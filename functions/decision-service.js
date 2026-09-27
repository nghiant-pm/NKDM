"use strict";

const { randomUUID } = require("node:crypto");
const D = require("./decision-scoring");
const { collectNews } = require("./decision-news");

/* Bản sao có chủ ý (ghi ở CLAUDE.md): DEFAULT_STRATEGY ↔ RULE_* · activeStrategy() ↔ activeStrategy() ·
   holdings() ↔ computeLedger() · buyAt/sellAt legacy ↔ strategyLevels() trong public/index.html.
   Đổi một bên phải đổi bên kia. Phiên bản thật luôn đọc từ strategies. */
const DEFAULT_STRATEGY = { id: null, buyDrop: 2, sellRise: 3, buyDropPct: null, sellRisePct: null,
  lotSize: 100, minCashRatio: 20, maxCashRatio: 30 };
function activeStrategy(rows, date) {
  const usable = rows.filter((r) => r.effectiveFrom && r.effectiveFrom <= date).sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  const row = usable.at(-1);
  if (!row) return { ...DEFAULT_STRATEGY };
  const out = { ...DEFAULT_STRATEGY, id: row.id };
  for (const key of ["buyDrop", "sellRise", "lotSize", "minCashRatio", "maxCashRatio"]) {
    if (Number.isFinite(Number(row[key]))) out[key] = Number(row[key]);
  }
  for (const key of ["buyDropPct", "sellRisePct"]) {
    if (row[key] != null && Number.isFinite(Number(row[key])) && Number(row[key]) > 0) out[key] = Number(row[key]);
  }
  return out;
}
function holdings(rows) {
  const out = {};
  rows.slice().sort((a, b) => ((a.date || "") + "_" + (a.createdAt || "")).localeCompare((b.date || "") + "_" + (b.createdAt || "")))
    .forEach((r) => {
      if (![r.qty, r.price].every(Number.isFinite) || r.qty <= 0 || r.price <= 0 || !["buy", "sell"].includes(r.side)) return;
      const h = out[r.ticker] || { qty: 0, avgCost: 0 };
      if (r.side === "buy") {
        h.avgCost = (h.qty * h.avgCost + r.qty * r.price) / (h.qty + r.qty); h.qty += r.qty;
      } else {
        h.qty -= r.qty; if (h.qty <= 0.0001) { h.qty = 0; h.avgCost = 0; }
      }
      out[r.ticker] = h;
    });
  return out;
}
function vnClock(now) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now)
    .reduce((out, p) => { out[p.type] = p.value; return out; }, {});
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, phase: minutes >= 930 ? "post" : minutes >= 540 ? "intraday" : "pre" };
}
async function saveEvaluation(db, events, histories) {
  // Chỉ đo sự kiện của phiên bản hiện tại: sự kiện bản cũ giữ nguyên kết quả theo luật lúc đó.
  const pending = events.filter((e) => e.data().scoreVersion === D.VERSION && !e.data().evaluation?.complete && histories.has(e.data().ticker));
  for (let i = 0; i < pending.length; i += 350) {
    const batch = db.batch();
    pending.slice(i, i + 350).forEach((e) => batch.update(e.ref, { evaluation: D.evaluateDecision(e.data(), histories.get(e.data().ticker)),
      evaluatedAt: new Date().toISOString() }));
    await batch.commit();
  }
}
const ENGINES = ["decision", "legacy"], KINDS = ["buy", "sell"];
const aboveKey = (engine, kind) => engine === "decision" ? kind + "Above" : kind === "buy" ? "legacyBuyAbove" : "legacySellAbove";
function reached(r, engine, kind) {
  if (engine === "legacy") return !!r[kind === "buy" ? "legacyBuy" : "legacySell"];
  const score = r[kind + "Score"];
  return score !== null && score >= D.POLICY.threshold;
}
/* Cờ "đang ở trên ngưỡng" chỉ đổi ở lượt sau đóng cửa — lượt trong phiên giữ nguyên cờ cũ,
   để một cú vượt ngưỡng giữa phiên rồi tụt lại không đẻ sự kiện. */
