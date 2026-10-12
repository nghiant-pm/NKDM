"use strict";

const VERSION = "orderflow-v2.1.0";
/* v2.0.0 (owner chốt 08/10/2026): máy cung cầu là LỚP TINH CHỈNH trên mốc T+, không tự đặt mốc riêng.
   Mốc mua = giá vốn − buyDrop (mã watchlist: giá kỳ vọng), mốc bán = giá vốn + sellRise, theo activeStrategy.
   Bên mua: lực bán trong ngày còn mạnh → "wait" (chờ giá tốt hơn, mức đỡ dưới mốc) · không → "now" (mua ngay).
   Bên bán: cầu còn mạnh → "hold" (giữ thêm, mức cản trên mốc) · không → "now" (bán ngay).
   Giá "now" không bao giờ kém hơn mốc T+: mua ≤ mốc, bán ≥ mốc.
   v2.1.0 (owner chốt 09/10/2026): nền các phiên trước làm mới mỗi ngày, ưu tiên dữ liệu tự thu (Người Quan Sát bù phiên thiếu);
   khung 30 phút nối qua nghỉ trưa; từ phút thứ provisionalMinutes có nhận xét SƠ BỘ = trộn hôm nay với nền theo tỷ lệ
   số phút đã có / 30. Không nối qua ngày: sổ lệnh qua đêm đã xoá, ngày trước chỉ làm nền. */
const POLICY = Object.freeze({
  windowMinutes: 30,
  provisionalMinutes: 15,
  minCoverage: 0.8,
  minSeedSessions: 5,
  // Nền mỗi phiên quy về độ nghiêng −1 (bán) … +1 (mua). Phiên tự thu đủ ownMinSamples mẫu: khớp chủ động cả ngày + cân bằng
  // sổ lệnh 3 mức; thiếu thì dư mua/dư bán + cỡ lệnh TB của Người Quan Sát. Phiên gần hơn nặng hơn (1…5).
  // Đủ 30 phút: nền chỉ cộng/trừ tối đa adjustMax điểm như v2.0.0; sơ bộ: nền chiếm thêm (1 − số phút/30) của điểm.
  baseline: { ownMinSamples: 150, execution: 0.6, book: 0.4, nqsRemaining: 0.7, nqsOrderSize: 0.3, adjustMax: 5 },
  // "Còn mạnh" = điểm phe đó ≥ pressureThreshold, hơn phe kia ≥ pressureGap và giữ ưu thế 3/5 mẫu gần nhất.
  pressureThreshold: 60,
  pressureGap: 10,
  clearSamples: 3,
  persistenceSamples: 5,
  persistenceHits: 3,
  maxSpoofRisk: 40,
  // Sàn an toàn giữ từ v1.1.0: KHÔNG BAO GIỜ khuyến nghị bán lỗ — giá bán ≥ giá vốn +1% kể cả khi mốc T+ đặt thấp hơn;
  // mã đang giữ chỉ mua thêm ≤ giá vốn −1%.
  minProfitPct: 1,
  // Giá tốt hơn lấy trong vùng cách mốc tối đa zoneMaxPct: mức khớp nhiều trong phiên (≥ zoneMinShare khối lượng ngày),
  // lệnh treo bền 3/5 mẫu, đáy/đỉnh + mức khối lượng lớn 5/20 phiên. Trùng nhiều nguồn thì cộng trọng số;
  // giá đề xuất = mức nặng nhất, bằng nhau thì gần mốc hơn (dễ khớp hơn).
  zoneMaxPct: 3,
  zoneMinShare: 0.1,
  zoneWeights: { wall: 0.15, session: 0.3 },
  sessionLookback: 20,
  weights: { imbalance: 30, persistence: 25, execution: 25, absorption: 20 },
  swing: { winPct: 6, lossPct: 3, sessions: 20 }
});

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round = (value, digits = 2) => {
  const scale = 10 ** digits;
  return Math.round((value + Number.EPSILON) * scale) / scale;
};
const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const unit = (signed) => clamp((signed + 1) / 2, 0, 1);
const sideScore = (parts, side) => round(Object.entries(POLICY.weights).reduce((sum, [key, weight]) =>
  sum + unit(side === "buy" ? parts[key] : -parts[key]) * weight, 0), 1);

