"use strict";

/* Gom dữ liệu 360 độ của MỘT mã cho skill review mã (.claude/skills/review-ma). Chạy trên máy owner, không ghi Firestore.
   node functions/review-ma.js FPT [--side buy|sell] [--export đường-dẫn.json]
   node functions/review-ma.js --plan [--export …]      → mọi mã trong kế hoạch phiên sắp tới (keHoachSapToi của file xuất)
   Dữ liệu sổ tay (vị thế, chiến lược, kế hoạch, điểm quyết định, cung cầu) đọc từ file "Xuất dữ liệu cho AI" mới nhất.
   Giá / khối ngoại / sổ lệnh lấy trực tiếp, dùng lại đúng hàm của bot — không chép phần đọc datafeed. */

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { fetchHistory, fetchForeign, mapWithConcurrency } = require("./index")._private;
const { normalizeConfig, decisionInputs: I } = require("./scoring");
const { foreignFlow } = I;
const { analyzeTicker } = require("./ticker-analysis");
const { maStreak, maInZone, tplusLevels } = require("./decision-service");
const { fetchVpsQuotes, fetchNqsHistory, vnClock } = require("./orderflow-service");
const { sessionLevels, toTick } = require("./orderflow");
const { parseFeed, SOURCES: HNX_FEEDS } = require("./decision-news");

const HISTORY_DAYS = 400;            // ~270 phiên: đủ 1 năm + đệm cho MA200
const BOX_WINDOWS = [20, 40, 60];    // 1 · 2 · 3 tháng
const BOX_MAX_WIDTH = 25;            // hộp rộng hơn 25% không còn là "đi ngang"
const BOX_MIN_WIDTH = 6;
const STAT_LOOKBACK = 40;            // hộp trượt dùng để đếm tỷ lệ bật lại
const STAT_FORWARD = 10;             // xem kết quả trong 10 phiên sau mỗi lần chạm
const r2 = (n) => Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
const pct = (from, to) => from > 0 && Number.isFinite(to) ? r2((to - from) / from * 100) : null;
const quantile = (values, q) => { const s = values.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))] : null; };

// ---------- File xuất của app ----------
function findExport(explicit) {
  if (explicit) return explicit;
  const dirs = [path.resolve(__dirname, ".."), path.join(os.homedir(), "Downloads")];
  const files = dirs.flatMap((dir) => { try { return fs.readdirSync(dir).filter((f) => /^fin2-nhat-ky.*\.json$/i.test(f)).map((f) => path.join(dir, f)); } catch (_) { return []; } });
  return files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}
function ledgerFor(data, ticker, file) {
  if (!data) return { status: "missing", note: "Không thấy file xuất — chỉ có dữ liệu thị trường, thiếu vị thế/kế hoạch của owner." };
  const ageHours = r2((Date.now() - Date.parse(data.xuatLuc)) / 3600000);
  const same = (row) => row && (row.ma === ticker || row.ticker === ticker);
  const plan = data.keHoachSapToi || null;
  return {
    status: "ok", file, exportedAt: data.xuatLuc, ageHours,
    stale: ageHours > 24,
    strategy: data.chienLuoc?.dangApDung || null,
    position: (data.viTheHienTai || []).find(same) || null,
    watch: (data.dangTheoDoi || []).find(same) || null,
    cash: data.homNay ? { tienMat: data.homNay.tienMat, tongTaiSan: data.homNay.tongTaiSan, tyLeTienMatPct: data.homNay.tyLeTienMatPct, mucTieu: data.homNay.mucTieuTienMatPct } : null,
    plan: plan ? { ngay: plan.ngay, daChot: plan.daChot, thiTruongYeu: plan.thiTruongYeu, items: (plan.cacMuc || []).filter(same) } : null,
    decision: (data.diemQuyetDinh?.hienTai || []).find(same) || null,
    orderflow: (data.cungCau?.hienTai || []).find(same) || null,
    thesis: (data.luanDiem || []).filter(same),
    trades: (data.giaoDich || []).filter(same).slice(-10),
    signals: (data.tinHieu || []).filter(same).slice(-8).map((s) => ({ ngay: s.ngay, may: s.may, loai: s.loai, gia: s.giaLucRaTinHieu, daLamTheo: s.daLamTheo })),
    realized: (data.laiLoDaChot || []).filter(same).slice(-5)
  };
}

