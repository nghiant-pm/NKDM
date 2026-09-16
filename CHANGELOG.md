# CHANGELOG — Fin2

Ngày mới nhất trên đầu.

---

## 2026-09-16 (Ẩn lãi/lỗ, forecast chốt lời và xuất Nhật ký cho AI)

- **Ẩn/hiện lãi lỗ:** nút hình con mắt ở đầu trang che toàn bộ số lãi/lỗ, tỷ suất và giá vốn sau lướt trong cả Gọn lẫn Đầy đủ; vẫn giữ giá, tiền mặt và tổng tài sản. Lựa chọn được nhớ riêng trên máy.
- **Forecast chốt lời:** dashboard Đầy đủ mô phỏng bán 30% / 50% / 100% tất cả vị thế đang lãi theo giá thị trường hiện tại. Số lượng làm tròn xuống theo CP nguyên; tiền về và lãi dự kiến đã trừ thuế TNCN 0,1%; không tạo giao dịch thật.
- **Biến động mã theo dõi:** bỏ dòng biến động khỏi thẻ và bảng Theo dõi. Mỗi lần ghi giá vẫn được giữ trong Nhật ký theo ngày, gồm giá, thay đổi điểm và % so với lần ghi trước.
- **Xuất Nhật ký cho AI:** chuyển nút xuất về ngay khu vực Nhật ký, bổ sung lịch sử giá theo dõi và lãi/lỗ đã chốt sau thuế. Có thể xuất dù kỳ đó chưa sinh tín hiệu; tên file là `fin2-nhat-ky-AI-YYYY-MM-DD.json`.
- Đã kiểm bằng dữ liệu mô phỏng: forecast, ẩn/hiện ở hai view, Nhật ký biến động 0 và xuất file khi không có tín hiệu. Không ghi Firebase thật và không đổi collection/rules.
- Đã deploy thành công Hosting + Firestore rules ngày 16/09/2026: https://fin2-danh-muc.web.app.

· `public/index.html` · `CHANGELOG.md` · `CODEMAP.md` · `AGENTS.md`

## 2026-09-16 (Dashboard dòng tiền và lãi/lỗ)

- **Hai view cùng một số liệu:** Đầy đủ có dashboard chi tiết; Gọn giữ 4 chỉ số chính gồm lãi/lỗ đã chốt, lãi/lỗ chưa bán, tiền mặt và tỷ lệ tiền mặt.
- **Đổi kỳ xem nhanh:** chọn Tuần / Tháng / Quý / Tất cả; lựa chọn được nhớ riêng trên từng máy. Lãi/lỗ đã chốt cộng từ các lệnh bán trong kỳ và đã trừ thuế TNCN đã lưu.
- **Phân nhóm vị thế:** dùng cờ sẵn có để chia “Giữ dài hạn” và “Giao dịch”, hiện giá trị, lãi/lỗ và tỷ trọng trên tổng tài sản.
- **Giá vốn sau lướt:** tính theo lãi/lỗ đã chốt trong chu kỳ nắm giữ liên tục hiện tại; bán hết rồi mua lại sẽ bắt đầu chu kỳ mới.
- **Mục tiêu tiền mặt:** thêm khoảng tối thiểu/tối đa vào từng phiên bản Chiến lược, mặc định 20–30%; dashboard báo Thấp / Đạt / Cao bằng cả chữ và màu.
- Không thêm collection và không đổi Firestore rules. Đã đối chiếu hai view, sáng/tối và các mốc 375/430/768/1120px bằng dữ liệu mô phỏng; không ghi Firebase thật.
- Đã deploy thành công Hosting + Firestore rules ngày 16/09/2026: https://fin2-danh-muc.web.app.

· `public/index.html` · `CHANGELOG.md` · `CODEMAP.md` · `AGENTS.md`

## 2026-09-16 (Biến động theo dõi, thời gian nắm giữ và cảnh báo gần ngưỡng)

