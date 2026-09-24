# CHANGELOG — Fin2

Ngày mới nhất trên đầu.

---

## 2026-09-24g (View Gọn: dải Highlight hôm nay + nút Bỏ qua)

Owner muốn đổi tên dải “Việc cần làm hôm nay” và có cách gạt những mục đã xem xong khỏi tầm mắt.

- **Đổi tên** thành “Highlight hôm nay”; bộ đếm ghi “N mục”, không có gì thì hiện “Không có gì cần chú ý”.
- **Nút “Bỏ qua” trên từng mục:** ẩn mục đó tới hết ngày. Ngày mai nếu mã vẫn đạt/sắp đạt ngưỡng thì hiện lại. Có nút “Hiện lại N mục đã bỏ qua” khi lỡ bấm nhầm.
- **Chỉ lưu trên máy đang dùng** (localStorage `fin2-skip-highlight`, tự hết hạn khi sang ngày) theo lựa chọn của owner. Không ghi Firestore, không thêm collection, không đổi rules; tín hiệu, lệnh và khối Quyết định giữ nguyên. Đây không phải nút “đã làm / bỏ qua” tín hiệu đã chốt là không làm — đã ghi rõ trong `CLAUDE.md` / `AGENTS.md`.
- **Đã kiểm với dữ liệu giả:** bỏ qua 2 mục → còn 11/13, 0 lần ghi database, khối Quyết định vẫn 13 tín hiệu; tải lại trang vẫn giữ; dữ liệu của ngày hôm trước tự bị bỏ; Hiện lại trả đủ 13 mục. Nút Bỏ qua 44px, không tràn ở 375 và 1120px.

