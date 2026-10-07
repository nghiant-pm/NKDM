"use strict";

/* Kiểm tra walk-forward trên dữ liệu đã xảy ra, không ghi Firestore/Telegram.
   Tập mã là universe hiện tại nên kết quả có survivorship bias; chỉ dùng để bắt
   lỗi công thức và xem phân bố, không dùng như cam kết lợi nhuận. */
const UNIVERSE = require("./universe");
const { scoreTicker, evaluateCandidate, evaluateFiveSession, HOLD_MAX_SESSIONS, SCORE_VERSION } = require("./scoring");
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

/* Phiên chốt cho đề cử >90 điểm: mua giá đóng cửa ngày đề cử, bán giá đóng cửa phiên n.
   Một mã lên >90 nhiều ngày liền chỉ tính lần đầu mỗi đợt n phiên — cùng cách gom và cùng
   tiêu chí điểm ngọt với holdStats/holdSweetSpot bên public/index.html (bản sao có chủ ý). */
const HOLD_MIN_WIN = 50;
const HOLD_MIN_SAMPLES = 30;
function holdStats(rows, n) {
  const windowEnd = {};
  const returns = [];
  rows.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach((row) => {
    const end = windowEnd[row.ticker];
    if (end === "open" || (end && row.date <= end)) return;
    const exit = row.hold.path[n - 1];
    windowEnd[row.ticker] = exit ? exit.date : "open";
    if (exit) returns.push((exit.close / row.hold.entryPrice - 1) * 100);
  });
  const sorted = returns.slice().sort((a, b) => a - b);
  const avg = average(returns);
  const fix = (value) => Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  return {
    sessions: n,
    samples: returns.length,
    winPct: returns.length ? fix(returns.filter((value) => value > 0).length / returns.length * 100) : null,
    avgPct: fix(avg),
    medianPct: sorted.length ? fix((sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2) : null,
    worstPct: sorted.length ? fix(sorted[0]) : null,
    perSessionPct: avg === null ? null : fix(avg / n)
  };
}
// Điểm ngọt: lãi bình quân mỗi phiên cao nhất, với điều kiện ≥50% số lần có lãi và đủ mẫu.
function holdSweetSpot(table) {
  return table.filter((row) => row.samples >= HOLD_MIN_SAMPLES && row.winPct >= HOLD_MIN_WIN)
    .sort((a, b) => b.perSessionPct - a.perSessionPct)[0]?.sessions ?? null;
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

  // `node backtest.js 200` = thử trên 200 phiên gần nhất (mặc định 80; tối đa theo lịch sử 520 ngày).
  const testSessions = Math.max(1, Number(process.argv[2]) || 80);
  const dates = benchmark.slice(60, -HOLD_MAX_SESSIONS).map((bar) => bar.date).slice(-testSessions);
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
      picks.push({ ...score, rank: index + 1, marketBull, evaluation: evaluateCandidate(score, histories.get(score.ticker), benchmark),
        hold: evaluateFiveSession(score, histories.get(score.ticker)) });
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

  // Điểm ngọt phiên chốt cho >90 điểm: cả giai đoạn + hai nửa — chỉ đáng tin khi hai nửa ra gần nhau.
  const top = picks.filter((row) => row.hold);
  const middle = dates[dates.length >> 1];
  [["Cả giai đoạn", top], ["Nửa đầu", top.filter((row) => row.date < middle)], ["Nửa sau", top.filter((row) => row.date >= middle)]]
    .forEach(([label, rows]) => {
      const table = Array.from({ length: HOLD_MAX_SESSIONS }, (_, i) => holdStats(rows, i + 1));
      const best = holdSweetSpot(table);
      console.log(`\n>90 điểm · ${label} (${rows.length} đề cử) · điểm ngọt: ${best ? best + " phiên" : "chưa đủ mẫu"}`);
      console.table(table.map((row) => ({
        "Phiên": row.sessions, "Mẫu": row.samples, "Có lãi %": row.winPct, "Bình quân %": row.avgPct,
        "Trung vị %": row.medianPct, "Tệ nhất %": row.worstPct, "Mỗi phiên %": row.perSessionPct
      })));
    });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