function parseLevel(value) {
  if (typeof value !== "string") return null;
  const [priceRaw, quantityRaw] = value.split("|");
  const price = Number(priceRaw), quantity = Number(quantityRaw);
  return Number.isFinite(price) && price > 0 && Number.isFinite(quantity) && quantity >= 0
    ? { price, quantity } : null;
}

function parseVpsQuote(row, capturedAt = new Date().toISOString()) {
  if (!row || !/^[A-Z0-9]{3,10}$/.test(String(row.sym || ""))) return null;
  const bids = [row.g1, row.g2, row.g3].map(parseLevel).filter(Boolean);
  const asks = [row.g4, row.g5, row.g6].map(parseLevel).filter(Boolean);
  const price = Number(row.lastPrice || row.r);
  // Nằm sàn thì bên mua trống, nằm trần thì bên bán trống — vẫn là dữ liệu thật, chỉ loại khi trống cả hai.
  if (!Number.isFinite(price) || price <= 0 || (!bids.length && !asks.length)) return null;
  return {
    ticker: String(row.sym), capturedAt, price,
    refPrice: Number.isFinite(Number(row.r)) ? Number(row.r) : null,
    totalVolume: Number.isFinite(Number(row.lot)) ? Number(row.lot) : null,
    lastVolume: Number.isFinite(Number(row.lastVolume)) ? Number(row.lastVolume) : null,
    side: row.side === "B" || row.side === "S" ? row.side : null,
    bids, asks
  };
}

function depth(levels) {
  const weights = [1, 0.65, 0.4];
  return levels.reduce((sum, level, index) => sum + level.quantity * (weights[index] || 0.25), 0);
}

function imbalance(sample) {
  const bid = depth(sample.bids || []), ask = depth(sample.asks || []);
  return bid + ask > 0 ? (bid - ask) / (bid + ask) : 0;
}

function levelDelta(previous, current, side, index) {
  const old = previous?.[side]?.[index], next = current?.[side]?.[index];
  if (!old && !next) return 0;
  if (!old) return next.quantity;
  if (!next) return -old.quantity;
  if (side === "bids") {
    if (next.price > old.price) return next.quantity;
    if (next.price < old.price) return -old.quantity;
  } else {
    if (next.price < old.price) return next.quantity;
    if (next.price > old.price) return -old.quantity;
  }
  return next.quantity - old.quantity;
}

function multiLevelFlow(samples) {
  if (samples.length < 2) return 0;
  const weights = [1, 0.65, 0.4];
  const values = [];
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1], current = samples[index];
    let flow = 0;
    for (let level = 0; level < 3; level += 1) {
      flow += (levelDelta(previous, current, "bids", level) - levelDelta(previous, current, "asks", level)) * weights[level];
    }
    const base = (depth(previous.bids || []) + depth(previous.asks || []) + depth(current.bids || []) + depth(current.asks || [])) / 2;
    values.push(base > 0 ? Math.tanh(flow / base * 2) : 0);
  }
  return clamp(average(values), -1, 1);
}

function persistence(samples) {
  const recent = samples.slice(-POLICY.persistenceSamples);
  const signs = recent.map((sample) => Math.sign(imbalance(sample)));
  const buyHits = signs.filter((value) => value > 0).length;
  const sellHits = signs.filter((value) => value < 0).length;
  return {
    signed: recent.length ? (buyHits - sellHits) / recent.length : 0,
    buyHits, sellHits,
    enoughBuy: buyHits >= POLICY.persistenceHits,
    enoughSell: sellHits >= POLICY.persistenceHits
  };
}

