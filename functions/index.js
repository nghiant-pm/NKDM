"use strict";

const { setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const UNIVERSE = require("./universe");
const { scoreTicker, evaluateCandidate, SCORE_VERSION, MIN_SCORE } = require("./scoring");

initializeApp();
setGlobalOptions({ region: "asia-southeast1", maxInstances: 1 });

const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = defineSecret("TELEGRAM_CHAT_ID");
/* VNDirect thay VPS từ 24/09/2026: VPS không nhận kết nối từ Google Cloud (#012).
   Cùng định dạng TradingView, giá trùng VPS tới 0,001. `public/index.html` dùng CÙNG nguồn
   cho nút Quét ngay để điểm hai bên khớp nhau. */
const HISTORY_API = "https://dchart-api.vndirect.com.vn/dchart/history";
const TIME_ZONE = "Asia/Ho_Chi_Minh";
const MAX_RESULTS = 5;
const MAX_MISSING_RATIO = 0.2;
const HISTORY_DAYS = 240;

/* Khung giờ gửi Telegram owner bật/tắt được. Bản sao có chủ ý của SCREENING_SLOTS trong
   public/index.html — thêm/bớt khung phải sửa cả hai. Chỉ lượt "post" được ghi lịch sử. */
const SLOTS = [
  { id: "0830", time: "08:30", phase: "pre" },
  { id: "1030", time: "10:30", phase: "intraday" },
  { id: "1330", time: "13:30", phase: "intraday" },
  { id: "1530", time: "15:30", phase: "post" },
  { id: "1600", time: "16:00", phase: "post" },
  { id: "2000", time: "20:00", phase: "post" }
];
const DEFAULT_SLOTS = { "1600": true };

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function dateInZone(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(value).reduce((out, part) => {
    if (part.type !== "literal") out[part.type] = part.value;
    return out;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/* Khung giờ ứng với thời điểm chạy, làm tròn xuống bội số 30 phút (Scheduler có thể trễ vài giây). */
function slotAt(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(value).reduce((out, part) => {
    if (part.type !== "literal") out[part.type] = part.value;
    return out;
  }, {});
  const id = parts.hour + (Number(parts.minute) < 30 ? "00" : "30");
  return SLOTS.find((slot) => slot.id === id) || null;
}

function slotEnabled(settings, slotId) {
  const slots = settings && settings.slots;
  return slots && typeof slots === "object" ? slots[slotId] === true : DEFAULT_SLOTS[slotId] === true;
}

/* Phiên dùng để chấm: trước giờ mở cửa lấy phiên gần nhất đã đóng; trong/sau phiên phải có
   nến hôm nay, không có tức là ngày nghỉ. */
function marketDateFor(phase, date, benchmarkBars) {
  if (phase === "pre") {
    const closed = benchmarkBars.filter((bar) => bar.date < date);
    return closed.at(-1)?.date || null;
  }
  return benchmarkBars.at(-1)?.date === date ? date : null;
}

function parseHistory(payload) {
  if (!payload || payload.s !== "ok" || !Array.isArray(payload.t)) return [];
  const rows = payload.t.map((timestamp, index) => ({
    date: dateInZone(new Date(Number(timestamp) * 1000)),
    timestamp: Number(timestamp),
    open: Number(payload.o?.[index]),
    high: Number(payload.h?.[index]),
    low: Number(payload.l?.[index]),
    close: Number(payload.c?.[index]),
    volume: Number(payload.v?.[index])
  })).filter((row) => [row.timestamp, row.open, row.high, row.low, row.close, row.volume].every(Number.isFinite));
  return rows.sort((a, b) => a.timestamp - b.timestamp);
}

async function fetchHistory(ticker, historyDays = HISTORY_DAYS, maxAttempts = 2) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - historyDays * 86400;
  const url = `${HISTORY_API}?symbol=${encodeURIComponent(ticker)}&resolution=D&from=${from}&to=${to}`;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        // VNDirect trả 406 nếu accept chỉ là application/json.
        headers: { accept: "*/*", "user-agent": "Mozilla/5.0 (Fin2-Screener)" },
        signal: AbortSignal.timeout(9000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = parseHistory(await response.json());
      if (!rows.length) throw new Error("không có dữ liệu");
      return rows;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) await wait(attempt * 1500);
    }
  }
  throw new Error(`${ticker}: lỗi nguồn dữ liệu sau ${maxAttempts} lần thử (${lastError?.message || lastError})`);
}

async function mapWithConcurrency(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try { output[index] = { ok: true, value: await worker(items[index]) }; }
      catch (error) { output[index] = { ok: false, error }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return output;
}

function heldTickers(transactions) {
  const qty = {};
  transactions.forEach((row) => {
    const ticker = String(row.ticker || "").toUpperCase();
    const amount = Number(row.qty || 0);
    if (!ticker || !Number.isFinite(amount)) return;
    qty[ticker] = (qty[ticker] || 0) + (row.side === "sell" ? -amount : amount);
  });
  return new Set(Object.keys(qty).filter((ticker) => qty[ticker] > 0.0001));
}

function scoreOrder(a, b) {
  return b.totalScore - a.totalScore || b.relativeStrengthScore - a.relativeStrengthScore || a.ticker.localeCompare(b.ticker);
}

function rank(rows, group) {
  return rows.filter((row) => row.group === group && row.totalScore >= MIN_SCORE)
    .sort(scoreOrder)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function selectResults(rows) {
  const top = rows.slice().sort(scoreOrder).slice(0, MAX_RESULTS);
  const fresh = rank(top, "new");
  const watched = rank(top, "watchlist");
  return { fresh, watched, selected: [...fresh, ...watched] };
}

function viDate(date) {
  const [y, m, d] = String(date).split("-");
  return `${d}/${m}/${y}`;
}

function telegramHeader(slot, date, marketDate, trial) {
  if (slot.phase === "pre") return [`Fin2 · Trước phiên ${viDate(date)} · ${slot.time}`, `Theo phiên ${viDate(marketDate)} · Công thức ${SCORE_VERSION}`];
  if (slot.phase === "intraday") return [`Fin2 · Trong phiên ${viDate(date)} · ${slot.time}`, `Tạm tính, nến hôm nay chưa đóng · Công thức ${SCORE_VERSION}`];
  return [`Fin2 · Sàng lọc ${viDate(date)} · ${slot.time}`,
    (trial && trial.isTrial ? `Thử nghiệm ${trial.trialSession}/20 · ` : "") + `Công thức ${SCORE_VERSION}`];
}

function telegramText(header, fresh, watched) {
  const lines = header.slice();
  if (!fresh.length && !watched.length) return lines.concat("", "Không có mã đạt chuẩn 70 điểm.").join("\n");
  if (fresh.length) {
    lines.push("", "Cơ hội mới");
    fresh.forEach((row) => lines.push(`${row.rank}. ${row.ticker} · ${row.totalScore} điểm · ${row.close.toFixed(2)}`, `   ${row.reasons.join(" · ")}`));
  }
  if (watched.length) {
    lines.push("", "Đang theo dõi");
    watched.forEach((row) => lines.push(`${row.rank}. ${row.ticker} · ${row.totalScore} điểm · ${row.close.toFixed(2)}`, `   ${row.reasons.join(" · ")}`));
  }
  lines.push("", "Chỉ là đề cử để xem xét, không tự tạo lệnh.");
  return lines.join("\n");
}

async function sendTelegram(token, chatId, text) {
  if (!token || !chatId) throw new Error("Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) throw new Error(`Telegram: ${payload.description || response.status}`);
}

async function updateEvaluations(db, historyByTicker, benchmarkBars) {
  const snapshot = await db.collection("screening_results").get();
  const pending = snapshot.docs.filter((item) => item.data()?.evaluation?.complete !== true);
  if (!pending.length) return 0;
  let batch = db.batch();
  let writes = 0;
  let total = 0;
  for (const item of pending) {
    const data = item.data();
    const bars = historyByTicker.get(data.ticker);
    if (!bars) continue;
    batch.update(item.ref, { evaluation: evaluateCandidate(data, bars, benchmarkBars), evaluatedAt: FieldValue.serverTimestamp() });
    writes += 1;
    total += 1;
    if (writes === 400) { await batch.commit(); batch = db.batch(); writes = 0; }
  }
  if (writes) await batch.commit();
  return total;
}

/* Khoá theo KHUNG GIỜ: mỗi `screening_slots/{ngày}_{khung}` chỉ gửi Telegram một lần,
   kể cả khi Scheduler gọi lặp. */
async function acquireSlot(db, date, slot) {
  const ref = db.collection("screening_slots").doc(`${date}_${slot.id}`);
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const old = snap.exists ? snap.data() : null;
    if (old?.notificationAttemptedAt || old?.status === "holiday") return { ref, skip: true, reason: "slot-done" };
    const updatedMillis = old?.updatedAt?.toMillis?.() || 0;
    if (old?.status === "running" && Date.now() - updatedMillis < 20 * 60 * 1000) return { ref, skip: true, reason: "already-running" };
    transaction.set(ref, {
      date, slot: slot.id, time: slot.time, phase: slot.phase, status: "running",
      startedAt: old?.startedAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { ref, skip: false };
  });
}

async function claimNotification(db, ref, type) {
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (snap.data()?.notificationAttemptedAt) return false;
    transaction.set(ref, {
      notificationType: type,
      notificationAttemptedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return true;
  });
}

async function markFailure(db, slotRef, runRef, date, slot, error, token, chatId) {
  const message = String(error?.message || error).slice(0, 500);
  await slotRef.set({ status: "failed", error: message, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  if (runRef) {
    const run = (await runRef.get()).data();
    if (!["completed", "empty"].includes(run?.status)) {
      await runRef.set({ date, status: "failed", error: message, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  }
  if (!await claimNotification(db, slotRef, "failure")) return;
  try {
    await sendTelegram(token, chatId, `Fin2 · Bot sàng lọc lỗi ${viDate(date)} · ${slot.time}\n${message}`);
    await slotRef.set({ notificationSentAt: FieldValue.serverTimestamp() }, { merge: true });
  } catch (notifyError) {
    logger.error("Không gửi được Telegram báo lỗi", notifyError);
  }
}

/* Tải + chấm điểm, không ghi gì. `marketDate === null` nghĩa là không có phiên để chấm. */
async function scanMarket({ phase, date, held, watchlist, extraTickers }) {
  const symbols = [...new Set([...UNIVERSE, ...watchlist, ...extraTickers])].filter(Boolean).sort();
  const benchmarkAll = await fetchHistory("VNINDEX", HISTORY_DAYS, 3);
  const marketDate = marketDateFor(phase, date, benchmarkAll);
  if (!marketDate) return { marketDate: null, latestMarketDate: benchmarkAll.at(-1)?.date || null };
  const upTo = (bars) => bars.filter((bar) => bar.date <= marketDate);
  const benchmarkBars = upTo(benchmarkAll);

  const fetched = await mapWithConcurrency(symbols, 5, fetchHistory);
  const historyByTicker = new Map();
  const failures = [];
  fetched.forEach((item, index) => {
    const bars = item.ok ? upTo(item.value) : [];
    if (bars.at(-1)?.date === marketDate) historyByTicker.set(symbols[index], bars);
    else failures.push(symbols[index]);
  });
  const missingRatio = failures.length / symbols.length;
  if (missingRatio > MAX_MISSING_RATIO) throw new Error(`Thiếu dữ liệu ${failures.length}/${symbols.length} mã (${Math.round(missingRatio * 100)}%)`);

  const scored = [];
  historyByTicker.forEach((bars, ticker) => {
    if (held.has(ticker) && !watchlist.has(ticker)) return;
    const result = scoreTicker(ticker, bars, benchmarkBars);
    if (!result.eligible) return;
    scored.push({ ...result, group: watchlist.has(ticker) ? "watchlist" : "new" });
  });
  return { marketDate, symbols, benchmarkBars, historyByTicker, failures, scored, ...selectResults(scored) };
}

/* Ghi lịch sử chính thức của ngày — chỉ lượt sau đóng cửa, chỉ MỘT lần/ngày.
   Lượt sau đóng cửa kế tiếp trong ngày chỉ đọc lại số thử nghiệm, không ghi đè. */
async function recordOfficialRun(db, date, scan, oldResultsSnap) {
  const runRef = db.collection("screening_runs").doc(date);
  const [runSnap, runsSnap] = await Promise.all([runRef.get(), db.collection("screening_runs").get()]);
  const run = runSnap.data();
  if (["completed", "empty"].includes(run?.status)) return { trialSession: run.trialSession, isTrial: run.isTrial };

  const successfulRuns = runsSnap.docs.filter((item) => item.id !== date && ["completed", "empty"].includes(item.data().status)).length;
  const trialSession = Math.min(20, successfulRuns + 1);
  const isTrial = successfulRuns < 20;
  const { selected, fresh, watched } = scan;

  const oldToday = oldResultsSnap.docs.filter((item) => item.data().date === date);
  const keep = new Set(selected.map((row) => `${date}_${row.ticker}`));
  const batch = db.batch();
  oldToday.forEach((item) => { if (!keep.has(item.id)) batch.delete(item.ref); });
  selected.forEach((row) => {
    const ref = db.collection("screening_results").doc(`${date}_${row.ticker}`);
    const old = oldResultsSnap.docs.find((item) => item.id === ref.id)?.data();
    batch.set(ref, {
      ...row,
      date,
      trialSession,
      isTrial,
      evaluation: old?.evaluation || { primary: "pending", resolvedDate: null, sessionsObserved: 0, complete: false, return20Pct: null, excess20Pct: null },
      createdAt: old?.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  batch.set(runRef, {
    date,
    status: selected.length ? "completed" : "empty",
    trialSession,
    isTrial,
    universeCount: scan.symbols.length,
    scannedCount: scan.historyByTicker.size,
    missingCount: scan.failures.length,
    qualifiedCount: scan.scored.length,
    newCount: fresh.length,
    watchlistCount: watched.length,
    scoreVersion: SCORE_VERSION,
    startedAt: run?.startedAt || FieldValue.serverTimestamp(),
    ...(run?.error ? { error: FieldValue.delete() } : {}),
    updatedAt: FieldValue.serverTimestamp(),
    completedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  await batch.commit();
  await updateEvaluations(db, scan.historyByTicker, scan.benchmarkBars);
  return { trialSession, isTrial };
}

async function runSlot(db, slot, date, token, chatId) {
  const lock = await acquireSlot(db, date, slot);
  if (lock.skip) { logger.info(`Bỏ qua ${date} ${slot.time}: ${lock.reason}`); return; }
  const runRef = slot.phase === "post" ? db.collection("screening_runs").doc(date) : null;
  try {
    const [transactionsSnap, watchlistSnap, oldResultsSnap] = await Promise.all([
      db.collection("transactions").get(),
      db.collection("watchlist").get(),
      db.collection("screening_results").get()
    ]);
    const pendingTickers = oldResultsSnap.docs.filter((item) => item.data()?.evaluation?.complete !== true).map((item) => item.data().ticker);
    const scan = await scanMarket({
      phase: slot.phase,
      date,
      held: heldTickers(transactionsSnap.docs.map((item) => item.data())),
      watchlist: new Set(watchlistSnap.docs.map((item) => item.id)),
      extraTickers: slot.phase === "post" ? pendingTickers : []
    });
    if (!scan.marketDate) {
      await lock.ref.set({ status: "holiday", latestMarketDate: scan.latestMarketDate, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      if (runRef && !(await runRef.get()).exists) {
        await runRef.set({ date, status: "holiday", latestMarketDate: scan.latestMarketDate, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
      logger.info(`Không có phiên để chấm ${date} ${slot.time}`);
      return;
    }
    const trial = runRef ? await recordOfficialRun(db, date, scan, oldResultsSnap) : null;
    const notificationType = scan.selected.length ? "results" : "empty";
    await lock.ref.set({
      status: "completed", marketDate: scan.marketDate, scannedCount: scan.historyByTicker.size,
      missingCount: scan.failures.length, selectedCount: scan.selected.length, updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    if (await claimNotification(db, lock.ref, notificationType)) {
      await sendTelegram(token, chatId, telegramText(telegramHeader(slot, date, scan.marketDate, trial), scan.fresh, scan.watched));
      await lock.ref.set({ notificationSentAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    logger.info(`Hoàn tất ${date} ${slot.time}`, { selected: scan.selected.length, missing: scan.failures.length });
  } catch (error) {
    logger.error(`Bot sàng lọc lỗi ${date} ${slot.time}`, error);
    await markFailure(db, lock.ref, runRef, date, slot, error, token, chatId);
    throw error;
  }
}

/* Chạy mỗi 30 phút trong ngày làm việc; chỉ làm việc thật khi khung giờ đó đang bật
   trong `settings/screening`. Không retry: khoá khung giờ đã chặn gửi lặp. */
exports.screenShortTermOpportunities = onSchedule({
  schedule: "0,30 8-20 * * 1-5",
  timeZone: TIME_ZONE,
  retryCount: 0,
  secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID],
  timeoutSeconds: 540,
  memory: "512MiB"
}, async () => {
  const now = new Date();
  const slot = slotAt(now);
  if (!slot) return;
  const db = getFirestore();
  const settings = (await db.collection("settings").doc("screening").get()).data();
  if (!slotEnabled(settings, slot.id)) return;
  await runSlot(db, slot, dateInZone(now), TELEGRAM_BOT_TOKEN.value(), TELEGRAM_CHAT_ID.value());
});

exports._private = {
  dateInZone, slotAt, slotEnabled, marketDateFor, parseHistory, fetchHistory, mapWithConcurrency,
  heldTickers, rank, selectResults, telegramHeader, telegramText, scanMarket, SLOTS
};
