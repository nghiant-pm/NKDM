"use strict";

const { scoreTicker, decisionInputs: I } = require("./scoring");
const { SECTORS, sectorFor } = require("./decision-scoring");

function metrics(ticker, bars) {
  if (!Array.isArray(bars) || bars.length < 60) return null;
  const clean = bars.filter((bar) => [bar.open, bar.high, bar.low, bar.close, bar.volume].every(Number.isFinite));
  if (clean.length < 60) return null;
  return {
    ticker,
    date: clean.at(-1).date,
    close: I.round(clean.at(-1).close),
    return5Pct: I.round(I.returnForBars(clean, 5)),
    return20Pct: I.round(I.returnForBars(clean, 20)),
    return60Pct: I.round(I.returnForBars(clean, 60)),
    avgValue20: Math.round(I.valueAverage20(clean)),
    atr14Pct: I.round(I.atrPct(clean))
  };
}

function median(values) {
  const rows = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!rows.length) return null;
  const middle = Math.floor(rows.length / 2);
  return rows.length % 2 ? rows[middle] : (rows[middle - 1] + rows[middle]) / 2;
}

function peerMedian(rows) {
  const out = {};
  ["close", "return5Pct", "return20Pct", "return60Pct", "avgValue20", "atr14Pct"].forEach((key) => {
    out[key] = I.round(median(rows.map((row) => row[key])));
  });
  return out;
}

function selectClosestPeers(target, rows, limit = 5) {
  if (!target || !Number.isFinite(target.avgValue20) || target.avgValue20 <= 0) return [];
  return rows.filter((row) => row && row.ticker !== target.ticker && row.date === target.date &&
      Number.isFinite(row.avgValue20) && row.avgValue20 > 0)
    .sort((a, b) => Math.abs(Math.log(a.avgValue20 / target.avgValue20)) - Math.abs(Math.log(b.avgValue20 / target.avgValue20)) ||
      a.ticker.localeCompare(b.ticker))
    .slice(0, limit);
}

async function analyzeTicker({ ticker, config, fetchHistory, fetchForeign, mapWithConcurrency }) {
  const benchmarkAll = await fetchHistory("VNINDEX", 240, 3);
  const marketDate = benchmarkAll.at(-1)?.date;
  if (!marketDate) throw new Error("Không đọc được phiên VN-Index mới nhất");
  const benchmark = benchmarkAll.filter((bar) => bar.date <= marketDate);
  const targetBars = (await fetchHistory(ticker, 240, 3)).filter((bar) => bar.date <= marketDate);
  if (targetBars.at(-1)?.date !== marketDate) {
    return { ticker, marketDate, config, status: "missing-current-session", score: null, comparison: null };
  }

  const target = metrics(ticker, targetBars);
  if (!target) return { ticker, marketDate, config, status: "insufficient-data", score: null, comparison: null };
  const foreign = await fetchForeign([ticker], marketDate);
  const score = scoreTicker(ticker, targetBars, benchmark, config, foreign.get(ticker));
  const sector = sectorFor(ticker);
  if (!sector) {
    return { ticker, marketDate, config, status: "complete", score, comparison: { sector: null, target, peers: [], median: null, status: "unknown-sector" } };
  }

  const symbols = SECTORS[sector].split(" ").filter((symbol) => symbol !== ticker);
  const fetched = await mapWithConcurrency(symbols, 5, (symbol) => fetchHistory(symbol));
  const candidates = fetched.map((item, index) => {
    if (!item.ok) return null;
    const bars = item.value.filter((bar) => bar.date <= marketDate);
    return bars.at(-1)?.date === marketDate ? metrics(symbols[index], bars) : null;
  }).filter(Boolean);
  const peers = selectClosestPeers(target, candidates);
  return {
    ticker,
    marketDate,
    config,
    status: "complete",
    score,
    comparison: {
      sector,
      target,
      peers,
      median: peers.length ? peerMedian(peers) : null,
      status: peers.length >= 2 ? "complete" : "insufficient-peers"
    }
  };
}

module.exports = { metrics, median, peerMedian, selectClosestPeers, analyzeTicker };
