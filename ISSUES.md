# ISSUES — Fin2

Mã tăng dần. 🔴 đang mở · 🟢 đã fix.

---

## Đang mở

### 🔴 #013 — Xoá giao dịch sinh từ “Khớp” không cập nhật lại lệnh
**Triệu chứng:** xoá trong Nhật ký một giao dịch được tạo khi bấm Khớp lệnh thì giao dịch mất,
nhưng lệnh gốc vẫn hiện “Đã khớp” / “Khớp một phần” với số lượng cũ. Hai nguồn lệch nhau.

**Bug gốc:** `removeTransaction` chỉ xoá `transactions/{id}`, không trừ lại `filledQty`,
`averageFillPrice` và `status` của `orders/{orderId}`.

**Chưa sửa:** phát hiện khi đọc code ngày 24/09/2026, cần owner chọn cách xử lý (chặn xoá
giao dịch có `orderId`, hoặc xoá thì hoàn lại trạng thái lệnh).

**File:** `public/index.html` — `removeTransaction`, `fillOrder`.

### 🔴 #012 — Cloud Function hết thời gian chờ khi lấy lịch sử VPS
**Triệu chứng:** lần chạy thủ công production lúc 14:44 ngày 24/09/2026 dừng ngay khi lấy
VN-Index vì kết nối tới `histdatafeed.vps.com.vn` bị timeout. Cùng API vẫn hoạt động từ máy
owner nên bot chưa sinh đề cử cho lần chạy này.

**Bug gốc:** API lịch sử VPS không nhận kết nối từ Cloud Function/Google Cloud. Bản retry
đã deploy nhưng Force run production khoảng 14:53 vẫn timeout đủ 3 lần ở VN-Index, trong
khi máy owner gọi cùng API thành công.

**Fix:** retry đã deploy nhưng **không sửa được đường kết nối**; bot vẫn dừng đúng và không
phát đề cử sai. Một round chạy từ máy owner đã quét 107 mã, thiếu 0, có 15 mã đạt chuẩn và
gửi Telegram thành công, nhưng có nhãn thủ công và không ghi Firestore/app. Issue vẫn mở;
lịch 16:10 chỉ vận hành được khi có nguồn dữ liệu server thay thế hoặc proxy phù hợp.

**Workaround:** thêm nút “Quét ngay” dùng chung ở Gọn/Đầy đủ. App lấy OHLCV VPS và chạy
công thức `v1.0.0` ngay trên thiết bị với tối đa 5 request đồng thời. Kết quả chỉ hiện tạm,
không ghi hai collection screening và không gửi Telegram; vẫn mở được form “Đưa vào theo
dõi”. Workaround này cần owner mở app và bấm nên không thay thế lịch 16:10.

**Ghi nhớ:** lỗi mạng không được hạ chuẩn dữ liệu. Retry phải có giới hạn; hết lượt vẫn
fail closed để không gửi đề cử từ dữ liệu thiếu. Kết quả chạy trên máy owner không chứng minh
đường Cloud Function đã hoạt động.

**File:** `functions/index.js` — `fetchHistory`, `screenShortTermOpportunities`,
`markFailure`; `public/index.html` — `runManualScreening`, `screenFetchHistory`,
`screenScoreTicker`, `initScreening`.

### 🔴 #011 — Thư viện Cloud Functions còn 2 cảnh báo bảo mật mức vừa
**Triệu chứng:** `npm audit` báo 2 cảnh báo mức vừa trong chuỗi phụ thuộc gián tiếp
`firebase-admin` → `@google-cloud/storage` → `gaxios` → `uuid`.

**Bug gốc:** phiên bản `firebase-admin` tương thích hiện tại còn kéo theo phiên bản
`gaxios` / `uuid` có advisory. `npm audit fix` chưa tìm được đường nâng tự động mà vẫn giữ
nguyên contract hiện tại.

**Fix:** chưa tự ép nâng phiên bản lớn vì có thể làm Cloud Function lỗi. Trước lần deploy
sau, chạy lại `npm audit`; nếu Firebase phát hành chuỗi phụ thuộc đã vá thì nâng phiên bản,
chạy `npm run smoke` và dry-run Functions lại.

**Ghi nhớ:** đây là thư viện chạy phía server; không đưa package hoặc secret xuống HTML.
Không dùng `npm audit fix --force` khi chưa kiểm tra breaking change.

**File:** `functions/package.json`, `functions/package-lock.json`.

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

