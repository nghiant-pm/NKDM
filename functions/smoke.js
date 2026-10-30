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

// Cung-cầu v2.0.0: tinh chỉnh trên mốc T+. Đủ 30 mẫu + 5 phiên nền mới có nhận xét; tường mua kê rồi rút = lực bán còn mạnh.
const orderflow = require("./orderflow");
const bookSample = (index, bid, ask, side = "B", totalVolume = index * 1000) => ({
  ticker:"HPG", capturedAt:new Date(Date.UTC(2026, 9, 7, 2, index)).toISOString(), price:50 + index * .01,
  totalVolume, lastVolume:1000, side,
  bids:[{ price:49.9, quantity:bid }, { price:49.8, quantity:bid * .7 }, { price:49.7, quantity:bid * .5 }],
  asks:[{ price:50.1, quantity:ask }, { price:50.2, quantity:ask * .7 }, { price:50.3, quantity:ask * .5 }]
});
const flow = (samples, extra = {}) => orderflow.scoreOrderflow({ samples, seedSessions:5, ...extra });
const buyingBooks = Array.from({ length:30 }, (_, index) => bookSample(index, 100000 + index * 4000, 10000));
const sellingBooks = Array.from({ length:30 }, (_, index) => bookSample(index, 10000, 100000 + index * 4000, "S"));
// Giá hiện tại 50,29. Mã theo dõi giá kỳ vọng 51 → đã tới mốc mua.
assert.equal(flow(buyingBooks).action, "wait", "Không có mốc T+ thì máy cung cầu không tự ra hành động");
const buyNow = flow(buyingBooks, { buyAt:51 });
assert.equal(buyNow.action, "buy", "Tới mốc mua và lực bán yếu phải ra Mua ngay");
assert.ok(buyNow.suggestedPrice <= 50.29, "Mua ngay không trả cao hơn giá hiện tại");
assert.equal(flow(buyingBooks, { buyAt:50 }).action, "wait", "Giá chưa về mốc mua thì chưa có hành động");
assert.equal(flow(buyingBooks, { buyAt:50 }).buyAdvice.verdict, "now", "Chưa tới mốc vẫn có sẵn nhận xét để app ghép vào dòng T+");
assert.ok(flow(buyingBooks, { buyAt:50 }).buyAdvice.price <= 50, "Giá mua không bao giờ cao hơn mốc T+");
assert.equal(flow(buyingBooks.slice(16), { buyAt:51 }).buyAdvice, null, "Chưa đủ 15 phút thì không có nhận xét");
const early = flow(buyingBooks.slice(1), { buyAt:51 });
assert.ok(early.ready && early.provisional && /sơ bộ/.test(early.buyAdvice.reason), "Đủ 15 phút nhưng chưa đủ 30 phút là nhận xét sơ bộ");
assert.equal(buyNow.provisional, false, "Đủ 30 phút thì không còn sơ bộ");
assert.equal(flow(buyingBooks, { buyAt:51, seedSessions:4 }).buyAdvice, null, "Thiếu 5 phiên nền thì không có nhận xét");
const buyWait = flow(sellingBooks, { buyAt:51 });
assert.equal(buyWait.action, "buy-wait", "Tới mốc mua nhưng lực bán còn mạnh phải Chờ");
assert.ok(buyWait.suggestedPrice < 50.29 && buyWait.suggestedPrice >= 50.29 * .97, "Chờ mua phải gợi ý giá thấp hơn, trong 3%");
const fakeWall = buyingBooks.slice(0, 29).concat(bookSample(29, 1000, 10000, "S", 29001));
const fakeScore = flow(fakeWall, { buyAt:51 });
assert.ok(fakeScore.buySpoofRisk > 40, "Tường mua bị rút phải vượt ngưỡng rủi ro");
assert.equal(fakeScore.action, "buy-wait", "Tường mua biến mất = cầu giả, không được Mua ngay");
const withSupport = flow(sellingBooks, { buyAt:51, levels:{ support:[49.5], resistance:[] } });
assert.equal(withSupport.suggestedPrice, 49.5, "Mốc hỗ trợ nhiều phiên trong 3% được ưu tiên hơn lệnh treo");
const farSupport = flow(sellingBooks, { buyAt:51, levels:{ support:[45], resistance:[] } });
assert.ok(farSupport.zone.low > 48.7, "Mốc xa hơn 3% không vào vùng");
// Mã đang giữ giá vốn 47, mốc bán 50 → đã tới mốc bán.
const sellHold = flow(buyingBooks, { held:true, avgCost:47, sellAt:50 });
assert.equal(sellHold.action, "sell-hold", "Tới mốc bán nhưng cầu còn mạnh phải Giữ thêm");
assert.ok(sellHold.suggestedPrice > 50.29 && sellHold.suggestedPrice <= 50.29 * 1.03, "Giữ thêm phải gợi ý giá bán cao hơn, trong 3%");
const sellNow = flow(sellingBooks, { held:true, avgCost:47, sellAt:50 });
assert.equal(sellNow.action, "sell", "Tới mốc bán và cầu yếu phải Bán ngay");
assert.ok(sellNow.suggestedPrice >= 50.29, "Bán ngay không thấp hơn giá hiện tại");
// Không bao giờ khuyến nghị bán lỗ: kể cả mốc T+ đặt thấp, giá bán ≥ giá vốn +1%.
const lossSell = flow(sellingBooks, { held:true, avgCost:55, sellAt:50 });
assert.notEqual(lossSell.action, "sell", "Dưới giá vốn không được ra Bán");
assert.ok(lossSell.sellAdvice.price >= 55 * 1.01, "Giá bán luôn từ giá vốn +1%");
// Mua thêm chỉ ≤ giá vốn −1%.
assert.equal(flow(buyingBooks, { held:true, avgCost:52, buyAt:50.5 }).action, "buy", "Tới mốc mua thêm và lực bán yếu phải Mua ngay");
const costCap = flow(buyingBooks, { held:true, avgCost:50.5, buyAt:51 });
assert.notEqual(costCap.action, "buy", "Giá chưa thấp hơn giá vốn 1% không được Mua thêm");
assert.ok(costCap.buyAdvice.price <= 50.5 * .99, "Giá mua thêm luôn ≤ giá vốn −1%");
const blocked = flow(sellingBooks, { held:true, avgCost:40, sellAt:43, hold:true });
assert.equal(blocked.sellAdvice, null, "Mã Giữ không có nhận xét bán");
assert.equal(blocked.action, "wait", "Mã Giữ không được phát Bán");
// Chống nhảy: đổi nhận xét phải lặp 3 lần liên tiếp; thiếu dữ liệu thì bỏ ngay.
let smoothed = orderflow.nextState(buyNow, buyWait);
assert.equal(smoothed.action, "buy", "Một lần đo ngược chiều chưa được đổi nhận xét");
smoothed = orderflow.nextState(orderflow.nextState(smoothed, buyWait), buyWait);
assert.equal(smoothed.action, "buy-wait", "Ba lần liên tiếp thì đổi sang Chờ");
assert.equal(orderflow.nextState(buyNow, flow(buyingBooks.slice(16), { buyAt:51 })).action, "wait", "Thiếu dữ liệu không được giữ hành động cũ");
const levelBars = Array.from({ length:25 }, (_, index) => ({ date:"2026-09-" + String(index + 1).padStart(2, "0"),
  open:50, high:52 + index * .01, low:48 - index * .01, close:49.03, volume:1000 })).concat({ date:"2026-10-07", open:50, high:60, low:40, close:50, volume:1 });
