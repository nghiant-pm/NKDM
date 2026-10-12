"use strict";

const { randomUUID } = require("node:crypto");
const { holdings, activeStrategy, tplusLevels } = require("./decision-service");
const O = require("./orderflow");

const VPS_API = "https://bgapidatafeed.vps.com.vn/getliststockdata/";
const NQS_API = "https://dulieu.nguoiquansat.vn/Company/OrderHistory";
const OWNER = "nghiant@youmed.vn";

function vnClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now)
    .reduce((out, part) => { if (part.type !== "literal") out[part.type] = part.value; return out; }, {});
  const minuteOfDay = Number(parts.hour) * 60 + Number(parts.minute);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hhmm: `${parts.hour}${parts.minute}`,
    minuteKey: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`,
    inSession: (minuteOfDay >= 540 && minuteOfDay <= 690) || (minuteOfDay >= 780 && minuteOfDay <= 885) };
}

async function fetchVpsQuotes(tickers, capturedAt = new Date().toISOString()) {
  const symbols = [...new Set((tickers || []).map((ticker) => String(ticker).trim().toUpperCase())
    .filter((ticker) => /^[A-Z0-9]{3,10}$/.test(ticker)))];
  if (!symbols.length) return new Map();
  const response = await fetch(VPS_API + symbols.join(","), { headers: { accept: "application/json, text/plain, */*" },
    signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`VPS HTTP ${response.status}`);
  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : payload?.sym ? [payload] : Object.values(payload || {}).flat().filter(Boolean);
  return new Map(rows.map((row) => O.parseVpsQuote(row, capturedAt)).filter(Boolean).map((row) => [row.ticker, row]));
}

function textOnly(html) {
  return String(html || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&minus;|&#8722;/gi, "-")
    .replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}
function numberVi(value) {
  // Bảng OrderHistory là khối lượng nguyên, dấu phẩy/chấm chỉ là phân cách hàng nghìn.
  const cleaned = String(value || "").replace(/[^0-9,.-]/g, "").replace(/[.,]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}
function parseNqsOrderHistory(html, now = new Date()) {
  const text = textOnly(html);
  const rows = [];
  const regex = /(\d{2})\/(\d{2})\s+(-?[\d.,]+)\s+(-?[\d.,]+)\s+(-?[\d.,]+)\s+(-?[\d.,]+)/g;
  const current = vnClock(now).date;
  const currentYear = Number(current.slice(0, 4)), currentMonth = Number(current.slice(5, 7));
  let match;
  // Lấy dư 1 dòng: trong phiên trang có thể đã có dòng hôm nay, nơi gọi lọc bỏ rồi giữ 5 phiên trước.
  while ((match = regex.exec(text)) && rows.length < 6) {
    const month = Number(match[2]), year = month > currentMonth ? currentYear - 1 : currentYear;
    const values = match.slice(3, 7).map(numberVi);
    if (values.some((value) => value === null)) continue;
    rows.push({ date: `${year}-${String(month).padStart(2, "0")}-${match[1]}`,
      buyRemaining: values[0], sellRemaining: values[1], avgBuyOrder: values[2], avgSellOrder: values[3], source: "nguoiquansat" });
  }
  return rows;
}
async function fetchNqsHistory(ticker, now = new Date()) {
  const url = `${NQS_API}?code=${encodeURIComponent(ticker)}&page=1&hasPaging=1`;
  const response = await fetch(url, { headers: { accept: "text/html, */*", "user-agent": "Fin2/1.0" },
    signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Người Quan Sát HTTP ${response.status}`);
  return parseNqsOrderHistory(await response.text(), now);
}

