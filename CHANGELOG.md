# CHANGELOG — Fin2

Ngày mới nhất trên đầu.

---

## 2026-09-10

### Watchlist + nhật ký tín hiệu + chiến lược có phiên bản + xuất JSON cho AI
Owner muốn biết "chiến lược −2/+3 này có thật sự hiệu quả không", và muốn theo dõi cả
mã chưa mua. Muốn trả lời được thì phải **ghi lại từng gợi ý mua/bán mỗi ngày**, rồi
đối chiếu với giá các phiên sau. Đây là gói lớn nhất từ lúc lên Firebase.

- **Chia màn hình thành 3 tab:** Danh mục · Theo dõi · Chiến lược. Toàn bộ nội dung cũ
  nằm nguyên trong tab Danh mục, không đổi một chữ nào bên trong. Hàm mới `showTab(name)`
  / `initTabs()`. Tab đang mở nhớ theo **máy** (localStorage `fin2-tab`), giống cách nhớ
  sáng/tối — đổi máy không kéo theo.
- **Tab Theo dõi — mã chưa mua.** Thêm mã + "giá muốn mua" (`addWatch`, `removeWatch`,
  `renderWatchlist`, collection `watchlist/{MÃ}`). Mã trong danh sách theo dõi được
  **lấy giá và nhập giá chung với mã đang giữ** — `renderPriceInputs` / `renderTodayBanner`
  từ nay nhận **danh sách mã** (`priceTickers`) chứ không còn nhận riêng mã đang giữ.
- **Tab Chiến lược — ngưỡng có phiên bản.** Mỗi lần đổi ngưỡng là một bản ghi mới trong
  `strategies` kèm ngày hiệu lực và lý do; bản cũ **giữ nguyên, không sửa đè**. Hàm
  `activeStrategy(ngày)` trả bản có ngày hiệu lực gần nhất trước ngày đó. Nhờ vậy tín hiệu
  tháng 9 vẫn được chấm theo ngưỡng tháng 9 dù tháng 10 owner đổi ngưỡng.
  Ngưỡng giờ có **3 tầng**: hằng số mặc định `RULE_BUY_DROP`/`RULE_SELL_RISE`/`RULE_LOT`
  (2 / 3 / 100) → phiên bản trong `strategies` → nơi dùng đọc qua `activeStrategy()`.
  **Không nơi nào được gõ số nữa**, kể cả `renderPositions`.
- **Ghi lại tín hiệu mỗi ngày.** Bấm "Lưu nhật ký hôm nay" thì ngoài `daily_snapshots`,
  app ghi luôn các gợi ý của ngày đó vào `signals` (`buildSignals`, `writeSignals`):
  mua khi giá ≤ giá vốn − ngưỡng, bán khi ≥ giá vốn + ngưỡng (cờ **Giữ** vẫn chặn tín hiệu
  bán), và loại **watch** khi mã theo dõi rơi xuống giá muốn mua. Toast báo thêm số tín hiệu
  đã ghi. Id đặt theo `ngày_MÃ_loại` nên lưu lại trong ngày là **ghi đè, không đẻ bản trùng**;
  sửa giá xong tín hiệu cũ không còn thoả thì **xoá luôn**, không để rác.
- **KHÔNG lưu cờ "đã làm theo hay chưa"** trong `signals`. Cố ý. Việc đó suy ra được từ
  `transactions` cùng ngày · cùng mã · cùng chiều ngay lúc xuất dữ liệu. Lưu thêm một bản sao
  chỉ tạo thêm chỗ để lệch nhau.
- **Nút xuất dữ liệu JSON cho AI đánh giá** (`buildExport`, `downloadExport`). Chọn khoảng ngày,
  tải về 1 file gồm: chiến lược từng giai đoạn, từng tín hiệu kèm ngưỡng lúc đó, **có làm theo
  hay không**, khớp thực tế, và **giá của mã đó ở 5 / 10 / 20 phiên sau**. Kèm sẵn đoạn
  `HUONG_DAN_AI` viết bằng lời để dán vào chat nào cũng hiểu — trong đó nói rõ "điểm" là
  nghìn đồng chứ không phải %, và đơn vị tiền của từng trường.