// ---------- Xu hướng ----------
function trendBlock(bars, benchmark) {
  const last = bars.at(-1), n = bars.length;
  const ma = (len, end = n) => n >= len ? r2(I.sma(bars, len, end)) : null;
  const slope = (len) => n >= len + 5 ? pct(I.sma(bars, len, n - 5), I.sma(bars, len, n)) : null;
  const year = bars.slice(-250);
  const hi = Math.max(...year.map((b) => b.high)), lo = Math.min(...year.map((b) => b.low));
  const ret = (s) => n > s ? pct(bars[n - 1 - s].close, last.close) : null;
  const bret = (s) => benchmark.length > s ? pct(benchmark.at(-1 - s).close, benchmark.at(-1).close) : null;
  return {
    date: last.date, close: last.close,
    ma: { ma10: ma(10), ma20: ma(20), ma50: ma(50), ma100: ma(100), ma200: ma(200) },
    closeVsMaPct: { ma10: pct(ma(10), last.close), ma20: pct(ma(20), last.close), ma50: pct(ma(50), last.close), ma200: pct(ma(200), last.close) },
    maSlope5Pct: { ma20: slope(20), ma50: slope(50), ma200: slope(200) },
    returnsPct: { s5: ret(5), s20: ret(20), s60: ret(60), s120: ret(120), s250: ret(250) },
    vsVnIndexPct: { s20: ret(20) !== null && bret(20) !== null ? r2(ret(20) - bret(20)) : null, s60: ret(60) !== null && bret(60) !== null ? r2(ret(60) - bret(60)) : null },
    year: { high: hi, low: lo, fromHighPct: pct(hi, last.close), fromLowPct: pct(lo, last.close) },
    atr14Pct: r2(I.atrPct(bars))
  };
}

// ---------- Hộp giá 1–3 tháng ----------
/* Hộp = khoảng giá đi ngang: đáy/đỉnh lấy phân vị 5%/95% (bỏ râu nến lẻ), rộng 6–25%, trôi ít hơn nửa bề rộng,
   chạm mỗi biên ≥ 2 lần tách biệt. Không đạt → kênh tăng/giảm hoặc không có cấu trúc. Thống kê quá khứ, không phải dự báo. */