function summary(samples) {
  const valid = samples || [];
  if (!valid.length) return { sampleCount: 0, coveragePct: 0 };
  const prices = valid.map((sample) => sample.price).filter(Number.isFinite);
  return { sampleCount: valid.length, coveragePct: Math.round(Math.min(1, valid.length / 270) * 1000) / 10,
    firstAt: valid[0].capturedAt, lastAt: valid.at(-1).capturedAt,
    open: prices[0] || null, high: prices.length ? Math.max(...prices) : null,
    low: prices.length ? Math.min(...prices) : null, close: prices.at(-1) || null };
}
function contextAdjustment(decision) {
  if (!decision || decision.stale) return 0;
  const market = Number(decision.buyParts?.market), trend = Number(decision.buyParts?.trend), foreign = Number(decision.buyParts?.foreign);
  let value = 0;
  if (Number.isFinite(market)) value += (market - 10) * 0.35;
  if (Number.isFinite(trend)) value += (trend - 7.5) * 0.3;
  if (Number.isFinite(foreign)) value += (foreign - 5) * 0.45;
  return Math.max(-10, Math.min(10, value));
}
function backgroundBlocks(decision) {
  if (!decision || decision.stale) return { buy:false, sell:false };
  const market = Number(decision.buyParts?.market), trend = Number(decision.buyParts?.trend), foreign = Number(decision.buyParts?.foreign);
  const news = Number(decision.newsImpact || 0);
  return {
    buy: (Number.isFinite(market) && market <= 5 && Number.isFinite(trend) && trend <= 4) || news <= -6 || foreign === 0,
    sell: (Number.isFinite(market) && market >= 16 && Number.isFinite(trend) && trend >= 12 && foreign >= 9) || news >= 6
  };
}
function eventId(clock, ticker, action) {
  return `${clock.date}_${clock.hhmm}_${ticker}_${action}_${O.VERSION.replace(/[^a-z0-9.-]/gi, "-")}`;
}
function intradayEvaluation(event, samples) {
  // Đo theo phút GIAO DỊCH (nối qua nghỉ trưa) như khung 30 phút của máy.
  const entryAt = O.minuteOf({ capturedAt: event.createdAt }), entryPrice = Number(event.suggestedPrice || event.price);
  const after = samples.filter((sample) => O.minuteOf(sample) >= entryAt);
  // Mua ngay / Giữ thêm đúng khi giá tăng sau đó; Bán ngay / Chờ mua đúng khi giá giảm.
  const direction = ["buy", "sell-hold"].includes(event.action) ? 1 : -1;
  const buySide = String(event.action).startsWith("buy");
  const horizons = {};
  [15, 30, 60].forEach((minutes) => {
    const sample = after.filter((row) => O.minuteOf(row) <= entryAt + minutes).at(-1);
    horizons[minutes] = sample && Number.isFinite(entryPrice) && entryPrice > 0
      ? Math.round((sample.price / entryPrice - 1) * 10000 * direction) / 100 : null;
  });
  const touched30 = after.some((sample) => O.minuteOf(sample) <= entryAt + 30 &&
    (buySide ? sample.price <= entryPrice : sample.price >= entryPrice));
  return { horizons, touched30, updatedAt: new Date().toISOString() };
}

/* Nền 5 phiên làm mới MỖI NGÀY (trước v2.1.0 lấy một lần rồi đứng yên). Ngày phiên theo Người Quan Sát; phiên nào máy
   đã tự thu đủ mẫu thì độ nghiêng tính từ dữ liệu tự thu, còn lại từ dư mua/dư bán Người Quan Sát. Lỗi nguồn thì dùng
   tạm nền cũ, thử lại sau 30 phút (không gọi lại mỗi phút làm chậm lượt thu). */