- **Bảo mật:** 3 collection mới `watchlist` / `strategies` / `signals` đã có nhánh trong
  `firestore.rules` ngay trong lần sửa này, không để sau.
- ⚠️ **`daily_snapshots.prices` từ nay chứa cả mã KHÔNG nắm giữ** (mã theo dõi).
  `computeSummary` bỏ qua mã không giữ nên số liệu không đổi, nhưng ai đọc snapshot cũ/mới
  cần biết là hai bản có phạm vi khác nhau.

**Đã kiểm:** harness Node với dữ liệu giả, 7 nhóm phép thử — chiến lược mặc định · chọn đúng
phiên bản theo ngày · sinh tín hiệu mua/bán/theo dõi · cờ Giữ chặn tín hiệu bán · danh sách mã
lấy giá · đối chiếu "đã làm theo" khi xuất · lọc theo khoảng ngày — **đạt hết**.
Mở trình duyệt xem 3 tab ở khổ điện thoại 375px, không lỗi console.
**CHƯA deploy, chưa bấm thử với dữ liệu thật.**

**File đụng tới:** `public/index.html` · `firestore.rules` · `CODEMAP.md` · `ISSUES.md`

### Sửa bug màn đăng nhập không tự ẩn (#005) + nút lấy giá tự động
Owner báo: đăng nhập xong kéo xuống vẫn thấy trang dữ liệu nằm dưới màn đăng nhập.

- **Bug gốc:** `.gate{ display:flex }` trong stylesheet của trang **đè lên** `display:none`
  mà trình duyệt gán mặc định cho thuộc tính `hidden` — khai `display` của tác giả luôn
  thắng UA stylesheet. Nên `gate.hidden = true` không giấu được gì.
  **Chữa tận gốc:** thêm `[hidden]{ display:none !important }` áp cho toàn trang,
  không vá riêng `.gate` — mọi phần tử dùng `hidden` từ nay đều đúng.
- **Nút "Lấy giá thị trường".** Đo thật 7 nguồn từ đúng origin của app: TCBS, SSI,
  VNDirect, CafeF, DNSE, Yahoo **đều bị CORS chặn**; chỉ `bgapidatafeed.vps.com.vn`
  cho gọi cross-origin. `lastPrice` trả về đã sẵn đơn vị nghìn đồng, trùng đơn vị
  `price` của app — đối chiếu đúng 4 giá owner nhập tay hôm trước.
  Mã chưa khớp lệnh thì rơi về giá tham chiếu và **nói rõ ra**; mã không có giá thì
  gọi tên mã. Chỉ điền vào ô, **không tự ghi database** — giữ nguyên quyết định cũ.
  Không cần proxy, không cần nâng Blaze plan.

**File đụng tới:** `public/index.html` · `CLAUDE.md` · `CODEMAP.md` · `ISSUES.md`

### Di trú xong, dọn trang seed
Owner đã chạy `seed.html` một lần, 10/10 document sang Firestore, 4 con số trên app
khớp đúng số của app TCBS. Sau đó:
- Xoá `public/seed.html` — hết việc, để lại là một cửa ghi dữ liệu không ai canh.
- `artifact-da-doi.html` publish đè lên Artifact cũ (theo lựa chọn 2B của owner).
- **Giữ `portfolio-tracker.html`** làm bản lịch sử của app cũ, KHÔNG xoá:
  dự án chưa có git nên đó là bản duy nhất còn tồn tại. Có git rồi thì xoá được.

**Kiểm chứng trước khi giao:**
- Harness Node tách riêng `computeHoldings` / `computeCashVND` / `currentPriceFor` /
  `computeSummary` chạy trên đúng dữ liệu seed → khớp tuyệt đối 4 chỉ số
  (76.558.231 / 73.448.000 / 72.890.000 / 149.448.231).