const levels = orderflow.sessionLevels(levelBars, "2026-10-07");
assert.equal(levels.low20, orderflow.toTick(48 - 24 * .01), "Đáy 20 phiên không lấy nến hôm nay");
assert.equal(levels.nodes[0], 49.05, "Giá lịch sử lẻ phải làm tròn về bước giá");
// Mã nằm sàn (bên mua trống) vẫn phải đọc được sổ lệnh.
const floorQuote = orderflow.parseVpsQuote({ sym:"PNJ", lastPrice:18.75, r:20.15, lot:3693380, side:"S",
  g1:"0.0|0|d", g2:"0.0|0|d", g3:"0.0|0|d", g4:"18.75|373360|f", g5:"18.8|4380|d", g6:"18.85|1370|d" });
assert.ok(floorQuote && floorQuote.bids.length === 0 && floorQuote.asks.length === 3, "Mã nằm sàn vẫn có dữ liệu cung cầu");
// Tỷ lệ phủ tính trên 30 phút đồng hồ: rơi rớt quá 20% hoặc mẫu buổi sáng bù cho buổi chiều đều phải Chờ.
const thinned = buyingBooks.filter((_, index) => index % 3 !== 1);
assert.equal(orderflow.scoreOrderflow({ samples:thinned, seedSessions:5 }).ready, false, "Chỉ 20/30 phút có mẫu phải Chờ");
const afterLunch = buyingBooks.concat(Array.from({ length:10 }, (_, index) => ({ ...bookSample(29, 130000, 10000),
  capturedAt:new Date(Date.UTC(2026, 9, 7, 6, index)).toISOString() })));