async function ensureSeeds(db, tickers, now, clock, seedDocs) {
  const results = {};
  const load = async (ticker) => {
    const old = seedDocs[ticker], oldSessions = old?.sessions || [];
    const triedRecently = old?.attemptAt && now.getTime() - Date.parse(old.attemptAt) < 30 * 60000;
    if (old?.refreshedOn === clock.date || (triedRecently && oldSessions.length)) { results[ticker] = oldSessions; return; }
    const control = db.collection("orderflow_control").doc(`seed_${ticker}`);
    try {
      const nqs = (await fetchNqsHistory(ticker, now)).filter((row) => row.date < clock.date).slice(0, O.POLICY.minSeedSessions);
      const refs = nqs.map((row) => db.collection("orderflow_daily").doc(`${row.date}_${ticker}`));
      const days = refs.length ? (await db.getAll(...refs)).map((snap) => snap.data() || {}) : [];
      const sessions = nqs.map((row, index) => {
        const own = O.sessionLean(days[index].samples);
        return own === null ? { ...row, lean: O.nqsLean(row) } : { ...row, lean: own, source: "vps", ownSamples: days[index].samples.length };
      });
      results[ticker] = sessions;
      await control.set({ ticker, sessions, status: sessions.length >= O.POLICY.minSeedSessions ? "complete" : "learning",
        refreshedOn: clock.date, attemptAt: now.toISOString(), error: null, updatedAt: now.toISOString() }, { merge: true });
      // Chỉ thêm seed Người Quan Sát vào ngày chưa có — KHÔNG ghi samples/source để khỏi xoá mẫu đã tự thu.
      const batch = db.batch();
      const fresh = nqs.filter((row, index) => !days[index].seed);
      fresh.forEach((row) => batch.set(db.collection("orderflow_daily").doc(`${row.date}_${ticker}`),
        { ticker, date: row.date, seed: row }, { merge: true }));
      if (fresh.length) await batch.commit();
    } catch (error) {
      results[ticker] = oldSessions;
      await control.set({ ticker, status: "source-error", attemptAt: now.toISOString(),
        error: String(error.message).slice(0, 180), updatedAt: now.toISOString() }, { merge: true });
    }
  };
  for (let index = 0; index < tickers.length; index += 4) {
    await Promise.all(tickers.slice(index, index + 4).map(load));
  }
  return results;
}

// Mốc nhiều phiên chỉ cần tính một lần mỗi ngày; cất vào orderflow_control/seed_{MÃ}.levels.
// Lỗi nguồn thì dùng tạm mốc của ngày trước (vẫn là dữ liệu thật, chỉ thiếu phiên gần nhất).
async function ensureLevels(db, tickers, clock, seedDocs, fetchHistory) {
  const results = {};
  const load = async (ticker) => {
    const old = seedDocs[ticker]?.levels || null;
    if (old?.date === clock.date || !fetchHistory) { results[ticker] = old; return; }
    try {
      const levels = O.sessionLevels(await fetchHistory(ticker), clock.date);
      results[ticker] = levels || old;
      if (levels) await db.collection("orderflow_control").doc(`seed_${ticker}`).set({ ticker, levels }, { merge: true });
    } catch { results[ticker] = old; }
  };
  for (let index = 0; index < tickers.length; index += 4) {
    await Promise.all(tickers.slice(index, index + 4).map(load));
  }
  return results;
}

