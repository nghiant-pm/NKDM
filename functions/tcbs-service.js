"use strict";

/* TCBS iFlash OpenAPI — CHỈ đọc danh mục, không gọi endpoint đặt/sửa/huỷ lệnh hay chuyển tiền.
   API Key, mã lưu ký và khoá mã hoá phiên nằm trong Secret Manager (index.js truyền vào).
   iOTP chỉ đi qua để đổi token, không lưu, không log. JWT mã hoá AES-GCM rồi cất ở
   tcbs_private/session (rules chặn client), tự hết hạn tối đa 8 giờ. */

const crypto = require("crypto");
const { HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");

const OWNER_EMAIL = "nghiant@youmed.vn";
const TCBS_BASE = "https://openapi.tcbs.com.vn";
const SESSION_MAX_MS = 8 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20000;
const LOCK_MS = 2 * 60 * 1000;
const TRADE_PAGE_SIZE = 50;
const TRADE_MAX_PAGES = 20;
// Bản sao có chủ ý của SELL_TAX_RATE trong public/index.html (thuế TNCN 0,1% giá trị bán).
const SELL_TAX_RATE = 0.001;

function cleanText(value, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function safeId(value) {
  return cleanText(value, 180).replace(/[^A-Za-z0-9_-]/g, "_");
}

function maskAccount(value) {
  const text = cleanText(value, 40);
  return text.length <= 4 ? text : "••••" + text.slice(-4);
}

function assertOwner(request) {
  if (request.auth?.token?.email !== OWNER_EMAIL || request.auth.token.email_verified !== true) {
    throw new HttpsError("permission-denied", "Không có quyền truy cập");
  }
}

/* ---------- mã hoá phiên ---------- */
function sessionKey(secret) {
  const key = Buffer.from(cleanText(secret, 200), "hex");
  if (key.length !== 32) throw new Error("Khoá phiên TCBS chưa cấu hình đúng");
  return key;
}

function sealToken(token, secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", sessionKey(secret), iv);
  const data = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}

function openToken(row, secret) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", sessionKey(secret), Buffer.from(row.iv, "base64"));
  decipher.setAuthTag(Buffer.from(row.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(row.data, "base64")), decipher.final()]).toString("utf8");
}