assert.equal(orderflow.scoreOrderflow({ samples:afterLunch, seedSessions:5 }).ready, false, "Mẫu 9 giờ không được đếm bù cho đầu phiên chiều");
// v2.1.0: khung 30 phút nối qua nghỉ trưa — 11:00–11:29 + 13:00–13:04 là đủ 30 phút liên tục.
const lunchBridge = Array.from({ length:35 }, (_, index) => ({ ...bookSample(index, 100000 + index * 4000, 10000),
  capturedAt:new Date(Date.UTC(2026, 9, 7, index < 30 ? 4 : 6, index < 30 ? index : index - 30)).toISOString() }));
const bridged = orderflow.scoreOrderflow({ samples:lunchBridge, seedSessions:5 });
assert.ok(bridged.ready && !bridged.provisional, "Đầu phiên chiều nối với cuối phiên sáng, không phải chờ tới 13:30");
const lunchRefresh = { capturedAt:new Date(Date.UTC(2026, 9, 7, 5)).toISOString() };
assert.equal(orderflow.minuteOf(lunchRefresh), orderflow.minuteOf(lunchBridge[29]) + 1, "Mẫu giờ nghỉ trưa dồn về 11:30");
const learning = orderflow.nextState({ action:"buy", orderflowVersion:orderflow.VERSION },
  orderflow.scoreOrderflow({ samples:buyingBooks.slice(16), seedSessions:5 }));
assert.equal(learning.action, "wait", "Thiếu dữ liệu không được giữ hành động cũ");
// Nền các phiên trước: phiên gần nặng hơn; tự thu chưa đủ mẫu thì không tin; sơ bộ nghiêng theo nền, đủ 30 phút gần như không.
assert.equal(orderflow.baselineLean([{ date:"2026-10-06", lean:-1 }, { date:"2026-10-07", lean:1 }]), 0.333, "Phiên gần hơn nặng hơn");
assert.equal(orderflow.baselineLean([{ date:"2026-10-07", buyRemaining:300, sellRemaining:100, avgBuyOrder:1, avgSellOrder:1 }]), 0.35,
  "Nền cũ chưa có độ nghiêng thì tính từ dư mua/dư bán");
assert.equal(orderflow.sessionLean(buyingBooks), null, "Phiên tự thu dưới 150 mẫu không dùng làm nền");
const fullDay = Array.from({ length:200 }, (_, index) => bookSample(index, 50000, 10000, "B", index * 1000));
assert.ok(orderflow.sessionLean(fullDay) > 0, "Phiên tự thu nghiêng mua cho độ nghiêng dương");
const earlySell = sellingBooks.slice(14);
const leanBuy = flow(earlySell, { baselineLean:1 }), leanSell = flow(earlySell, { baselineLean:-1 });
assert.ok(leanBuy.provisional && leanBuy.buyScore - leanSell.buyScore > 40, "Sơ bộ: nền chiếm phần lớn điểm");
assert.ok(flow(sellingBooks, { baselineLean:1 }).buyScore - flow(sellingBooks, { baselineLean:-1 }).buyScore <= 10.01,
  "Đủ 30 phút: nền chỉ cộng/trừ tối đa 5 điểm");

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

