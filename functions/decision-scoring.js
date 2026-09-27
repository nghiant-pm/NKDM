"use strict";

// Chỉ server chấm: client đọc kết quả, không có bản sao công thức.
const { decisionInputs: I } = require("./scoring");
const VERSION = "decision-v1.1.0";
/* Ngưỡng CỐ ĐỊNH theo phiên bản công thức, cố ý không đọc tab Chiến lược: đang chạy bóng, đổi giữa chừng
   thì mẫu trước/sau không so được. Muốn đổi → nâng VERSION (bộ đếm 20 phiên chạy lại).
   Điểm lưu thang 0–100; app hiển thị ÷10 (thang 10). */
const POLICY = Object.freeze({ threshold: 80, winPct: 6, lossPct: 3, sessions: 20, minLiquidity: 20e9,
  buyWeights: { market: 25, trend: 20, pullback: 20, confirmation: 10, price: 10, risk: 10 },
  sellWeights: { trend: 25, relative: 20, distribution: 20, heat: 15, profit: 15 }, newsLimit: 5 });

// Rổ ngành nội bộ, bình quân ngang trọng số; không giả danh chỉ số ngành chính thức.
const SECTORS = {
  "Ngân hàng": "ACB BID CTG EIB HDB LPB MBB MSB OCB SHB SSB STB TCB TPB VCB VPB",
  "Chứng khoán": "BSI CTS FTS HCM MBS ORS SHS SSI VCI VIX VND",
  "Bất động sản": "BCM CRE DIG DXG DXS HDG KBC KDH KHG NLG NTL NVL PDR SCR SJS SZC TCH VHM VIC VPI VRE",
  "Thép": "HPG HSG NKG", "Hóa chất": "DCM DGC DPM",
  "Bán lẻ": "DGW FRT MWG PET PNJ", "Công nghệ": "CMG ELC FPT",
  "Vận tải": "GMD HAH HVN PVT VJC VSC", "Dầu khí": "GAS PLX PVD PVS",
  "Điện": "GEX PC1 POW REE", "Xây dựng": "CII CTD DPG FCN HHV LCG VCG",
  "Thực phẩm": "ASM BAF DBC MSN NAF PAN SAB VNM", "Thủy sản": "ANV VHC",
  "Nhựa": "AAA APH BMP", "Giấy": "DHC", "Khác": "BVH EVF IDC KSB TLG YEG"
};
const clamp = (n, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
function sectorFor(ticker) {
  return Object.keys(SECTORS).find((key) => key !== "Khác" && SECTORS[key].split(" ").includes(ticker)) || null;
}
function sectorContext(ticker, histories, benchmark) {
  const name = sectorFor(ticker);
  const peers = name ? SECTORS[name].split(" ").filter((tk) => tk !== ticker && histories.has(tk)) : [];
  const valid = peers.map((tk) => ({ ticker: tk, bars: histories.get(tk) }))
    .filter((p) => p.bars.length >= 60 && p.bars.at(-1).date === benchmark.at(-1).date);
  if (valid.length < 2) return { name, available: false, peers: valid.map((p) => p.ticker), return20Pct: null, strength: 0 };
  const excess = I.average(valid.map((p) => I.returnForBars(p.bars, 20) - I.alignBenchmarkReturn(p.bars, benchmark, 20)));
  const above = valid.filter((p) => p.bars.at(-1).close > I.sma(p.bars, 20)).length / valid.length;
  return { name, available: true, peers: valid.map((p) => p.ticker),
    return20Pct: I.round(I.average(valid.map((p) => I.returnForBars(p.bars, 20)))),
    strength: I.round((excess >= 4 ? 6 : excess >= 0 ? 4 : excess >= -3 ? 2 : 0) + above * 4) };
}
function newsAdjustment(items, date) {
  const seen = new Set();
  const used = items.filter((n) => {
    const age = (Date.parse(date + "T23:59:59+07:00") - Date.parse(n.publishedAt)) / 86400000;
    const key = n.eventKey || n.url;
    if (!n.verified || n.confidence < 0.8 || !Number.isFinite(age) || age < 0 || age > 20 || seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a,b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0,20).map((n) => {
    const age = Math.max(0, (Date.parse(date + "T23:59:59+07:00") - Date.parse(n.publishedAt)) / 86400000);
    return { ...n, impact: I.round(clamp(n.baseImpact || 0, -5, 5) * Math.max(0, 1 - age / 20), 1) };
  });
  return { impact: I.round(clamp(used.reduce((sum, n) => sum + n.impact, 0), -5, 5), 1), items: used };
}
function scoreDecision({ ticker, bars, benchmark, sector, position, targetBuy, strategy, news = [], phase }) {
  const valid = (rows) => Array.isArray(rows) && rows.length >= 60 && rows.every((b) =>
    [b.open, b.high, b.low, b.close, b.volume].every(Number.isFinite) && b.close > 0 && b.volume >= 0);
  if (!valid(bars) || !valid(benchmark) || bars.at(-1).date !== benchmark.at(-1).date) return null;
  const current = bars.at(-1), prior = bars.at(-2), trend = I.trendScore(bars);
  const relative = I.relativeStrengthScore(bars, benchmark), pullback = I.pullbackScore(bars, trend);
  const breakout = I.breakoutScore(bars), marketTrend = I.trendScore(benchmark);
  if (relative.excess20 === null) return null;
  const atr = I.atrPct(bars), liquidity = I.valueAverage20(bars);
  const held = position && position.qty > 0;
  const avgCost = held ? position.avgCost : null;
  const buyPoint = held ? avgCost - strategy.buyDrop : targetBuy;
  const buyPct = held && strategy.buyDropPct ? avgCost * (1 - strategy.buyDropPct / 100) : null;
  const buyAt = buyPct === null ? buyPoint : Math.max(buyPoint, buyPct);
  const sellAt = held ? Math.min(avgCost + strategy.sellRise,
    strategy.sellRisePct ? avgCost * (1 + strategy.sellRisePct / 100) : Infinity) : null;
  const priceGap = Number.isFinite(buyAt) && buyAt > 0 ? (current.close / buyAt - 1) * 100 : null;
  const newsState = newsAdjustment(news, current.date);
  const buyParts = {
    // Thiếu dữ liệu rổ ngành: VN-Index gánh trọn 25 điểm, không phạt mã ngoài rổ.
    market: I.round(sector.available ? marketTrend.score / 25 * 15 + sector.strength : marketTrend.score),
    trend: I.round(trend.score / 25 * 12 + relative.score / 25 * 8),
    pullback: I.round(pullback.score / 25 * 20),
    confirmation: (current.close > prior.close ? 4 : 0) + (current.close >= current.open ? 2 : 0) +
      (breakout.volumeRatio >= 1.2 ? 4 : breakout.volumeRatio >= 0.8 ? 2 : 0),
    price: priceGap === null ? 0 : priceGap <= 0 ? 10 : priceGap <= 2 ? 8 : priceGap <= 5 ? 5 : 0,
    risk: (liquidity >= POLICY.minLiquidity ? 5 : liquidity >= 5e9 ? 2 : 0) + (atr <= 2.5 ? 5 : atr <= 4 ? 3 : atr <= 6 ? 1 : 0)
  };
  const riskFlags = [];
  if (!sector.available) riskFlags.push("Chưa đủ dữ liệu rổ ngành");
  if (trend.score < 15) riskFlags.push("Xu hướng yếu — nguy cơ bắt dao rơi");
  if (marketTrend.score < 15) riskFlags.push("VN-Index đang yếu");
  if (liquidity < POLICY.minLiquidity) riskFlags.push("Thanh khoản TB20 dưới 20 tỷ đồng");
  if (atr > 6) riskFlags.push("Biến động ATR14 trên 6%");
  let buyScore = clamp(Math.round(Object.values(buyParts).reduce((a, b) => a + b, 0) + newsState.impact));
  if (trend.score < 15 || pullback.score < 10 || liquidity < POLICY.minLiquidity) buyScore = Math.min(75, buyScore);
  const sellEligible = held && current.close > avgCost;
  const distanceMA = (current.close / trend.ma20 - 1) * 100;
  const distribution = bars.slice(-5).filter((b, i, rows) => {
    const prev = i ? rows[i - 1] : bars[bars.length - 6];
    return b.close < prev.close && b.volume >= I.average(bars.slice(-21, -1).map((x) => x.volume)) * 1.2;
  }).length;
  const sellParts = sellEligible ? {
    trend: 25 - trend.score,
    relative: I.round((25 - relative.score) / 25 * 20),
    distribution: Math.min(20, distribution * 7),
    heat: distanceMA >= 10 ? 15 : distanceMA >= 6 ? 10 : atr > 6 ? 8 : 0,
    profit: current.close >= sellAt ? 15 : I.round(clamp((current.close - avgCost) / (sellAt - avgCost), 0, 1) * 15)
  } : null;
  const sellScore = sellParts ? clamp(Math.round(Object.values(sellParts).reduce((a, b) => a + b, 0) - newsState.impact)) : null;
  // Chữ hiển thị thẳng trong app → cùng thang 10 và cách viết số Việt Nam như phần điểm.
  const vn = (n) => Number(n).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  const on10 = (n25) => vn(n25 / 2.5) + "/10";
  const reasons = [
    `VN-Index ${on10(marketTrend.score)} · ${sector.name || "Ngành chưa xác định"} ${sector.available ? vn(sector.strength) + "/10" : "thiếu dữ liệu"}`,
    `Xu hướng ${on10(trend.score)} · ${relative.excess20 >= 0 ? "mạnh" : "yếu"} hơn VN-Index ${vn(Math.abs(relative.excess20))}%`,
    `Nhịp điều chỉnh ${on10(pullback.score)} · khối lượng ${vn(breakout.volumeRatio)}× TB20`
  ];
  return { ticker, date: current.date, phase, scoreVersion: VERSION, threshold: POLICY.threshold, buyScore, sellScore, buyParts, sellParts,
    reasons, riskFlags, newsImpact: newsState.impact, news: newsState.items, sector,
    close: current.close, avgCost, targetBuy: Number.isFinite(targetBuy) ? targetBuy : null,
    qty: held ? position.qty : 0, hold: !!position?.hold,
    strategy: { id: strategy.id || null, buyDrop: strategy.buyDrop, sellRise: strategy.sellRise,
      buyDropPct: strategy.buyDropPct || null, sellRisePct: strategy.sellRisePct || null },
    market: { trend: marketTrend.score, ma20: I.round(trend.ma20), ma50: I.round(trend.ma50),
      atr14Pct: I.round(atr), avgValue20: Math.round(liquidity), excess20Pct: I.round(relative.excess20),
      distributionDays: distribution },
    conflict: buyScore >= POLICY.threshold && sellScore !== null && sellScore >= POLICY.threshold };
}
function rankDecisions(rows) {
  const rank = (key) => new Map(rows.filter((r) => Number.isFinite(r[key]))
    .sort((a, b) => b[key] - a[key] || a.ticker.localeCompare(b.ticker)).map((r, i) => [r.ticker, i + 1]));
  const buy = rank("buyScore"), sell = rank("sellScore");
  return rows.map((r) => ({ ...r, buyRank: buy.get(r.ticker), sellRank: sell.get(r.ticker) || null }));
}
function evaluateDecision(event, bars) {
  const policy = event.policy;
  const future = bars.filter((b) => b.date > event.date).slice(0, policy.sessions);
  const sell = event.kind === "sell";
  // Đối xứng hai chiều: Mua đúng khi giá lên winPct, Bán đúng khi giá xuống winPct; sai khi đi ngược lossPct.
  const up = event.close * (1 + (sell ? policy.lossPct : policy.winPct) / 100);
  const down = event.close * (1 - (sell ? policy.winPct : policy.lossPct) / 100);
  let primary = "pending", resolvedDate = null;
  for (const b of future) {
    const hitUp = b.high >= up, hitDown = b.low <= down;
    if (hitUp && hitDown) primary = "indeterminate";
    else if (hitUp) primary = sell ? "loss" : "win";
    else if (hitDown) primary = sell ? "win" : "loss";
    if (primary !== "pending") { resolvedDate = b.date; break; }
  }
  if (primary === "pending" && future.length >= policy.sessions) primary = "timeout";
  const returnPct = future.length ? I.pctChange(event.close, future.at(-1).close) * (sell ? -1 : 1) : null;
  return { primary, resolvedDate, sessionsObserved: future.length, complete: future.length >= policy.sessions,
    effectPct: I.round(returnPct) };
}
module.exports = { VERSION, POLICY, SECTORS, sectorFor, sectorContext, newsAdjustment, scoreDecision, rankDecisions, evaluateDecision };
