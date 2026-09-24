"use strict";

const SCORE_VERSION = "v1.0.0";
const MIN_BARS = 60;
const MIN_AVG_VALUE_20 = 20_000_000_000;
const MIN_SCORE = 70;

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function sma(bars, length, end = bars.length) {
  if (end < length) return null;
  return average(bars.slice(end - length, end).map((bar) => bar.close));
}

function pctChange(from, to) {
  return Number.isFinite(from) && from > 0 && Number.isFinite(to) ? (to / from - 1) * 100 : null;
}

function returnForBars(bars, sessions) {
  if (bars.length <= sessions) return null;
  return pctChange(bars[bars.length - 1 - sessions].close, bars[bars.length - 1].close);
}

function atrPct(bars, length = 14) {
  if (bars.length <= length) return null;
  const ranges = [];
  for (let i = bars.length - length; i < bars.length; i += 1) {
    const bar = bars[i];
    const previous = bars[i - 1];
    ranges.push(Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - previous.close),
      Math.abs(bar.low - previous.close)
    ));
  }
  return average(ranges) / bars[bars.length - 1].close * 100;
}

function valueAverage20(bars) {
  const rows = bars.slice(-20);
  return average(rows.map((bar) => bar.close * 1000 * bar.volume));
}

function alignBenchmarkReturn(bars, benchmarkBars, sessions) {
  if (bars.length <= sessions) return null;
  const startDate = bars[bars.length - 1 - sessions].date;
  const endDate = bars[bars.length - 1].date;
  const byDate = new Map(benchmarkBars.map((bar) => [bar.date, bar.close]));
  return pctChange(byDate.get(startDate), byDate.get(endDate));
}

function trendScore(bars) {
  const close = bars.at(-1).close;
  const ma20 = sma(bars, 20);
  const ma50 = sma(bars, 50);
  const ma20Past = sma(bars, 20, bars.length - 5);
  const return20 = returnForBars(bars, 20);
  let score = 0;
  if (close > ma20) score += 8;
  if (ma20 > ma50) score += 7;
  if (ma20 > ma20Past) score += 5;
  if (return20 > 0) score += 5;
  return { score, ma20, ma50, return20 };
}

function relativeStrengthScore(bars, benchmarkBars) {
  const return20 = returnForBars(bars, 20);
  const return10 = returnForBars(bars, 10);
  const benchmark20 = alignBenchmarkReturn(bars, benchmarkBars, 20);
  const benchmark10 = alignBenchmarkReturn(bars, benchmarkBars, 10);
  if (![return20, return10, benchmark20, benchmark10].every(Number.isFinite)) {
    return { score: 0, excess20: null, excess10: null };
  }
  const excess20 = return20 - benchmark20;
  const excess10 = return10 - benchmark10;
  let score = excess20 >= 8 ? 15 : excess20 >= 4 ? 12 : excess20 >= 0 ? 8 : excess20 >= -3 ? 4 : 0;
  score += excess10 >= 5 ? 10 : excess10 >= 2 ? 7 : excess10 >= 0 ? 4 : 0;
  return { score, excess20, excess10 };
}

function breakoutScore(bars) {
  const current = bars.at(-1);
  const prior = bars.slice(-21, -1);
  const priorHigh = Math.max(...prior.map((bar) => bar.high));
  const distancePct = (current.close / priorHigh - 1) * 100;
  const volumeAverage = average(prior.map((bar) => bar.volume));
  const volumeRatio = volumeAverage > 0 ? current.volume / volumeAverage : 0;
  let score = distancePct >= 0 ? 15 : distancePct >= -2 ? 10 : distancePct >= -5 ? 5 : 0;
  score += volumeRatio >= 1.5 ? 10 : volumeRatio >= 1.2 ? 7 : volumeRatio >= 1 ? 4 : 0;
  return { score, priorHigh, distancePct, volumeRatio };
}