function touchEpisodes(bars, hit, gap = 3) {
  const out = []; let lastIdx = -Infinity;
  bars.forEach((b, i) => { if (hit(b)) { if (i - lastIdx > gap) out.push(i); lastIdx = i; } });
  return out;
}
function boxFor(bars, w) {
  const win = bars.slice(-w); if (win.length < w) return null;
  const floor = toTick(quantile(win.map((b) => b.low), 0.05)), top = toTick(quantile(win.map((b) => b.high), 0.95));
  const width = pct(floor, top), band = (top - floor) * 0.15;
  const bottoms = touchEpisodes(win, (b) => b.low <= floor + band), tops = touchEpisodes(win, (b) => b.high >= top - band);
  const drift = Math.abs(pct(win[0].close, win.at(-1).close));
  const isBox = width >= BOX_MIN_WIDTH && width <= BOX_MAX_WIDTH && drift < width * 0.5 && bottoms.length >= 2 && tops.length >= 2;
  const close = win.at(-1).close;
  return { sessions: w, from: win[0].date, floor, top, widthPct: width, driftPct: drift, isBox,
    bottomTouches: bottoms.map((i) => win[i].date), topTouches: tops.map((i) => win[i].date),
    positionPct: top > floor ? Math.round((close - floor) / (top - floor) * 100) : null,
    shape: isBox ? "hộp" : pct(win[0].close, close) > width * 0.5 ? "kênh tăng" : pct(win[0].close, close) < -width * 0.5 ? "kênh giảm" : "không rõ cấu trúc" };
}
// Đếm trên 1 năm: mỗi lần giá chạm đáy/đỉnh của hộp trượt 40 phiên trước đó, 10 phiên sau ra sao.
function boxStats(bars) {
  const res = { bottom: { bounce: 0, broke: 0, flat: 0, cases: [] }, top: { reject: 0, broke: 0, flat: 0, cases: [] } };
  const start = Math.max(STAT_LOOKBACK, bars.length - 250);
  let skipB = -1, skipT = -1;
  for (let t = start; t < bars.length - 1; t += 1) {
    const prior = bars.slice(t - STAT_LOOKBACK, t);
    const floor = quantile(prior.map((b) => b.low), 0.05), top = quantile(prior.map((b) => b.high), 0.95);
    const width = top - floor;
    if (!(width > 0) || pct(floor, top) > BOX_MAX_WIDTH) continue;
    const fwd = bars.slice(t + 1, t + 1 + STAT_FORWARD), b = bars[t];
    const outcome = (good, bad) => { for (const x of fwd) { if (bad(x)) return "broke"; if (good(x)) return "ok"; } return fwd.length < STAT_FORWARD ? "open" : "flat"; };
    if (t > skipB && b.low <= floor + width * 0.15) {
      const o = outcome((x) => x.high >= floor + width * 0.5, (x) => x.close < floor * 0.98);
      if (o !== "open") { res.bottom[o === "ok" ? "bounce" : o]++; res.bottom.cases.push({ date: b.date, floor: r2(floor), result: o === "ok" ? "bật lên giữa hộp" : o === "broke" ? "thủng đáy" : "lình xình" }); }
      skipB = t + 5;
    }
    if (t > skipT && b.high >= top - width * 0.15) {
      const o = outcome((x) => x.low <= top - width * 0.5, (x) => x.close > top * 1.02);
      if (o !== "open") { res.top[o === "ok" ? "reject" : o]++; res.top.cases.push({ date: b.date, top: r2(top), result: o === "ok" ? "quay đầu về giữa hộp" : o === "broke" ? "vượt đỉnh" : "lình xình" }); }
      skipT = t + 5;
    }
  }
  res.bottom.cases = res.bottom.cases.slice(-6); res.top.cases = res.top.cases.slice(-6);
  return res;
}
// Nhịp đáy → đỉnh → đáy trong hộp đang chạy (số phiên trung bình mỗi chân sóng).
function boxRhythm(box) {
  if (!box?.isBox) return null;
  const marks = [...box.bottomTouches.map((d) => ({ d, k: "đáy" })), ...box.topTouches.map((d) => ({ d, k: "đỉnh" }))].sort((a, b) => a.d.localeCompare(b.d));
  const legs = []; for (let i = 1; i < marks.length; i += 1) if (marks[i].k !== marks[i - 1].k) legs.push(Math.round((Date.parse(marks[i].d) - Date.parse(marks[i - 1].d)) / 86400000 * 5 / 7));
  return { sequence: marks.map((m) => m.k + " " + m.d), avgLegSessions: legs.length ? Math.round(legs.reduce((a, b) => a + b, 0) / legs.length) : null, lastMark: marks.at(-1) || null };
}

// ---------- Khối lượng ----------
function volumeBlock(bars, box) {
  const n = bars.length, avg = (end, len = 20) => bars.slice(Math.max(0, end - len), end).reduce((s, b) => s + b.volume, 0) / Math.min(len, end);
  const last20 = bars.slice(-20);
  const upVol = last20.filter((b, i) => b.close > (bars[n - 20 + i - 1]?.close ?? b.open)).reduce((s, b) => s + b.volume, 0);
  const downVol = last20.filter((b, i) => b.close < (bars[n - 20 + i - 1]?.close ?? b.open)).reduce((s, b) => s + b.volume, 0);
  const spikes = [];
  for (let i = Math.max(21, n - 60); i < n; i += 1) {
    const ratio = bars[i].volume / avg(i);
    if (ratio < 2) continue;
    const zone = box && box.top > box.floor ? (bars[i].close - box.floor) / (box.top - box.floor) : null;
    spikes.push({ date: bars[i].date, volumeX: r2(ratio), changePct: pct(bars[i - 1].close, bars[i].close), close: bars[i].close,
      zone: zone === null ? null : zone >= 0.75 ? "gần đỉnh hộp" : zone <= 0.25 ? "gần đáy hộp" : "giữa hộp",
      after5Pct: i + 5 < n ? pct(bars[i].close, bars[i + 5].close) : null });
  }
  return { avg20Shares: Math.round(avg(n)), avg20ValueBn: r2(I.valueAverage20(bars) / 1e9), lastX: r2(bars.at(-1).volume / avg(n - 1)),
    upDownRatio20: downVol > 0 ? r2(upVol / downVol) : null, spikes };
}