function executionFlow(samples) {
  let buy = 0, sell = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const current = samples[index], previous = samples[index - 1];
    const delta = Number.isFinite(current.totalVolume) && Number.isFinite(previous.totalVolume)
      ? Math.max(0, current.totalVolume - previous.totalVolume) : Math.max(0, Number(current.lastVolume || 0));
    if (current.side === "B") buy += delta;
    if (current.side === "S") sell += delta;
  }
  return buy + sell > 0 ? (buy - sell) / (buy + sell) : 0;
}

function absorption(samples) {
  if (samples.length < 2) return 0;
  const first = samples[0], last = samples.at(-1);
  const move = first.price > 0 ? clamp((last.price / first.price - 1) * 50, -1, 1) : 0;
  const book = average(samples.slice(-5).map(imbalance));
  // Cùng chiều được điểm xác nhận; ngược chiều nhẹ được xem là hấp thụ, ngược mạnh là cảnh báo.
  if (Math.sign(move) === Math.sign(book)) return clamp((move + book) / 2, -1, 1);
  return clamp(book * 0.65 + move * 0.35, -1, 1);
}

function removedWithoutTrade(previous, current, side) {
  const currentByPrice = new Map((current[side] || []).map((level) => [level.price, level.quantity]));
  const removed = (previous[side] || []).reduce((sum, level) => {
    const remaining = currentByPrice.get(level.price) || 0;
    return sum + Math.max(0, level.quantity - remaining);
  }, 0);
  const total = (previous[side] || []).reduce((sum, level) => sum + level.quantity, 0);
  const traded = Number.isFinite(current.totalVolume) && Number.isFinite(previous.totalVolume)
    ? Math.max(0, current.totalVolume - previous.totalVolume) : Number(current.lastVolume || 0);
  if (total <= 0 || removed / total < 0.4 || traded >= removed * 0.1) return 0;
  return clamp((removed / total - 0.4) / 0.6, 0, 1);
}

function spoofRisk(samples, side) {
  if (samples.length < 2) return 0;
  const values = [];
  for (let index = 1; index < samples.length; index += 1) {
    values.push(removedWithoutTrade(samples[index - 1], samples[index], side === "buy" ? "bids" : "asks"));
  }
  // Một lần tường lệnh biến mất là đủ để cảnh báo; lấy đỉnh thay vì pha loãng vào 30 mẫu.
  return round(clamp(Math.max(...values, 0) * 100), 1);
}

function persistentLevels(samples, side) {
  const recent = samples.slice(-POLICY.persistenceSamples);
  const counts = new Map();
  recent.forEach((sample) => (sample[side] || []).forEach((level) => counts.set(level.price, (counts.get(level.price) || 0) + 1)));
  return [...counts.entries()].filter(([, hits]) => hits >= POLICY.persistenceHits).map(([price]) => price);
}

// Bước giá HOSE: <10 → 0,01 · 10–<50 → 0,05 · ≥50 → 0,1 (nghìn đ). Giá lịch sử VNDirect đã điều chỉnh nên bị lẻ.
const tickSize = (price) => price < 10 ? 0.01 : price < 50 ? 0.05 : 0.1;
const toTick = (price) => round(Math.round(price / tickSize(price)) * tickSize(price), 2);
// Giá "ngay" làm tròn về phía có lợi cho owner: mua tròn xuống, bán tròn lên — không bao giờ kém mốc T+.
const tickFloor = (price) => round(Math.floor(round(price / tickSize(price), 6)) * tickSize(price), 2);
const tickCeil = (price) => round(Math.ceil(round(price / tickSize(price), 6)) * tickSize(price), 2);

// Khối lượng khớp trong ngày dồn vào giá của phút đó (mẫu phút chỉ biết giá cuối phút nên là ước lượng).
function volumeProfile(samples) {
  const profile = new Map();
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1], current = samples[index];
    if (!Number.isFinite(current.totalVolume) || !Number.isFinite(previous.totalVolume)) continue;
    const traded = Math.max(0, current.totalVolume - previous.totalVolume);
    if (traded > 0) profile.set(current.price, (profile.get(current.price) || 0) + traded);
  }
  return profile;
}

