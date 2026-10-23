"use strict";

const { activeStrategy, tplusLevels, holdings, maInZone } = require("./decision-service");

/* Kế hoạch chiều (owner chốt 23/10/2026, pm-v1.0.0). Kế hoạch thật dựng ở APP (buildPlan(…, noon)) — bot KHÔNG chép luật kế hoạch,
   chỉ làm hai việc:
   1. Telegram giờ nghỉ trưa: tóm tắt SƠ BỘ mã chạm mốc lúc 11:30 (mốc T+ + vùng MA tạm có nền phiên trước) để nhắc mở app chốt.
      Chưa tính gồng/cửa lọc tiền mặt/số lệnh → có thể khác kế hoạch app, tin nhắn ghi rõ "sơ bộ".
   2. Sau đóng cửa: đo từng mục kế hoạch chiều đã chốt — chiều có khớp giá không (mẫu phút orderflow_daily từ 13:00) và
      lãi/lỗ sau PM_EVAL_SESSIONS phiên so với giá đặt. Ghi plans/{ngày}.pmEvaluation (app chỉ đọc field này).
   MARKET_WEAK_FLAG ↔ riskFlags (decision-scoring.js) ↔ MARKET_WEAK_FLAG (public/index.html). */
const MARKET_WEAK_FLAG = "VN-Index đang yếu";
const PM_SHADOW_SESSIONS = 10;   // ↔ PM_SHADOW_SESSIONS ở public/index.html
const PM_EVAL_SESSIONS = 5;
const AFTERNOON_START = 13 * 60;

function noonSummary({ rows, positions, watch, hold, strategy, date }) {
  const live = rows.filter((r) => !r.stale && r.maTrendNoon?.date === date && r.maTrendNoon.close > 0);
  const out = { known: live.length > 0, weak: live.some((r) => (r.riskFlags || []).includes(MARKET_WEAK_FLAG)), sell: [], buy: [], ma: [] };
  live.sort((a, b) => a.ticker.localeCompare(b.ticker)).forEach((r) => {
    const tk = r.ticker, price = r.maTrendNoon.close, pos = positions[tk]?.qty > 0 ? positions[tk] : null;
    const target = Number(watch[tk]?.targetBuy);
    const { buyAt, sellAt } = tplusLevels(pos, strategy, Number.isFinite(target) && target > 0 ? target : null);
    if (pos && !hold.has(tk) && price >= Math.max(sellAt, pos.avgCost * 1.01)) out.sell.push(tk);
    const n = r.maTrendNoon;
    if (Number.isFinite(buyAt) && price <= buyAt) out.buy.push(tk);
    // Nền phiên trước: phiên đã đóng cửa gần nhất cũng trên MA (maTrend.streak > 0).
    else if (maInZone(n.streak, n.rise, strategy) && n.up && r.maTrend?.streak > 0) out.ma.push(tk);
  });
  return out;
}

function viDate(date) {
  const [y, m, d] = String(date).split("-");
  return `${d}/${m}/${y}`;
}

function noonText(summary, date, session) {
  const lines = [`Fin2 · Kế hoạch chiều ${viDate(date)} · sơ bộ`,
    session <= PM_SHADOW_SESSIONS ? `Chạy bóng phiên ${session}/${PM_SHADOW_SESSIONS}: chỉ ghi lại để đo, chưa đặt lệnh`
      : "Chạy bóng: đã đủ phiên đo, chờ anh xem số", ""];
  lines.push(!summary.known ? "Thị trường: chưa rõ" : summary.weak ? "Thị trường yếu: dừng mua T+, MA vẫn mua" : "Thị trường ổn");
  if (summary.sell.length) lines.push(`Bán tại mốc: ${summary.sell.join(", ")}`);
  if (summary.buy.length) lines.push(`Mua T+${summary.weak ? " (bị dừng)" : ""}: ${summary.buy.join(", ")}`);
  if (summary.ma.length) lines.push(`Mua theo MA: ${summary.ma.join(", ")}`);
  if (!summary.sell.length && !summary.buy.length && !summary.ma.length) lines.push("Không mã nào chạm mốc lúc 11:30.");
  lines.push("", "Mở Fin2 trước 13:00 để xem và chốt.");
  return lines.join("\n");
}