· `public/index.html` · `CLAUDE.md` · `AGENTS.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-09-24f (View Gọn: trả Nắm giữ / Theo dõi về một cột)

Owner thấy bố cục hai cột trên desktop lạ mắt và khó theo dõi.

- **Một cột ở mọi kích thước màn hình:** bỏ quy tắc chia Nắm giữ (cột chính) / Theo dõi (cột phụ) từ 900px; Theo dõi nằm dưới Nắm giữ, cả hai dùng hết chiều ngang. Mobile vốn đã một cột nên không đổi.
- Bỏ luôn quy tắc nới cột Mã của bảng Theo dõi (thêm ở 24e) vì chỉ cần khi bảng bị ép hẹp trong cột phụ.
- Đã kiểm ở 800 và 1120px: không cuộn ngang, tên mã và nút ba chấm cùng một dòng ở cả hai bảng.

· `public/index.html` · `CHANGELOG.md`

## 2026-09-24e (View Gọn thành màn hình dùng hằng ngày + một nút lấy giá chung)

Owner chốt tối ưu giao diện, ưu tiên view Gọn trên điện thoại: danh mục đang bị đẩy xuống quá sâu và bảng 5 cột làm số liệu xuống dòng khó đọc.

- **Một nút lấy giá cho cả app:** icon làm mới ở header, dùng cho cả Gọn và Đầy đủ; bỏ các nút lấy giá riêng ở Danh mục, Theo dõi và bảng nắm giữ. `refreshAllPrices()` gộp mã nắm giữ + theo dõi, gọi VPS đúng một lần, ghi giá vào `tickers` (mã trùng chỉ ghi một lần), ghi lịch sử cho mã theo dõi và điền sẵn ô giá nhật ký. **Không tạo nhật ký ngày hay tín hiệu** — vẫn phải bấm Lưu. Báo đang tải, số mã cập nhật, mã thiếu giá và giờ cập nhật.
- **Bố cục Gọn:** Tổng quan → Việc cần làm hôm nay → Nắm giữ → Theo dõi → Phân tích chi tiết (mặc định gập). Dải Việc cần làm chỉ tổng hợp tín hiệu đã/sắp đạt ngưỡng, lệnh chờ và mã theo dõi gần mục tiêu; không có việc thì thu về một dòng.
- **Mobile:** bảng Nắm giữ/Theo dõi thành dòng thẻ hai tầng (mã + cảnh báo + lãi/lỗ ở trên; số lượng, giá vốn, giá hiện tại ở dưới). Tìm/lọc/sắp xếp nằm sau icon, nút đặt lại chỉ hiện khi đang lọc. Thao tác ít dùng (luận điểm, sửa giá kỳ vọng, bỏ theo dõi) vào menu ba chấm.
- **Desktop:** hai cột — Nắm giữ cột chính, Theo dõi cột phụ; bảng giữ dạng cột.
- **Icon đồng nhất, vùng bấm tối thiểu 44px**, icon-only có nhãn trợ năng. Không thêm collection, không đổi Firestore rules.
- **Sửa khi bấm thử trước deploy:** số tiền và % dính liền rồi tràn mép phải ở mã lỗ; chữ “Danh Mục” bị xuống dòng; nút “không tính mã dài hạn” chiếm riêng một hàng; menu ba chấm mở lệch ra ngoài mép trái màn hình; cột Mã ở Theo dõi (desktop) quá hẹp; nút Gọn/Đầy đủ, chọn kỳ, tên mã, mục menu và nút gập Quyết định dưới 44px.
- **Đã kiểm bằng trình duyệt thật với dữ liệu giả (không chạm Firestore thật), giá lấy thật từ VPS:** 344/375/430/768/1120px, sáng và tối, không cuộn ngang ở cả hai view. Bấm lấy giá: 1 lần gọi VPS cho 14 mã, mã vừa giữ vừa theo dõi ghi 1 lần + có lịch sử theo dõi, 0 nhật ký/tín hiệu trước khi Lưu; thiếu 2 mã vẫn lưu 12 mã và báo đúng mã thiếu; mất mạng báo lỗi, không ghi gì. Bấm Lưu sinh đúng 1 nhật ký ngày và tín hiệu. Trạng thái rỗng, lọc/đặt lại đều đúng.
- Cập nhật quy tắc nút lấy giá trong `CLAUDE.md` / `AGENTS.md` để AI sau không dựng lại nút cũ.
- Đã deploy Hosting ngày 24/09/2026 (rules và Cloud Function không đổi nên không deploy lại); trang public trả `200 OK`, `Cache-Control: no-cache`, nội dung trùng khớp bản local: https://fin2-danh-muc.web.app.

· `public/index.html` · `CLAUDE.md` · `AGENTS.md` · `CHANGELOG.md` · `ISSUES.md` · `CODEMAP.md`

## 2026-09-24d (Cơ hội ngắn hạn: thêm nút Quét ngay trên thiết bị)

Do lịch Cloud Function chưa lấy được dữ liệu VPS, owner cần một cách tự quét ngay trong app mà vẫn giữ nguyên quy trình tự xem xét trước khi đưa mã vào watchlist.

- **Một nút dùng chung hai view:** thêm “Quét ngay” trong khối `screening-hub`; vì khối này được di chuyển thật giữa Gọn và Đầy đủ nên không tạo hai luồng riêng.
- **Chấm ngay trên thiết bị:** `runManualScreening()` lấy OHLCV trực tiếp từ VPS với tối đa 5 request cùng lúc, áp dụng đúng công thức `v1.0.0`, loại mã đang nắm giữ ngoài watchlist và lấy tối đa 5 mã tổng cộng.
- **Hiện tạm, không tạo lịch sử giả:** kết quả mang nhãn “Xem nhanh · không lưu”, chỉ sống trong bộ nhớ của tab hiện tại; không ghi `screening_runs`, `screening_results` và không gửi Telegram. Tải lại trang thì kết quả tạm mất.
- **Giữ luồng duyệt thủ công:** mỗi cơ hội mới vẫn có nút “Đưa vào theo dõi”, mở đúng form watchlist dùng chung và để owner tự nhập giá muốn mua rồi bấm Lưu.
- **Không coi là đã sửa lịch tự động:** đây là workaround khi owner chủ động mở app và bấm quét. Issue kết nối VPS từ Cloud Functions vẫn mở; lịch 16:10 vẫn chưa vận hành được.
- **Đã deploy và bấm thử production:** quét 107 mã thành công trên app thật, trả đúng 5 kết quả và giữ nguyên khi chuyển Gọn ↔ Đầy đủ; đã kiểm tra giao diện 375 px ở cả sáng và tối.

· `public/index.html` · `CHANGELOG.md` · `ISSUES.md` · `CODEMAP.md`

## 2026-09-24c (Bot sàng lọc: xác nhận VPS chặn đường chạy trên Google Cloud)

Bản retry đã deploy nhưng lần Force run production khoảng 14:53 vẫn không lấy được VN-Index sau đủ 3 lần thử; trong cùng thời điểm máy owner gọi API VPS bình thường.

- **Xác nhận điểm nghẽn hạ tầng:** `histdatafeed.vps.com.vn` không nhận kết nối từ Cloud Function/Google Cloud. Retry giúp bot chờ và báo lỗi đúng hơn nhưng không mở được đường kết nối, nên không được coi là đã sửa xong.
- **Lịch 16:10 chưa vận hành được:** Function vẫn giữ nguyên nguyên tắc dừng an toàn, không phát đề cử khi thiếu VN-Index. Muốn tự động chạy cần một nguồn dữ liệu server khác hoặc proxy phù hợp; chưa tự chọn giải pháp thay owner.
- **Có kết quả kiểm tra thủ công:** chạy từ máy owner quét 107 mã, thiếu 0, có 15 mã đạt từ 70 điểm. Top 5 gồm mã đang theo dõi `MSR` 97 điểm, `MSN` 84 điểm; cơ hội mới `VPI` 92 điểm, `HAH` 84 điểm, `BVH` 81 điểm. Telegram đã gửi thành công.
- **Không lẫn với dữ liệu chính thức:** round thủ công có nhãn rõ và không ghi `screening_runs`, `screening_results` hay giao diện app. Đây là kiểm tra đường chấm điểm + Telegram, không thay cho lịch tự động production.

· `functions/index.js` · `CHANGELOG.md` · `ISSUES.md` · `CODEMAP.md`

## 2026-09-24b (Bot sàng lọc: chịu lỗi khi VPS phản hồi chậm)

Lần chạy thủ công trên production lúc 14:44 thất bại vì Cloud Function hết thời gian chờ khi kết nối tới API lịch sử VPS để lấy VN-Index, dù cùng API vẫn trả dữ liệu bình thường từ máy owner.

- **Thử lại có kiểm soát:** `fetchHistory()` gửi thêm header JSON và user-agent, đặt timeout 9 giây cho mỗi lần thử và chờ giãn dần giữa các lần. VN-Index được thử tối đa 3 lần; mã cổ phiếu thường tối đa 2 lần. Giới hạn này giữ thời gian xấu nhất khoảng 442 giây, còn đủ khoảng trống trong timeout 540 giây để ghi trạng thái lỗi và gửi cảnh báo.
- **Vẫn dừng an toàn:** nếu VN-Index tiếp tục không tải được hoặc dữ liệu mã thiếu quá giới hạn, bot ghi lỗi và không phát đề cử. Bản vá không dùng dữ liệu thiếu để cố chấm điểm.
- **Chưa kết luận đã hết lỗi:** nguyên nhân kết nối từ hạ tầng Cloud Functions tới `histdatafeed.vps.com.vn` chưa được xác định chắc chắn. Bản vá đang chờ redeploy và một lần chạy production thành công để xác nhận.

· `functions/index.js` · `CHANGELOG.md` · `ISSUES.md` · `CODEMAP.md`

## 2026-09-24 (Bot sàng lọc cơ hội ngắn hạn 2–4 tuần)

Owner chốt xây bot theo luật minh bạch để tìm tối đa 5 mã đáng xem sau mỗi phiên, chỉ đề xuất để duyệt thủ công và phải thử nghiệm đủ 20 phiên trước khi tin cậy.

- **Tự quét sau giờ đóng cửa:** thêm Cloud Function `screenShortTermOpportunities` chạy lúc 16:10 từ thứ Hai đến thứ Sáu theo giờ Việt Nam. Bot đọc OHLCV lịch sử VPS với tối đa 5 request cùng lúc, bỏ qua ngày không có nến VN-Index mới và dừng nếu thiếu VN-Index hoặc thiếu quá 20% dữ liệu.
- **Chấm điểm có thể kiểm tra lại:** `scoreTicker()` chấm xu hướng 25 điểm, sức mạnh so với VN-Index 25 điểm, lấy tín hiệu tốt hơn giữa bứt phá/điều chỉnh 25 điểm, thanh khoản và rủi ro 15 điểm, vùng giá 40–70 thêm tối đa 10 điểm. Mã phải có ít nhất 60 phiên, thanh khoản TB20 từ 20 tỷ đồng/ngày và tổng từ 70 điểm; mỗi đề cử lưu 2–3 lý do cùng `scoreVersion`.
- **Tối đa 5 mã, tách đúng nhóm:** loại mã đang nắm giữ khỏi cơ hội mới, tách “Cơ hội mới” và “Đang theo dõi”, nhưng giới hạn 5 mã là tổng của cả hai nhóm. Kết quả không tạo tín hiệu, lệnh hay giao dịch.
- **Không gửi trùng trong ngày:** `acquireRun()` khóa lần chạy theo ngày; `claimNotification()` chỉ cho một lần thử gửi Telegram. Token và chat ID đọc từ Secret Manager, không xuất hiện trong HTML hoặc Firestore phía client.
- **Đo kết quả sau 20 phiên:** `evaluateCandidate()` ghi thắng khi +6% đến trước −3%, thua khi ngược lại, “không xác định” nếu cùng một nến chạm cả hai, đồng thời lưu lợi nhuận phiên 20 và phần vượt/trượt VN-Index. 20 lần chạy đầu đều mang nhãn “Thử nghiệm”.
- **Một giao diện dùng chung hai view:** `screening-hub` được di chuyển giữa Gọn và Đầy đủ. Owner xem điểm thành phần/lý do rồi bấm “Đưa vào theo dõi” để mở form watchlist có sẵn; app chỉ điền mã và giá tham khảo, owner vẫn tự nhập giá muốn mua rồi bấm Lưu.
- **Dữ liệu và bảo mật:** thêm `screening_runs` cho trạng thái lần chạy và `screening_results` cho từng đề cử. Client owner chỉ được đọc; mọi ghi dữ liệu bot do Cloud Function thực hiện. Firestore rules đã có nhánh tương ứng.
- **Kiểm tra trước khi bật:** smoke test, kiểm cú pháp, rules dry-run, dữ liệu thật VPS và giao diện mobile 375/430/768/1120px đều đã kiểm. Backtest walk-forward 80 phiên cho 400 đề cử có 96 thắng, 282 thua, 22 hết 20 phiên chưa chạm ngưỡng; tỷ lệ thắng trên ca đã phân định là 25,4%, lợi nhuận phiên 20 trung bình −2,225% và kém VN-Index trung bình 1,278 điểm %. Vì kết quả chưa tốt, giữ nguyên nhãn “Thử nghiệm” và **không chỉnh công thức theo mẫu ngắn**.
- **Đã bật chạy thật:** owner đã nâng project lên Blaze; `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` được lưu ở Secret Manager phiên bản 1. Cloud Function `screenShortTermOpportunities` v2 đã được deploy tại `asia-southeast1` với Node.js 22 và 512 MB; Firestore rules và Hosting cũng đã phát hành thành công.
- **Hoàn tất vận hành ban đầu:** Artifact Registry được đặt chính sách tự xoá image cũ hơn 1 ngày để tránh tích rác. Tin nhắn thử đã gửi thành công tới bot Telegram `@fin2_watchlist_bot`. `npm audit` vẫn còn 2 cảnh báo mức vừa ở phụ thuộc gián tiếp `gaxios` / `uuid`, chưa có bản sửa tự động không phá vỡ tương thích.

· `functions/index.js` · `functions/scoring.js` · `functions/universe.js` · `functions/smoke.js` · `functions/backtest.js` · `functions/package.json` · `functions/package-lock.json` · `public/index.html` · `firestore.rules` · `firebase.json` · `AGENTS.md` · `CHANGELOG.md` · `ISSUES.md` · `CODEMAP.md`

## 2026-09-23 (View Gọn: bỏ mã khỏi danh sách theo dõi)

Owner muốn có thể bỏ theo dõi ngay tại danh sách Đang theo dõi của view Gọn, không cần chuyển sang view Đầy đủ.

- **Bỏ theo dõi ngay trên từng mã:** thêm nút “Bỏ theo dõi” màu xám nhạt ở mỗi dòng. Nút dùng lại `removeWatch()` và hộp xác nhận sẵn có trước khi xoá mã khỏi `watchlist`.

· `public/index.html` · `CHANGELOG.md`

## 2026-09-22 (Hàng đợi tín hiệu, vòng đời lệnh và phân tích quyết định)

Owner chọn bổ sung hàng đợi tín hiệu, đo chất lượng, biểu đồ quyết định, luận điểm theo mã và phân tích đóng góp; đồng thời yêu cầu tách lệnh mới đặt khỏi giao dịch đã khớp và cho dùng ở cả Gọn lẫn Đầy đủ.

- **Hàng đợi tín hiệu dùng chung hai view:** khối Quyết định được di chuyển thật giữa Gọn và Đầy đủ, gồm tín hiệu hôm nay, lệnh đang chờ, chất lượng tín hiệu và đóng góp lãi/lỗ; không có hai bản logic song song.
- **Tách “đã đặt” khỏi “đã khớp”:** form Giao dịch có hai hành động riêng. Lệnh đặt lưu vào `orders` và chưa đổi tiền mặt/vị thế; chỉ khi xác nhận khớp mới tạo `transactions`.
- **Khớp một phần và hủy lệnh:** mỗi lần khớp ghi đúng số lượng/giá thực tế, cập nhật giá khớp trung bình và phần còn lại; lệnh hủy giữ trong Nhật ký và file xuất AI. Các lệnh bán đang chờ giữ chỗ số cổ phiếu để tránh đặt trùng.
- **Tín hiệu có bối cảnh tiền mặt:** tín hiệu mua trong hàng đợi hiện tỷ lệ tiền mặt dự kiến sau lệnh và cảnh báo khi xuống dưới mức tối thiểu của chiến lược. Tín hiệu bán tự giới hạn số lượng không vượt vị thế.
- **Đo chất lượng tín hiệu:** hiện số tín hiệu đã đặt/đã khớp, hiệu quả trung bình và tỷ lệ đúng hướng sau 5/10/20 lần lưu Nhật ký; mỗi kết quả luôn kèm số mẫu.
- **Biểu đồ quyết định:** thêm đường giá vốn, ngưỡng mua/bán, giá kỳ vọng watchlist và điểm mua/bán; giao dịch giá bất thường nằm ngoài khung không kéo méo tỷ lệ biểu đồ.
- **Nhật ký luận điểm theo mã:** thêm `theses/{MÃ}` cho lý do nắm giữ/theo dõi, điều kiện luận điểm sai và ngày xem lại; mở được từ cả hai view.
- **Phân tích đóng góp:** tách lãi/lỗ đã chốt, chưa bán và tổng đóng góp theo mã; tuân theo nút ẩn lãi/lỗ dashboard.
- **Bảo mật:** thêm rules owner-only cho `orders` và `theses`. File xuất AI bổ sung lệnh đặt, trạng thái khớp/hủy và luận điểm.
- Đã kiểm cú pháp JavaScript, ID trùng, tham chiếu ID và quy tắc font-weight; đã được phát hành cùng đợt deploy toàn bộ ngày 24/09/2026.

· `public/index.html` · `firestore.rules` · `CHANGELOG.md` · `ISSUES.md` · `CODEMAP.md`

## 2026-09-21b (Chiến lược: highlight khi đạt ngưỡng và thêm ngưỡng %)

Owner báo nhiều mã đã giảm đủ 2 điểm nhưng không được highlight, đồng thời chọn áp dụng cho cả Gọn và Đầy đủ và cho ngưỡng điểm/% chạy song song theo phương án A.

- **Hiện hành động khi đã đạt ngưỡng:** mã đang nắm giữ không còn mất highlight lúc vừa chạm mức mua/bán. Cả Gọn và Đầy đủ nay hiện “Mua thêm/Bán … CP”; trước ngưỡng vẫn hiện “Sắp mua/Sắp bán” qua `strategyAlert()`.
- **Thêm ngưỡng % tuỳ chọn:** mỗi phiên bản Chiến lược có thể đặt thêm mức giảm để mua (%) và tăng để bán (%). `strategyLevels()` cho ngưỡng điểm và % chạy song song; mức nào đến trước sẽ kích hoạt.
- **Giữ nguyên chiến lược cũ:** ô % không bắt buộc. Bản cũ và bản mới để trống `buyDropPct` / `sellRisePct` tiếp tục chỉ dùng ngưỡng điểm, không đổi kết quả lịch sử.
- **Một công thức cho hiển thị và Nhật ký:** hai view và `buildSignals()` cùng dùng `strategyAlert()`, tránh tình trạng trên màn hình và tín hiệu cho kết quả khác nhau.
- **Giữ đúng ngưỡng đã sinh tín hiệu:** tín hiệu mới chép thêm `buyDropPct` / `sellRisePct`; file xuất AI giữ cả ngưỡng điểm và % của đúng phiên bản lúc phát tín hiệu.
- **Đã kiểm tra:** cú pháp hợp lệ, form local không có lỗi console và 7 ca mô phỏng gồm chỉ điểm, điểm đến trước, % đến trước, sắp mua, đạt mua, đạt bán và mã Giữ chặn bán.
- Đã deploy thành công Hosting + Firestore rules ngày 21/09/2026; trang public trả `200 OK`, `Cache-Control: no-cache` và đã có đúng form % + logic highlight mới: https://fin2-danh-muc.web.app.

· `public/index.html` · `CHANGELOG.md` · `ISSUES.md` · `CODEMAP.md` · `AGENTS.md`

## 2026-09-21 (Tuỳ chọn không tính mã dài hạn vào lãi/lỗ tổng)

- Thêm công tắc “Không tính mã dài hạn” ở dashboard của cả Gọn và Đầy đủ.
- Khi bật, tổng “Lãi/lỗ chưa bán” và tỷ suất đi kèm chỉ tính nhóm Giao dịch; lãi/lỗ từng mã vẫn hiện đầy đủ.
- Tổng tài sản, giá trị cổ phiếu, vốn mua, tiền mặt, tỷ lệ tiền mặt và lãi/lỗ đã chốt giữ nguyên.
- Lựa chọn được nhớ riêng trên từng máy bằng `fin2-exclude-hold-pnl`; không ghi Firestore, không thêm collection và không đổi rules.
- Đã kiểm tra cú pháp, đối chiếu hai view và chạy dữ liệu mô phỏng cho hai trạng thái bật/tắt.
- Đã deploy thành công Firebase Hosting ngày 21/09/2026: https://fin2-danh-muc.web.app.

· `public/index.html` · `CHANGELOG.md` · `CODEMAP.md` · `AGENTS.md`

## 2026-09-17b (Mở biểu đồ VPS khi bấm vào mã)

Owner muốn xem lịch sử biến động giá ngay trên từng mã, áp dụng cho cả Gọn và Đầy đủ nhưng chỉ hiện khi bấm để màn hình không bị rối.

- **Mở từ đúng mã đang xem:** tên mã trong danh mục và danh sách theo dõi ở cả hai view nay là nút mở biểu đồ kỹ thuật VPS (`data-chart-ticker`).
- **Biểu đồ gọn, đúng nhu cầu xem nhanh:** `fetchPriceHistory()` chỉ lấy giá đóng cửa theo ngày từ API lịch sử VPS khi owner mở mã; `renderStockChart()` tự vẽ đường giá, giá mới nhất và mức tăng/giảm trong kỳ.
- **Đổi khoảng xem ngay trong modal:** có 1 tháng / 3 tháng / 1 năm; chạm hoặc rê trên đường giá sẽ hiện giá và ngày tương ứng qua `showChartPoint()`.
- **Dễ dùng trên điện thoại:** biểu đồ tự co theo màn hình, theo giao diện sáng/tối hiện tại, có trạng thái đang tải, thiếu dữ liệu và lỗi tải; yêu cầu quá 15 giây sẽ tự dừng.
- **Đóng xong quay lại đúng chỗ:** `initStockChart()` huỷ yêu cầu đang tải, dọn dữ liệu tạm và trả focus về mã vừa bấm.
- ~~Nhúng nguyên biểu đồ kỹ thuật `web5.vps.com.vn` bằng iframe~~ đã bỏ trước deploy vì giao diện đầy đủ làm khung xem nhanh bị rối; thay bằng biểu đồ đường tối giản từ `histdatafeed.vps.com.vn`.
- Không thêm collection, không đổi Firestore rules và không lưu dữ liệu biểu đồ vào app.

· `public/index.html` · `CHANGELOG.md` · `CODEMAP.md`

## 2026-09-17 (Highlight chuẩn bị mua cho mã theo dõi)

- Mã theo dõi được highlight “Chuẩn bị mua” khi giá còn cao hơn mục tiêu không quá 0,5 điểm và giá mới thấp hơn lần ghi liền trước.
- Khoảng cảnh báo của mã theo dõi được cấu hình riêng trong Chiến lược, có phiên bản theo ngày hiệu lực; chiến lược cũ mặc định 0,5 điểm.
- “Đạt giá mua” vẫn ưu tiên khi giá đã chạm mục tiêu; mã chưa có giá trước, đang tăng hoặc còn xa không bị highlight.
- Có ở cả Gọn và Đầy đủ. Đây chỉ là cảnh báo trực quan; tín hiệu Nhật ký vẫn chỉ sinh khi giá thực sự đạt mục tiêu.
- Không thêm collection và không đổi Firestore rules. Đã kiểm bằng dữ liệu mô phỏng cho đủ 5 trường hợp: gần + giảm, đã đạt, gần + tăng, thiếu giá trước và giảm nhưng còn xa.
- Đã deploy thành công Hosting + Firestore rules ngày 17/09/2026: https://fin2-danh-muc.web.app.

· `public/index.html` · `CHANGELOG.md` · `CODEMAP.md` · `AGENTS.md`

## 2026-09-17 (Phạm vi ẩn lãi/lỗ và forecast theo lô 100 CP)

- Nút con mắt chỉ che số liệu trong dashboard Dòng tiền & lãi/lỗ, gồm tổng quan, phân nhóm, đã chốt theo mã và forecast.
- Lãi/lỗ từng mã trong Đang nắm giữ, Giá vốn sau lướt, Đã chốt chu kỳ và lãi/lỗ trong Nhật ký luôn hiển thị.
- Forecast bán 30% / 50% / 100% làm tròn xuống theo bội số 100 CP của từng mã; phần dưới 100 CP không được tính vào kịch bản.
- Đã deploy thành công Hosting + Firestore rules ngày 17/09/2026: https://fin2-danh-muc.web.app.

· `public/index.html` · `CHANGELOG.md` · `CODEMAP.md` · `AGENTS.md`

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