function aboveFlags(r, priorRow, phase) {
  return Object.fromEntries(ENGINES.flatMap((engine) => KINDS.map((kind) => [aboveKey(engine, kind),
    phase === "post" ? reached(r, engine, kind) : !!priorRow?.[aboveKey(engine, kind)]])));
}
function makeEvents(rows, prior, date, phase) {
  // Chỉ lượt sau đóng cửa sinh sự kiện; mã Giữ vẫn được đo, không tạo lệnh.
  if (phase !== "post") return [];
  return rows.flatMap((r) => ENGINES.flatMap((engine) => KINDS.filter((kind) =>
    reached(r, engine, kind) && !prior[r.ticker]?.[aboveKey(engine, kind)]
  ).map((kind) => ({ ticker: r.ticker, kind, engine, date, phase, close: r.close, score: r[kind + "Score"],
    legacyReached: kind === "buy" ? r.legacyBuy : r.legacySell,
    scoreVersion: D.VERSION, policy: { ...D.POLICY }, snapshot: r,
    evaluation: { primary: "pending", complete: false, sessionsObserved: 0, effectPct: null } }))));
}
async function runDecision(db, helpers, { now = new Date(), scheduled = false } = {}) {
  const { date, phase } = vnClock(now), id = randomUUID();
  const lock = db.collection("decision_control").doc("runtime");
  const acquired = await db.runTransaction(async (tx) => {
    const old = (await tx.get(lock)).data();
    if (old?.status === "running" && now.getTime() - Date.parse(old.startedAt) < 10 * 60000) return false;
    if (!scheduled && ["complete", "partial"].includes(old?.status) && old?.completedAt && now.getTime() - Date.parse(old.completedAt) < 60000) return false;
    tx.set(lock, { status: "running", jobId: id, startedAt: now.toISOString(), error: null }, { merge: true }); return true;
  });
  if (!acquired) return { status: "busy" };
  try {
    const names = ["transactions", "watchlist", "tickers", "strategies", "decision_latest", "decision_events"];
    const reads = await Promise.all(names.map((n) => db.collection(n).get()));
    const docs = (i) => reads[i].docs.map((d) => ({ ...d.data(), id: d.id }));
    const positions = holdings(docs(0)), watch = Object.fromEntries(docs(1).map((r) => [r.id, r]));
    const prices = Object.fromEntries(docs(2).map((r) => [r.id, r]));
    const prior = Object.fromEntries(docs(4).map((r) => [r.id, r]));
    const targets = [...new Set([...Object.keys(positions).filter((tk) => positions[tk].qty > 0), ...Object.keys(watch)])].sort();
    if (targets.length > 150) throw new Error("Quá 150 mã trong danh mục và theo dõi");
    if (!targets.length) {
      await lock.set({ status: "empty", completedAt: new Date().toISOString() }, { merge: true });
      return { status: "empty" };
    }
    const benchmarkAll = await helpers.fetchHistory("VNINDEX", 240, 3);
    const marketDate = phase === "pre" ? benchmarkAll.filter((b) => b.date < date).at(-1)?.date : benchmarkAll.at(-1)?.date;
    if (!marketDate || (scheduled && marketDate !== date)) {
      await lock.set({ status: "holiday", completedAt: new Date().toISOString() }, { merge: true });
      return { status: "holiday" };
    }
    const benchmark = benchmarkAll.filter((b) => b.date <= marketDate);
    const effectivePhase = marketDate < date ? "pre" : phase;
    const peers = targets.flatMap((tk) => D.SECTORS[D.sectorFor(tk)]?.split(" ") || []);
    const pendingTickers = docs(5).filter((r) => r.scoreVersion === D.VERSION && !r.evaluation?.complete).map((r) => r.ticker);
    const symbols = [...new Set([...targets, ...peers, ...pendingTickers])];
    const fetched = await helpers.mapWithConcurrency(symbols, 5, (tk) => helpers.fetchHistory(tk));
    const histories = new Map();
    fetched.forEach((r, i) => {
      if (!r.ok) return;
      const bars = r.value.filter((b) => b.date <= marketDate);
      if (bars.at(-1)?.date === marketDate) histories.set(symbols[i], bars);
    });
    const strategy = activeStrategy(docs(3), marketDate);
    const knownTickers = [...new Set([...targets, ...Object.values(D.SECTORS).flatMap((s) => s.split(" "))])];
    const news = await collectNews(db, knownTickers, Object.keys(D.SECTORS), helpers.mapWithConcurrency, now)
      .catch(() => ({ status: "source-error", aiReady: false, items: [], coverage: "HNX RSS — chưa lấy được tin" }));
    const rows = targets.map((ticker) => {
      let bars = histories.get(ticker);
      if (!bars) return null;
      const meta = prices[ticker] || {}, sector = D.sectorContext(ticker, histories, benchmark);
      if (effectivePhase === "intraday" && meta.lastPriceDate === marketDate && Number.isFinite(meta.lastPrice) && meta.lastPrice > 0) {
        bars = bars.map((b, i) => i === bars.length - 1 ? { ...b, close: meta.lastPrice,
          high: Math.max(b.high, meta.lastPrice), low: Math.min(b.low, meta.lastPrice) } : b);
      }
      const position = positions[ticker]?.qty > 0 ? { ...positions[ticker], hold: !!meta.hold } : null;
      const matched = news.items.filter((n) => n.tickers?.includes(ticker) || (sector.name && n.sector === sector.name));
      const row = D.scoreDecision({ ticker, bars, benchmark, sector, position,
        targetBuy: Number.isFinite(watch[ticker]?.targetBuy) ? watch[ticker].targetBuy : null,
        strategy, news: news.aiReady && !["source-error", "ai-error"].includes(news.status) ? matched : [], phase: effectivePhase });
      if (!row) return null;
      row.newsStatus = news.status; row.newsCoverage = news.coverage; row.newsAiReady = news.aiReady;
      row.sourceNews = matched.map(({ text, ...n }) => n).slice(0, 8);
      row.priceSource = effectivePhase === "intraday" && meta.lastPriceDate === marketDate && Number.isFinite(meta.lastPrice) && meta.lastPrice > 0 ? "VPS + VNDirect OHLCV" : "VNDirect OHLCV";
      const buyAt = position ? Math.max(position.avgCost - strategy.buyDrop,
        strategy.buyDropPct ? position.avgCost * (1 - strategy.buyDropPct / 100) : -Infinity) : watch[ticker]?.targetBuy;
      const sellAt = position ? Math.min(position.avgCost + strategy.sellRise,
        strategy.sellRisePct ? position.avgCost * (1 + strategy.sellRisePct / 100) : Infinity) : null;
      row.legacyBuy = Number.isFinite(buyAt) && row.close <= buyAt;
      row.legacySell = !!position && !position.hold && row.close >= sellAt;
      row.news = row.news.map(({ text, ...n }) => n);
      row.previousBuy = prior[ticker]?.scoreVersion === D.VERSION ? prior[ticker].buyScore : null;
      row.previousSell = prior[ticker]?.scoreVersion === D.VERSION ? prior[ticker].sellScore : null;
      row.updatedAt = new Date().toISOString();
      return row;
    }).filter(Boolean);
    if (!rows.length) throw new Error("Chưa đủ lịch sử giá để chấm điểm danh mục");
    const ranked = D.rankDecisions(rows);
    const missing = targets.filter((tk) => !rows.some((r) => r.ticker === tk));
    const runId = `${marketDate}_${effectivePhase === "post" ? "post" : now.toISOString().replace(/[:.]/g, "-")}`;
    const runRef = db.collection("decision_runs").doc(runId);
    const [runs, version] = await Promise.all([db.collection("decision_runs").get(), db.collection("decision_versions").doc(D.VERSION).get()]);
    const closedDates = new Set(runs.docs.filter((r) => r.data().phase === "post" && r.data().status === "complete" && r.data().scoreVersion === D.VERSION).map((r) => r.data().date));
    const trialSession = closedDates.size + (!closedDates.has(marketDate) && effectivePhase === "post" && !missing.length ? 1 : 0);
    const priorSame = Object.fromEntries(Object.entries(prior).filter(([, r]) => r.scoreVersion === D.VERSION));
    const events = makeEvents(ranked, priorSame, marketDate, effectivePhase);
    // Doc chính thức sau đóng cửa giữ lần đầu; lượt làm mới tiếp theo vẫn lưu bản riêng để không mất lịch sử.
    const officialExists = runs.docs.some((r) => r.id === runId && r.data().status === "complete");
    const actualRef = officialExists ? db.collection("decision_runs").doc(`${marketDate}_${now.toISOString().replace(/[:.]/g, "-")}`) : runRef;
    let batch = db.batch(), writes = 0;
    const flush = async () => { if (writes) await batch.commit(); batch = db.batch(); writes = 0; };
    if (!version.exists) { batch.create(version.ref, { scoreVersion: D.VERSION, policy: D.POLICY, sectors: D.SECTORS,
      createdAt: now.toISOString(), mode: "shadow", newsVersion: "news-v1.0.0" });
      writes += 1;
    }
    for (const r of ranked) {
      batch.set(db.collection("decision_snapshots").doc(`${actualRef.id}_${r.ticker}`), r); writes += 1;
      batch.set(db.collection("decision_latest").doc(r.ticker), { ...r, ...aboveFlags(r, priorSame[r.ticker], effectivePhase) }); writes += 1;
      if (writes >= 350) await flush();
    }
    // Thiếu mã: giữ kết quả cũ với cờ stale thay vì hiển thị như kết quả mới.
    for (const tk of missing.filter((tk) => prior[tk])) {
      batch.update(db.collection("decision_latest").doc(tk), { stale: true }); writes += 1;
      if (writes >= 350) await flush();
    }
    for (const e of events) {
      const eventId = `${marketDate}_${e.ticker}_${e.kind}_${e.engine}_${D.VERSION}`;
      if (!reads[5].docs.some((r) => r.id === eventId)) {
        batch.create(db.collection("decision_events").doc(eventId), { ...e, createdAt: now.toISOString() }); writes += 1;
      }
      if (writes >= 350) await flush();
    }
    batch.set(actualRef, { date: marketDate, phase: effectivePhase, scoreVersion: D.VERSION,
      status: missing.length ? "partial" : "complete", trialSession: Math.min(20, trialSession),
      pilotReady: trialSession >= 20 && docs(5).filter((r) => r.engine === "decision" && r.scoreVersion === D.VERSION).length + events.filter((r) => r.engine === "decision").length >= 10,
      missing, rows: ranked.map((r) => ({ ticker:r.ticker, buyScore:r.buyScore, sellScore:r.sellScore, buyRank:r.buyRank, sellRank:r.sellRank })),
      newsStatus: news.status, createdAt: now.toISOString(), mode: "shadow" });
    batch.set(lock, { status: missing.length ? "partial" : "complete", completedAt: new Date().toISOString(),
      marketDate, missing, trialSession: Math.min(20, trialSession), error: null }, { merge: true });
    writes += 2; await flush();
    if (effectivePhase === "post") await saveEvaluation(db, reads[5].docs, histories);
    return { status: missing.length ? "partial" : "complete", scored: ranked.length, missing };
  } catch (error) {
    await lock.set({ status: "error", error: String(error.message).slice(0, 250), completedAt: new Date().toISOString() }, { merge: true });
    throw error;
  }
}
module.exports = { runDecision, activeStrategy, holdings, makeEvents, aboveFlags, vnClock };
