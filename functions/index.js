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
const HISTORY_API = "https://histdatafeed.vps.com.vn/tradingview/history";
const TIME_ZONE = "Asia/Ho_Chi_Minh";
const MAX_RESULTS = 5;
const MAX_MISSING_RATIO = 0.2;
const HISTORY_DAYS = 240;

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
        headers: { accept: "application/json", "user-agent": "Fin2-Screener/1.0" },
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
  throw new Error(`${ticker}: lỗi VPS sau ${maxAttempts} lần thử (${lastError?.message || lastError})`);
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

function telegramText(date, trialSession, fresh, watched) {
  const lines = [`Fin2 · Sàng lọc ${date}`, `Thử nghiệm ${trialSession}/20 · Công thức ${SCORE_VERSION}`];
  if (!fresh.length && !watched.length) return lines.concat("", "Hôm nay không có mã đạt chuẩn 70 điểm.").join("\n");
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

async function acquireRun(db, date) {
  const ref = db.collection("screening_runs").doc(date);
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const old = snap.exists ? snap.data() : null;
    if (old?.notificationAttemptedAt) return { ref, skip: true, reason: "notification-already-attempted" };
    const updatedMillis = old?.updatedAt?.toMillis?.() || 0;
    if (old?.status === "running" && Date.now() - updatedMillis < 20 * 60 * 1000) {
      return { ref, skip: true, reason: "already-running" };
    }
    transaction.set(ref, {
      date,
      status: "running",
      scoreVersion: SCORE_VERSION,
      startedAt: old?.startedAt || FieldValue.serverTimestamp(),
      ...(old?.error ? { error: FieldValue.delete() } : {}),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { ref, skip: false };
  });
}

async function claimNotification(db, runRef, type) {
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(runRef);
    if (snap.data()?.notificationAttemptedAt) return false;
    transaction.set(runRef, {
      notificationType: type,
      notificationAttemptedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return true;
  });
}

async function markFailure(db, runRef, date, error, token, chatId) {
  const message = String(error?.message || error).slice(0, 500);
  await runRef.set({ status: "failed", error: message, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  if (!await claimNotification(db, runRef, "failure")) return;
  try {
    await sendTelegram(token, chatId, `Fin2 · Bot sàng lọc lỗi ngày ${date}\n${message}`);
    await runRef.set({ notificationSentAt: FieldValue.serverTimestamp() }, { merge: true });
  } catch (notifyError) {
    logger.error("Không gửi được Telegram báo lỗi", notifyError);
  }
}

exports.screenShortTermOpportunities = onSchedule({
  schedule: "10 16 * * 1-5",
  timeZone: TIME_ZONE,
  retryCount: 1,
  minBackoffSeconds: 300,
  secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID],
  timeoutSeconds: 540,
  memory: "512MiB"
}, async () => {
  const db = getFirestore();
  const date = dateInZone();
  const lock = await acquireRun(db, date);
  if (lock.skip) { logger.info(`Bỏ qua ${date}: ${lock.reason}`); return; }
  const token = TELEGRAM_BOT_TOKEN.value();
  const chatId = TELEGRAM_CHAT_ID.value();
  try {
    const [transactionsSnap, watchlistSnap, oldResultsSnap, runsSnap] = await Promise.all([
      db.collection("transactions").get(),
      db.collection("watchlist").get(),
      db.collection("screening_results").get(),
      db.collection("screening_runs").get()
    ]);
    const held = heldTickers(transactionsSnap.docs.map((item) => item.data()));
    const watchlist = new Set(watchlistSnap.docs.map((item) => item.id));
    const pendingTickers = oldResultsSnap.docs.filter((item) => item.data()?.evaluation?.complete !== true).map((item) => item.data().ticker);
    const symbols = [...new Set([...UNIVERSE, ...watchlist, ...pendingTickers])].filter(Boolean).sort();

    const benchmarkBars = await fetchHistory("VNINDEX", HISTORY_DAYS, 3);
    if (benchmarkBars.at(-1)?.date !== date) {
      await lock.ref.set({ status: "holiday", latestMarketDate: benchmarkBars.at(-1)?.date || null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      logger.info(`Không có phiên mới ${date}`);
      return;
    }

    const fetched = await mapWithConcurrency(symbols, 5, fetchHistory);
    const historyByTicker = new Map();
    const failures = [];
    fetched.forEach((item, index) => {
      const ticker = symbols[index];
      if (item.ok && item.value.at(-1)?.date === date) historyByTicker.set(ticker, item.value);
      else failures.push(ticker);
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
    const { fresh, watched, selected } = selectResults(scored);
    const successfulRuns = runsSnap.docs.filter((item) => ["completed", "empty"].includes(item.data().status)).length;
    const trialSession = Math.min(20, successfulRuns + 1);
    const isTrial = successfulRuns < 20;

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
    batch.set(lock.ref, {
      status: selected.length ? "completed" : "empty",
      trialSession,
      isTrial,
      universeCount: symbols.length,
      scannedCount: historyByTicker.size,
      missingCount: failures.length,
      qualifiedCount: scored.length,
      newCount: fresh.length,
      watchlistCount: watched.length,
      scoreVersion: SCORE_VERSION,
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    await batch.commit();

    await updateEvaluations(db, historyByTicker, benchmarkBars);
    const notificationType = selected.length ? "results" : "empty";
    if (await claimNotification(db, lock.ref, notificationType)) {
      await sendTelegram(token, chatId, telegramText(date, trialSession, fresh, watched));
      await lock.ref.set({ notificationSentAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    logger.info(`Hoàn tất ${date}`, { selected: selected.length, missing: failures.length });
  } catch (error) {
    logger.error(`Bot sàng lọc lỗi ${date}`, error);
    await markFailure(db, lock.ref, date, error, token, chatId);
    throw error;
  }
});

exports._private = { dateInZone, parseHistory, fetchHistory, mapWithConcurrency, heldTickers, rank, selectResults, telegramText };