- Gọi thẳng Firestore REST không kèm đăng nhập → `PERMISSION_DENIED`. Rules chặn thật,
  không phải chỉ chặn ở client.

### Chuyển từ Claude Artifact sang Firebase + dựng lại giao diện mobile-first
**Vì sao:** bản cũ chạy trên Artifact platform, phần lưu dữ liệu (`window.claude.use("db")`)
chỉ sống khi mở qua link artifact — mở file trên máy là mất. Owner muốn một link ổn định,
dùng chính trên điện thoại lúc đang xem bảng giá.

- Tạo Firebase project `fin2-danh-muc` (location `asia-southeast1`), web app, hosting.
  Owner đã được nêu rủi ro đặt dữ liệu tài chính cá nhân trên project thuộc tài khoản
  công ty `nghiant@youmed.vn` và **chọn giữ** — ghi vào CLAUDE.md mục "Đã chốt".
- `public/index.html` — app mới. Giữ **nguyên vẹn** 4 hàm tính toán của bản cũ
  (`computeHoldings`, `computeCashVND`, `currentPriceFor`, `computeSummary`) vì đã kiểm chứng đúng;
  chỉ thay tầng đọc/ghi từ Artifact `db` sang Firestore modular SDK.
- **Giao diện dựng lại mobile-first** theo `Starter-Kit/02-ui-ux/`:
  bỏ 3 font còn 1 (Inter), bỏ weight 700/800 còn 400/500, bỏ nhãn IN HOA + letter-spacing,
  bỏ phụ đề giải thích dưới tiêu đề, bảng vị thế đổi thành **lưới thẻ** (một đường dựng DOM
  cho mọi khổ màn hình, không tách bản mobile riêng), dark mode có script pre-paint,
  ô nhập `font-size:16px` chặn iOS tự phóng, padding đáy có `env(safe-area-inset-bottom)`,
  kèm `prefers-reduced-motion`.
- **Cổng đăng nhập Google + `firestore.rules` chỉ cho đúng 1 email.**
  Chặn thật nằm ở rules, client chỉ hiển thị. Nhánh sai tài khoản **không auto-signOut**
  (bài học 11b: signOut một trang là văng mọi tab).
- **Chặn bán vượt số đang giữ** (ISSUES #001): submit bị chặn hẳn, hiện ô tick xác nhận;
  tick rồi mới ghi được. Xác nhận **mất hiệu lực khi đổi mã / loại lệnh / số lượng**
  để không vô tình dùng lại cho giao dịch khác.
- Ngưỡng −2 / +3 gom về hằng số `RULE_BUY_DROP` / `RULE_SELL_RISE`, không gõ số rải rác.
- `public/seed.html` — trang dùng một lần, di trú 10 document từ Artifact cũ sang Firestore
  bằng chính quyền đăng nhập của owner (không cần service account key). Doc id cố định
  nên chạy lại không sinh bản trùng. **Xoá sau khi đối chiếu xong.**

**File đụng tới:** `public/index.html` (mới) · `public/seed.html` (mới, tạm) ·
`firestore.rules` (mới) · `firebase.json` · `.firebaserc` · `CLAUDE.md` · `CODEMAP.md` ·
`ISSUES.md` · `.claude/` · `hooks/codemap-reminder.js`

### Dựng hệ 4 file tài liệu + cài Starter-Kit
Dự án trước đó chỉ có `contexx.md` và 1 file HTML. Dựng `CLAUDE.md` / `CODEMAP.md` /
`CHANGELOG.md` / `ISSUES.md`, copy `skills/` + `agents/` + `settings.json` + `launch.json`
vào `.claude/`, sửa `CODE_DIRS` của hook nhắc CODEMAP thành `['public']`.

**Sai lệch đã sửa:** `contexx.md` ghi file nguồn nằm ở `claude/portfolio-tracker.html`,
thực tế nằm ở gốc `D:\TCBS\`.
