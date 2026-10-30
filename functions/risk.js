"use strict";

/* Luật danh mục cho tin Telegram của bot. Mặc định và hai hàm luật dưới đây là
   BẢN SAO CÓ CHỦ Ý của public/index.html (RULE_* · activeStrategy · positionMarket ·
   positionAdvice). Hai hàm luật được chép NGUYÊN VĂN để dễ so; sửa một bên phải sửa bên kia. */

const DEFAULTS = {
  stopLossPct: 5,
  trailPct: 8,
  staleSessions: 20,
  staleGainPct: 2,
  addNearMa20Pct: 3,
  lotSize: 100,
  nearRange: 0.5
};

/* Bản rút gọn của computeLedger() ở client: chỉ lấy phần luật cần
   (khối lượng, giá vốn TB, ngày bắt đầu chu kỳ, khối lượng lớn nhất chu kỳ). */
function holdingsFrom(transactions) {
  const sorted = transactions.slice().sort((a, b) => {
    const ka = (a.date || "") + "_" + (a.createdAt || "");
    const kb = (b.date || "") + "_" + (b.createdAt || "");
    return ka < kb ? -1 : (ka > kb ? 1 : 0);
  });
  const holdings = {};
  sorted.forEach((t) => {
    const ticker = String(t.ticker || "").toUpperCase();
    const qty = Number(t.qty || 0);
    const price = Number(t.price || 0);
    if (!ticker || !Number.isFinite(qty)) return;
    const h = holdings[ticker] || { qty: 0, avgCost: 0, heldSince: null, cycleMaxQty: 0 };
    if (t.side === "buy") {
      if (h.qty <= 0) { h.heldSince = t.date || null; h.cycleMaxQty = 0; }
      const newQty = h.qty + qty;
      h.avgCost = newQty > 0 ? ((h.qty * h.avgCost) + (qty * price)) / newQty : 0;
      h.qty = newQty;
      h.cycleMaxQty = Math.max(h.cycleMaxQty, newQty);
    } else {
      h.qty -= qty;
      if (h.qty <= 0.0001) { h.qty = 0; h.avgCost = 0; h.heldSince = null; h.cycleMaxQty = 0; }
    }
    holdings[ticker] = h;
  });
  return holdings;
}

/* Cùng quy tắc chọn phiên bản với activeStrategy() ở client. */
function activeStrategy(strategies, day) {
  const usable = strategies
    .filter((v) => v.effectiveFrom && v.effectiveFrom <= day)
    .sort((a, b) => a.effectiveFrom < b.effectiveFrom ? -1
      : a.effectiveFrom > b.effectiveFrom ? 1
      : (a.createdAt || "") < (b.createdAt || "") ? -1 : 1);
  const v = usable.at(-1) || {};
  const positive = (value, fallback) => value != null && isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
  return {
    stopLossPct: positive(v.stopLossPct, DEFAULTS.stopLossPct),
    trailPct: positive(v.trailPct, DEFAULTS.trailPct),
    staleSessions: positive(v.staleSessions, DEFAULTS.staleSessions),
    staleGainPct: DEFAULTS.staleGainPct,
    addNearMa20Pct: DEFAULTS.addNearMa20Pct,
    lotSize: isFinite(v.lotSize) ? Number(v.lotSize) : DEFAULTS.lotSize,
    nearRange: isFinite(v.nearRange) && v.nearRange > 0 ? Number(v.nearRange) : DEFAULTS.nearRange
  };
}