function pullbackScore(bars, trend) {
  const current = bars.at(-1);
  const previous = bars.at(-2);
  const recentHigh = Math.max(...bars.slice(-6, -1).map((bar) => bar.high));
  const distanceMa20Pct = (current.close / trend.ma20 - 1) * 100;
  const drawdown5Pct = (current.close / recentHigh - 1) * 100;
  let score = 0;
  if (distanceMa20Pct >= -1 && distanceMa20Pct <= 3) score += 10;
  else if (distanceMa20Pct > 3 && distanceMa20Pct <= 5) score += 5;
  if (current.close > previous.close) score += 5;
  if (current.low <= trend.ma20 * 1.01 && current.close >= trend.ma20) score += 5;
  if (drawdown5Pct <= -2 && drawdown5Pct >= -8) score += 5;
  return { score, distanceMa20Pct, drawdown5Pct };
}

function liquidityRiskScore(bars, avgValue20) {
  const volatilityPct = atrPct(bars);
  const positiveDays = bars.slice(-20).filter((bar, index, rows) => index > 0 && bar.close > rows[index - 1].close).length;
  let score = avgValue20 >= 100_000_000_000 ? 6 : avgValue20 >= 50_000_000_000 ? 5 : 4;
  score += volatilityPct <= 2.5 ? 5 : volatilityPct <= 4 ? 3 : volatilityPct <= 6 ? 1 : 0;
  score += positiveDays >= 8 && positiveDays <= 14 ? 4 : positiveDays >= 6 && positiveDays <= 16 ? 2 : 0;
  return { score, volatilityPct, positiveDays };
}

function fitScore(close) {
  if (close >= 40 && close <= 70) return 10;
  if (close >= 30 && close <= 80) return 6;
  return 2;
}

function buildReasons(parts) {
  const candidates = [];
  if (parts.trend.score >= 20) candidates.push({ weight: parts.trend.score, text: "Xu hướng tăng trên MA20 và MA50" });
  if (parts.relativeStrength.excess20 !== null && parts.relativeStrength.excess20 > 0) {
    candidates.push({ weight: 20 + parts.relativeStrength.excess20, text: `Mạnh hơn VN-Index ${round(parts.relativeStrength.excess20, 1)}% trong 20 phiên` });
  }
  if (parts.breakout.score >= parts.pullback.score && parts.breakout.score >= 15) {
    candidates.push({ weight: 30 + parts.breakout.score, text: parts.breakout.distancePct >= 0 ? "Đang vượt đỉnh 20 phiên" : "Đang sát vùng đỉnh 20 phiên" });
  }
  if (parts.pullback.score > parts.breakout.score && parts.pullback.score >= 15) {
    candidates.push({ weight: 30 + parts.pullback.score, text: "Điều chỉnh về MA20 và có dấu hiệu hồi phục" });
  }
  if (parts.breakout.volumeRatio >= 1.2) candidates.push({ weight: 15 + parts.breakout.volumeRatio, text: `Khối lượng phiên gần nhất gấp ${round(parts.breakout.volumeRatio, 1)} lần trung bình` });
  candidates.push({ weight: parts.avgValue20 >= 50_000_000_000 ? 10 : 5, text: `Thanh khoản TB20 khoảng ${Math.round(parts.avgValue20 / 1_000_000_000)} tỷ đồng/phiên` });
  const reasons = candidates.sort((a, b) => b.weight - a.weight).map((item) => item.text);
  const fallback = [
    `Xu hướng kỹ thuật đạt ${parts.trend.score}/25 điểm`,
    `Sức mạnh tương đối đạt ${parts.relativeStrength.score}/25 điểm`
  ];
  fallback.forEach((text) => { if (reasons.length < 2 && !reasons.includes(text)) reasons.push(text); });
  return reasons.slice(0, 3);
}