// MA: đếm phiên đóng cửa liên tiếp trên MA, Telegram chỉ báo mã mới đủ số phiên / vừa rơi xuống.
const { maStreak, maInZone, activeStrategy: pickStrategy } = require("./decision-service");
const { maChanges, telegramText } = require("./index")._private;
const closesToBars = (closes) => closes.map((close, i) => ({ date: `2026-10-${String(i + 1).padStart(2, "0")}`, close }));
const base10 = Array(10).fill(10);
const rising = closesToBars([...base10, 11, 12, 13, 14, 15]);
const r5 = maStreak(rising, 10);
assert.deepEqual([r5.streak, r5.prevStreak, r5.rise, r5.since], [5, 4, 5, "2026-10-11"], "Cắt lên + 5 phiên trên MA10, MA đi lên 5 phiên");
const fell = closesToBars([...base10, 11, 12, 13, 14, 15, 16, 9]);
assert.deepEqual([maStreak(fell, 10).streak, maStreak(fell, 10).prevStreak], [0, 6], "Rơi xuống dưới MA10 → về 0");
assert.equal(maStreak(closesToBars([10, 11, 12]), 10).streak, 0, "Chưa đủ 10 phiên thì không tính");
// MA50 cho luật cắt lỗ của app (30/10/2026): trung bình 50 phiên cuối, thiếu 50 phiên → null.
assert.equal(maStreak(closesToBars(Array.from({ length: 60 }, (_, i) => i + 1)), 10).ma50, 35.5, "MA50 = TB 50 phiên cuối");
assert.equal(maStreak(closesToBars([10, 11, 12]), 10).ma50, null, "Chưa đủ 50 phiên thì MA50 null");
const maRule = pickStrategy([], "2026-10-13");
assert.deepEqual([maRule.maLength, maRule.maDays, maRule.maMaxDays], [10, 5, 15], "Mặc định MA10 · 5–15 phiên");
assert.deepEqual([pickStrategy([{ effectiveFrom: "2026-10-01", maLength: 20, maDays: 3 }], "2026-10-13").maLength,
  pickStrategy([{ effectiveFrom: "2026-10-01", buyDrop: 2 }], "2026-10-13").maMaxDays], [20, 15], "Phiên bản cũ thiếu MA thì rơi về mặc định");
assert.ok(maInZone(5, 5, maRule) && !maInZone(16, 16, maRule) && !maInZone(8, 3, maRule) && !maInZone(4, 4, maRule), "Vùng mua: 5–15 phiên và MA đi lên ≥5");
const longRun = closesToBars([...base10, ...Array.from({ length: 16 }, (_, i) => 11 + i)]);
assert.equal(maStreak(longRun, 10).streak, 16, "Trên MA 16 phiên");
const ma = maChanges(new Set(["AAA", "BBB", "CCC", "DDD"]),
  new Map([["AAA", rising], ["BBB", fell], ["CCC", closesToBars([10, 11])], ["DDD", longRun]]), maRule);
