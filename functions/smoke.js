"use strict";

const assert = require("node:assert/strict");
const { scoreTicker, evaluateCandidate, evaluateFiveSession, fiveSessionPending, FORWARD_SESSIONS, normalizeConfig, DEFAULT_CONFIG } = require("./scoring");
const { selectResults } = require("./index")._private;
const { metrics, peerMedian, selectClosestPeers } = require("./ticker-analysis");

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

const fiveSessionBars = [
  { date: "2026-03-02", close: 50.5 },
  { date: "2026-03-03", close: 51 },
  { date: "2026-03-04", close: 52 },
  { date: "2026-03-05", close: 51.5 },
  { date: "2026-03-06", close: 55 },
  { date: "2026-03-09", close: 40 }
];
assert.equal(evaluateFiveSession({ ...signal, totalScore: 90 }, fiveSessionBars), null, "Đúng 90 điểm không thuộc báo cáo >90");
const newFive = evaluateFiveSession({ ...signal, totalScore: 91 }, []);
assert.equal(newFive.complete, false, "Chưa có phiên sau đề cử thì vẫn ở trạng thái chờ");
assert.equal(newFive.sessionsObserved, 0, "Bắt đầu theo dõi từ 0/5 phiên");
const waitingFive = evaluateFiveSession({ ...signal, totalScore: 91 }, fiveSessionBars.slice(0, 4));
assert.equal(waitingFive.complete, false, "Chưa đủ 5 phiên thì tiếp tục chờ");
assert.equal(waitingFive.sessionsObserved, 4, "Đếm đúng số phiên đã quan sát");
const completedFive = evaluateFiveSession({ ...signal, totalScore: 91 }, fiveSessionBars);
assert.equal(completedFive.complete, true, "Đủ phiên thứ 5 thì chốt kết quả");
assert.equal(completedFive.exitDate, "2026-03-06", "Chỉ dùng đúng phiên thứ 5");
assert.equal(completedFive.exitPrice, 55, "Giá thoát là giá đóng cửa phiên thứ 5");
assert.equal(completedFive.returnPct, 10, "Lãi/lỗ tính từ giá lúc đề cử");
const adjustedFive = evaluateFiveSession({ ...signal, totalScore: 91 }, [{ date: signal.date, close: 44 }, ...fiveSessionBars]);
assert.equal(adjustedFive.entryPrice, 44, "Giá mua lấy cùng chuỗi giá với phiên 5 khi có");
assert.equal(adjustedFive.returnPct, 25, "Lãi/lỗ tính trên giá mua cùng chuỗi giá");
assert.equal(completedFive.closes.length, 6, "Chép giá đóng cửa mọi phiên đã có sau đề cử, không dừng ở phiên 5");
assert.equal(completedFive.closes[5].close, 40, "Giá phiên 6 nằm trong chuỗi để app chọn số phiên");
const longBars = Array.from({ length: 25 }, (_, i) => ({ date: `2026-04-${String(i + 1).padStart(2, "0")}`, close: 50 + i }));
const longFive = evaluateFiveSession({ ...signal, totalScore: 91 }, longBars);
assert.equal(longFive.closes.length, FORWARD_SESSIONS, "Chuỗi giá dừng ở phiên 20");
assert.equal(fiveSessionPending({ totalScore: 91, fiveSessionEvaluation: longFive }), false, "Đủ 20 phiên thì thôi đo lại");
assert.equal(fiveSessionPending({ totalScore: 91, fiveSessionEvaluation: completedFive }), true, "Đã chốt phiên 5 nhưng chưa đủ 20 phiên thì đo tiếp");
assert.equal(fiveSessionPending({ totalScore: 91, fiveSessionEvaluation: { ...completedFive, closes: undefined } }), true, "Kết quả cũ chưa có chuỗi giá thì được điền bù");
assert.equal(fiveSessionPending({ totalScore: 90 }), false, "Đúng 90 điểm không thuộc báo cáo");