- **Biến động trong thời gian theo dõi:** thẻ và bảng watchlist hiện số ngày theo dõi, mức thay đổi theo điểm và %. Giá được ghi tối đa một lần/mã/ngày vào `watch_prices`; ghi lại trong ngày sẽ cập nhật đúng bản đó. Lịch sử cũ trong `daily_snapshots` vẫn được tận dụng, mã chưa có mốc được ghi rõ từ lần bắt đầu có dữ liệu.
- **Thời gian nắm giữ:** mỗi vị thế hiện số ngày của chu kỳ nắm giữ liên tục hiện tại. Ngày bắt đầu được suy ra từ giao dịch; bán hết rồi mua lại tạo chu kỳ mới, không lưu thêm bản sao vào Firestore.
- **Cảnh báo gần điểm mua/bán:** phiên bản chiến lược thêm `nearRange`, mặc định 0,5 điểm với bản cũ. Mã chưa chạm ngưỡng nhưng còn cách không quá khoảng này được highlight và báo số điểm còn lại; cờ Giữ tiếp tục chặn toàn bộ cảnh báo bán.
- **Cả Gọn và Đầy đủ:** Đầy đủ thêm thông tin vào thẻ; Gọn dùng dòng phụ và viền nhấn nhẹ, không thêm cột. Đã thử bằng dữ liệu mô phỏng ở 375/430/768/1120px, không tràn ngang; không ghi Firebase thật.
- **Bảo mật:** collection `watch_prices` có nhánh rules riêng cho đúng email owner; chốt chặn mặc định vẫn từ chối mọi collection khác.
- Đã deploy thành công Hosting + Firestore rules ngày 16/09/2026: https://fin2-danh-muc.web.app.

· `public/index.html` · `firestore.rules` · `CHANGELOG.md` · `CODEMAP.md`

## 2026-09-15c (Nhật ký: xóa giao dịch nhập sai)

Owner chọn phương án xóa đúng một giao dịch mua/bán đã nhập sai, thay vì xóa sạch toàn bộ dữ liệu của mã.

- **Xóa ngay tại Nhật ký:** mỗi giao dịch có nút Xóa; app hiện lại mã, số lượng, giá và ngày để xác nhận trước khi xóa đúng `transactions/{id}` (`removeTransaction`).
- **Luôn tìm thấy giao dịch vừa nhập:** Nhật ký nay hiện cả ngày chỉ có giao dịch hoặc nạp/rút, kể cả ngày đó chưa bấm Lưu để tạo `daily_snapshots` (`renderLog`).
- **Phạm vi đã chốt:** chỉ xóa giao dịch được chọn. Không xóa cả mã, giá, mã theo dõi, nạp/rút hay bản Nhật ký ngày đã lưu; dữ liệu còn lại tự đồng bộ và tính lại như trước.

· `public/index.html` · `CHANGELOG.md` · `CODEMAP.md`

## 2026-09-15 (T+2 và thuế TNCN khi bán)

- Form giao dịch dùng chung ở Gọn và Đầy đủ báo số cổ phiếu có thể bán tại thời điểm hiện tại; cổ phiếu mua mở bán từ 11:35 ngày làm việc thứ hai kế tiếp. Chỉ loại thứ Bảy và Chủ nhật theo phạm vi đã chốt.
- Dòng báo tự cập nhật khi đổi mã, đổi Mua/Bán, dữ liệu đồng bộ thay đổi hoặc thời gian đi qua 11:35. Đây là thông tin tham khảo; không chặn lưu. Cơ chế xác nhận bán vượt tổng số đang giữ vẫn giữ nguyên.
- Lệnh bán mới âm thầm lưu và trừ thuế TNCN 0,1% giá trị bán. Tiền mặt và lãi/lỗ đã bán đều dùng số sau thuế; lệnh bán cũ không có dữ liệu thuế giữ nguyên, không tính hồi tố.
- File xuất dữ liệu thêm thuế cho từng lệnh bán và tổng thuế trong phần giao dịch khớp tín hiệu. Không thêm collection hay thay đổi Firestore rules.

· `public/index.html` · `CHANGELOG.md` · `CODEMAP.md` · `AGENTS.md`

## 2026-09-15 (View Gọn: sort, filter và thao tác nhanh)