### 🟢 #010 — Bot sàng lọc chưa thể chạy thật vì project chưa ở gói Blaze `fix 2026-09-24`
**Triệu chứng:** code, rules và giao diện đã có nhưng lịch 16:10 chưa chạy; Telegram chưa
thể nhận kết quả thật.

**Bug gốc:** Firebase Scheduled Functions và Secret Manager cần project bật thanh toán
Blaze. Project `fin2-danh-muc` lúc đó chưa nâng gói nên Firebase CLI không thể bật các API
Cloud Functions, Artifact Registry và Secret Manager cần thiết.

**Fix:** owner đã nâng Blaze. Hai secret `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` đã
được lưu ở Secret Manager phiên bản 1. Đã deploy thành công Function
`screenShortTermOpportunities` v2 tại `asia-southeast1` với Node.js 22, 512 MB; đồng thời
phát hành Firestore rules và Hosting. Artifact Registry tự xoá image cũ hơn 1 ngày. Tin nhắn
thử đã tới `@fin2_watchlist_bot` thành công.

**Ghi nhớ:** Scheduled Functions và Secret Manager cần Blaze. Sau deploy phải kiểm đủ bốn
phần: lịch Function, secret, Firestore rules và một tin nhắn Telegram thật.

**File:** `firebase.json`; `functions/index.js` — `screenShortTermOpportunities`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`; `firestore.rules` — nhánh `screening_runs`,
`screening_results`.

### 🟢 #009 — Ghi giao dịch ngay khi mới đặt lệnh `fix 2026-09-22`
**Triệu chứng:** trước đây app chỉ có Mua/Bán đã ghi vào `transactions`; nếu nhập ngay lúc
đặt lệnh nhưng lệnh không khớp thì tiền mặt, giá vốn và số lượng cổ phiếu bị thay đổi sai.

**Bug gốc:** mô hình dữ liệu chưa có nơi lưu vòng đời lệnh. `transactions` vừa bị dùng cho
lệnh mới gửi lên sàn, vừa là nguồn tính danh mục; vì vậy app không thể phân biệt “đang chờ”
với “đã khớp”.

**Fix:** thêm collection `orders` với trạng thái `pending` / `partial` / `filled` /
`cancelled`. Đặt lệnh không tác động danh mục; xác nhận phần khớp mới sinh giao dịch bằng
batch cùng cập nhật lệnh và giá. Hỗ trợ khớp nhiều lần, hủy lệnh và giữ chỗ số CP cho các
lệnh bán đang mở. Cả Gọn và Đầy đủ dùng chung một khối Quyết định. Đã kiểm cú pháp
JavaScript, ID trùng, tham chiếu ID và đối chiếu tĩnh luồng đặt → khớp một phần/toàn bộ → hủy;
đã được phát hành cùng đợt deploy toàn bộ ngày 24/09/2026.

**Ghi nhớ:** `orders` ghi ý định và trạng thái trên sàn; `transactions` chỉ ghi phần đã khớp.
Không dùng lệnh đang chờ hoặc đã hủy để tính tiền mặt, giá vốn hay số lượng đang giữ.

**File:** `public/index.html` — `createOrder`, `fillOrder`, `initDecisionTools`,
`renderDecisionHub`; `firestore.rules` — nhánh `orders`.

### 🟢 #008 — Chạm ngưỡng mua/bán thì highlight lại biến mất `fix 2026-09-21`
**Triệu chứng:** mã còn cách ngưỡng tối đa `nearRange` thì hiện “Sắp mua/Sắp bán”,
nhưng vừa chạm hoặc vượt ngưỡng lại mất toàn bộ highlight ở cả Gọn và Đầy đủ.

**Bug gốc:** hàm cũ chỉ trả trạng thái khi khoảng cách tới ngưỡng lớn hơn 0;
trường hợp đã đạt ngưỡng không có trạng thái hiển thị, dù `buildSignals` vẫn sinh tín hiệu.

**Fix:** `strategyAlert` trả cả hai trạng thái “sắp đạt” và “đã đạt”; Gọn và Đầy đủ
hiện hành động cùng số CP/lệnh. `buildSignals` cũng dùng hàm này. Đã kiểm bằng 7 ca mô
phỏng: chỉ dùng điểm, điểm đến trước, % đến trước, sắp mua, đạt mua, đạt bán và mã Giữ
chặn bán.

**Ghi nhớ:** highlight và tín hiệu mua/bán phải cùng đi qua `strategyAlert`; không viết
lại điều kiện riêng cho từng view.

**File:** `public/index.html` — `strategyLevels`, `strategyAlert`, `renderCompact`,
`renderPositions`, `buildSignals`.

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
