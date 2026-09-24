"use strict";

/* Kiểm tra walk-forward trên dữ liệu đã xảy ra, không ghi Firestore/Telegram.
   Tập mã là universe hiện tại nên kết quả có survivorship bias; chỉ dùng để bắt
   lỗi công thức và xem phân bố, không dùng như cam kết lợi nhuận. */
const UNIVERSE = require("./universe");
const { scoreTicker, evaluateCandidate, SCORE_VERSION } = require("./scoring");
const { fetchHistory, mapWithConcurrency } = require("./index")._private;

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function breakdown(rows) {
  const complete = rows.filter((row) => row.evaluation.complete);
  const win = complete.filter((row) => row.evaluation.primary === "win").length;
  const loss = complete.filter((row) => row.evaluation.primary === "loss").length;
  return {
    count: complete.length,
    winRateResolvedPct: win + loss ? Math.round(win / (win + loss) * 1000) / 10 : null,
    averageReturn20Pct: average(complete.map((row) => row.evaluation.return20Pct).filter(Number.isFinite)),
    averageExcess20Pct: average(complete.map((row) => row.evaluation.excess20Pct).filter(Number.isFinite))
  };
}

async function main() {
  const benchmark = await fetchHistory("VNINDEX", 520);
  const fetched = await mapWithConcurrency(UNIVERSE, 5, (ticker) => fetchHistory(ticker, 520));
  const histories = new Map();
  const missing = [];
  fetched.forEach((result, index) => {
    if (result.ok) histories.set(UNIVERSE[index], result.value);
    else missing.push(UNIVERSE[index]);
  });

  const dates = benchmark.slice(60, -20).map((bar) => bar.date).slice(-80);
  const picks = [];
  dates.forEach((date) => {
    const benchmarkPast = benchmark.filter((bar) => bar.date <= date);
    const indexClose = benchmarkPast.at(-1)?.close;
    const indexMa20 = average(benchmarkPast.slice(-20).map((bar) => bar.close));
    const indexMa50 = average(benchmarkPast.slice(-50).map((bar) => bar.close));
    const marketBull = indexClose > indexMa20 && indexMa20 > indexMa50;
    const day = [];
    histories.forEach((allBars, ticker) => {
      const past = allBars.filter((bar) => bar.date <= date);
      if (past.at(-1)?.date !== date) return;
      const score = scoreTicker(ticker, past, benchmarkPast);
      if (score.eligible) day.push(score);
    });
    day.sort((a, b) => b.totalScore - a.totalScore || a.ticker.localeCompare(b.ticker));
    day.slice(0, 5).forEach((score, index) => {
      picks.push({ ...score, rank: index + 1, marketBull, evaluation: evaluateCandidate(score, histories.get(score.ticker), benchmark) });
    });
  });

  const complete = picks.filter((row) => row.evaluation.complete);
  const outcomes = ["win", "loss", "indeterminate", "timeout"].reduce((out, key) => {
    out[key] = complete.filter((row) => row.evaluation.primary === key).length;
    return out;
  }, {});
  const measured = complete.filter((row) => Number.isFinite(row.evaluation.return20Pct));
  const metricAverage = (key) => measured.length
    ? measured.reduce((sum, row) => sum + row.evaluation[key], 0) / measured.length
    : null;
  console.log(JSON.stringify({
    scoreVersion: SCORE_VERSION,
    sessions: dates.length,
    picks: picks.length,
    complete: complete.length,
    outcomes,
    winRateResolvedPct: outcomes.win + outcomes.loss > 0 ? Math.round(outcomes.win / (outcomes.win + outcomes.loss) * 1000) / 10 : null,
    averageReturn20Pct: metricAverage("return20Pct"),
    averageExcess20Pct: metricAverage("excess20Pct"),
    breakdown: {
      marketBull: breakdown(picks.filter((row) => row.marketBull)),
      marketWeak: breakdown(picks.filter((row) => !row.marketBull)),
      breakoutLed: breakdown(picks.filter((row) => row.breakoutScore >= row.pullbackScore)),
      pullbackLed: breakdown(picks.filter((row) => row.pullbackScore > row.breakoutScore)),
      score70to79: breakdown(picks.filter((row) => row.totalScore < 80)),
      score80plus: breakdown(picks.filter((row) => row.totalScore >= 80))
    },
    missingTickers: missing
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