// Mốc nhiều phiên từ nến ngày TRƯỚC hôm nay: đáy/đỉnh 5 và 20 phiên + 3 giá đóng cửa có khối lượng lớn nhất.
function sessionLevels(bars, today) {
  const past = (bars || []).filter((bar) => bar.date < today).slice(-POLICY.sessionLookback);
  if (past.length < 5) return null;
  const last5 = past.slice(-5);
  const byClose = new Map();
  past.forEach((bar) => { const price = toTick(bar.close); byClose.set(price, (byClose.get(price) || 0) + bar.volume); });
  const nodes = [...byClose.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([price]) => price);
  const low5 = toTick(Math.min(...last5.map((bar) => bar.low))), high5 = toTick(Math.max(...last5.map((bar) => bar.high)));
  const low20 = toTick(Math.min(...past.map((bar) => bar.low))), high20 = toTick(Math.max(...past.map((bar) => bar.high)));
  return { date: today, sessions: past.length, low5, high5, low20, high20, nodes,
    support: [low5, low20, ...nodes], resistance: [high5, high20, ...nodes] };
}

// Vùng giá TỐT HƠN mốc: mua → thấp hơn hẳn base (mức đỡ), bán → cao hơn hẳn base (mức cản), cách base tối đa zoneMaxPct.
function priceZone(side, { base, profile, walls, levels }) {
  if (!Number.isFinite(base) || base <= 0) return null;
  const buy = side === "buy";
  const far = base * (1 + (buy ? -1 : 1) * POLICY.zoneMaxPct / 100);
  const inBand = (price) => Number.isFinite(price) && (buy ? price < base && price >= far : price > base && price <= far);
  const total = [...profile.values()].reduce((sum, value) => sum + value, 0);
  const candidates = new Map();
  const add = (raw, weight, source) => {
    const price = toTick(raw);
    if (!inBand(price)) return;
    const row = candidates.get(price) || { price, weight: 0, sources: [] };
    row.weight += weight;
    if (!row.sources.includes(source)) row.sources.push(source);
    candidates.set(price, row);
  };
  profile.forEach((volume, price) => { if (total > 0 && volume / total >= POLICY.zoneMinShare) add(price, volume / total, "khớp nhiều"); });
  (walls || []).forEach((price) => add(price, POLICY.zoneWeights.wall, "lệnh treo bền"));
  (levels || []).forEach((price) => add(price, POLICY.zoneWeights.session, "mốc nhiều phiên"));
  const rows = [...candidates.values()];
  if (!rows.length) return null;
  const best = rows.slice().sort((a, b) => b.weight - a.weight || Math.abs(a.price - base) - Math.abs(b.price - base))[0];
  return { low: Math.min(...rows.map((row) => row.price)), high: Math.max(...rows.map((row) => row.price)),
    suggested: best.price, sources: best.sources };
}

// Phút GIAO DỊCH: phiên chiều nối liền sau 11:30 (lệnh chờ buổi sáng vẫn còn hiệu lực), mẫu giờ nghỉ trưa dồn về 11:30.
const minuteOf = (sample) => {
  const minute = Math.floor(Date.parse(sample.capturedAt) / 60000);
  const ofDay = ((minute + 420) % 1440 + 1440) % 1440; // giờ Việt Nam
  return minute - (ofDay >= 780 ? 89 : ofDay > 690 ? ofDay - 690 : 0);
};

