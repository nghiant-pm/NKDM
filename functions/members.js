"use strict";

/* Nhiều tài khoản — đợt 1 (owner chốt 01/11/2026).
   Sổ mỗi người nằm ở users/{uid}/{BOOK_COLLECTIONS}; danh sách được vào ở members/{email} (owner thêm/khoá trong app).
   Bot đợt 1 vẫn chỉ phục vụ owner: đọc/ghi sổ owner qua ownerBook(). Trước khi owner chuyển sổ (members/{owner}.migratedAt)
   ownerBook() trả về gốc db — bot đọc sổ cũ ở cấp ngoài cùng, không có quãng trống.
   ↔ BOOK_COLLECTIONS ở public/index.html (bản sao có chủ ý). */
const { getAuth } = require("firebase-admin/auth");

const OWNER_EMAIL = "nghiant@youmed.vn";
const BOOK_COLLECTIONS = ["transactions", "cashflows", "tickers", "daily_snapshots", "watchlist", "strategies",
  "signals", "watch_prices", "orders", "theses", "plans"];
const BOOK = new Set(BOOK_COLLECTIONS);

let ownerUid = null;
async function ownerBook(db) {
  const member = (await db.collection("members").doc(OWNER_EMAIL).get()).data();
  if (!member?.migratedAt) return db;
  if (!ownerUid) ownerUid = member.uid || (await getAuth().getUserByEmail(OWNER_EMAIL)).uid;
  return db.collection("users").doc(ownerUid);
}
/** Đọc một collection: thuộc sổ → sổ owner, còn lại → dữ liệu chung. */
const sourceFor = (db, book) => (name) => (BOOK.has(name) ? book : db).collection(name);

const isOwnerAuth = (auth) => auth?.token?.email === OWNER_EMAIL && auth.token.email_verified === true;
async function isActiveMember(db, auth) {
  if (isOwnerAuth(auth)) return true;
  const email = auth?.token?.email;
  if (!email || auth.token.email_verified !== true) return false;
  return (await db.collection("members").doc(email).get()).data()?.status === "active";
}

/* Mã các thành viên KHÁC owner đang giữ hoặc theo dõi — để bot chấm điểm/đếm MA cho cả mã của họ.
   Chỉ lấy tên mã, không đọc giá vốn hay số lượng của ai ra ngoài. Doc ở cấp ngoài cùng (sổ owner cũ) bị bỏ qua. */
async function memberTickers(db) {
  const [txs, watch] = await Promise.all([db.collectionGroup("transactions").get(), db.collectionGroup("watchlist").get()]);
  const owner = ownerUid || (await ownerBook(db)).id;
  const qty = new Map();
  txs.docs.forEach((d) => {
    const uid = d.ref.parent.parent?.id, r = d.data();
    if (!uid || uid === owner || !Number.isFinite(r.qty)) return;
    const key = uid + "|" + r.ticker;
    qty.set(key, (qty.get(key) || 0) + (r.side === "sell" ? -r.qty : r.side === "buy" ? r.qty : 0));
  });
  const out = new Set([...qty].filter(([, q]) => q > 0).map(([k]) => k.split("|")[1]));
  watch.docs.forEach((d) => { if (d.ref.parent.parent && d.ref.parent.parent.id !== owner) out.add(d.id); });
  return [...out].filter((tk) => /^[A-Z0-9]{3}$/.test(tk));
}

/* Chuyển sổ owner từ cấp ngoài cùng sang users/{uid}: CHÉP, không xoá (bản cũ giữ làm dự phòng, owner xoá tay sau 2 tuần).
   Chạy một lần — có migratedAt thì thôi. Ghi đè cùng id nên chạy lại giữa chừng cũng không đẻ bản trùng. */
async function migrateOwnerBook(db, uid) {
  const memberRef = db.collection("members").doc(OWNER_EMAIL);
  const member = (await memberRef.get()).data();
  if (member?.migratedAt) return { status: "done", counts: member.migratedCounts || {} };
  const book = db.collection("users").doc(uid), writer = db.bulkWriter(), counts = {};
  for (const name of BOOK_COLLECTIONS) {
    const snap = await db.collection(name).get();
    counts[name] = snap.size;
    snap.docs.forEach((d) => writer.set(book.collection(name).doc(d.id), d.data()));
  }
  await writer.close();
  for (const name of BOOK_COLLECTIONS) {
    const copied = (await book.collection(name).count().get()).data().count;
    if (copied < counts[name]) throw new Error(`Chép thiếu ${name}: ${copied}/${counts[name]}`);
  }
  const now = new Date().toISOString();
  await memberRef.set({ role: "owner", status: "active", uid, name: member?.name || "", addedAt: member?.addedAt || now,
    migratedAt: now, migratedCounts: counts }, { merge: true });
  ownerUid = uid;
  return { status: "migrated", counts };
}

module.exports = { OWNER_EMAIL, BOOK_COLLECTIONS, ownerBook, sourceFor, isOwnerAuth, isActiveMember, memberTickers, migrateOwnerBook };
