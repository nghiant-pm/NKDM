# Fin2 — Nhật Ký Danh Mục

## Tổng quan
Trang theo dõi danh mục cổ phiếu cá nhân. **1 người dùng duy nhất** (owner), chạy trên nhiều thiết bị.
Không realtime nhiều người cùng sửa → **không cần merge 3 chiều, không cần phân quyền nhiều lớp**.

**Owner:** Trung Nghĩa — Project Manager, không lập trình.
**Yêu cầu khi sửa code:** giải thích ngắn gọn thay đổi là gì, không giải thích kỹ thuật sâu. Tiếng Việt.

---

## Tech Stack
- **Frontend:** 1 file HTML tĩnh, JS thuần, không bundler, không framework
- **Database:** Firestore (project `fin2-danh-muc`, location `asia-southeast1`)
- **Auth:** Google Sign-In, rules chỉ cho **đúng 1 email**
- **Hosting:** Firebase Hosting
- **Font / Brand:** Inter · brand `#0248C4` · tăng `#16a34a` · giảm `#dc2626`

---

## Cấu trúc thư mục
```
public/index.html    Toàn bộ app: markup + style + logic. Nguồn sự thật duy nhất.
firestore.rules      Hàng rào bảo mật THẬT (server-side).
firebase.json        Cấu hình hosting + rules.
artifact-da-doi.html Trang "đã dời" đã publish đè lên Artifact cũ. KHÔNG phải app.
portfolio-tracker.html   Bản app CŨ chạy trên Artifact, đã ngưng. Giữ làm lịch sử
                     vì chưa có git. Có git rồi thì xoá được.
contexx.md           Context gốc từ phiên chat đầu. Chỉ đọc, không sửa logic từ đây.
Starter-Kit/         Bộ chuẩn dùng chung. Chỉ đọc, không sửa.
```

---

## Chiến thuật giao dịch (nguồn của mọi công thức gợi ý)
- Mua mã lớn trụ cột, tầm giá 40–70 (nghìn đ/CP)
- Giá ≤ `avgCost − 2` → gợi ý **mua thêm 100 CP/phiên**
- Giá ≥ `avgCost + 3` → gợi ý **bán 100 CP/phiên**
- ⚠️ **−2 / +3 / 100 CP chỉ là MẶC ĐỊNH.** Owner sửa được ở tab Chiến lược, mỗi lần
  đổi tạo một phiên bản mới trong `strategies` có ngày hiệu lực. Code phải đọc qua
  `activeStrategy(ngày)`, **không nơi nào được gõ số**.
- `tickers/{TICKER}.hold === true` → **ẩn gợi ý bán**, hiện badge "Giữ"
- **"Điểm" = giá tuyệt đối (nghìn đ), KHÔNG phải %.** Owner đã biết đánh đổi và cố ý chọn. Đừng đề xuất đổi sang %.
- Broker TCBS miễn phí môi giới. Lệnh bán ghi từ 15/09/2026 lưu `taxRate: 0.001` và
  `taxAmount` để trừ thuế TNCN khỏi tiền mặt và lãi/lỗ đã bán; lệnh cũ thiếu hai trường
  này giữ thuế bằng 0, không hồi tố.

---

## Mô hình dữ liệu
```
transactions/{autoId}       ticker, side "buy"|"sell", qty, price (nghìn đ), date, note, createdAt,
                            taxRate?, taxAmount? (VND nguyên; chỉ lệnh bán mới từ 15/09/2026)
cashflows/{autoId}          type "deposit"|"withdraw", amount (VND nguyên), date, note, createdAt
tickers/{TICKER}            lastPrice (nghìn đ), lastPriceDate, hold?, updatedAt
daily_snapshots/{YYYY-MM-DD}  date, cash, investedCost, marketValue, totalAssets, prices{}, createdAt, updatedAt
watchlist/{TICKER}          targetBuy (nghìn đ), addedAt, updatedAt
strategies/{autoId}         buyDrop, sellRise, nearRange, lotSize, minCashRatio, maxCashRatio,
                            effectiveFrom (YYYY-MM-DD), reason, createdAt
signals/{YYYY-MM-DD_MÃ_loại}  date, ticker, kind "buy"|"sell"|"watch", price, avgCost,
                            targetBuy, qty, strategyId, buyDrop, sellRise, createdAt, updatedAt
```
Id của `signals` là **tất định** (ngày_mã_loại) ⇒ lưu lại trong ngày là ghi đè, không đẻ bản trùng.
**Lưu ở MÁY (localStorage, KHÔNG đồng bộ giữa thiết bị):** `fin2-theme` (sáng/tối) ·
`fin2-tab` (tab đang mở) · `fin2-view` (Gọn/Đầy đủ) · `fin2-sort-positions` / `fin2-sort-watchlist`
(cột và chiều sort view Gọn) · `fin2-collapsed` (section nào đang gập) · `fin2-pnl-range`
(Tuần/Tháng/Quý/Tất cả) · `fin2-hide-pnl` (ẩn/hiện lãi lỗ). Đây là sở thích hiển thị,
mất cũng không sao. **Dữ liệu thật luôn nằm ở Firestore** — đừng đẩy thứ gì cần giữ vào đây.

