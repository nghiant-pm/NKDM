# ISSUES — Fin2

Mã tăng dần. 🔴 đang mở · 🟢 đã fix.

---

## Đang mở

### 🔴 #002 — Chưa có ngưỡng chặn dồn vốn vào một mã
**Triệu chứng:** quy tắc "giảm 2 điểm là mua thêm 100 CP" không có điểm dừng.
Một mã trụ cột rơi vào khủng hoảng riêng (dẫn chứng owner tự nêu: VIC −43.4% năm 2022,
−69.3% từ đỉnh 4/2021 đến đáy 2024) sẽ hút vốn liên tục.

**Bug gốc:** không phải bug code — là **khoảng trống có chủ ý** trong thiết kế.
Owner đã được nêu rủi ro và **chốt chưa làm** (2026-09-10).

**Không tự thêm.** Muốn xử lý thì cần owner chốt: số lần mua thêm tối đa/mã,
hoặc % vốn tối đa/mã, và tiêu chí số hoá cho nhãn "giữ — không bán".

### 🔴 #003 — Nguồn vốn nạp/rút là số tính ngược, không phải lịch sử thật
**Triệu chứng:** `cashflows/seed-deposit-1` = 150,006,231đ, ghi ngày 2026-09-10.
Đây là số **tính ngược** từ tiền mặt mục tiêu + tổng giá trị mua theo giá vốn,
để khớp số dư thực tế trên app TCBS.

**Hệ quả:** mọi thống kê theo thời gian của dòng vốn đều sai — tất cả vốn dồn vào một ngày.
Lãi/lỗ và tổng tài sản thì đúng.

**Chưa sửa vì:** cần owner tra lại lịch sử nạp/rút thật trên app TCBS.

### 🔴 #004 — `contexx.md` ghi giá trị vốn lệch ~5,800đ so với app TCBS
App gốc hiện 73,442,200đ, tự tính ra 73,448,000đ.
**Bug gốc:** app TCBS làm tròn hiển thị giá vốn ở 2 chữ số thập phân; nhân với số lượng
thì sai số nở ra. Không đáng kể, **không sửa** — ghi lại để lần sau khỏi truy lại.

### 🔴 #007 — Nhật ký tín hiệu chỉ có nếu owner nhớ bấm "Lưu nhật ký hôm nay"
**Triệu chứng:** ngày nào quên bấm lưu thì ngày đó **không có tín hiệu nào** trong
`signals`, và cũng không có giá trong `daily_snapshots`. File xuất cho AI sẽ thủng
đúng những ngày đó mà không có gì báo là đang thiếu.

**Bug gốc:** `writeSignals` chỉ được gọi từ `saveTodaySnapshot`. App là trang tĩnh,
không có tiến trình chạy nền — không ai sinh tín hiệu hộ khi owner không mở app.
Đây là **giới hạn của kiến trúc**, không phải lỗi code.

**Kéo theo:** `giaSauDo` trong `buildExport` đếm theo **bản ghi nhật ký kế tiếp**, nên
"sau 5 phiên" thực chất là "sau 5 lần lưu nhật ký". Bỏ lỡ vài ngày thì con số này
nới rộng ra mà nhìn vào không biết.

**Cần làm (việc của owner):** bấm "Lưu nhật ký hôm nay" đều mỗi phiên. Chỉ khi có chuỗi
ngày liên tục thì phần đánh giá chiến lược mới đáng tin.

**Chưa chốt cách xử lý.** Hướng khả dĩ: nhắc nếu hôm nay chưa lưu, hoặc đếm "phiên sau"
theo ngày lịch thay vì theo số bản ghi. Cần owner chọn.

**File:** `public/index.html` — `saveTodaySnapshot`, `writeSignals`, `buildExport` (`giaSauDo`).

---

## Đã fix

### 🟢 #006 — Deploy xong nhưng trình duyệt vẫn chạy bản cũ `fix 2026-09-10`
**Triệu chứng:** deploy thành công, file trên server đúng, nhưng mở trang vẫn là bản cũ —
không có nút mới, bug cũ vẫn còn. Suýt kết luận nhầm là "fix không ăn".

**Bug gốc:** `firebase.json` khai header `no-cache` cho `source: "/index.html"`.
Nhưng trình duyệt xin `/`, không xin `/index.html` — pattern không khớp nên header
không áp, và Firebase trả `Cache-Control: max-age=3600`. Bản cũ sống thêm 1 tiếng
trên máy người dùng.

**Cách chữa:** khai hai pattern — `"/"` và `"**/*.html"`.
Kiểm bằng `curl -D-` sau mỗi lần đổi header, đừng tin cấu hình.
Đây đúng là bài học 13b trong Starter-Kit, lần này vấp ở dạng khác.

### 🟢 #005 — Đăng nhập xong màn đăng nhập không biến mất `fix 2026-09-10`
**Triệu chứng:** đăng nhập thành công, kéo xuống thì thấy trang dữ liệu nằm **bên dưới**
màn đăng nhập thay vì thay thế nó. Owner báo: "kiểu này hơi khó hiểu".

**Bug gốc:** `.gate{ display:flex }` trong stylesheet của trang đè lên `display:none`
mà trình duyệt gán mặc định cho thuộc tính `hidden`. Khai `display` của tác giả luôn
thắng UA stylesheet, nên `gate.hidden = true` không có tác dụng gì.
`#app` thì ẩn đúng vì `.wrap` không khai `display` — đó là lý do bug nhìn như
"hai trang chồng nhau" chứ không phải "không ẩn được gì".

**Cách chữa:** thêm `[hidden]{ display:none !important }` áp toàn trang.
Chữa cả họ lỗi này một lần, không vá riêng `.gate` — mọi phần tử dùng `hidden`
(`#pos-empty`, `#log-empty`, `#gate-btn`) từ nay đều đúng.

### 🟢 #001 — Bán nhiều hơn số đang giữ không bị chặn `fix 2026-09-10`
**Triệu chứng:** gõ nhầm số lượng bán (VD bán 1000 khi chỉ giữ 100) thì vẫn ghi được,
`computeHoldings` cho `qty` về 0 và `realizedPnl` sai, tiền mặt phồng lên — **không có gì báo**.

**Bug gốc:** form submit không đối chiếu số lượng bán với số đang giữ. Toàn bộ tin cậy
vào dữ liệu người dùng gõ.

**Cách chữa:** trước khi ghi, chạy lại `computeHoldings` lấy `qty` hiện có; vượt thì
**chặn hẳn** và hiện ô tick xác nhận. Tick rồi mới ghi được. Xác nhận gắn với đúng
giao dịch đang nhập — đổi mã / loại lệnh / số lượng là mất hiệu lực,
để không vô tình dùng lại cho giao dịch sau.