// Cửa sổ là 30 PHÚT GIAO DỊCH tính tới mẫu mới nhất, không phải 30 mẫu gần nhất — mẫu rơi rớt
// làm tỷ lệ phủ dưới 80% chứ không bị đếm bù.
function recentWindow(samples) {
  const newest = samples.length ? minuteOf(samples.at(-1)) : NaN;
  if (!Number.isFinite(newest)) return [];
  return samples.filter((sample) => {
    const minute = minuteOf(sample);
    return minute > newest - POLICY.windowMinutes && minute <= newest;
  });
}

function coverageFor(samples) {
  if (!samples.length) return { coverage: 0, spanMinutes: 0 };
  const spanMinutes = minuteOf(samples.at(-1)) - minuteOf(samples[0]);
  // Phủ tính trên đoạn đã có (tối đa 30 phút) để nhận xét sơ bộ cũng phải đủ mẫu liên tục.
  const expected = Math.min(POLICY.windowMinutes, spanMinutes + 1);
  return { coverage: Math.min(1, new Set(samples.map(minuteOf)).size / expected), spanMinutes };
}

// Độ nghiêng một phiên tự thu (null = chưa đủ mẫu để tin).
function sessionLean(samples) {
  if (!Array.isArray(samples) || samples.length < POLICY.baseline.ownMinSamples) return null;
  const { execution, book } = POLICY.baseline;
  return round(clamp(executionFlow(samples) * execution + average(samples.map(imbalance)) * book, -1, 1), 3);
}
function nqsLean(row) {
  const buy = Number(row?.buyRemaining || 0), sell = Number(row?.sellRemaining || 0);
  const sizeBuy = Number(row?.avgBuyOrder || 0), sizeSell = Number(row?.avgSellOrder || 0);
  const remaining = buy + sell > 0 ? (buy - sell) / (buy + sell) : 0;
  const orderSize = sizeBuy + sizeSell > 0 ? (sizeBuy - sizeSell) / (sizeBuy + sizeSell) : 0;
  return round(remaining * POLICY.baseline.nqsRemaining + orderSize * POLICY.baseline.nqsOrderSize, 3);
}
function baselineLean(sessions) {
  const rows = (sessions || []).filter((row) => row?.date).slice().sort((a, b) => a.date < b.date ? -1 : 1);
  if (!rows.length) return 0;
  let sum = 0, weights = 0;
  rows.forEach((row, index) => {
    const lean = Number.isFinite(row.lean) ? row.lean : nqsLean(row);
    sum += lean * (index + 1); weights += index + 1;
  });
  return round(clamp(sum / weights, -1, 1), 3);
}

const ADVICE_TEXT = {
  buy: { now: "Lực bán đã yếu", wait: "Lực bán trong ngày còn mạnh" },
  sell: { now: "Cầu đã yếu đi", hold: "Cầu còn mạnh" }
};
// Đổi verdict thì giá đi theo: "now" = giá ngay (không kém mốc), chờ/giữ = mức tốt hơn nếu có, không có thì vẫn giá ngay.
function withVerdict(side, advice, verdict) {
  const better = verdict === "now" ? null : advice.better;
  return { ...advice, verdict, price: better ? better.suggested : advice.nowPrice, zone: better,
    reason: ADVICE_TEXT[side][verdict] + (advice.provisional ? " (sơ bộ)" : "") };
}
// Hành động theo giá sống: chỉ khác "wait" khi giá đã chạm mốc T+. Dùng cho sự kiện đo hiệu quả + bảng mã.
function finalize(scored) {
  const { current, buyAdvice, sellAdvice } = scored;
  let action = "wait", advice = null;
  if (sellAdvice && current >= sellAdvice.base) { advice = sellAdvice; action = sellAdvice.verdict === "now" ? "sell" : "sell-hold"; }
  else if (buyAdvice && current <= buyAdvice.base) { advice = buyAdvice; action = buyAdvice.verdict === "now" ? "buy" : "buy-wait"; }
  const reasons = advice ? [advice.reason, ...scored.flowReasons] : scored.ready ? ["Chưa tới mốc T+", ...scored.flowReasons] : scored.flowReasons;
  return { ...scored, action, suggestedPrice: advice?.price ?? null, zone: advice?.zone ?? null, reasons };
}

