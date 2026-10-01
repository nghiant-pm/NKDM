"use strict";

/* TCBS iFlash OpenAPI — CHỈ ĐỌC để đối chiếu với sổ tay. Không gọi endpoint đặt/sửa/huỷ lệnh hay
   chuyển tiền. Mỗi lần gọi: iOTP → phiên (JWT) → đọc → trả về app. Phiên chỉ nằm trong bộ nhớ
   của lượt gọi đó, không cất ở đâu, không log. API Key + mã lưu ký do index.js lấy từ Secret Manager. */

const { HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");

const OWNER_EMAIL = "nghiant@youmed.vn";
const TCBS_BASE = "https://openapi.tcbs.com.vn";
const REQUEST_TIMEOUT_MS = 20000;
const TRADE_PAGE_SIZE = 50;
const TRADE_MAX_PAGES = 20;

function cleanText(value, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

// Mô tả cấu trúc JSON chỉ bằng tên trường + kiểu (mảng thì lấy phần tử đầu) — không lộ giá trị.
function shape(value, depth = 0) {
  if (Array.isArray(value)) return value.length ? ["array(" + value.length + ")", depth < 3 ? shape(value[0], depth + 1) : "…"] : "array(0)";
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).slice(0, 40).map(([k, v]) => [k, depth < 3 ? shape(v, depth + 1) : typeof v]));
  }
  return value === null ? "null" : typeof value;
}