- Hai bảng có tìm mã, lọc trạng thái và sort tăng/giảm khi bấm tiêu đề cột. Sort lưu riêng từng máy; filter tự về Tất cả khi tải lại. Có nút về thứ tự kéo thả đã xếp.
- Bảng nắm giữ thêm Giá hiện tại. Giá cao/thấp hơn giá vốn và lãi/lỗ dùng xanh/đỏ; bảng theo dõi dùng xanh khi đạt giá kỳ vọng, đỏ khi còn cao hơn.
- Thêm mã theo dõi ngay từ view Gọn bằng form có sẵn. Form giữ bản nhập khi đóng/mở và không tạo luồng ghi riêng.
- Nút Lấy giá của bảng nắm giữ lấy toàn bộ mã đang giữ dù đang lọc và ghi thẳng vào `tickers`; không tạo nhật ký hay tín hiệu. Tab Danh mục ở Đầy đủ giữ cách điền ô rồi chờ Lưu.
- Đã thử bằng dữ liệu mẫu: sort số và mã, giá thiếu luôn cuối; tìm + lọc, trạng thái không có kết quả; nhớ sort nhưng không nhớ filter; thêm mã chỉ ghi `watchlist`; lấy giá nắm giữ chỉ ghi `tickers`; màu tăng/giảm và bảng 5 cột ở 375/430/768/1120px không tràn ngang. Đã deploy Firebase thành công ngày 15/09/2026.

· `public/index.html` · `CHANGELOG.md` · `CODEMAP.md` · `AGENTS.md`

## 2026-09-14 (Giao diện: thêm view Gọn)

Owner muốn xem nhanh vốn, cổ phiếu đang giữ và mã đang theo dõi trên cùng một màn hình, giữ cách đồng bộ và lưu dữ liệu hiện có.

- **Chuyển Gọn / Đầy đủ:** nhớ lựa chọn riêng từng máy bằng `fin2-view`; lần đầu mở Đầy đủ. Quay lại Đầy đủ vẫn ở tab trước đó (`initCompact`).
- **Ba khối chính:** tổng quan gồm vốn nạp ròng (nạp − rút), tiền mặt, giá trị cổ phiếu và lãi/lỗ chưa bán kèm %. Hai bảng hiện mã đang giữ và mã theo dõi; chênh lệch điểm = giá thị trường − giá kỳ vọng (`renderCompact`). Điện thoại xếp tổng quan 2×2.
- **Cùng số liệu và thứ tự mã:** dùng `computeSummary`, `sortTickers` và luồng đồng bộ sẵn có. Mã thiếu giá hiện rõ “Chưa có giá”; tổng có dùng giá vốn thay thế được ghi “Tạm tính · thiếu giá”. Không thêm collection hay kết nối đồng bộ.
- **Thao tác ngay trong view Gọn:** bấm mã hoặc Giao dịch mở form cũ trong hộp; Cập nhật giá mở khối nhập giá cũ (`openCompactForm`). Đóng hộp giữ nội dung đang nhập, không tự lưu. Bấm giá kỳ vọng dùng lại `editWatch`; nút `tx-submit` chặn gửi lặp khi đang lưu.
- **Giữ đúng hai cách lấy giá:** Danh mục chỉ điền ô rồi chờ Lưu nhật ký; Theo dõi ghi ngay như trước. Nút và thông báo được chuyển qua lại giữa hai view, không tạo bản sao xử lý. Nạp/rút, quản lý watchlist, chiến lược và lịch sử vẫn ở Đầy đủ; không thêm gợi ý mua/bán vào bảng Gọn.
- **Nhắc trước khi rời trang có nội dung chưa lưu:** `pendingDrafts` ghi nhận form giao dịch và ô giá đang sửa; `beforeunload` yêu cầu trình duyệt cảnh báo trước khi tải lại hoặc đóng trang. Lưu xong xoá cờ. Bản nháp chỉ ở bộ nhớ phiên mở trang, không lưu vào localStorage.
- **Đã kiểm bằng trình duyệt với dữ liệu mẫu:** đối chiếu tổng, thiếu giá, danh sách rỗng; đo 375/430/768/1120px không tràn ngang và xem sáng/tối. View Gọn được nhớ qua tải lại; quay về Đầy đủ khôi phục đúng tab Theo dõi. Giữ form khi đóng/mở và nhận cập nhật dữ liệu; thử lưu giao dịch, sửa giá kỳ vọng, lấy giá danh mục chỉ điền ô, lấy giá watchlist ghi ngay và lưu nhật ký tạo snapshot + tín hiệu. Các thao tác ghi dùng bản mô phỏng, không ghi Firebase thật. Đã deploy Firebase thành công (`firebase deploy --project fin2-danh-muc`, exit 0): https://fin2-danh-muc.web.app.

