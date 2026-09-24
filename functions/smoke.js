"use strict";

const assert = require("node:assert/strict");
const { scoreTicker, evaluateCandidate } = require("./scoring");
const { selectResults } = require("./index")._private;

function dateAt(index) {
  const date = new Date(Date.UTC(2026, 0, 1 + index));
  return date.toISOString().slice(0, 10);
}

function bars({ count = 90, start = 48, step = 0.18, volume = 1_500_000 } = {}) {
  return Array.from({ length: count }, (_, index) => {
    const close = start + step * index;
    return { date: dateAt(index), open: close - 0.2, high: close + 0.5, low: close - 0.5, close, volume };
  });
}

const benchmark = bars({ start: 1000, step: 0.2, volume: 10_000_000 });
const breakout = bars();
breakout.at(-1).close += 1.2;
breakout.at(-1).high = breakout.at(-1).close + 0.3;
breakout.at(-1).volume = 3_000_000;
const strong = scoreTicker("TEST", breakout, benchmark);
assert.equal(strong.eligible, true, "Xu hướng/breakout mạnh phải vượt chuẩn");
assert.ok(strong.reasons.length >= 2 && strong.reasons.length <= 3, "Mỗi đề cử có 2–3 lý do");
assert.equal(strong.date, breakout.at(-1).date, "Điểm chỉ dùng dữ liệu tới ngày đang xét");

const illiquid = bars({ volume: 10_000 });
assert.equal(scoreTicker("LOW", illiquid, benchmark).reason, "low-liquidity", "Thanh khoản dưới chuẩn phải bị loại");

const outsidePrice = scoreTicker("HIGH", bars({ start: 100, step: 0.2 }), benchmark);
assert.equal(outsidePrice.priceFitScore, 2, "Ngoài vùng 40–70 chỉ mất điểm, không bị khóa cứng");

const signal = { date: "2026-03-01", close: 50 };
const future = [
  { date: "2026-03-02", open: 50, high: 53.5, low: 48.4, close: 51, volume: 1 },
  ...bars({ count: 20, start: 51, step: 0.1, volume: 1 }).map((row, index) => ({ ...row, date: dateAt(62 + index) }))
];
const evaluation = evaluateCandidate(signal, future, benchmark);
assert.equal(evaluation.primary, "indeterminate", "Cùng nến chạm hai ngưỡng không được tính thắng");

const ranked = selectResults(Array.from({ length: 8 }, (_, index) => ({
  ticker: `T${index}`,
  group: index % 2 ? "watchlist" : "new",
  totalScore: 90 - index,
  relativeStrengthScore: 20 - index
})));
assert.equal(ranked.selected.length, 5, "Hai nhóm cộng lại chỉ được tối đa 5 mã");
assert.equal(ranked.fresh.length + ranked.watched.length, 5, "Tách nhóm không được làm phát sinh thêm mã");

console.log("Smoke scoring: OK");