function maskAccount(value) {
  const text = cleanText(value, 40);
  return text.length <= 4 ? text : "••••" + text.slice(-4);
}

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
    if (!response.ok) {
      const error = new Error(`TCBS từ chối yêu cầu (${response.status})`);
      error.status = response.status;
      error.tcbsCode = cleanText(data?.code, 20);
      error.tcbsMessage = cleanText(data?.message, 120);
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
    if (error.status === 400 || error.status === 401) {
      // Câu báo của TCBS không chứa bí mật → trả nguyên văn để biết lỗi ở iOTP hay API Key.
      // Log chỉ hình dạng key (độ dài, có ký tự lạ không), KHÔNG log nội dung key/iOTP.
      const key = String(apiKey);
      logger.warn("TCBS từ chối đổi token", { status: error.status, tcbsCode: error.tcbsCode, tcbsMessage: error.tcbsMessage,
        keyLength: key.length, keyTrimmedLength: key.trim().length, keyOddChars: (key.match(/[^A-Za-z0-9._~+/=-]/g) || []).length,
        keyHyphens: (key.match(/-/g) || []).length, keyAsciiPunct: (key.match(/[!-/:-@[-`{-~]/g) || []).length,
        keyNonAscii: (key.match(/[^\x00-\x7F]/g) || []).length, keyWhitespace: (key.match(/\s/g) || []).length,
        keyQuoted: /^["'`].*["'`]$/.test(key.trim()) });
      throw new HttpsError("invalid-argument", "TCBS từ chối: " + (error.tcbsMessage || "iOTP hoặc API Key") +
        (error.tcbsCode ? " (" + error.tcbsCode + ")" : ""));
    }
    throw error;
  }
  if (typeof data?.token !== "string" || !data.token) throw new Error("TCBS không trả access token");
  return data.token;
}

function activeNormalAccounts(profile) {
  if (!Array.isArray(profile?.bankSubAccounts)) throw new Error("TCBS không trả danh sách tiểu khoản");
  const rows = profile.bankSubAccounts
    .filter((row) => row?.accountType === "NORMAL" && String(row.status) === "1")
    .map((row) => cleanText(row.accountNo, 40))
    .filter((accountNo) => /^[A-Za-z0-9]+$/.test(accountNo));
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

/* Đo thật 01/10/2026: /se trả `stock[]` với `totalQtty` + `costPrice` — KHÁC tài liệu (`assets[]`,
   `quantity`, `avgPrice`). Đọc theo bản thật, giữ tên theo tài liệu làm dự phòng.
   Giá TCBS là VND (78500) → app dùng nghìn đồng (78,5). Mã lạ (quyền mua…) bỏ riêng, không hỏng cả lượt. */
function normalizeAssets(accountNo, data) {
  const rows = Array.isArray(data?.stock) ? data.stock : Array.isArray(data?.assets) ? data.assets : null;
  if (!rows) throw new Error(`TCBS không trả tài sản của ${maskAccount(accountNo)}`);
  return rows.map((row) => {
    const ticker = cleanText(row?.symbol, 20).toUpperCase();
    const qty = Number(row?.totalQtty ?? row?.quantity), costVND = Number(row?.costPrice ?? row?.avgPrice);
    if (!/^[A-Z0-9]+$/.test(ticker) || !Number.isFinite(qty) || qty <= 0) return null;
    if (!Number.isFinite(costVND) || costVND < 0) throw new Error(`Giá vốn TCBS không hợp lệ ở ${maskAccount(accountNo)}`);
    return { ticker, qty, avgCost: costVND / 1000 };
  }).filter(Boolean);
}

function normalizeCash(accountNo, data) {
  if (!Array.isArray(data?.data)) throw new Error(`TCBS không trả số dư của ${maskAccount(accountNo)}`);
  const row = data.data.find((item) => String(item?.accountNo || "") === accountNo) || data.data[0];
  const cash = Number(row?.cashBalance);
  if (!row || !Number.isFinite(cash)) throw new Error(`Số dư TCBS không hợp lệ ở ${maskAccount(accountNo)}`);
  return Math.round(cash);
}

// Lệnh thiếu trường → bỏ riêng lệnh đó (null); cả lượt vẫn chạy nhưng báo chưa đầy đủ.
function normalizeTrade(row) {
  const tradeId = cleanText(row?.tradeId, 100), ticker = cleanText(row?.symbol, 20).toUpperCase();
  const qty = Number(row?.qtty), priceVND = Number(row?.price), execAt = execIso(row?.timeExec);
  const side = row?.side === "B" ? "buy" : row?.side === "S" ? "sell" : null;
  if (!tradeId || !side || !/^[A-Z0-9]+$/.test(ticker) || !(qty > 0) || !(priceVND > 0) || !execAt) return null;
  return { tradeId, ticker, side, qty, price: priceVND / 1000, date: vnDate(execAt), execAt };
}

/* Tài liệu TCBS không nêu tham số phân trang của matching-details → đọc lần lượt từng trang,
   gộp theo tradeId, dừng khi hết dữ liệu hoặc 2 trang liền không có lệnh mới (TCBS bỏ qua tham số). */
async function readTrades(token, accountNo) {
  const encoded = encodeURIComponent(accountNo), seen = new Map(), skipped = new Set();
  let total = NaN, idle = 0, firstShape = null;
  for (let page = 0; page < TRADE_MAX_PAGES; page++) {
    const data = await fetchJson(`/aion/v1/accounts/${encoded}/matching-details?pageSize=${TRADE_PAGE_SIZE}&pageIndex=${page}`, token);
    if (!firstShape) firstShape = shape(data);
    if (!Array.isArray(data?.data)) throw new Error(`TCBS không trả lệnh khớp của ${maskAccount(accountNo)}`);
    if (Number.isFinite(Number(data.totalCount))) total = Number(data.totalCount);
    let added = 0;
    data.data.forEach((raw) => {
      const row = normalizeTrade(raw);
      if (!row) { skipped.add(JSON.stringify(raw)); return; }
      const key = accountNo + "_" + row.tradeId;
      if (!seen.has(key)) { seen.set(key, row); added++; }
    });
    idle = added ? 0 : idle + 1;
    if (!data.data.length || seen.size + skipped.size >= total || idle >= 2) break;
  }
  return { rows: [...seen.values()], complete: !skipped.size && (!Number.isFinite(total) || seen.size >= total), shape: firstShape };
}

// Gộp nhiều tiểu khoản: cộng số lượng, giá vốn bình quân gia quyền.
function aggregatePositions(rows) {
  const out = {};
  rows.forEach((row) => {
    const old = out[row.ticker] || { ticker: row.ticker, qty: 0, avgCost: 0 };
    const nextQty = old.qty + row.qty;
    old.avgCost = nextQty > 0 ? (old.qty * old.avgCost + row.qty * row.avgCost) / nextQty : 0;
    old.qty = nextQty;
    out[row.ticker] = old;
  });
  return Object.values(out).sort((a, b) => a.ticker.localeCompare(b.ticker));
}

async function readPortfolio(request, secrets) {
  if (request.auth?.token?.email !== OWNER_EMAIL || request.auth.token.email_verified !== true) {
    throw new HttpsError("permission-denied", "Không có quyền truy cập");
  }
  try {
    const token = await exchangeToken(secrets.apiKey, request.data?.otp);
    const code = cleanText(secrets.custodyCode, 40).toUpperCase();
    if (!/^[A-Z0-9]{6,40}$/.test(code)) throw new HttpsError("failed-precondition", "Chưa cấu hình mã lưu ký TCBS");
    const profile = await fetchJson(`/eros/v2/get-profile/by-username/${encodeURIComponent(code)}?fields=basicInfo,bankSubAccounts`, token);
    const accounts = activeNormalAccounts(profile);
    const parts = await Promise.all(accounts.map(async (accountNo) => {
      const encoded = encodeURIComponent(accountNo);
      const [assets, cash, trades] = await Promise.all([
        fetchJson(`/aion/v1/accounts/${encoded}/se`, token),
        fetchJson(`/aion/v1/accounts/${encoded}/cashInvestments`, token),
        readTrades(token, accountNo)
      ]);
      // Chẩn đoán: ghi HÌNH DẠNG câu trả lời (tên trường + kiểu), không ghi giá trị.
      logger.info("TCBS hình dạng dữ liệu", { account: maskAccount(accountNo), se: shape(assets), cash: shape(cash), trades: trades.shape });
      return { positions: normalizeAssets(accountNo, assets), cash: normalizeCash(accountNo, cash), trades };
    }));
    return {
      readAt: new Date().toISOString(),
      accounts: accounts.map(maskAccount),
      positions: aggregatePositions(parts.flatMap((p) => p.positions)),
      cash: parts.reduce((sum, p) => sum + p.cash, 0),
      trades: parts.flatMap((p) => p.trades.rows).sort((a, b) => a.execAt.localeCompare(b.execAt)),
      tradesComplete: parts.every((p) => p.trades.complete)
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("unavailable", cleanText(error.message, 160) || "Chưa đọc được TCBS");
  }
}

module.exports = { readPortfolio, execIso, aggregatePositions };