function scoreTicker(ticker, bars, benchmarkBars) {
  if (!Array.isArray(bars) || bars.length < MIN_BARS) return { eligible: false, reason: "insufficient-bars" };
  const cleanBars = bars.filter((bar) => [bar.open, bar.high, bar.low, bar.close, bar.volume].every(Number.isFinite));
  if (cleanBars.length < MIN_BARS) return { eligible: false, reason: "invalid-bars" };
  const avgValue20 = valueAverage20(cleanBars);
  if (!Number.isFinite(avgValue20) || avgValue20 < MIN_AVG_VALUE_20) {
    return { eligible: false, reason: "low-liquidity", avgValue20: round(avgValue20 || 0, 0) };
  }
  const trend = trendScore(cleanBars);
  const relativeStrength = relativeStrengthScore(cleanBars, benchmarkBars);
  const breakout = breakoutScore(cleanBars);
  const pullback = pullbackScore(cleanBars, trend);
  const liquidityRisk = liquidityRiskScore(cleanBars, avgValue20);
  const priceFit = fitScore(cleanBars.at(-1).close);
  const styleScore = Math.max(breakout.score, pullback.score);
  const totalScore = trend.score + relativeStrength.score + styleScore + liquidityRisk.score + priceFit;
  const parts = { trend, relativeStrength, breakout, pullback, liquidityRisk, avgValue20 };
  const riskFlags = [];
  if (liquidityRisk.volatilityPct > 6) riskFlags.push("Biến động ATR14 trên 6%");
  if (breakout.volumeRatio < 0.8) riskFlags.push("Khối lượng gần nhất thấp hơn trung bình");
  return {
    eligible: totalScore >= MIN_SCORE,
    ticker,
    date: cleanBars.at(-1).date,
    close: round(cleanBars.at(-1).close),
    totalScore,
    trendScore: trend.score,
    relativeStrengthScore: relativeStrength.score,
    breakoutScore: breakout.score,
    pullbackScore: pullback.score,
    liquidityRiskScore: liquidityRisk.score,
    priceFitScore: priceFit,
    avgValue20: Math.round(avgValue20),
    atr14Pct: round(liquidityRisk.volatilityPct),
    excess20Pct: round(relativeStrength.excess20),
    reasons: buildReasons(parts),
    riskFlags,
    scoreVersion: SCORE_VERSION
  };
}

function evaluateCandidate(result, bars, benchmarkBars) {
  const future = bars.filter((bar) => bar.date > result.date).slice(0, 20);
  const up = result.close * 1.06;
  const down = result.close * 0.97;
  let primary = "pending";
  let resolvedDate = null;
  for (const bar of future) {
    const hitUp = bar.high >= up;
    const hitDown = bar.low <= down;
    if (hitUp && hitDown) { primary = "indeterminate"; resolvedDate = bar.date; break; }
    if (hitUp) { primary = "win"; resolvedDate = bar.date; break; }
    if (hitDown) { primary = "loss"; resolvedDate = bar.date; break; }
  }
  const complete = future.length >= 20;
  if (complete && primary === "pending") primary = "timeout";
  let return20Pct = null;
  let excess20Pct = null;
  if (complete) {
    const end = future[19];
    return20Pct = pctChange(result.close, end.close);
    const benchmarkByDate = new Map(benchmarkBars.map((bar) => [bar.date, bar.close]));
    const benchmarkReturn = pctChange(benchmarkByDate.get(result.date), benchmarkByDate.get(end.date));
    excess20Pct = Number.isFinite(benchmarkReturn) ? return20Pct - benchmarkReturn : null;
  }
  return {
    primary,
    resolvedDate,
    sessionsObserved: future.length,
    complete,
    return20Pct: round(return20Pct),
    excess20Pct: round(excess20Pct)
  };
}

module.exports = {
  SCORE_VERSION,
  MIN_BARS,
  MIN_AVG_VALUE_20,
  MIN_SCORE,
  scoreTicker,
  evaluateCandidate
};