const targetMetrics = metrics("AAA", bars({ count: 90, start: 45, step: 0.1, volume: 1_000_000 }));
assert.equal(targetMetrics.return5Pct, 0.94, "So sánh tính đúng biến động 5 phiên");
assert.equal(targetMetrics.return20Pct, 3.85, "So sánh tính đúng biến động 20 phiên");
assert.equal(targetMetrics.return60Pct, 12.53, "So sánh tính đúng biến động 60 phiên");
const peerRows = [0.2, 0.5, 0.8, 1.1, 1.5, 2, 5].map((ratio, index) => ({
  ...targetMetrics, ticker:`P${index}`, avgValue20:targetMetrics.avgValue20 * ratio
}));
peerRows.push({ ...targetMetrics, ticker:"AAA" });
peerRows.push({ ...targetMetrics, ticker:"OLD", date:"2025-01-01" });
const closest = selectClosestPeers(targetMetrics, peerRows);
assert.equal(closest.length, 5, "Chỉ lấy tối đa 5 mã tương đương");
assert.ok(!closest.some((row) => row.ticker === "AAA" || row.ticker === "OLD"), "Loại chính mã đang chấm và mã lệch ngày");
assert.deepEqual(closest.map((row) => row.ticker), ["P3", "P2", "P4", "P1", "P5"], "Ưu tiên mã gần thanh khoản theo tỷ lệ");
assert.equal(peerMedian([{ return20Pct:1 }, { return20Pct:5 }, { return20Pct:3 }]).return20Pct, 3, "Trung vị nhóm được tính đúng");

// Khối ngoại 5 phiên: mua ròng đều được cộng, bán ròng đều bị trừ, thiếu/hết room thì trung lập 5.
const { foreignFlow } = require("./scoring").decisionInputs;
const flowBars = bars(); // ~75 tỷ/phiên → 5 phiên ~375 tỷ
const flowRows = (net, room = 1e8) => flowBars.slice(-5).map((bar) => ({ date: bar.date, netVal: net, currentRoom: room, totalRoom: 1e9 }));
const buying = foreignFlow(flowRows(5e9), flowBars);
assert.equal(buying.status, "ok", "Đủ 5 phiên khớp ngày thì chấm");
assert.equal(buying.buyScore, 10, "Mua ròng 5/5 phiên, ~6,7% giá trị → đủ 10 điểm mua");
assert.equal(buying.sellScore, 0, "Mua ròng đều → không có áp lực bán từ khối ngoại");
assert.equal(foreignFlow(flowRows(-5e9), flowBars).sellScore, 10, "Bán ròng đều → áp lực bán tối đa");
assert.equal(foreignFlow(flowRows(5e9, 1e6), flowBars).status, "room-full", "Hết room ngoại → trung lập");
assert.equal(foreignFlow(flowRows(5e9, 1e6), flowBars).buyScore, 5, "Hết room ngoại không được cộng điểm");
assert.equal(foreignFlow(null, flowBars).buyScore, 5, "Không có dữ liệu → trung lập 5");
assert.equal(foreignFlow(flowRows(5e9).slice(0, 3), flowBars).status, "missing", "Thiếu phiên thì không chấm");
const lagged = flowRows(5e9).map((row, i, all) => ({ ...row, date: i ? all[i - 1].date : dateAt(84) }));
assert.equal(foreignFlow(lagged, flowBars).status, "ok", "Nguồn chậm 1 phiên vẫn dùng được");
const neutralTotal = scoreTicker("TEST", breakout, benchmark).totalScore;
assert.ok(scoreTicker("TEST", breakout, benchmark, DEFAULT_CONFIG, flowRows(1e10)).totalScore === neutralTotal + 5,
  "Khối ngoại mua mạnh cộng thêm 5 so với trung lập");
assert.ok(strong.riskFlags.includes("Chưa có dữ liệu khối ngoại"), "Thiếu dữ liệu khối ngoại phải báo cờ");
const { scoreDecision, POLICY } = require("./decision-scoring");
const decision = scoreDecision({ ticker: "TEST", bars: breakout, benchmark, sector: { available: false, strength: 0 },
  position: { qty: 100, avgCost: 40 }, targetBuy: null, strategy: { buyDrop: 2, sellRise: 3 }, foreignRows: flowRows(-1e10), phase: "post" });
assert.equal(decision.buyParts.foreign, 0, "Điểm Mua: khối ngoại bán ròng mạnh → 0");
assert.equal(decision.sellParts.foreign, 10, "Áp lực Bán: khối ngoại bán ròng mạnh → 10");
Object.entries(POLICY.buyWeights).forEach(([key, max]) => assert.ok(decision.buyParts[key] <= max, `Phần Mua ${key} không vượt ${max}`));
Object.entries(POLICY.sellWeights).forEach(([key, max]) => assert.ok(decision.sellParts[key] <= max, `Phần Bán ${key} không vượt ${max}`));

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