// ---------- Khối ngoại 20 phiên ----------
function foreignBlock(rows, bars) {
  if (!rows?.length) return { status: "missing" };
  const last20 = rows.slice(-20), last = rows.at(-1);
  return { five: foreignFlow(rows, bars), net20Bn: r2(last20.reduce((s, r) => s + r.netVal, 0) / 1e9),
    buyDays20: last20.filter((r) => r.netVal > 0).length, sellDays20: last20.filter((r) => r.netVal < 0).length,
    roomPct: last.totalRoom > 0 ? r2(last.currentRoom / last.totalRoom * 100) : null,
    daily: rows.slice(-10).map((r) => ({ date: r.date, netBn: r2(r.netVal / 1e9) })) };
}

// ---------- Công bố thông tin HNX (chỉ tiêu đề có mã) ----------
async function hnxDisclosures(ticker) {
  const out = [];
  for (const url of HNX_FEEDS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { accept: "*/*", "user-agent": "Fin2-Review/1.0" } });
      if (!res.ok) continue;
      parseFeed(await res.text()).filter((n) => new RegExp(`\\b${ticker}\\b`).test(n.title)).forEach((n) => out.push(n));
    } catch (_) { /* nguồn phụ, lỗi thì bỏ qua */ }
  }
  return out.slice(0, 10);
}

// ---------- Luật cứng owner đã chốt ----------
function hardRules(ledger, side, clock, levels) {
  const pos = ledger.position, rules = [];
  if (clock.inSession) rules.push("Đang trong phiên 9:00–15:00: KHÔNG ra khuyến nghị mới (kỷ luật 16/10/2026). Chỉ review để ghi nhận, lệnh để kế hoạch tối nay.");
  if (pos && pos.giaVonTB > 0) {
    rules.push(`Không bao giờ bán lỗ: giá bán ≥ ${r2(pos.giaVonTB * 1.01)} (giá vốn TB ${r2(pos.giaVonTB)} +1%).`);
    rules.push(`Mua thêm theo T+/cung cầu chỉ ≤ ${r2(pos.giaVonTB * 0.99)} (giá vốn −1%). Ngoại lệ: máy MA được mua trên giá vốn.`);
    if (pos.coTheBan < pos.soLuong) rules.push(`Còn ${pos.soLuong - pos.coTheBan} CP chưa về (T+2): không mua thêm tới khi hàng về; bán tối đa ${pos.coTheBan} CP.`);
  }
  if (ledger.decision?.hold) rules.push("Mã đang gắn Giữ: không gợi ý bán.");
  if (side === "buy" && ledger.plan?.thiTruongYeu) rules.push("VN-Index đang yếu: dừng mua T+ (kể cả mã theo dõi), chỉ còn mua theo MA.");
  if (side === "buy" && ledger.cash) rules.push(`Tiền mặt sau lệnh phải ≥ ${ledger.cash.mucTieu?.toiThieu ?? 20}% tổng tài sản (hiện ${ledger.cash.tyLeTienMatPct}%).`);
  if (!ledger.plan?.items?.length) rules.push("Mã KHÔNG có trong kế hoạch phiên sắp tới → lệnh tự phát. Đồng ý thì chỉ được đề xuất đưa vào kế hoạch/watchlist, không đặt ngay.");
  rules.push("Hộp giá chỉ tinh chỉnh giá trong 3% quanh mốc T+/MA, không tự sinh lệnh.");
  return { rules, levels: { buyAt: r2(levels.buyAt), sellAt: r2(levels.sellAt) } };
}