⚠️ **Hai đơn vị tiền song song:** `price` và `lastPrice` là **nghìn đồng**; `amount`, `cash`, `marketValue` là **VND nguyên**. Quy đổi bằng `×1000`. Nhầm chỗ này là lệch 1000 lần và không có gì báo lỗi.

---

## Phân quyền
Rules Firestore cho phép đọc/ghi **chỉ khi `request.auth.token.email == OWNER_EMAIL`**. Client chỉ hiện màn đăng nhập; mọi chặn thật nằm ở rules.

⚠️ **Gate phía client KHÔNG phải hàng rào bảo mật.** Thêm collection mới → thêm nhánh rules NGAY, không để sau.

---

## ⚠️ Những chỗ NHÂN BẢN CÓ CHỦ Ý — sửa 1 chỗ phải sửa mấy chỗ
- **Ngưỡng mua/bán có 3 tầng:** hằng số mặc định `RULE_BUY_DROP`/`RULE_SELL_RISE`/`RULE_LOT`
  → phiên bản trong `strategies` → nơi dùng gọi `activeStrategy(ngày)`. Ba nơi dùng phải
  ra cùng một số cho cùng một ngày: `renderPositions` (chip gợi ý), `buildSignals` (ghi log
  tín hiệu), `renderStrategy` (thẻ "Đang áp dụng"). **Thêm chỗ dùng mới thì gọi
  `activeStrategy()`, đừng gõ số và cũng đừng đọc thẳng hằng số.**
  Phiên bản chiến lược **chỉ thêm, không sửa đè** — sửa đè là tín hiệu cũ mất ngưỡng gốc.
- **Ba nút lấy giá** (`#fetch-price` tab Danh mục · `#wl-fetch` tab Theo dõi ·
  `#compact-prices` bảng nắm giữ ở Gọn) khác nhau ở chỗ có ghi database hay không,
  nhưng **phần đọc datafeed chỉ có MỘT chỗ là `fetchQuotes()`**.
  Thêm nút lấy giá mới thì gọi hàm đó, đừng chép lại phần đọc JSON.
- **Mỗi doc `signals` chép lại `buyDrop`/`sellRise`/`strategyId` của phiên bản lúc đó.**
  Bản sao có chủ ý, cùng bản chất với `daily_snapshots`: đổi ngưỡng về sau thì tín hiệu cũ
  **vẫn giữ ngưỡng cũ** — đúng ý, vì đó mới là cái đã thực sự sinh ra tín hiệu hôm đó.
  Đừng "vá lại cho nhất quán".
- **`daily_snapshots.prices` từ nay chứa CẢ MÃ KHÔNG NẮM GIỮ** (mã trong watchlist), vì
  watchlist cũng cần lịch sử giá để đánh giá "chờ có đáng không". `computeSummary` bỏ qua
  mã không giữ nên vô hại — nhưng ai đọc snapshot phải biết, đừng suy ra danh mục từ `prices`.
- **`daily_snapshots` chép lại `cash`/`investedCost`/`marketValue`** vốn tính được từ `transactions`+`cashflows`. Đây là **bản sao có chủ ý** để giữ lịch sử theo ngày. Đổi công thức trong `computeSummary` thì **snapshot cũ vẫn giữ số cũ** — đúng ý, đừng "vá lại cho nhất quán".

---

## Các cặp VIEW SONG SONG (hỏi phạm vi trước khi code)
- **Gọn ↔ Đầy đủ:** cùng dữ liệu Firestore, `computeSummary()` và thứ tự mã qua `sortTickers()`.
  `renderCompact()` phải giữ công thức lãi/lỗ và % tương ứng `renderPositions()`, chênh lệch điểm tương ứng `renderWatchlist()`.
  Gọn dùng vốn nạp ròng (tổng nạp − tổng rút); Đầy đủ giữ Tổng tài sản. Đây là khác biệt đã chốt.
  Gọn không có gợi ý mua/bán; thiếu giá phải hiện rõ, tổng dùng giá vốn thay thế có nhãn tạm tính.
  Form giao dịch, form thêm mã theo dõi và nút lấy giá theo dõi được di chuyển DOM để dùng chung handler; không sao chép form hoặc tạo thêm kết nối.
  Thay đổi nội dung/luồng ở một view cần hỏi phạm vi áp dụng trước khi code.
- **Dashboard dòng tiền:** hai view dùng chung `dashboardData()`. Gọn chỉ có 4 chỉ số chính;
  Đầy đủ thêm phân nhóm vị thế và lãi/lỗ đã chốt theo mã. Kỳ xem là sở thích localStorage.
  Mục tiêu tiền mặt phải đọc qua `activeStrategy()`, bản cũ thiếu trường dùng 20–30%.
  Forecast 30/50/100% chỉ mô phỏng vị thế đang lãi theo giá hiện tại, trừ thuế và không ghi Firestore.
  Ẩn lãi/lỗ phải áp dụng đồng thời ở dashboard, vị thế, forecast và Nhật ký của cả hai view.