· `public/index.html` · `CHANGELOG.md` · `CODEMAP.md`

## 2026-09-10

### Kéo đổi thứ tự mã và giảm chữ phụ
- Bỏ “(nghìn đ)” ở nhãn giá và dòng lấy giá thành công kèm số mã/nguồn/giờ.
- Giữ thông báo ngắn khi lỗi, thiếu giá hoặc dùng giá tham chiếu.
- Thêm tay nắm kéo thả trên thẻ Danh mục và Theo dõi, hỗ trợ chuột/chạm, cuộn khi kéo sát mép và phím mũi tên.
- Thứ tự lưu riêng từng danh sách trong localStorage trên mỗi máy; không thay đổi dữ liệu đầu tư.

### Cài ứng dụng Danh Mục trên Android
- Đổi title và tiêu đề giao diện thành “Danh Mục”.
- Thêm manifest, icon PNG 192/512 và icon maskable, mở ở chế độ standalone.
- Nút Cài đặt chỉ hiện khi Chrome phát sự kiện cho phép cài; ẩn sau khi cài hoặc đang mở app riêng.
- Không thêm cache offline; dữ liệu và cách đăng nhập giữ nguyên. Cần deploy rồi kiểm tra cài thực tế trên Android.

### Lấy giá trước khi thêm mã theo dõi
- Form Thêm mã: nhập mã → Lấy giá → xem giá thị trường → nhập giá muốn mua → Lưu.
- Dùng chung nguồn VPS; hiện riêng giá tham chiếu khi chưa khớp lệnh. Đổi mã bỏ kết quả cũ.
- Lấy giá chỉ xem trước; bấm Lưu mới ghi mã theo dõi và giá đã lấy trong cùng batch.
- Vẫn cho nhập giá muốn mua thủ công khi nguồn giá không khả dụng.

### Sửa giá muốn mua trong Theo dõi
- Thêm nút “Sửa” cạnh giá muốn mua, mở ô giá có sẵn và nút Lưu/Huỷ.
- Chỉ cập nhật giá mục tiêu và thời gian sửa; giữ ngày thêm mã. Chặn giá không hợp lệ và lưu lặp.
- Khoảng cách, % cần giảm và trạng thái đạt giá tự cập nhật qua đồng bộ Firestore.

### Tinh gọn giao diện và bổ sung khoảng giảm giá
- Bỏ nút đăng xuất và placeholder “Giá (nghìn đ)” trong ô cập nhật giá.
- Theo dõi: giá thị trường trước, giá muốn mua sau; thêm “Cần giảm” theo % giá thị trường.
- Giá đã bằng hoặc thấp hơn giá muốn mua hiện 0%; thiếu giá hiện “—”.

### Rút gọn câu chữ, dùng nhãn dễ hiểu
- Rút ngắn nút bấm, thông báo và trạng thái trống; bỏ ví dụ dài trong ô ghi chú.
- Nhãn owner chốt: “Danh mục”, “Giá TB”, “Tỷ suất”, “CP/lệnh”,
  “Theo / Giữ”, “Tải”, “Lấy giá”, “Lưu”.
- Giữ đơn vị, cảnh báo cần thiết, logic và cấu trúc dữ liệu hiện tại.
- Kiểm tra: cú pháp JavaScript hợp lệ; ID giao diện và nội dung xuất dữ liệu giữ nguyên.

### Gập được cả khối tài sản
Owner báo: 11 phần gập được nhưng đúng khối 4 ô tài sản trên cùng thì không, vì nó là khối
duy nhất không có đầu đề.

- **Thêm đầu đề "Tổng quan"** cho khối 4 ô (Tổng tài sản · Giá trị đầu tư · Tiền mặt · Lãi/lỗ),
  khoá gập `tong-quan`. Tổng cộng **12 phần gập được**.
