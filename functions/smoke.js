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

// Khung giờ: giờ Việt Nam = UTC+7, Scheduler có thể trễ vài giây.
const { slotAt, slotEnabled, marketDateFor, telegramHeader } = require("./index")._private;
const vnTime = (hhmmss) => new Date(`2026-09-24T${hhmmss}+07:00`);
assert.equal(slotAt(vnTime("16:00:04"))?.id, "1600", "Trễ vài giây vẫn đúng khung 16:00");
assert.equal(slotAt(vnTime("08:30:00"))?.phase, "pre", "8:30 là trước phiên");
assert.equal(slotAt(vnTime("13:30:10"))?.phase, "intraday", "13:30 là trong phiên");
assert.equal(slotAt(vnTime("20:00:00"))?.phase, "post", "20:00 là sau phiên");
assert.equal(slotAt(vnTime("09:00:00")), null, "Giờ không có khung thì không chạy");
assert.equal(slotEnabled(undefined, "1600"), true, "Chưa cấu hình thì mặc định bật 16:00");
assert.equal(slotEnabled(undefined, "2000"), false, "Chưa cấu hình thì các khung khác tắt");
assert.equal(slotEnabled({ slots: { "1600": false, "0830": true } }, "1600"), false, "Owner tắt 16:00 thì phải tắt");
assert.equal(slotEnabled({ slots: { "1600": false, "0830": true } }, "0830"), true, "Owner bật 8:30 thì phải bật");

const vn = [{ date: "2026-09-22" }, { date: "2026-09-23" }, { date: "2026-09-24" }];
assert.equal(marketDateFor("pre", "2026-09-24", vn), "2026-09-23", "Trước phiên không dùng nến hôm nay");
assert.equal(marketDateFor("post", "2026-09-24", vn), "2026-09-24", "Sau phiên dùng nến hôm nay");
assert.equal(marketDateFor("intraday", "2026-09-25", vn), null, "Không có nến hôm nay = ngày nghỉ");
assert.match(telegramHeader({ phase: "intraday", time: "10:30" }, "2026-09-24", "2026-09-24", null)[1], /Tạm tính/, "Trong phiên phải ghi tạm tính");
assert.match(telegramHeader({ phase: "pre", time: "08:30" }, "2026-09-24", "2026-09-23", null)[1], /23\/09\/2026/, "Trước phiên ghi rõ phiên được chấm");

