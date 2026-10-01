"use strict";

const assert = require("node:assert/strict");
const { scoreTicker, evaluateCandidate, normalizeConfig, DEFAULT_CONFIG } = require("./scoring");
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

const ranked = selectResults([
  ...Array.from({ length: 7 }, (_, index) => ({ ticker: `N${index}`, group: "new", totalScore: 95 - index, relativeStrengthScore: 20 })),
  { ticker: "W0", group: "watchlist", totalScore: 72, relativeStrengthScore: 10 },
  { ticker: "W1", group: "watchlist", totalScore: 71, relativeStrengthScore: 10 }
]);
assert.equal(ranked.fresh.length, 5, "Mã mới chỉ lấy tối đa maxNew (mặc định 5)");
assert.deepEqual(ranked.watched.map((row) => row.ticker), ["W0", "W1"], "Mã theo dõi đạt chuẩn không bị mã mới điểm cao chiếm chỗ");
assert.equal(selectResults(ranked.selected, normalizeConfig({ minScore: 80, maxNew: 2 })).selected.length, 2, "Owner đổi điểm tối thiểu / số mã mới thì áp dụng ngay");

const { watchGapText } = require("./index")._private;
assert.match(watchGapText({ close: 52.3, targetBuy: 50 }), /Còn 2,3 điểm tới giá kỳ vọng 50/, "Mã theo dõi ghi khoảng cách tới giá kỳ vọng");
assert.match(watchGapText({ close: 49, targetBuy: 50 }), /Đã tới giá kỳ vọng/, "Dưới giá kỳ vọng thì báo đã tới");
assert.equal(watchGapText({ close: 49 }), "", "Không có giá kỳ vọng thì bỏ dòng");

assert.deepEqual(normalizeConfig({ minScore: "abc", fitMin: 80, fitMax: 60, winPct: 8 }),
  { ...DEFAULT_CONFIG, winPct: 8 }, "Giá trị sai rơi về mặc định từng khoá");
const loose = scoreTicker("HIGH", bars({ start: 100, step: 0.2 }), benchmark, normalizeConfig({ fitMin: 90, fitMax: 130 }));
assert.equal(loose.priceFitScore, 10, "Vùng giá phù hợp đọc từ thông số owner");
const wide = evaluateCandidate({ ...signal, evalWinPct: 10, evalLossPct: 10, evalSessions: 5 }, future, benchmark);
assert.equal(wide.primary, "timeout", "Ngưỡng đo đọc từ chính kết quả đã lưu");
assert.equal(wide.complete, true, "Số phiên đo đọc từ chính kết quả đã lưu");

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

console.log("Smoke scoring + khung giờ: OK");