- **Gập rồi vẫn liếc được số:** đầu đề có ô `#ov-sub` hiện tổng tài sản, nhưng **chỉ hiện khi
  đang gập** (class `.only-collapsed`). Mở ra thì ẩn đi vì thân đã có sẵn con số đó — không
  bày hai lần. Cơ chế này thuần CSS, `render()` cứ đổ số vào vô điều kiện, không phải biết
  khối đang gập hay mở.

### Nút lấy giá cho tab Theo dõi + thu gọn từng section
Hai việc nhỏ làm ngay sau gói watchlist: mã theo dõi vẫn phải nhập giá tay, và trang
một màn quá dài trên điện thoại.

- **Nút "Lấy giá thị trường" ở tab Theo dõi** (`fetchWatchPrices`). Bấm một cái là lấy giá
  tất cả mã đang theo dõi từ datafeed VPS. Dòng chữ dưới nút nói rõ lưu được mấy mã, mã nào
  đang lấy giá tham chiếu vì chưa khớp lệnh, mã nào không có giá. Chưa theo dõi mã nào thì
  nút **tự mờ đi** (`renderWatchlist` bật/tắt `#wl-fetch`).
- ⚠️ **Nút này GHI THẲNG vào `tickers`, không chờ bấm Lưu** — ngoại lệ có chủ ý so với quy tắc
  cũ "nút Lấy giá chỉ điền vào ô". Owner cân nhắc và chọn: mã theo dõi không nằm trong danh mục
  nên giá sai cũng không làm lệch lãi/lỗ hay tổng tài sản. **Nút `#fetch-price` ở tab Danh mục
  giữ nguyên nếp cũ** — vẫn chỉ điền vào ô. Đừng "sửa lại cho nhất quán" một trong hai bên.
- **Tách phần đọc datafeed ra dùng chung** (`fetchQuotes(syms)`). Trước đây chỉ có một nút nên
  phần đọc JSON nằm luôn trong `fetchMarketPrices`; giờ có hai nút thì tách ra một chỗ.
  `fetchMarketPrices` từ nay gọi `fetchQuotes` thay vì tự đọc. **Có nút lấy giá thứ ba thì cũng
  gọi hàm này, đừng chép lại lần nữa.**
- **Thu gọn được từng phần của trang** (`initCollapse`, `setCollapsed`, `readCollapsed`,
  `writeCollapsed`). 11 đầu đề có thêm mũi tên; bấm vào đầu đề là gập/mở phần thân bên dưới.
  Phần nào đang gập **nhớ theo máy** (localStorage `fin2-collapsed`), cùng nhóm với `fin2-theme`
  và `fin2-tab` — đổi máy không kéo theo.
- **Cách làm cố ý gọn:** JS chỉ gắn class `collapsed` lên thẻ cha, CSS giấu mọi thứ sau đầu đề
  (`.collapsed > *:not(.sec-head)`). **Không bọc thêm thẻ nào**, nên markup cũ không phải sửa —
  chỉ thêm `data-sec="<khoá>"` vào 11 đầu đề để có chỗ ghi nhớ. Khoá: hom-nay · vi-the · ghi-gd ·
  nap-rut · nhat-ky · watchlist · them-wl · st-hien-tai · st-doi · st-lich-su · xuat.
  Thêm section mới muốn gập được thì chỉ cần đặt thêm `data-sec` mới.
- **Boot giờ có 5 lời gọi:** `initTabs() → initCollapse() → initForms() → render() → initGate()`.

**Đã kiểm:** chạy lại harness logic 7 nhóm phép thử — đạt hết. Mở trình duyệt khổ 375px:
11 đầu đề đều có mũi tên, gập/mở ăn, tải lại trang vẫn còn nguyên phần đang gập, `aria-expanded`
đúng, nút lấy giá watchlist tự tắt khi chưa theo dõi mã nào, không lỗi console.
**CHƯA thử với dữ liệu Firestore thật, CHƯA deploy, CHƯA commit.**

**File đụng tới:** `public/index.html` · `CLAUDE.md` (ghi ngoại lệ nút lấy giá) · `CODEMAP.md`

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