/* ---------- gọi TCBS ---------- */
async function fetchJson(path, token, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(TCBS_BASE + path, {
      method: options.method || "GET",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch (_) { throw new Error(`TCBS trả dữ liệu không hợp lệ (${response.status})`); }
    if (response.status === 401 && token) throw new HttpsError("unauthenticated", "Phiên TCBS đã hết hạn");
    if (!response.ok) {
      const error = new Error(`TCBS từ chối yêu cầu (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("TCBS không phản hồi");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function exchangeToken(apiKey, otp) {
  const code = cleanText(otp, 20);
  if (!/^\d{4,10}$/.test(code)) throw new HttpsError("invalid-argument", "Kiểm tra iOTP");
  if (!cleanText(apiKey, 600)) throw new HttpsError("failed-precondition", "Chưa cấu hình API Key TCBS");
  let data;
  try {
    data = await fetchJson("/gaia/v1/oauth2/openapi/token", null, { method: "POST", body: { apiKey: cleanText(apiKey, 600), otp: code } });
  } catch (error) {
    if (error.status === 400 || error.status === 401) throw new HttpsError("invalid-argument", "TCBS từ chối iOTP hoặc API Key");
    throw error;
  }
  if (typeof data?.token !== "string" || !data.token) throw new Error("TCBS không trả access token");
  return data.token;
}

function tokenExpiry(token) {
  const now = Date.now();
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    const exp = Number(payload.exp) * 1000;
    if (Number.isFinite(exp) && exp > now) return new Date(Math.min(exp, now + SESSION_MAX_MS)).toISOString();
  } catch (_) {}
  return new Date(now + SESSION_MAX_MS).toISOString();
}

/* ---------- chuẩn hoá dữ liệu ---------- */
function activeNormalAccounts(profile) {
  if (!Array.isArray(profile?.bankSubAccounts)) throw new Error("TCBS không trả danh sách tiểu khoản");
  const rows = profile.bankSubAccounts
    .filter((row) => row?.accountType === "NORMAL" && String(row.status) === "1")
    .map((row) => ({ accountNo: cleanText(row.accountNo, 40), isDefault: row.isDefault === "Y" }))
    .filter((row) => /^[A-Za-z0-9]+$/.test(row.accountNo));
  if (!rows.length) throw new HttpsError("failed-precondition", "Không tìm thấy tiểu khoản cổ phiếu thường");
  return rows;
}

// TCBS trả giờ khớp KHÔNG kèm múi giờ ("2024-09-16T17:05:20") — đó là giờ VN.
function execIso(value) {
  const text = cleanText(value, 40).replace(" ", "T");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return null;
  const ms = Date.parse(/(Z|[+-]\d{2}:?\d{2})$/.test(text) ? text : text + "+07:00");
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function vnDate(iso) {
  return new Date(Date.parse(iso) + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Giá TCBS là VND (78500) → app dùng nghìn đồng (78,5). Tiền giữ nguyên VND.
function normalizeAssets(accountNo, data, syncedAt) {
  if (!Array.isArray(data?.assets)) throw new Error(`TCBS không trả tài sản của ${maskAccount(accountNo)}`);
  return data.assets.map((row) => {
    const ticker = cleanText(row?.symbol, 20).toUpperCase();
    const qty = Number(row?.quantity), avgPriceVND = Number(row?.avgPrice), marketValue = Number(row?.marketValue);
    if (!/^[A-Z0-9]+$/.test(ticker) || !Number.isFinite(qty) || qty < 0 ||
        !Number.isFinite(avgPriceVND) || avgPriceVND < 0 || !Number.isFinite(marketValue) || marketValue < 0) {
      throw new Error(`Tài sản TCBS không hợp lệ ở ${maskAccount(accountNo)}`);
    }
    return { accountNo, ticker, qty, avgCost: avgPriceVND / 1000, marketValue: Math.round(marketValue), syncedAt };
  }).filter((row) => row.qty > 0);
}

function normalizeBalance(accountNo, data, syncedAt) {
  if (!Array.isArray(data?.data)) throw new Error(`TCBS không trả số dư của ${maskAccount(accountNo)}`);
  const row = data.data.find((item) => String(item?.accountNo || "") === accountNo) || data.data[0];
  const cashBalance = Number(row?.cashBalance), bodBalance = Number(row?.bodBalance);
  if (!row || !Number.isFinite(cashBalance) || !Number.isFinite(bodBalance)) {
    throw new Error(`Số dư TCBS không hợp lệ ở ${maskAccount(accountNo)}`);
  }
  return { accountNo, cashBalance: Math.round(cashBalance), bodBalance: Math.round(bodBalance), syncedAt };
}

// Lệnh thiếu trường → bỏ riêng lệnh đó (trả null), lượt đồng bộ vẫn chạy nhưng bị đánh dấu chưa đầy đủ.
function normalizeTrade(accountNo, row, syncedAt) {
  const tradeId = cleanText(row?.tradeId, 100), ticker = cleanText(row?.symbol, 20).toUpperCase();
  const qty = Number(row?.qtty), priceVND = Number(row?.price), execAt = execIso(row?.timeExec);
  const side = row?.side === "B" ? "buy" : row?.side === "S" ? "sell" : null;
  if (!tradeId || !side || !/^[A-Z0-9]+$/.test(ticker) || !(qty > 0) || !(priceVND > 0) || !execAt) return null;
  const price = priceVND / 1000;
  return {
    id: `${safeId(accountNo)}_${safeId(tradeId)}`, accountNo, tradeId, orderId: cleanText(row?.orderId, 100),
    ticker, side, qty, price, date: vnDate(execAt), execAt, source: "tcbs", syncedAt,
    ...(side === "sell" ? { taxRate: SELL_TAX_RATE, taxAmount: Math.round(qty * price * 1000 * SELL_TAX_RATE) } : {})
  };
}

/* Tài liệu TCBS không nêu tham số phân trang của matching-details → đọc lần lượt từng trang,
   gộp theo tradeId, dừng khi hết dữ liệu hoặc 2 trang liền không có lệnh mới (TCBS bỏ qua tham số). */
async function readTrades(token, accountNo, syncedAt) {
  const encoded = encodeURIComponent(accountNo), seen = new Map(), skipped = new Set();
  let total = NaN, idle = 0;
  for (let page = 0; page < TRADE_MAX_PAGES; page++) {
    const data = await fetchJson(`/aion/v1/accounts/${encoded}/matching-details?pageSize=${TRADE_PAGE_SIZE}&pageIndex=${page}`, token);
    if (!Array.isArray(data?.data)) throw new Error(`TCBS không trả lệnh khớp của ${maskAccount(accountNo)}`);
    if (Number.isFinite(Number(data.totalCount))) total = Number(data.totalCount);
    let added = 0;
    data.data.forEach((raw) => {
      const row = normalizeTrade(accountNo, raw, syncedAt);
      if (!row) { skipped.add(JSON.stringify(raw)); return; }
      if (!seen.has(row.id)) { seen.set(row.id, row); added++; }
    });
    idle = added ? 0 : idle + 1;
    if (!data.data.length || seen.size + skipped.size >= total || idle >= 2) break;
  }
  return { rows: [...seen.values()], complete: !skipped.size && (!Number.isFinite(total) || seen.size >= total) };
}

async function readAccount(token, account, syncedAt) {
  const encoded = encodeURIComponent(account.accountNo);
  const [assets, balance, trades] = await Promise.all([
    fetchJson(`/aion/v1/accounts/${encoded}/se`, token),
    fetchJson(`/aion/v1/accounts/${encoded}/cashInvestments`, token),
    readTrades(token, account.accountNo, syncedAt)
  ]);
  return {
    positions: normalizeAssets(account.accountNo, assets, syncedAt),
    balance: normalizeBalance(account.accountNo, balance, syncedAt),
    trades: trades.rows,
    matchingComplete: trades.complete
  };
}

async function loadData(token, custodyCode) {
  const code = cleanText(custodyCode, 40).toUpperCase();
  if (!/^[A-Z0-9]{6,40}$/.test(code)) throw new HttpsError("failed-precondition", "Chưa cấu hình mã lưu ký TCBS");
  const syncedAt = new Date().toISOString();
  const profile = await fetchJson(`/eros/v2/get-profile/by-username/${encodeURIComponent(code)}?fields=basicInfo,bankSubAccounts`, token);
  const accounts = activeNormalAccounts(profile);
  const accountData = await Promise.all(accounts.map((account) => readAccount(token, account, syncedAt)));
  return { custodyCode: code, accounts, accountData, syncedAt };
}

/* ---------- gộp & đối chiếu ---------- */
function aggregatePositions(rows) {
  const out = {};
  rows.forEach((row) => {
    const old = out[row.ticker] || { ticker: row.ticker, qty: 0, avgCost: 0, marketValue: 0 };
    const nextQty = old.qty + row.qty;
    old.avgCost = nextQty > 0 ? (old.qty * old.avgCost + row.qty * row.avgCost) / nextQty : 0;
    old.qty = nextQty;
    old.marketValue += row.marketValue || 0;
    out[row.ticker] = old;
  });
  return Object.values(out).sort((a, b) => a.ticker.localeCompare(b.ticker));
}

function tradesAfter(trades, cutoverAt) {
  const cut = Date.parse(cutoverAt);
  return trades.filter((row) => Date.parse(row.execAt) > cut);
}

// Ảnh đầu kỳ + lệnh khớp sau chuyển giao phải ra đúng số lượng TCBS đang báo, không thì lịch sử chưa đầy đủ.
function quantitiesMatch(opening, trades, current) {
  const expected = Object.fromEntries((opening || []).map((row) => [row.ticker, Number(row.qty) || 0]));
  trades.forEach((row) => { expected[row.ticker] = (expected[row.ticker] || 0) + (row.side === "buy" ? row.qty : -row.qty); });
  const actual = Object.fromEntries(current.map((row) => [row.ticker, row.qty]));
  return [...new Set([...Object.keys(expected), ...Object.keys(actual)])]
    .every((ticker) => Math.abs((expected[ticker] || 0) - (actual[ticker] || 0)) < 0.0001);
}

/* ---------- Firestore ---------- */
const connectionRef = (db) => db.collection("tcbs_connection").doc("current");
const sessionRef = (db) => db.collection("tcbs_private").doc("session");

async function readConnection(db) {
  return (await connectionRef(db).get()).data() || {};
}

// Khoá chống bấm trùng / nhiều thiết bị cùng lúc. Lỗi TCBS (không phải lỗi người dùng) → đánh dấu dữ liệu cũ.
async function withLock(db, action, run) {
  const ref = db.collection("tcbs_control").doc("runtime"), now = Date.now();
  const acquired = await db.runTransaction(async (tx) => {
    const old = (await tx.get(ref)).data();
    if (old?.status === "running" && now - Date.parse(old.startedAt) < LOCK_MS) return false;
    tx.set(ref, { status: "running", action, startedAt: new Date(now).toISOString() });
    return true;
  });
  if (!acquired) throw new HttpsError("resource-exhausted", "TCBS đang được đồng bộ");
  try {
    const result = await run();
    await ref.set({ status: "complete", completedAt: new Date().toISOString() }, { merge: true });
    return result;
  } catch (error) {
    const message = cleanText(error.message, 160) || "Chưa đồng bộ được TCBS";
    await ref.set({ status: "error", completedAt: new Date().toISOString() }, { merge: true });
    if (error instanceof HttpsError && error.code === "unauthenticated") {
      await sessionRef(db).delete();
      await connectionRef(db).set({ sessionExpiresAt: null, updatedAt: new Date().toISOString() }, { merge: true });
    }
    if (error instanceof HttpsError) throw error;
    await connectionRef(db).set({ stale: true, error: message, updatedAt: new Date().toISOString() }, { merge: true });
    throw new HttpsError("unavailable", message);
  }
}

// Ghi 1 lượt: đủ tài sản + số dư + lệnh khớp trong MỘT batch — lỗi thì không ghi gì.
async function persistSync(db, connection, loaded, extras = {}, session = null) {
  const [oldPositions, oldBalances, storedTrades] = await Promise.all(
    ["tcbs_positions", "tcbs_balances", "tcbs_trades"].map((name) => db.collection(name).get()));
  const positions = loaded.accountData.flatMap((row) => row.positions);
  const balances = loaded.accountData.map((row) => row.balance);
  const newTrades = loaded.accountData.flatMap((row) => row.trades);
  if (positions.length + balances.length + newTrades.length + oldPositions.size + oldBalances.size > 480) {
    throw new Error("Dữ liệu TCBS vượt giới hạn một lượt đồng bộ");
  }
  const tradeMap = new Map(storedTrades.docs.map((doc) => [doc.id, doc.data()]));
  newTrades.forEach((row) => tradeMap.set(row.id, row));
  const aggregate = aggregatePositions(positions);
  const tcbsMode = connection.mode === "tcbs" && connection.cutoverAt;
  const historyComplete = tcbsMode
    ? loaded.accountData.every((row) => row.matchingComplete) &&
      quantitiesMatch(connection.openingPositions, tradesAfter([...tradeMap.values()], connection.cutoverAt), aggregate)
    : null;

  const batch = db.batch();
  oldPositions.docs.forEach((doc) => batch.delete(doc.ref));
  oldBalances.docs.forEach((doc) => batch.delete(doc.ref));
  positions.forEach((row) => batch.set(db.collection("tcbs_positions").doc(`${safeId(row.accountNo)}_${safeId(row.ticker)}`), row));
  balances.forEach((row) => batch.set(db.collection("tcbs_balances").doc(safeId(row.accountNo)), row));
  newTrades.forEach(({ id, ...data }) => batch.set(db.collection("tcbs_trades").doc(id), data, { merge: true }));
  if (session) batch.set(sessionRef(db), session);
  batch.set(connectionRef(db), {
    ...extras,
    status: tcbsMode ? "connected" : "pending_confirmation",
    custodyCodeMasked: maskAccount(loaded.custodyCode),
    accounts: loaded.accounts.map((row) => ({ accountNoMasked: maskAccount(row.accountNo), isDefault: row.isDefault })),
    lastSyncAt: loaded.syncedAt,
    historyComplete, stale: false, error: null,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  await batch.commit();
  return { tickers: aggregate.length, trades: newTrades.length, historyComplete };
}

/* ---------- callable ---------- */
// Nhập iOTP: đổi token, đọc danh mục ngay, cất phiên 8 giờ.
async function connect(db, request, secrets) {
  assertOwner(request);
  return withLock(db, "connect", async () => {
    const token = await exchangeToken(secrets.apiKey, request.data?.otp);
    const loaded = await loadData(token, secrets.custodyCode);
    const expiresAt = tokenExpiry(token), connection = await readConnection(db);
    return persistSync(db, connection, loaded, {
      sessionExpiresAt: expiresAt, connectedAt: connection.connectedAt || new Date().toISOString()
    }, { ...sealToken(token, secrets.sessionKey), expiresAt });
  });
}

// Trong phiên 8 giờ: bấm là đồng bộ, không hỏi lại iOTP.
async function sync(db, request, secrets) {
  assertOwner(request);
  return withLock(db, "sync", async () => {
    const session = (await sessionRef(db).get()).data();
    if (!session?.expiresAt || Date.parse(session.expiresAt) <= Date.now()) {
      throw new HttpsError("unauthenticated", "Phiên TCBS đã hết hạn");
    }
    const loaded = await loadData(openToken(session, secrets.sessionKey), secrets.custodyCode);
    return persistSync(db, await readConnection(db), loaded);
  });
}

// Chuyển nguồn: ảnh đầu kỳ = đúng lượt đồng bộ owner vừa xem ở bảng so sánh.
async function confirmCutover(db, request) {
  assertOwner(request);
  return withLock(db, "confirm", async () => {
    const connection = await readConnection(db);
    if (connection.status !== "pending_confirmation" || !connection.lastSyncAt) {
      throw new HttpsError("failed-precondition", "Chưa có dữ liệu TCBS để xác nhận");
    }
    const positions = (await db.collection("tcbs_positions").get()).docs.map((doc) => doc.data());
    const openingPositions = aggregatePositions(positions).map((row) => ({ ticker: row.ticker, qty: row.qty, avgCost: row.avgCost }));
    await connectionRef(db).set({
      status: "connected", mode: "tcbs", cutoverAt: connection.lastSyncAt, openingPositions,
      historyComplete: true, updatedAt: new Date().toISOString()
    }, { merge: true });
    return { ok: true };
  });
}

/* Ngắt kết nối: chép lệnh khớp TCBS sau chuyển giao vào sổ `transactions` (id tất định → chép lại
   không trùng) để số liệu tay tiếp tục đúng; xoá phiên + mốc chuyển giao để lần sau phải xác nhận lại. */
async function disconnect(db, request) {
  assertOwner(request);
  return withLock(db, "disconnect", async () => {
    const connection = await readConnection(db);
    const stored = connection.mode === "tcbs" && connection.cutoverAt
      ? (await db.collection("tcbs_trades").get()).docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      : [];
    const trades = connection.cutoverAt ? tradesAfter(stored, connection.cutoverAt) : [];
    if (trades.length > 480) throw new Error("Quá nhiều lệnh khớp để chép một lượt");
    const batch = db.batch(), now = new Date().toISOString();
    trades.forEach((row) => {
      batch.set(db.collection("transactions").doc(`tcbs_${row.id}`), {
        ticker: row.ticker, side: row.side, qty: row.qty, price: row.price, date: row.date,
        note: "Đồng bộ từ TCBS", createdAt: row.execAt, tcbsTradeId: row.id,
        ...(row.side === "sell" ? { taxRate: row.taxRate, taxAmount: row.taxAmount } : {})
      });
    });
    batch.delete(sessionRef(db));
    batch.set(connectionRef(db), {
      status: "disconnected", mode: "manual", sessionExpiresAt: null,
      cutoverAt: FieldValue.delete(), openingPositions: FieldValue.delete(), historyComplete: null,
      disconnectedAt: now, stale: false, error: null, updatedAt: now
    }, { merge: true });
    await batch.commit();
    return { copied: trades.length };
  });
}

module.exports = { connect, sync, confirmCutover, disconnect, aggregatePositions, execIso };