async function reviewTicker(ticker, { side = null, data = null, file = null, benchmark, clock, quotes }) {
  const ledger = ledgerFor(data, ticker, file);
  const bars = (await fetchHistory(ticker, HISTORY_DAYS, 3));
  const marketDate = benchmark.at(-1).date;
  const closed = bars.filter((b) => b.date <= marketDate);
  const st = ledger.strategy || { buyDrop: 2, sellRise: 3, maLength: 10, maDays: 5, maMaxDays: 15 };
  const pos = ledger.position, targetBuy = ledger.watch?.giaMuonMua ?? null;
  const levels = tplusLevels(pos && pos.soLuong > 0 ? { avgCost: pos.giaVonTB } : null, st, targetBuy);
  const inferredSide = side || (ledger.plan?.items?.[0]?.loai === "sell" ? "sell" : "buy");
  const [foreignMap, nqs, disclosures, analysis] = await Promise.all([
    fetchForeign([ticker], marketDate), fetchNqsHistory(ticker).catch((e) => ({ error: String(e.message || e) })),
    hnxDisclosures(ticker), analyzeTicker({ ticker, config: normalizeConfig(), fetchHistory, fetchForeign, mapWithConcurrency }).catch((e) => ({ error: String(e.message || e) }))
  ]);
  const boxes = BOX_WINDOWS.map((w) => boxFor(closed, w)).filter(Boolean);
  const active = [...boxes].reverse().find((b) => b.isBox) || null;
  const ms = maStreak(closed, st.maLength || 10);
  const quote = quotes.get(ticker) || null;
  return {
    ticker, side: inferredSide, generatedAt: new Date().toISOString(), clock, marketDate,
    dataNote: "Giá nghìn đ/CP; tiền tỷ đ (Bn) trừ chỗ ghi đồng. Chỉ phiên đã đóng cửa vào xu hướng/hộp; quote là giá sống VPS.",
    quote: quote && { price: quote.price, refPrice: quote.refPrice, changePct: pct(quote.refPrice, quote.price), totalVolume: quote.totalVolume, bids: quote.bids, asks: quote.asks },
    ledger,
    levels: { tplus: { buyAt: r2(levels.buyAt), sellAt: r2(levels.sellAt) }, sessionLevels: sessionLevels(bars, clock.date) },
    trend: trendBlock(closed, benchmark),
    ma: ms && { ...ms, inZone: maInZone(ms.streak, ms.rise, { maDays: st.maDays || 5, maMaxDays: st.maMaxDays || 15 }), strategy: { len: st.maLength, days: st.maDays, maxDays: st.maMaxDays } },
    box: { windows: boxes, active, rhythm: boxRhythm(active), history1y: boxStats(closed) },
    volume: volumeBlock(closed, active || boxes.at(-1)),
    foreign: foreignBlock(foreignMap.get(ticker), closed),
    orderBookHistory: nqs,
    opportunity: analysis?.error ? analysis : { score: analysis.score && { total: analysis.score.totalScore, reasons: analysis.score.reasons, riskFlags: analysis.score.riskFlags }, peers: analysis.comparison },
    disclosuresHnx: disclosures,
    hard: hardRules(ledger, inferredSide, clock, levels)
  };
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const file = findExport(opt("--export"));
  const data = file ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
  let tickers = args.filter((a, i) => /^[A-Za-z0-9]{3}$/.test(a) && !["--side", "--export"].includes(args[i - 1])).map((a) => a.toUpperCase());
  if (args.includes("--plan")) {
    if (!data?.keHoachSapToi) throw new Error("File xuất chưa có keHoachSapToi — xuất lại dữ liệu từ app bản mới.");
    tickers = [...new Set(data.keHoachSapToi.cacMuc.map((x) => x.ma))];
  }
  if (!tickers.length) throw new Error("Cần mã cổ phiếu, ví dụ: node functions/review-ma.js FPT");
  const clock = vnClock();
  // Trước 15:00 nến hôm nay còn đang chạy → bỏ khỏi xu hướng/hộp (chỉ phiên đã đóng cửa), giá sống nằm ở quote.
  const benchmark = (await fetchHistory("VNINDEX", HISTORY_DAYS, 3)).filter((b) => b.date < clock.date || clock.hhmm >= "1500");
  const quotes = await fetchVpsQuotes([...tickers, "VNINDEX"]).catch(() => new Map());
  const market = trendBlock(benchmark, benchmark);
  const results = await mapWithConcurrency(tickers, 2, (tk) => reviewTicker(tk, { side: opt("--side"), data, file, benchmark, clock, quotes }));
  const out = { market: { vnIndex: market, weakFlag: data?.keHoachSapToi?.thiTruongYeu ?? null },
    reviews: results.map((r, i) => r.ok ? r.value : { ticker: tickers[i], error: String(r.error?.message || r.error) }) };
  process.stdout.write(JSON.stringify(out, null, 1));
}

if (require.main === module) main().catch((e) => { console.error("Lỗi:", e.message || e); process.exit(1); });
module.exports = { boxFor, boxStats, boxRhythm, volumeBlock, trendBlock };