function scoreOrderflow({ samples, seedSessions = 0, baselineLean = 0, held = false, avgCost = null, hold = false, contextAdjustment = 0,
  blockBuy = false, blockSell = false, strongConflict = false, levels = null, buyAt = null, sellAt = null }) {
  const window = recentWindow(samples || []);
  const cover = coverageFor(window);
  const persist = persistence(window);
  const parts = {
    imbalance: multiLevelFlow(window),
    persistence: persist.signed,
    execution: executionFlow(window),
    absorption: absorption(window)
  };
  const buySpoofRisk = spoofRisk(window, "buy"), sellSpoofRisk = spoofRisk(window, "sell");
  // Đủ 30 phút: weight = 1, nền chỉ còn ±adjustMax. Sơ bộ: phần còn thiếu của 30 phút lấy theo nền các phiên trước.
  const lean = clamp(Number(baselineLean) || 0, -1, 1), weight = Math.min(1, (cover.spanMinutes + 1) / POLICY.windowMinutes);
  const blend = (side) => sideScore(parts, side) * weight + unit(side === "buy" ? lean : -lean) * 100 * (1 - weight);
  const seedAdjustment = lean * POLICY.baseline.adjustMax;
  let buyScore = clamp(blend("buy") - buySpoofRisk * 0.3 + contextAdjustment + seedAdjustment);
  let sellScore = clamp(blend("sell") - sellSpoofRisk * 0.3 - contextAdjustment - seedAdjustment);
  if (strongConflict) { buyScore = Math.min(buyScore, POLICY.pressureThreshold - 1); sellScore = Math.min(sellScore, POLICY.pressureThreshold - 1); }
  buyScore = round(buyScore, 1); sellScore = round(sellScore, 1);
  const ready = seedSessions >= POLICY.minSeedSessions && cover.coverage >= POLICY.minCoverage && cover.spanMinutes >= POLICY.provisionalMinutes - 1;
  const provisional = ready && cover.spanMinutes < POLICY.windowMinutes - 1;
  // Tường mua kê rồi rút = cầu giả → coi như lực bán còn mạnh. Bối cảnh xấu (blockBuy) thì chờ mua; bối cảnh rất tốt (blockSell) thì giữ.
  const sellPressure = ready && (blockBuy || buySpoofRisk > POLICY.maxSpoofRisk || (sellScore >= POLICY.pressureThreshold &&
    sellScore - buyScore >= POLICY.pressureGap && persist.enoughSell));
  const demandStrong = ready && (blockSell || (buyScore >= POLICY.pressureThreshold && buyScore - sellScore >= POLICY.pressureGap &&
    persist.enoughBuy && buySpoofRisk <= POLICY.maxSpoofRisk));
  const latest = window.at(-1), current = latest?.price;
  const hasCost = held && Number.isFinite(avgCost) && avgCost > 0;
  const buyBase = Number.isFinite(buyAt) && buyAt > 0 ? (hasCost ? Math.min(buyAt, avgCost * (1 - POLICY.minProfitPct / 100)) : buyAt) : null;
  const sellBase = hasCost && !hold && Number.isFinite(sellAt) && sellAt > 0 ? Math.max(sellAt, avgCost * (1 + POLICY.minProfitPct / 100)) : null;
  const profile = volumeProfile(samples || []);
  const buyAdvice = ready && buyBase !== null && Number.isFinite(current) ? withVerdict("buy", {
    base: round(buyBase, 3), nowPrice: tickFloor(Math.min(current, buyBase)), provisional,
    better: priceZone("buy", { base: Math.min(current, buyBase), profile, walls: persistentLevels(window, "bids"), levels: levels?.support })
  }, sellPressure ? "wait" : "now") : null;
  const sellAdvice = ready && sellBase !== null && Number.isFinite(current) ? withVerdict("sell", {
    base: round(sellBase, 3), nowPrice: tickCeil(Math.max(current, sellBase)), provisional,
    better: priceZone("sell", { base: Math.max(current, sellBase), profile, walls: persistentLevels(window, "asks"), levels: levels?.resistance })
  }, demandStrong ? "hold" : "now") : null;
  const flowReasons = !ready
    ? [seedSessions < POLICY.minSeedSessions ? `Chưa đủ ${POLICY.minSeedSessions} phiên nền` : `Chưa đủ ${POLICY.provisionalMinutes} phút dữ liệu liên tục`]
    : [
      ...(provisional ? [`Sơ bộ: ${cover.spanMinutes + 1} phút hôm nay + nền ${seedSessions} phiên trước`] : []),
      persist.enoughBuy ? "Lực mua giữ ưu thế qua nhiều lần đo" : persist.enoughSell ? "Lực bán giữ ưu thế qua nhiều lần đo" : "Cung cầu chưa giữ được ưu thế",
      Math.abs(parts.execution) >= 0.2 ? (parts.execution > 0 ? "Khớp mua xác nhận" : "Khớp bán xác nhận") : "Khối lượng khớp chưa xác nhận rõ",
      Math.max(buySpoofRisk, sellSpoofRisk) > POLICY.maxSpoofRisk ? "Có dấu hiệu kê rồi rút lệnh" : "Chưa thấy kê/rút lệnh bất thường"
    ];
  if (ready && (blockBuy || blockSell)) flowReasons.unshift(blockBuy ? "Bối cảnh thị trường đang xấu" : "Bối cảnh thị trường đang rất tốt");
  return finalize({
    orderflowVersion: VERSION, ready, provisional, baselineLean: lean, current,
    buyScore, sellScore, confidence: round(Math.max(buyScore, sellScore)), buySpoofRisk, sellSpoofRisk,
    coverage: round(cover.coverage * 100, 1), spanMinutes: cover.spanMinutes,
    seedSessions, persistence: { buyHits: persist.buyHits, sellHits: persist.sellHits },
    parts: Object.fromEntries(Object.entries(parts).map(([key, value]) => [key, round(value, 3)])),
    buyAt: buyBase !== null ? round(buyAt, 3) : null, sellAt: sellBase !== null ? round(sellAt, 3) : null,
    buyAdvice, sellAdvice, flowReasons,
    priceBand: latest ? { bid: latest.bids?.[0]?.price || null, ask: latest.asks?.[0]?.price || null } : null,
    strongConflict: strongConflict || blockBuy || blockSell, contextBlocked: { buy: blockBuy, sell: blockSell }
  });
}