/* Gửi một lần mỗi ngày (khoá decision_control/noon). Lượt 12:30 thử lại nếu lượt 11:30 lỗi. */
async function sendNoonPlan(db, date, send) {
  const lock = db.collection("decision_control").doc("noon");
  const claimed = await db.runTransaction(async (tx) => {
    const old = (await tx.get(lock)).data();
    if (old?.date === date && old.sentAt) return false;
    tx.set(lock, { date, status: "sending", startedAt: new Date().toISOString(), error: null }, { merge: true });
    return true;
  });
  if (!claimed) return { status: "already-sent" };
  try {
    const names = ["decision_latest", "transactions", "watchlist", "tickers", "strategies", "plans"];
    const reads = await Promise.all(names.map((n) => db.collection(n).get()));
    const docs = (i) => reads[i].docs.map((d) => ({ ...d.data(), id: d.id }));
    const summary = noonSummary({ rows: docs(0).map((r) => ({ ...r, ticker: r.ticker || r.id })), positions: holdings(docs(1)),
      watch: Object.fromEntries(docs(2).map((r) => [r.id, r])), hold: new Set(docs(3).filter((r) => r.hold === true).map((r) => r.id)),
      strategy: activeStrategy(docs(4), date), date });
    const session = docs(5).filter((p) => p.pm?.frozenAt && p.id < date).length + 1;
    await send(noonText(summary, date, session));
    await lock.set({ status: "sent", sentAt: new Date().toISOString(), summary }, { merge: true });
    return { status: "sent", summary };
  } catch (error) {
    await lock.set({ status: "error", error: String(error.message).slice(0, 250) }, { merge: true });
    throw error;
  }
}

// Phút trong ngày theo giờ Việt Nam (UTC+7, không đổi giờ mùa) của capturedAt ISO.
function vnMinute(iso) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor(((t / 60000) + 7 * 60) % (24 * 60)) : -1;
}

function evaluateNoonItem(item, samples, bars, date, morningItems) {
  const prices = (samples || []).filter((s) => vnMinute(s.capturedAt) >= AFTERNOON_START && Number(s.price) > 0).map((s) => Number(s.price));
  const filled = prices.length ? (item.side === "buy" ? Math.min(...prices) <= item.limitPrice : Math.max(...prices) >= item.limitPrice) : null;
  const future = (bars || []).filter((b) => b.date > date).slice(0, PM_EVAL_SESSIONS);
  const exitClose = future.length >= PM_EVAL_SESSIONS ? future.at(-1).close : null;
  // Mua: giá sau 5 phiên so với giá mua · Bán: giá bán so với giá sau 5 phiên (dương = bán đúng).
  const returnPct = filled && exitClose > 0
    ? Math.round((item.side === "buy" ? exitClose / item.limitPrice - 1 : item.limitPrice / exitClose - 1) * 10000) / 100 : null;
  return { key: item.key, ticker: item.ticker, side: item.side, kind: item.kind || null, limitPrice: item.limitPrice,
    inMorning: morningItems.some((m) => !m.gate && m.ticker === item.ticker && m.side === item.side),
    filled, afternoonLow: prices.length ? Math.min(...prices) : null, afternoonHigh: prices.length ? Math.max(...prices) : null,
    sessions: future.length, exitClose, returnPct };
}

async function evaluateNoonPlans(db, fetchHistory) {
  const snap = await db.collection("plans").get();
  const pending = snap.docs.filter((d) => d.data().pm?.frozenAt && !d.data().pmEvaluation?.complete);
  const histories = new Map();
  const history = async (tk) => {
    if (!histories.has(tk)) histories.set(tk, await fetchHistory(tk).catch(() => null));
    return histories.get(tk);
  };
  for (const d of pending) {
    const plan = d.data(), date = d.id, morning = plan.frozenAt ? plan.items || [] : [];
    const items = (plan.pm.items || []).filter((x) => !x.gate);
    const days = items.length ? await db.getAll(...items.map((x) => db.collection("orderflow_daily").doc(`${date}_${x.ticker}`))) : [];
    const out = [];
    for (const [i, x] of items.entries()) out.push(evaluateNoonItem(x, days[i].data()?.samples, await history(x.ticker), date, morning));
    // Thiếu lịch sử giá (nguồn lỗi) thì giữ chưa xong, lượt sau đo lại.
    const complete = out.every((r) => r.sessions >= PM_EVAL_SESSIONS);
    await d.ref.set({ pmEvaluation: { items: out, complete, sessions: PM_EVAL_SESSIONS, evaluatedAt: new Date().toISOString() } }, { merge: true });
  }
  return { evaluated: pending.length };
}

module.exports = { noonSummary, noonText, sendNoonPlan, evaluateNoonItem, evaluateNoonPlans, vnMinute, PM_SHADOW_SESSIONS };