// Luật danh mục (cắt lỗ / chốt lời đuổi / vốn chết / mua thêm) — tình huống kiểu TCX, FPT.
const { holdingsFrom, activeStrategy, positionAdvice } = require("./risk");
const { portfolioAlerts, telegramText } = require("./index")._private;
const rules = activeStrategy([{ effectiveFrom: "2026-01-01", buyDrop: 2, sellRise: 3, lotSize: 100 }], "2026-10-30");
assert.equal(rules.stopLossPct, 5, "Phiên bản cũ thiếu trường cắt lỗ thì dùng mặc định 5%");
const since = "2026-09-10";
const tcx = { qty: 800, cycleMaxQty: 800, avgCost: 40.18, heldSince: since };
const advise = (pos, market, ctx = {}) => positionAdvice(pos, rules, { since, ...market }, { minScore: 70, ...ctx });
let advice = advise({ ...tcx, price: 37.9 }, { ma20: 39, ma50: 39.5 });
assert.equal(advice.kind, "stop"); assert.equal(advice.step, 2); assert.equal(advice.qty, 800, "Lỗ ≥5% VÀ dưới MA50 thì bán hết");
advice = advise({ ...tcx, price: 37.9 }, { ma20: 37, ma50: 36 });
assert.equal(advice.step, 1); assert.equal(advice.qty, 400, "Chạm một điều kiện thì đưa vị thế về 1/2");
advice = advise({ ...tcx, qty: 400, price: 37.9 }, { ma50: 36 });
assert.equal(advice.reached, false); assert.equal(advice.qty, 0, "Đã giảm về 1/2 thì không bảo bán tiếp ở bước 1");
advice = advise({ ...tcx, qty: 100, cycleMaxQty: 100, price: 39.8 }, { ma50: 40 });
assert.equal(advice.qty, 100, "Vị thế 100 CP thì bước 1 bán cả lô");
advice = advise({ ...tcx, price: 38.4 }, { ma50: 36 });
assert.equal(advice.step, 0); assert.equal(advice.reached, false, "Cách ngưỡng cắt ≤ 0,5 điểm thì cảnh báo sắp cắt");
advice = advise({ ...tcx, price: 37.9 }, {}, { hold: true });
assert.equal(advice.kind, "stop", "Cờ Giữ dài hạn không chặn cắt lỗ");
advice = advise({ ...tcx, price: 39.5 }, { ma20: 39, ma50: 38 });
assert.equal(advice, null, "Đang lỗ thì không bao giờ gợi ý mua thêm (bỏ bắt dao rơi)");
const fpt = { qty: 100, cycleMaxQty: 100, avgCost: 72.62, heldSince: since };
advice = advise({ ...fpt, price: 75 }, { ma20: 76, ma50: 70, peak: 76 });
assert.equal(advice.kind, "sell"); assert.equal(advice.qty, 100, "Đang lãi mà thủng MA20 thì chốt hết");
advice = advise({ ...fpt, price: 75 }, { ma20: 76, ma50: 70, peak: 76 }, { hold: true });
assert.equal(advice, null, "Mã Giữ dài hạn không bị chốt lời đuổi");
advice = advise({ ...fpt, price: 80 }, { ma20: 79, ma50: 70, peak: 88 });
assert.equal(advice.kind, "sell", "Rơi ≥8% từ đỉnh chu kỳ thì chốt");
advice = advise({ ...fpt, price: 79 }, { ma20: 78, ma50: 72, peak: 80 });
assert.equal(advice.kind, "buy"); assert.equal(advice.qty, 100, "Đang lãi, trên MA50, sát MA20 thì mua thêm");
advice = advise({ ...fpt, price: 73 }, { ma20: 74, ma50: 70, sessions: 25, score: 50 }, { hasCandidates: true });
assert.equal(advice.kind, "sell", "Lãi nhỏ dưới MA20: chốt lời đuổi đi trước vốn chết");
advice = advise({ ...fpt, price: 73 }, { ma20: 72, ma50: 70, sessions: 25, score: 50 }, { hasCandidates: true });
assert.equal(advice.kind, "rotate", "Giữ ≥20 phiên, lãi <2%, điểm <70, có mã tốt hơn thì chuyển vốn");
assert.equal(advise({ ...fpt, price: 73 }, { ma20: 72, ma50: 70, sessions: 25, score: 50 }, { hasCandidates: false })?.kind, "buy",
  "Không có mã thay thế thì không gợi ý chuyển vốn");
assert.equal(advise({ ...fpt, price: 73 }, { since: "2026-01-01", ma20: 72.5, ma50: 70, sessions: 99, score: 50 }, { hasCandidates: true })?.kind, "buy",
  "Số phiên của chu kỳ cũ không được tính");
const ledger = holdingsFrom([
  { ticker: "TCX", side: "buy", qty: 800, price: 40.18, date: "2026-09-10" },
  { ticker: "TCX", side: "sell", qty: 400, price: 38, date: "2026-10-01" }
]);
assert.equal(ledger.TCX.qty, 400); assert.equal(ledger.TCX.cycleMaxQty, 800, "Sổ vị thế nhớ khối lượng lớn nhất chu kỳ");
const tcxBars = bars({ count: 80, start: 42, step: -0.06 }).map((row, index) => ({ ...row, date: dateAt(250 + index) }));
const alerts = portfolioAlerts({
  transactions: [{ ticker: "TCX", side: "buy", qty: 800, price: 40.18, date: tcxBars[30].date }],
  strategies: [], tickerMeta: {}, date: tcxBars.at(-1).date,
  historyByTicker: new Map([["TCX", tcxBars]]), benchmarkBars: benchmark, hasCandidates: true
});
assert.equal(alerts[0]?.advice.kind, "stop", "Bot phát hiện mã cần cắt lỗ từ giao dịch + lịch sử giá");
const text = telegramText(["Fin2"], [], [], alerts, [{ ticker: "HPG", totalScore: 82 }]);
assert.match(text, /Danh mục cần xử lý\n- TCX · Cắt lỗ 800 CP/, "Tin Telegram đưa cắt lỗ lên đầu");
assert.match(text, /Thay bằng: HPG 82/, "Tin Telegram kèm mã thay thế");

console.log("Smoke scoring + khung giờ + luật danh mục: OK");