// Chống nhảy qua lại từng phút: đổi verdict một bên phải lặp lại clearSamples lần liên tiếp. Thiếu dữ liệu thì bỏ ngay.
function smooth(side, prior, next) {
  const key = side + "Advice", pendingKey = side + "Pending";
  const old = prior?.[key], fresh = next[key];
  if (!fresh || !old || old.verdict === fresh.verdict) return { [key]: fresh, [pendingKey]: null };
  const count = prior?.[pendingKey]?.verdict === fresh.verdict ? Number(prior[pendingKey].count || 0) + 1 : 1;
  return count >= POLICY.clearSamples ? { [key]: fresh, [pendingKey]: null }
    : { [key]: withVerdict(side, fresh, old.verdict), [pendingKey]: { verdict: fresh.verdict, count } };
}
function nextState(prior, scored) {
  if (!scored.ready) return { ...scored, buyPending: null, sellPending: null };
  return finalize({ ...scored, ...smooth("buy", prior, scored), ...smooth("sell", prior, scored) });
}

module.exports = { VERSION, POLICY, parseVpsQuote, scoreOrderflow, nextState, sessionLevels, priceZone, toTick,
  imbalance, multiLevelFlow, spoofRisk, minuteOf, sessionLean, nqsLean, baselineLean };