---

## Đã CHỐT và CẤM dựng lại
- **Firebase project đặt trên tài khoản công ty `nghiant@youmed.vn`.** Codex đã nêu rủi ro (IT admin tổ chức truy cập được dữ liệu tài chính cá nhân); owner cân nhắc và **chọn giữ**. Không nêu lại.
- **Không có ngưỡng chặn mua thêm** (số lần / % vốn tối đa mỗi mã). Owner biết rủi ro dồn vốn và **chốt chưa làm**. Đừng tự thêm.
- **Giá lấy từ datafeed VPS** (`bgapidatafeed.vps.com.vn`) — nguồn duy nhất kiểm chứng được
  là cho gọi cross-origin. TCBS, SSI, VNDirect, CafeF, DNSE, Yahoo **đều bị CORS chặn**,
  đã đo thật ngày 10/09/2026. Đừng thử lại nếu chưa có bằng chứng mới.
- **Nút "Lấy giá" chỉ ĐIỀN vào ô, không tự ghi database.** Owner vẫn phải bấm Lưu.
  Cố ý — tránh ghi dữ liệu rác khi chưa xác nhận giá.
  ⚠️ **NGOẠI LỆ: nút "Lấy giá thị trường" ở tab Theo dõi thì GHI THẲNG** vào `tickers`.
  Owner đã cân nhắc và chọn (10/09/2026): mã watchlist không nằm trong danh mục nên giá sai
  không làm lệch lãi/lỗ hay tổng tài sản. Đừng "sửa lại cho nhất quán" với nút bên tab Danh mục.
- **NGOẠI LỆ thứ hai: nút "Lấy giá" của bảng nắm giữ ở view Gọn cũng GHI THẲNG** vào
  `tickers`, nhưng không tạo `daily_snapshots` hay `signals`. Owner chọn để cập nhật nhanh;
  nhật ký và tín hiệu vẫn chỉ ghi khi bấm Lưu ở tab Danh mục của view Đầy đủ.
- **Bỏ Artifact `window.Codex.use("db")`**, đã chuyển sang Firestore. Không quay lại.
- **Không lưu cờ "đã làm theo tín hiệu hay chưa" trong `signals`.** Cái đó suy ra được từ
  `transactions` cùng ngày + cùng mã + cùng chiều, tính lúc xuất dữ liệu. Cố ý không lưu để
  tránh bản sao dễ lệch. Đừng thêm cột `followed`.
- **Log tín hiệu ghi tự động khi bấm "Lưu nhật ký hôm nay"**, không có nút "đã làm / bỏ qua"
  cho owner bấm tay. Owner đã cân nhắc và chọn phương án không thêm thao tác.
- **Không có mô phỏng ngược** (tính lại "nếu dùng ngưỡng khác từ đầu thì sao"). Owner chọn
  cách so sánh theo giai đoạn hiệu lực thật. Đừng tự thêm.
- **Không có test runner, không unit test.** Kiểm bằng bấm thử thật.

---

## Chuẩn UI/UX
Theo `Starter-Kit/02-ui-ux/`. Ba điều siết chặt nhất ở dự án này:
- **Mobile-first.** Dùng thật trên điện thoại lúc đang xem bảng giá. Breakpoint 768 / 430, cột dọc dùng `100dvh`.
- **Chỉ 2 font-weight: 400 và 500.** Không 600/700/800, không IN HOA + letter-spacing.
- **Không viết phụ đề hướng dẫn trong UI.** Giao diện tự hiểu được.
- Số tiền luôn `font-variant-numeric: tabular-nums`. Màu chỉ mang nghĩa (đỏ = giảm/nguy hiểm, xanh lá = tăng/xong, brand = đang active).

---

## Deploy
```bash
firebase deploy --project fin2-danh-muc
```
⚠️ **Ghi CHANGELOG TRƯỚC khi deploy.** Deploy hỏng thì DỪNG, không báo "xong".

---

## Cách làm việc khi sửa code
Theo `Starter-Kit/01-cach-lam-viec/cach-lam-viec-voi-owner.md`.

**TÔN CHỈ:** giữ mọi thứ tinh gọn và hiệu quả, hướng tới bền vững chứ không chắp vá. Thấy chỗ dư thừa thì **báo và đề xuất dọn**, đừng tự tiện dọn kèm.

1. Nghĩ trước khi code — mơ hồ thì hỏi, đừng chọn thầm.
2. Đơn giản trước — ít code nhất giải quyết được vấn đề.
3. Hỏi kiểu **trắc nghiệm A/B/C**, tối đa 3–5 câu, mỗi phương án 1 dòng hệ quả.
4. Việc đụng ≥2 file hoặc ≥1 buổi → chốt **dàn ý 5–7 việc** trước khi code.
5. **Sửa đúng chỗ** — không tiện tay refactor/đổi format/dọn code cũ xung quanh.

Việc nhỏ và rõ ràng thì **làm luôn**, không hỏi vặt.