async function runOrderflow(db, { now = new Date(), scheduled = false, fetchHistory = null } = {}) {
  const clock = vnClock(now), runtime = db.collection("orderflow_control").doc("runtime"), runId = randomUUID();
  if (scheduled && !clock.inSession) return { status: "outside-session" };
  const acquired = await db.runTransaction(async (tx) => {
    const prior = (await tx.get(runtime)).data();
    if (prior?.status === "running" && now.getTime() - Date.parse(prior.startedAt) < 90000) return false;
    tx.set(runtime, { status: "running", runId, startedAt: now.toISOString(), error: null }, { merge: true });
    return true;
  });
  if (!acquired) return { status: "busy" };
  try {
    const names = ["transactions", "watchlist", "tickers", "strategies", "decision_latest", "orderflow_latest", "orderflow_events", "orderflow_control"];
    const reads = await Promise.all(names.map((name) => db.collection(name).get()));
    const rows = (index) => reads[index].docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    const positions = holdings(rows(0)), watch = Object.fromEntries(rows(1).map((row) => [row.id, row]));
    const meta = Object.fromEntries(rows(2).map((row) => [row.id, row])), decisions = Object.fromEntries(rows(4).map((row) => [row.id, row]));
    const prior = Object.fromEntries(rows(5).map((row) => [row.id, row]));
    const strategy = activeStrategy(rows(3), clock.date);
    const seedDocs = Object.fromEntries(rows(7).filter((row) => row.id.startsWith("seed_")).map((row) => [row.ticker, row]));
    const targets = [...new Set([...Object.keys(positions).filter((ticker) => positions[ticker].qty > 0), ...Object.keys(watch)])].sort();
    if (!targets.length) { await runtime.set({ status: "empty", completedAt: now.toISOString() }, { merge: true }); return { status: "empty" }; }
    if (targets.length > 150) throw new Error("Quá 150 mã trong danh mục và theo dõi");
    const seeds = await ensureSeeds(db, targets, now, clock, seedDocs);
    const levels = await ensureLevels(db, targets, clock, seedDocs, fetchHistory);
    const quotes = await fetchVpsQuotes(targets, now.toISOString());
    const dayRefs = targets.map((ticker) => db.collection("orderflow_daily").doc(`${clock.date}_${ticker}`));
    const daySnaps = await db.getAll(...dayRefs);
    const byTicker = Object.fromEntries(daySnaps.map((snap) => [snap.id.split("_").at(-1), snap.data() || {}]));
    // Mọi sự kiện v2.x trong ngày đều tiếp tục được đo — nâng bản giữa phiên không bỏ dở sự kiện bản trước.
    const eventsToday = rows(6).filter((event) => event.date === clock.date && String(event.orderflowVersion || "").startsWith("orderflow-v2"));
    let batch = db.batch(), writes = 0, scoredCount = 0, readyCount = 0, missing = [];
    const actions = {};
    const flush = async () => { if (writes) await batch.commit(); batch = db.batch(); writes = 0; };
    for (const ticker of targets) {
      const quote = quotes.get(ticker);
      if (!quote) { missing.push(ticker); batch.set(db.collection("orderflow_latest").doc(ticker),
        { ticker, action: "wait", ready: false, stale: true, status: "source-error", reasons: ["Chưa lấy được dữ liệu cung cầu"], updatedAt: now.toISOString() }, { merge: true }); writes += 1; continue; }
      const existing = byTicker[ticker] || {};
      let samples = Array.isArray(existing.samples) ? existing.samples.slice(-300) : [];
      if (!samples.some((sample) => String(sample.capturedAt).slice(0, 16) === quote.capturedAt.slice(0, 16))) samples.push(quote);
      samples = samples.slice(-300);
      const held = positions[ticker]?.qty > 0, avgCost = held ? positions[ticker].avgCost : null;
      const background = backgroundBlocks(decisions[ticker]);
      // v2.0.0: mốc là mốc T+ (giá vốn −buyDrop/+sellRise, mã chỉ theo dõi = giá kỳ vọng).
      const anchors = tplusLevels(held ? positions[ticker] : null, strategy, watch[ticker]?.targetBuy);
      const scored = O.scoreOrderflow({ samples, seedSessions: (seeds[ticker] || []).length, baselineLean: O.baselineLean(seeds[ticker]),
        held, avgCost, hold: !!meta[ticker]?.hold, contextAdjustment: contextAdjustment(decisions[ticker]),
        blockBuy: background.buy, blockSell: background.sell, levels: levels[ticker], buyAt: anchors.buyAt, sellAt: anchors.sellAt });
      const state = O.nextState(prior[ticker]?.orderflowVersion === O.VERSION ? prior[ticker] : null, scored);
      const latest = { ticker, ...state, held, avgCost, source: { book: "VPS", seed: "VPS tự thu + Người Quan Sát" },
        status: state.ready ? "active" : "learning", stale: false, price: quote.price, strategyId: strategy.id,
        targetBuy: Number.isFinite(watch[ticker]?.targetBuy) ? watch[ticker].targetBuy : null, updatedAt: now.toISOString() };
      batch.set(dayRefs[targets.indexOf(ticker)], { ticker, date: clock.date, source: "vps", samples,
        summary: summary(samples), updatedAt: now.toISOString() }, { merge: true }); writes += 1;
      batch.set(db.collection("orderflow_latest").doc(ticker), latest); writes += 1; scoredCount += 1;
      if (state.ready) readyCount += 1;
      if (state.action !== "wait") actions[ticker] = state.action;
      const oldAction = prior[ticker]?.orderflowVersion === O.VERSION ? prior[ticker].action : "wait";
      if (state.ready && state.action !== "wait" && state.action !== oldAction) {
        const id = eventId(clock, ticker, state.action);
        batch.set(db.collection("orderflow_events").doc(id), { ticker, date: clock.date, action: state.action,
          orderflowVersion: O.VERSION, provisional: !!state.provisional, price: quote.price, suggestedPrice: state.suggestedPrice, buyScore: state.buyScore,
          sellScore: state.sellScore, confidence: state.confidence, spoofRisk: Math.max(state.buySpoofRisk, state.sellSpoofRisk),
          reasons: state.reasons, snapshot: latest, createdAt: now.toISOString(), evaluation: { intraday: {}, swing: { complete: false } } }, { merge: false }); writes += 1;
      }
      for (const event of eventsToday.filter((row) => row.ticker === ticker)) {
        batch.set(db.collection("orderflow_events").doc(event.id), { evaluation: { ...(event.evaluation || {}),
          intraday: intradayEvaluation(event, samples) } }, { merge: true }); writes += 1;
      }
      if (writes >= 350) await flush();
    }
    batch.set(db.collection("orderflow_versions").doc(O.VERSION), { orderflowVersion: O.VERSION, policy: O.POLICY,
      mode: "active", source: { book: "VPS", seed: "VPS tự thu + Người Quan Sát" }, updatedAt: now.toISOString() }, { merge: true }); writes += 1;
    batch.set(runtime, { status: missing.length ? "partial" : "complete", activeVersion: O.VERSION,
      recommendationEngine: O.VERSION, completedAt: now.toISOString(), targets: targets.length, scored: scoredCount, missing, error: null }, { merge: true }); writes += 1;
    await flush();
    const learning = targets.filter((ticker) => (seeds[ticker] || []).length < O.POLICY.minSeedSessions);
    return { status: missing.length ? "partial" : "complete", scored: scoredCount, ready: readyCount, actions, missing, learning };
  } catch (error) {
    await runtime.set({ status: "error", error: String(error.message).slice(0, 250), completedAt: now.toISOString() }, { merge: true });
    throw error;
  }
}