assert.deepEqual([ma.entered, ma.dropped, ma.expired], [["AAA"], ["BBB"], ["DDD"]], "Telegram: AAA mới vào, BBB rơi, DDD quá 15 phiên");
assert.match(telegramText(["H"], [], [], normalizeConfig(), ma), /Vùng mua MA10 · 5–15[\s\S]*Mới vào: AAA[\s\S]*Rơi xuống dưới MA: BBB[\s\S]*Quá 15 phiên, bỏ qua: DDD/, "Tin có mục MA");
assert.doesNotMatch(telegramText(["H"], [], [], normalizeConfig(), { ...ma, entered: [], dropped: [], expired: [], flat: [] }), /MA10/, "Không đổi thì không thêm dòng");
// Kiểu MWG 13/10/2026: tăng lên đỉnh rồi giảm 4 phiên về sát MA, MA vẫn đi lên → trong vùng nhưng phải CHỜ bật lên.
const pullback = closesToBars([...base10, 11, 12, 13, 14, 15, 14.8, 14.6, 14.4, 14.2]);
const pb = maStreak(pullback, 10);
assert.ok(maInZone(pb.streak, pb.rise, maRule) && !pb.up && pb.down === 4, "Giảm về MA: trong vùng, phiên cuối giảm, giảm 4 phiên liền");
const bounce = maStreak(closesToBars([...base10, 11, 12, 13, 14, 15, 14.8, 14.6, 14.9]), 10);
assert.ok(bounce.up && !bounce.prevUp && bounce.down === 0, "Bật lên: phiên cuối tăng sau phiên giảm");
const mb = maChanges(new Set(["PBK", "BNC"]), new Map([["PBK", pullback], ["BNC", closesToBars([...base10, 11, 12, 13, 14, 15, 14.8, 14.6, 14.9])]]), maRule);
assert.deepEqual(mb.bounced, ["BNC"], "Telegram: BNC bật lên lại");
assert.match(telegramText(["H"], [], [], normalizeConfig(), mb), /Bật lên lại, mua được: BNC/, "Tin có dòng bật lên");

// Kế hoạch chiều (23/10/2026): giờ nghỉ trưa, tóm tắt sơ bộ, đo khớp chiều + 5 phiên.
const noonPlan = require("./noon-plan");
const { vnClock } = require("./decision-service");
assert.deepEqual([vnClock(new Date("2026-10-23T04:30:00Z")).noon, vnClock(new Date("2026-10-23T05:59:00Z")).noon,
  vnClock(new Date("2026-10-23T06:00:00Z")).noon, vnClock(new Date("2026-10-23T04:29:00Z")).noon], [true, true, false, false], "Giờ nghỉ trưa 11:30–13:00");
const noonRows = [
  { ticker: "AAA", riskFlags: [], maTrend: { streak: 4 }, maTrendNoon: { date: "2026-10-23", close: 50, streak: 6, rise: 6, up: true } },
  { ticker: "NEW", riskFlags: [], maTrend: { streak: 0 }, maTrendNoon: { date: "2026-10-23", close: 50, streak: 6, rise: 6, up: true } },
  { ticker: "BBB", riskFlags: ["VN-Index đang yếu"], maTrendNoon: { date: "2026-10-23", close: 20, streak: 0, rise: 0, up: false } },
  { ticker: "OLD", riskFlags: [], maTrendNoon: { date: "2026-10-22", close: 1, streak: 6, rise: 6, up: true } }];
const ns = noonPlan.noonSummary({ rows: noonRows, positions: { BBB: { qty: 100, avgCost: 23 } }, watch: {}, hold: new Set(),
  strategy: maRule, date: "2026-10-23" });
// BBB đang giữ, lỗ 13% → cắt lỗ; mã đang giữ không còn "Mua T+" (30/10/2026).
assert.deepEqual([ns.weak, ns.stop, ns.buy, ns.ma, ns.sell], [true, ["BBB"], [], ["AAA"], []], "Trưa: MA tạm cần nền phiên trước, bỏ bản trưa ngày cũ");
assert.match(noonPlan.noonText(ns, "2026-10-23", 1), /Chạy bóng phiên 1\/10[\s\S]*Cắt lỗ: BBB[\s\S]*Mua theo MA: AAA/, "Tin trưa");
const ev = noonPlan.evaluateNoonItem({ key: "buy_AAA", ticker: "AAA", side: "buy", kind: "buy", limitPrice: 49 },
  [{ capturedAt: "2026-10-23T03:00:00Z", price: 40 }, { capturedAt: "2026-10-23T06:05:00Z", price: 49.5 }],
  closesToBars([50, 51, 52, 53, 54]).map((b, i) => ({ ...b, date: "2026-10-2" + (4 + i) })), "2026-10-23", []);
assert.deepEqual([ev.filled, ev.returnPct, ev.sessions], [false, null, 5], "Giá sáng không tính khớp chiều");

console.log("Smoke scoring + khung giờ: OK");