// ---- Chép nguyên văn từ public/index.html ----
function positionMarket(bars, since){
  const closes = bars.map((bar) => bar.close);
  const sma = (length) => closes.length >= length
    ? Math.round(closes.slice(-length).reduce((sum, value) => sum + value, 0) / length * 100) / 100 : null;
  const cycle = since ? bars.filter((bar) => bar.date >= since) : [];
  return {
    date: bars.length ? bars[bars.length - 1].date : null, since: since || null,
    ma20: sma(20), ma50: sma(50),
    peak: cycle.length ? Math.max(...cycle.map((bar) => bar.close)) : null,
    sessions: cycle.length
  };
}
function positionAdvice(pos, strategy, market, context){
  if(!(pos.qty > 0) || !(pos.price > 0) || !(pos.avgCost > 0)) return null;
  const m = market || {}, ctx = context || {};
  const num = (value, digits) => value.toFixed(digits);
  const pnlPct = (pos.price / pos.avgCost - 1) * 100;
  const stopAt = pos.avgCost * (1 - strategy.stopLossPct / 100);
  const ma20 = Number.isFinite(m.ma20) ? m.ma20 : null;
  const ma50 = Number.isFinite(m.ma50) ? m.ma50 : null;
  const sameCycle = !!pos.heldSince && m.since === pos.heldSince;
  const base = { stopAt, pnlPct };
  if(pnlPct <= 0){
    // Cắt lỗ áp dụng cả mã gắn cờ Giữ dài hạn.
    const lossHit = pos.price <= stopAt;
    const trendHit = ma50 !== null && pos.price < ma50;
    const reasons = [];
    if(lossHit) reasons.push("Lỗ " + num(-pnlPct, 1) + "%");
    if(trendHit) reasons.push("Dưới MA50 " + num(ma50, 2));
    if(lossHit && trendHit) return { ...base, kind:"stop", reached:true, qty:pos.qty, step:2, reasons };
    if(lossHit || trendHit){
      // Bước 1: đưa vị thế về 1/2 khối lượng lớn nhất chu kỳ; đã giảm rồi thì chờ bước 2.
      const lot = strategy.lotSize;
      const keep = Math.floor(Math.max(pos.cycleMaxQty || 0, pos.qty) / 2 / lot) * lot;
      const qty = Math.max(0, pos.qty - keep);
      return { ...base, kind:"stop", reached:qty > 0, qty, step:1, reasons };
    }
    const remaining = pos.price - stopAt;
    if(remaining <= strategy.nearRange) return { ...base, kind:"stop", reached:false, qty:0, step:0, remaining, reasons:[] };
  } else if(!ctx.hold){
    const peak = sameCycle && Number.isFinite(m.peak) ? Math.max(m.peak, pos.price) : null;
    const offPeakPct = peak ? (1 - pos.price / peak) * 100 : 0;
    const reasons = [];
    if(ma20 !== null && pos.price < ma20) reasons.push("Dưới MA20 " + num(ma20, 2));
    if(offPeakPct >= strategy.trailPct) reasons.push("Rơi " + num(offPeakPct, 1) + "% từ đỉnh " + num(peak, 2));
    if(reasons.length) return { ...base, kind:"sell", reached:true, qty:pos.qty, reasons };
  }
  if(!ctx.hold && sameCycle && m.sessions >= strategy.staleSessions && pnlPct < strategy.staleGainPct &&
    Number.isFinite(m.score) && m.score < ctx.minScore && ctx.hasCandidates){
    return { ...base, kind:"rotate", reached:true, qty:pos.qty,
      reasons:["Giữ " + m.sessions + " phiên", (pnlPct >= 0 ? "lãi " : "lỗ ") + num(Math.abs(pnlPct), 1) + "%", "điểm " + m.score] };
  }
  if(pnlPct > 0 && ma20 !== null && ma50 !== null && pos.price > ma50 &&
    pos.price >= ma20 && pos.price <= ma20 * (1 + strategy.addNearMa20Pct / 100)){
    return { ...base, kind:"buy", reached:true, qty:strategy.lotSize,
      reasons:["Lãi " + num(pnlPct, 1) + "%", "trên MA50", "sát MA20 " + num(ma20, 2)] };
  }
  return null;
}
// ---- Hết phần chép nguyên văn ----

module.exports = { DEFAULTS, holdingsFrom, activeStrategy, positionMarket, positionAdvice };