function swingEvaluation(event, bars) {
  // Chờ / Giữ thêm chỉ đo trong ngày (giá tốt hơn có tới trong 30' không); 20 phiên chỉ đo lệnh làm ngay.
  if (!["buy", "sell"].includes(event.action)) return { complete: true, outcome: "n/a" };
  const future = bars.filter((bar) => bar.date > event.date).slice(0, O.POLICY.swing.sessions);
  const entry = Number(event.suggestedPrice || event.price), direction = event.action === "buy" ? 1 : -1;
  let outcome = "pending", exit = null;
  for (const bar of future) {
    const win = direction > 0 ? bar.high >= entry * 1.06 : bar.low <= entry * 0.94;
    const loss = direction > 0 ? bar.low <= entry * 0.97 : bar.high >= entry * 1.03;
    if (win || loss) { outcome = win && loss ? "ambiguous" : win ? "win" : "loss"; exit = bar.date; break; }
  }
  return { complete: future.length >= O.POLICY.swing.sessions || outcome !== "pending", outcome,
    sessionsObserved: future.length, entryPrice: entry, exitDate: exit, winPct: 6, lossPct: 3 };
}
async function evaluateOrderflowEvents(db, fetchHistory) {
  const snapshot = await db.collection("orderflow_events").get();
  // Đo 20 phiên cho mọi sự kiện v2.x: ngưỡng đo (6%/3%) không đổi theo bản, nâng bản không bỏ dở mẫu cũ.
  const pending = snapshot.docs.filter((doc) => String(doc.data().orderflowVersion || "").startsWith("orderflow-v2") &&
    !doc.data().evaluation?.swing?.complete);
  const tickers = [...new Set(pending.map((doc) => doc.data().ticker))];
  const histories = new Map();
  await Promise.all(tickers.map(async (ticker) => { try { histories.set(ticker, await fetchHistory(ticker)); } catch { /* giữ pending */ } }));
  for (let index = 0; index < pending.length; index += 350) {
    const batch = db.batch();
    pending.slice(index, index + 350).forEach((doc) => {
      const bars = histories.get(doc.data().ticker);
      if (bars) batch.set(doc.ref, { evaluation: { ...(doc.data().evaluation || {}), swing: swingEvaluation(doc.data(), bars) },
        evaluatedAt: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
  }
  return { evaluated: pending.length };
}

module.exports = { OWNER, VPS_API, NQS_API, vnClock, fetchVpsQuotes, parseNqsOrderHistory, fetchNqsHistory,
  runOrderflow, evaluateOrderflowEvents, swingEvaluation, intradayEvaluation };
