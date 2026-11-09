# Fin2 — Nhật Ký Danh Mục

## Tổng quan
Trang theo dõi danh mục cổ phiếu cá nhân, chạy trên nhiều thiết bị. Từ 01/11/2026 (**nhiều tài khoản — đợt 1**) owner mở cho dưới 10
người bạn: **mỗi người một sổ riêng** (`users/{uid}/…`), owner gõ email để cấp/khoá (`members/{email}`). Không ai sửa sổ người khác →
**vẫn không cần merge 3 chiều, chỉ 2 vai owner / thành viên**. Đợt 2 (chưa làm): bot + Telegram theo từng người, mọi tuỳ chọn trong
setting của người đó, "giống anh". Đợt 3: TCBS cho thành viên (key riêng). Đợt 1 bot vẫn chỉ phục vụ owner (`functions/members.js ownerBook`).

**Owner:** Trung Nghĩa — Project Manager, không lập trình.
**Yêu cầu khi sửa code:** giải thích ngắn gọn thay đổi là gì, không giải thích kỹ thuật sâu. Tiếng Việt.

---

## Tech Stack
- **Frontend:** 1 file HTML tĩnh, JS thuần, không bundler, không framework
- **Database:** Firestore (project `fin2-danh-muc`, location `asia-southeast1`)
- **Auth:** Google Sign-In, rules cho owner (gõ cứng email) + email có trong `members` với `status:"active"`
- **Hosting:** Firebase Hosting
- **Font / Brand:** Inter · brand `#0248C4` · tăng `#16a34a` · giảm `#dc2626`

---

## Cấu trúc thư mục
```
public/index.html    Toàn bộ app: markup + style + logic. Nguồn sự thật duy nhất.
public/guide.js      Phần chạy tour hướng dẫn + nút ? (chép từ YMLC Documents\[1] Project\LC Vaccine\public\shared\guide.js).
public/guide-tours.js  Chữ tour (owner duyệt). id tour đã deploy KHÔNG đổi — "đã xem" nhớ theo id.
public/guide.html    Trang giải thích chiến thuật, không cần đăng nhập. Số trong trang = mặc định RULE_* — đổi mặc định thì sửa chữ.
functions/members.js Nhiều tài khoản phía server: ownerBook, memberTickers, isActiveMember, migrateOwnerBook.
firestore.rules      Hàng rào bảo mật THẬT (server-side).
firebase.json        Cấu hình hosting + rules.
deploy.bat           Deploy 1 chạm trên Windows: lấy nhánh từ GitHub → smoke → hỏi xác nhận → deploy.
                     Biến BRANCH đầu file: đổi thành main sau khi PR #1 được gộp.
artifact-da-doi.html Trang "đã dời" đã publish đè lên Artifact cũ. KHÔNG phải app.
portfolio-tracker.html   Bản app CŨ chạy trên Artifact, đã ngưng. Giữ làm lịch sử
                     vì chưa có git. Có git rồi thì xoá được.
contexx.md           Context gốc từ phiên chat đầu. Chỉ đọc, không sửa logic từ đây.
Starter-Kit/         Bộ chuẩn dùng chung. Chỉ đọc, không sửa.
.claude/skills/review-ma/  Skill review 360 độ trước mỗi lệnh (versioning, khác các skill dùng chung bị gitignore).
functions/review-ma.js     CLI gom dữ liệu cho skill trên, chạy ở máy owner, không deploy, không ghi Firestore.
reviews/             Bản review từng mã (gitignore, dữ liệu cá nhân) — giai đoạn 2 nhập vào Fin2.
```

---

## Chiến thuật giao dịch (nguồn của mọi công thức gợi ý)
- Mua mã lớn trụ cột, tầm giá 40–70 (nghìn đ/CP)
- **CUNG CẦU LÀ LỚP TINH CHỈNH TRÊN MỐC T+** (owner chốt 08/10/2026, `orderflow-v2.0.0`; thay "hai máy độc lập" của 07/10 vì
  máy cung cầu tự lấy giá vốn ±1% làm mốc nên khuyến nghị dính sát giá vốn). **T+** quyết định KHI NÀO (giá vốn −2/+3,
  mã watchlist = giá kỳ vọng); **Cung cầu** quyết định ĐẶT GIÁ NÀO khi đã tới mốc: bên mua *Mua ngay* (lực bán đã yếu) /
  *Chờ giá thấp hơn* (lực bán trong ngày còn mạnh); bên bán *Bán ngay* (cầu đã yếu) / *Giữ thêm* (cầu còn mạnh).
  Mục tiêu: không bán sớm khi cầu còn cao, không mua sớm khi lực bán còn mạnh, tìm giá tốt hơn giá định mua/bán.
  Giá "ngay" không bao giờ kém mốc T+; chờ/giữ gợi ý mức tốt hơn trong 3% quanh mốc (`priceZone`: khớp nhiều + lệnh treo bền +
  đáy/đỉnh/mức khối lượng lớn 5–20 phiên `sessionLevels`, cất ở `orderflow_control/seed_{MÃ}.levels`). Đừng dựng lại máy cung cầu tự ra lệnh riêng.
  **v2.1.0 (owner chốt 09/10/2026):** quét giữ **mỗi phút** (owner đề xuất 5 phút, Claude phản biện: thưa mẫu thì mù kê/rút lệnh, chống
  nhảy thành 15'; chờ là do luật 30 phút chứ không do nhịp quét). Khung 30 phút **nối qua nghỉ trưa**; từ phút thứ 15 có nhận xét
  **sơ bộ** (điểm trộn với nền theo số phút/30). Ngày trước **chỉ làm nền, KHÔNG trộn mẫu phút qua đêm** (sổ lệnh đã xoá):
  nền 5 phiên làm mới mỗi ngày, phiên tự thu đủ ≥150 mẫu dùng dữ liệu tự thu, thiếu thì Người Quan Sát, phiên gần nặng hơn.
- ⚠️ **CẮT LỖ — BỎ HẲN "GIẢM THÌ MUA THÊM"** (owner chốt 30/10/2026 sau bài học FPT/TCX, **thay luật 07/10/2026 "không bao giờ
  khuyến nghị bán lỗ"**). `stopAdvice()`: mã đang lỗ/hoà mà lỗ ≥ `stopLossPct` (mặc định 5%, tab Chiến lược) HOẶC giá dưới MA50
  (`decision_latest.maTrend.ma50`, bot, phiên đã đóng cửa) → bán về 1/2 khối lượng lớn nhất chu kỳ (`cycleMaxQty`, làm tròn lô);
  chạm CẢ HAI → bán hết. **Áp dụng cả mã Giữ.** Cách mức cắt ≤ `nearRange` điểm → "Sắp cắt lỗ". Trong kế hoạch: mục bán
  `engine:"stop"`, `mode:"stop"` tại giá so mốc, không qua cửa lọc, đứng trước luật bán/gồng. Mã đang giữ **không còn mốc mua T+**
  (giá vốn −2), cung cầu không nhận xét chiều mua cho mã đang giữ, vùng MA10 bỏ mã đang lỗ/hoà. **Mã đang lỗ không bao giờ có gợi ý
  mua thêm — đừng dựng lại.** Mã đang lãi vẫn theo sell-v1.1.0 (owner chọn giữ, KHÔNG lấy chốt lời đuổi MA20/8% của phiên cloud).
  **Mục "Đã cắt lỗ"** (owner chốt 02/11/2026): mã bán hết mà cả chu kỳ lỗ tự vào Theo dõi, nhóm riêng cuối bảng, không giá kỳ
  vọng → chỉ mua lại theo vùng MA (đã hồi thật), mua lại thì tự rời. Suy từ sổ mỗi lần render (`syncStopLossWatch`), không gắn vào từng đường ghi lệnh.
  Chưa làm (owner để sau): vốn chết + mã thay thế, mục "Danh mục cần xử lý" ở Telegram sàng lọc. Tin Telegram trưa có dòng "Cắt lỗ".
  Giá bán cung cầu vẫn ≥ giá vốn +1% (`POLICY.minProfitPct`) — chỉ áp cho mục bán T+, mục cắt lỗ không kèm cung cầu.
- ⚠️ **+3 / 5% / 100 CP chỉ là MẶC ĐỊNH.** Owner sửa được ở tab Chiến lược, mỗi lần
  đổi tạo một phiên bản mới trong `strategies` có ngày hiệu lực. Code phải đọc qua
  `activeStrategy(ngày)`, **không nơi nào được gõ số**.
- **Mã vừa mua còn lô chưa về (T+2, `awaitingShares`) → "Chờ hàng"**: không tín hiệu/nhận xét cung cầu chiều MUA tới khi hàng về;
  chiều BÁN chỉ còn khi có lô cũ đã về, tối đa số CP bán được (owner chốt 08/10/2026). Chặn qua `awaitingBlocks(mã, chiều)` ở `buildSignals` + `orderflowAdvice` + bảng mã.
- **Vùng mua MA — máy mua thứ ba** (owner chốt 13/10/2026, sửa lại chiều cùng ngày): mã đang có/theo dõi đã cắt lên MA `maLength`,
  đóng cửa trên MA từ `maDays` tới `maMaxDays` phiên liền VÀ MA đi lên ≥`maDays` phiên gần nhất (mặc định 10 · 5 · 15, chỉnh ở tab
  Chiến lược, theo phiên bản `strategies`). Trên MA quá `maMaxDays` = khó lướt → bỏ. Trong vùng + **phiên cuối đóng cửa TĂNG** →
  **tự ra tín hiệu "Mua · theo MA"** (`kind:"trend"`, `engine:"ma"`) dù chưa tới mốc T+; trong vùng mà phiên cuối giảm/đứng (giá
  đang giảm về MA, MA chậm nên vẫn đi lên — vụ MWG 13/10/2026) → chỉ nhãn **"MA10 chờ"** ở bảng mã, không ghi `signals`
  (từ 16/10/2026 KHÔNG còn nhóm "Chờ bật lên" ở Khuyến nghị; `maCandidates` là nơi duy nhất lọc); mã đã có tín hiệu mua T+ cùng ngày thì chỉ gắn chip "Ưu tiên" vào dòng T+
  (một mã một lệnh mua/ngày). **Mỗi đợt chỉ tới khi mua** (`maBoughtInRun`: khớp mua / lệnh mua chờ từ ngày `since`).
  Từ 30/10/2026 đây là **đường mua thêm DUY NHẤT** cho mã đang giữ, và chỉ khi giá TRÊN giá vốn (mã lỗ/hoà bị `maCandidates` loại;
  dòng Khuyến nghị ghi "Giá vốn X → Y"). Không kèm nhận xét cung cầu (giá cung cầu bám mốc T+).
  Chỉ tính phiên đã đóng cửa. Bot đếm (`maStreak` → `decision_latest.maTrend`), app so ngưỡng (`maTrendFor`);
  Telegram sau đóng cửa chỉ báo thay đổi vào/ra vùng (`maChanges`).
- **Dòng chi tiết Khuyến nghị** (`adviceInsight`, owner chốt 13/10/2026): điểm quyết định · xu hướng MA · khối ngoại + so VN-Index,
  chiều mua thêm cảnh báo rủi ro. **Đã bỏ hẳn "sau lệnh còn x% tiền mặt"** (owner không cần) — đừng dựng lại.
- **KỶ LUẬT: KẾ HOẠCH CHỐT TRƯỚC PHIÊN** (owner chốt 16/10/2026 sau review 10/09–16/10: lệnh tự phát lỗ −5,9% so với −2,2% theo
  tín hiệu, mua lúc giá xanh tốn nhất, T+ mua khi VN-Index yếu 1 thắng/16 thua). Khối Khuyến nghị = **kế hoạch ngày** `plans/{ngày}`
  (`buildPlan`): lệnh giới hạn đặt sẵn tại mốc (bán/mua thêm T+, giá kỳ vọng, vùng MA tại giá tham chiếu; mốc đã vượt → giá
  tham chiếu, mốc ngoài biên độ 7% → chưa vào). Ngoài phiên: nháp + nút Chốt (chốt lại tới 9:00). **Trong phiên 9:00–15:00 không
  ra khuyến nghị mới** (ngoại lệ duy nhất: kế hoạch chiều giờ nghỉ trưa, xem dưới), chưa chốt thì tự chốt (`maybeAutoFreeze`, chờ đủ dữ liệu `PLAN_INPUTS`).
  **Cửa lọc MUA** (thứ tự): VN-Index yếu (`marketState`, cờ bot) → dừng T+ kể cả mã theo dõi, MA vẫn mua · quá `maxBuys`
  (mặc định 3, theo phiên bản `strategies`) · tiền mặt SAU lệnh < `minCashRatio` → không mua. Bán không qua cửa lọc.
  Mục bị lọc vẫn lưu trong kế hoạch kèm `gate` để đo — đừng bỏ. **Chế độ trong phiên** (`sessionLocked`): bảng mã bỏ
  mũi tên/%, ẩn cung cầu, biểu đồ bỏ nến hôm nay; nút lấy giá hỏi "Vẫn xem?" → mở 15 phút trên máy + đếm `plans.peeks`.
  Lệnh theo kế hoạch hay không **suy ra** (`planStatusFor`), không lưu cờ. Còn lệnh chờ cùng mã cùng chiều (kể cả đặt ngày trước) → mục
  kế hoạch không hiện lại ở Khuyến nghị, chỉ ghi chú trên dòng "Đã đặt" (owner báo 20/10/2026); mục vẫn nằm trong kế hoạch đã chốt. Đổi chiến lược: sớm nhất phiên chưa mở, cách bản
  mới nhất ≥ 5 phiên (`strategyEarliestFrom`). Fin2 không chặn được app TCBS — chỉ bớt kéo owner vào xem bảng giá.
- **BÁN / GỒNG** (owner chốt 19/10/2026, `sell-v1.0.0`, chống bán non + bán cảm xúc): tới mốc bán T+ thì bán theo số **dấu hiệu giữ**
  (`holdSignals`): MA bắt buộc (đóng cửa trên MA `maLength`, MA đi lên) + VN-Index không yếu · khối ngoại mua ròng · cầu còn mạnh cuối phiên
  trước (cung cầu `sellAdvice.verdict === "hold"`). Không MA/MA+0 → bán hết · MA+1 → 1/2 · MA+2 → 1/3 · 4/4 → gồng hết (`SELL_TIER_SHARE`,
  cố định theo version — đổi là nâng `SELL_VERSION`; làm tròn lô, không chia được thì gồng cả). Phần gồng thoát khi đóng cửa dưới MA hoặc
  chạm **sàn = mốc T+ lúc bán đợt đầu** (lệnh điều kiện owner tự đặt ở TCBS; sàn KHÔNG đổi khi mua thêm theo MA). Lãi mỏng (vốn +1% →
  mốc) chỉ bán khi đóng cửa dưới MA — **sell-v1.1.0 (owner chốt 20/10/2026): VN-Index yếu KHÔNG còn tự bán lãi mỏng** (vụ TCB lãi 2%,
  mã khỏe hơn thị trường bị khuyên bán hết). Đừng dựng lại. **Bán chia bậc** (sell-v1.2.0, owner chốt 30/10/2026): mọi lệnh bán giới hạn của kế hoạch (cắt lỗ, tier, exit, thin — không gồm lệnh điều kiện `ride`) tách lệnh 1 lô, bậc sau +`SELL_LADDER_STEP_PCT` (0,5%), không vượt trần (`sellLadder`, mục kế hoạch `ladder`); nút Đặt ghi đủ các lệnh chờ một lượt. Đang gồng **suy ra** (`rideState`: kế hoạch đã chốt có mục `tier` `keepQty>0` + có lệnh bán
  ngày đó), không lưu cờ. Đang gồng vẫn được mua theo MA. Chỉ ở app (`sellPlanFor` trong `buildPlan`); `signals` + nhãn tầng mở chưa đổi.
- **KẾ HOẠCH CHIỀU** (owner chốt 23/10/2026, `pm-v1.0.0`, **CHẠY BÓNG**): giờ nghỉ trưa 11:30–13:00 dựng thêm kế hoạch cho phiên chiều
  (`buildPlan(s, ngày, noon=true)` → `plans/{ngày}.pm`). Giá so mốc = giá 11:30 của bot (`maTrendNoon.close`, `noonQuote`), MA tạm =
  `decision_latest.maTrendNoon` (cất RIÊNG, không đè `maTrend`) và phải có **nền phiên trước** (`maTrend.streak > 0`) · giá mua ≤ giá
  tham chiếu · `maxBuys` dùng chung cả ngày (`boughtTickersOn`) · tiền mặt trừ lệnh mua đang treo · gồng tính cả lệnh bán sáng (`rideState` sameDay).
  Mở app giờ trưa → tự chốt (`maybeAutoFreezePm`), Chốt lại tới 13:00; nghỉ trưa `sessionLocked` mở xem giá. Telegram trưa chỉ là tóm tắt
  sơ bộ (`functions/noon-plan.js`), bot KHÔNG chép luật kế hoạch. **Chạy bóng** (`PM_LIVE = false`): không nút Đặt, lệnh không tính
  "theo kế hoạch"; bot đo sau đóng cửa → `plans/{ngày}.pmEvaluation` (khớp chiều từ mẫu phút `orderflow_daily` + lãi/lỗ 5 phiên).
  Owner xem số sau 10 phiên rồi mới quyết mở — **đừng tự bật `PM_LIVE`**.
- **REVIEW 360 ĐỘ TRƯỚC MỖI LỆNH** (owner chốt 20/10/2026, skill `review-ma`, `review-v1.0.0`): review MỌI lệnh — nhịp chính là buổi tối
  review cả kế hoạch phiên sắp tới (`keHoachSapToi` của file xuất) trước khi Chốt; lệnh ngoài kế hoạch review riêng và tốt nhất chỉ được
  "đưa vào kế hoạch / watchlist", không đặt ngay. Kết luận Đồng ý / Chờ / Không + giá + 3 lý do + phản biện; luật cứng đứng trước.
  **Chạy bóng 20 phiên**: chỉ ghi kết luận, lệnh vẫn theo máy T+/MA — chưa có quyền chặn. Tin tức 3 mức, tin "ý định/tin đồn" KHÔNG cộng điểm
  (owner lo tin do đội lái tung). **Hộp giá 1–3 tháng chỉ tinh chỉnh giá trong 3% quanh mốc, không tự ra lệnh** — nói bằng số mẫu, không "đọc đội lái".
  Giai đoạn 2 (chưa làm): xuất file → nút "Nhập review" trong app (owner chọn, KHÔNG cất khoá quản trị trên máy) + chip trên mục kế hoạch + đo độ đúng.
- **ĐỊNH GIÁ NỘI TẠI** (owner chốt 01/11/2026): mục "Định giá" trong popup chi tiết mã, **CHỈ ĐỂ XEM** — không vào tín hiệu/kế hoạch/điểm.
  Doanh nghiệp thường DCF + Graham 2 + Graham 3; ngân hàng/chứng khoán P/B theo ROE + Graham 3. **Graham 2 dùng bản thận trọng 7 + 1g**
  (owner chọn, bản gốc 8,5 + 2g thổi giá mã tăng trưởng) — đừng đổi lại. Giá trị nội tại = **trung vị**, không trung bình. Số liệu VNDirect
  finfo lấy từ trình duyệt, không lưu; giả định mỗi người ở `prefs/valuation` (tab Chiến lược). EPS = (P/B × sổ sách) ÷ P/E, không dùng
  thẳng `EPS_TR` (chậm chỉnh sau chia thưởng). **Tăng trưởng theo lợi nhuận công ty mẹ 3 năm, KHÔNG theo lịch sử EPS** (VNDirect không chỉnh
  lùi sau chia thưởng → tăng trưởng âm giả). **DCF tính từ lợi nhuận** EPS × (1 − g ÷ ROE), không dùng dòng tiền tự do thực tế (owner chọn).
  Nhãn **đối xứng**: Rẻ ≤ −biên an toàn, Đắt ≥ +biên an toàn, giữa Hợp lý. Ngành tài chính nhận theo loại BCTC (≠ 2). Kết quả chỉ tham khảo.
- **CHỈ SỐ DANH MỤC** (owner chốt 09/11/2026): dải 1 tháng đầu tab Danh mục/Theo dõi + popup chung từng mã (`pidxCompute`), **CHỈ ĐỂ XEM**.
  Gốc 0% đầu khung. Đang nắm = **theo tỷ trọng với số CP hiện tại** (owner chọn, không dùng tổng tài sản vì nhiễu nạp/rút) · Theo dõi =
  bình quân đều mã chưa nắm · VN-Index so. Lịch sử VNDirect, nhớ 15 phút, không lưu Firestore. Trong phiên bỏ nến hôm nay.
  **Tự chọn**: tick mã nắm/theo dõi thành nhóm, theo tỷ trọng đang nắm (mã chưa nắm = trung bình mã nắm của nhóm), so VN-Index/VN30;
  nhóm KHÔNG lưu (owner chọn) — đừng tự thêm lưu nhóm.
- `tickers/{TICKER}.hold === true` → **ẩn gợi ý bán của CẢ HAI máy**, hiện badge "Giữ"; chi tiết mã vẫn cảnh báo áp lực bán.
  **Không ẩn cắt lỗ** (30/10/2026).
- **"Điểm" = giá tuyệt đối (nghìn đ), KHÔNG phải %.** Owner đã biết đánh đổi và cố ý chọn. Đừng đề xuất đổi sang %.
- Broker TCBS miễn phí môi giới; chỉ còn thuế TNCN 0.1% giá trị bán — chưa đưa vào tính toán.
- **Quản lý theo lô** (owner chốt 14/10/2026, bước 1): mỗi lệnh mua là một lô, mã `FPT-L1-1203` (mã · thứ tự mua · ngày ddmm),
  cổ tức cổ phiếu là lô riêng nhãn "Cổ tức". Bán thì owner **tự chọn lô** (không điền sẵn, không quy tắc FIFO/HIFO). **Lãi/lỗ đã chốt +
  đang treo tính theo giá mua của lô** (`lotCost`); cột Giá vốn, mốc Mua/Bán, mọi tín hiệu (T+, cung cầu, MA), luật không bán lỗ và
  bot server **vẫn theo giá vốn bình quân** `avgCost` như TCBS — cố ý, nên giá vốn × số CP không ra đúng lãi/lỗ trên dòng.
  Đổi tín hiệu sang theo lô là bước sau, chờ owner dùng thử. Lô suy từ `transactions`, không có collection riêng.

---

## Mô hình dữ liệu
```
members/{email}             role "owner"|"member", status "active"|"locked", name, uid?, addedAt, lastSeenAt?, guideSeen { <tourId>|setup-*: lúc xem },
                            owner thêm: migratedAt, migratedCounts. Owner ghi; thành viên chỉ tự ghi uid/lastSeenAt/guideSeen của doc mình.
users/{uid}/…               ⚠️ TỪ 01/11/2026 mọi collection SỔ RIÊNG dưới đây nằm ở users/{uid}/ (BOOK_COLLECTIONS): transactions,
                            cashflows, tickers, daily_snapshots, watchlist, strategies, signals, watch_prices, orders, theses, plans, prefs.
                            Bản ở cấp ngoài cùng = sổ owner CŨ, giữ dự phòng (client không đọc được), xoá tay sau 2 tuần (~15/11/2026).
                            Phần còn lại (settings, screening_*, decision_*, orderflow_*) vẫn ở cấp ngoài cùng, dùng chung.
transactions/{autoId}       ticker, side "buy"|"sell", qty, price (nghìn đ), date, note, createdAt
                            từ 16/10/2026 refPrice? = giá tham chiếu hôm đó (chép lúc ghi, chỉ khi app đã lấy giá ngày đó) → "mua lúc giá xanh"
                            từ 14/10/2026 lệnh bán có lots [{ id (= id lệnh mua của lô), qty }] — bán bao nhiêu CP từ lô nào.
                            Thiếu/lệch (lệnh cũ, Đồng bộ TCBS, lô đã xoá) → app tự trừ lô mua trước, sửa lại bằng nút Lô ở Nhật ký
cashflows/{autoId}          type "deposit"|"withdraw"|"adjust", amount (VND nguyên), date, note, createdAt
                            ("adjust" = đối chiếu số dư TCBS, amount CÓ DẤU, không phải vốn nạp/rút thật)
tickers/{TICKER}            lastPrice (nghìn đ), lastPriceDate, refPrice? (giá tham chiếu, nghìn đ), refPriceDate?, hold?, sector?, updatedAt
                            (sector = ngành owner gán đè; thiếu/null = theo rổ `TICKER_SECTORS`, ngoài rổ → "Khác")
                            (refPrice chỉ ghi ở nút lấy giá chung; % trong ngày chỉ tính khi refPriceDate = lastPriceDate)
                            stopWatchedOn? = ngày bán hết cắt lỗ đã đưa vào "Đã cắt lỗ" — owner Bỏ theo dõi thì không tự thêm lại tới lần cắt lỗ sau
daily_snapshots/{YYYY-MM-DD}  date, cash, investedCost, marketValue, totalAssets, prices{}, createdAt, updatedAt
watchlist/{TICKER}          targetBuy (nghìn đ), addedAt, updatedAt
                            từ 02/11/2026: stopLoss? { date, pnl (VND) } = mục "Đã cắt lỗ" (app tự ghi, `syncStopLossWatch`): mã bán hết mà
                            cả chu kỳ lỗ, từ 30/10/2026. targetBuy null → chỉ mua lại theo vùng MA. Mua lại → app xoá doc (có giá kỳ vọng tự đặt thì chỉ bỏ nhãn)
strategies/{autoId}         buyDrop, sellRise, lotSize, effectiveFrom (YYYY-MM-DD), reason, createdAt
                            từ 13/10/2026: maLength, maDays, maMaxDays (vùng mua MA; thiếu = 10 · 5 · 15)
                            từ 16/10/2026: maxBuys (lệnh mua tối đa mỗi kế hoạch ngày; thiếu = 3)
                            từ 30/10/2026: stopLossPct (cắt lỗ %; thiếu = 5, áp dụng ngay cho bản cũ). Form không còn ô Giảm để mua:
                            buyDrop/buyDropPct chép từ bản đang chạy (app không dùng, bot cung cầu/điểm còn đọc)
plans/{YYYY-MM-DD}          kế hoạch phiên đó: date, strategyId, maxBuys, minCashRatio, cashRatio, market { weak, known, date },
                            items [{ key, ticker, side, kind buy|sell|watch|trend, engine tplus|ma, qty, level (mốc), ref (giá biên độ),
                            limitPrice, avgCost, score, maPriority?, gate null|market|market-unknown|cash|cap,
                            từ 19/10/2026 mục bán: mode tier|ride|exit|thin, keepQty, floor, holdCount, holdSignals{ma,market,foreign,demand}, rideSince?, why?, sellVersion }], frozenAt, frozenBy owner|auto,
                            peeks (số lần "Vẫn xem" trong phiên, increment — doc có thể chỉ có peeks mà chưa frozenAt), createdAt, updatedAt
                            từ 23/10/2026: pm { …cùng dạng kế hoạch, version pm-v1.0.0, boughtBefore[], shadow, frozenAt, frozenBy } = kế hoạch chiều (app ghi);
                            pmEvaluation { items [{ key, ticker, side, kind, limitPrice, inMorning, filled, afternoonLow/High, sessions,
                            exitClose, returnPct }], complete, sessions 5, evaluatedAt } — CHỈ Cloud Function ghi (doc có 2 bên ghi, mỗi bên một field)
orders/{autoId}             … từ 16/10/2026 planDate (lệnh đặt từ mục kế hoạch ngày đó); signalId chỉ còn ở lệnh cũ
signals/{YYYY-MM-DD_MÃ_loại}  date, ticker, kind "buy"|"sell"|"watch", price, avgCost,
                            targetBuy, qty, strategyId, buyDrop, sellRise, createdAt, updatedAt
                            từ 30/10/2026: cắt lỗ = kind "sell" + engine "stop" + reason; mọi tín hiệu chép stopLossPct.
                            Mã đang giữ không còn tín hiệu kind "buy" (T+)
                            07/10/2026 (orderflow-v1.x, dữ liệu cũ): doc cung cầu riêng id _cungcau, engine "orderflow", action, suggestedPrice…
                            từ orderflow-v2.0.0: CHỈ doc T+, kèm nhận xét cung cầu cùng chiều: orderflowVersion, flowVerdict now|wait|hold,
                            flowPrice (giá nút Đặt điền), flowZoneLow/flowZoneHigh, flowReason
                            từ 13/10/2026: kind "trend" + engine "ma" (mua theo vùng MA, id ngày_MÃ_trend); mọi tín hiệu chép
                            maLength, maDays, maMaxDays, maStreak, maRise, maSince, maUp (trạng thái MA lúc lưu; null = không rõ / lưu ngày cũ)
prefs/valuation             (sổ riêng, từ 01/11/2026) giả định định giá: requiredReturn, savingsRate, growthCap, longGrowth, margin,
                            maxSpread (%, thiếu = 13 · 5 · 10 · 3 · 25 · 30), updatedAt. Chỉ ảnh hưởng mục Định giá ở chi tiết mã
settings/screening          slots { "0830"|"1030"|"1330"|"1530"|"1600"|"2000": bool }, updatedAt
                            (không có doc = chỉ bật 16:00). Owner bật/tắt khung giờ nhận tin Telegram
                            analysis { minScore, maxNew, minLiquidityBn (tỷ đ), fitMin, fitMax (nghìn đ),
                            winPct, lossPct, evalSessions }, analysisUpdatedAt — thông số sàng lọc chỉnh ở
                            tab Chiến lược (thiếu = mặc định 70·5·20·40–70·6·3·20). Ghi doc này LUÔN `merge`
screening_runs/{YYYY-MM-DD}      …, analysis (chép bộ thông số đã dùng lượt đó)
screening_results/{YYYY-MM-DD_MÃ}  …, targetBuy? (mã theo dõi), evalWinPct, evalLossPct, evalSessions
                            (chép ngưỡng đo lúc đề cử — đổi thông số không chấm lại kết quả cũ)
                            fiveSessionEvaluation? { sessions, sessionsObserved, complete, entryPrice, exitDate,
                            exitPrice, returnPct, closes[{date,close}] } — chỉ đề cử totalScore > 90: mua giả định giá
                            đóng cửa ngày đề cử, chốt giá đóng cửa phiên thứ 5. `closes` = giá đóng cửa tới 20 phiên sau
                            (từ 07/10/2026) để app chọn xem 3–20 phiên (`fiveSessionAt`); đủ 20 phiên mới thôi đo
                            (`fiveSessionPending`). Báo cáo chỉ tính lần đầu mỗi đợt, đợt dài theo số phiên đang xem (`fiveSessionSamples`)
                            từ v1.1.0: foreignScore (0–10), foreign { status ok|missing|room-full, netBuyDays,
                            netSellDays, netRatioPct, netValue (VND) } — khối ngoại 5 phiên
screening_slots/{YYYY-MM-DD_HHMM}  khoá mỗi khung giờ: status, phase, marketDate, notificationAttemptedAt…
                            (chỉ Cloud Function ghi)
decision_latest/{TICKER}    điểm quyết định gần nhất: buyScore, sellScore (0–100), buyParts, sellParts, threshold,
                            phase, scoreVersion, buyAbove/sellAbove/legacyBuyAbove/legacySellAbove…
                            từ decision-v1.2.0: buyParts.foreign/sellParts.foreign (0–10) + foreign { …như trên }
                            từ 13/10/2026: maTrend { len, date, close, ma, streak, prevStreak, rise, prevRise, since, up, prevUp, down } — chỉ phiên
                            đã đóng cửa, không vào điểm
                            từ 23/10/2026: maTrendNoon { …như maTrend, provisional } — lượt nghỉ trưa, nến hôm nay = giá 11:30; lượt khác cùng ngày chép lại
decision_snapshots/{runId_MÃ} · decision_runs/{ngày_post|ngày_giờ} · decision_versions/{version}
decision_events/{ngày_MÃ_chiều_engine_version}  sự kiện vượt ngưỡng + evaluation (engine decision|legacy)
decision_news/{hash} · decision_control/{runtime|news}   (tất cả decision_*: chỉ Cloud Function ghi, owner đọc)
orderflow_daily/{YYYY-MM-DD_MÃ}  samples[] mẫu phút VPS (giá, tổng KL, 3 mức bid/ask, side) + summary; ngày seed: seed{} 5 phiên NQS
orderflow_latest/{MÃ}       v2.0.0: buyAt/sellAt (mốc T+), buyAdvice/sellAdvice { base, verdict now|wait|hold, price, nowPrice,
                            better/zone { low, high, suggested, sources[] }, reason }, buyPending/sellPending (chống nhảy 3 mẫu),
                            action wait|buy|sell|buy-wait|sell-hold (theo giá sống, chỉ khác wait khi đã chạm mốc), suggestedPrice,
                            ready, stale, buyScore/sellScore (0–100), parts, buySpoofRisk/sellSpoofRisk, coverage, reasons[], flowReasons[],
                            held, avgCost, strategyId, updatedAt
                            v2.1.0: provisional (sơ bộ: 15–29 phút giao dịch, điểm trộn với nền), baselineLean (−1…+1), spanMinutes, seedSessions
orderflow_events/{ngày_HHMM_MÃ_action_version}  một doc mỗi lần ĐỔI hành động + evaluation { intraday 15/30/60', touched30, swing 20 phiên
                            (chỉ buy/sell; buy-wait/sell-hold = "n/a", đo bằng touched30: giá tốt hơn có tới trong 30' không) }
                            v2.1.0: provisional; phút đo là phút GIAO DỊCH (nối qua nghỉ trưa). Mọi sự kiện v2.x đều tiếp tục được đo.
orderflow_versions/{version} · orderflow_control/{runtime|seed_MÃ (sessions 5 phiên trước, mỗi phiên có lean + source vps|nguoiquansat,
                            làm mới mỗi ngày: refreshedOn, attemptAt; + levels mốc 20 phiên)}   (tất cả orderflow_*: chỉ Cloud Function ghi, owner đọc)
```
**Đối chiếu TCBS không có collection riêng:** xác nhận thì ghi thẳng vào sổ như nhập tay — lệnh thiếu vào
`transactions` (note "Đồng bộ TCBS", `createdAt` = giờ khớp), lệch tiền vào `cashflows` "adjust" (note "Đối chiếu TCBS").
Id của `signals` là **tất định** (ngày_mã_loại) ⇒ lưu lại trong ngày là ghi đè, không đẻ bản trùng.
**Lưu ở MÁY (localStorage, KHÔNG đồng bộ giữa thiết bị):** `fin2-theme` (sáng/tối) ·
`fin2-tab` (tab đang mở) · `fin2-collapsed` (section nào đang gập) · `fin2-skip-highlight`
(mục kế hoạch đã Bỏ qua ở khối Khuyến nghị, tự hết hạn khi sang ngày) · `fin2-sector-collapsed` (nhóm ngành đang gập) ·
`fin2-sector-off` (bảng đang tắt chia ngành — chữ "Mã" đầu bảng là nút bật/tắt, không còn sắp theo mã). Đây là sở thích hiển thị,
mất cũng không sao. **Dữ liệu thật luôn nằm ở Firestore** — đừng đẩy thứ gì cần giữ vào đây.

⚠️ **Hai đơn vị tiền song song:** `price` và `lastPrice` là **nghìn đồng**; `amount`, `cash`, `marketValue` là **VND nguyên**. Quy đổi bằng `×1000`. Nhầm chỗ này là lệch 1000 lần và không có gì báo lỗi.

---

## Phân quyền
Rules Firestore (01/11/2026): `isOwner()` gõ cứng email owner (không bao giờ tự khoá mình) · `isMember()` = owner hoặc `members/{email}`
`status == "active"`, email đã xác minh. Sổ `users/{uid}/…` chỉ chính chủ · dữ liệu bot `screening_*`/`decision_*`/`settings` thành viên đọc ·
`orderflow_*` + `screening_slots` + ghi `settings` chỉ owner (cung cầu đợt 1 bám giá vốn owner). Client chỉ chặn hiển thị
(`data-owner-only`); mọi chặn thật nằm ở rules. ⚠️ `decision_latest` còn chứa mốc T+ legacy tính từ giá vốn OWNER → thành viên
đọc được mốc đó (owner biết, đợt 2 tách theo người). Đã thử 31 ca trên emulator — đổi rules thì thử lại.

⚠️ **Gate phía client KHÔNG phải hàng rào bảo mật.** Thêm collection mới → thêm nhánh rules NGAY, không để sau.

---

## ⚠️ Những chỗ NHÂN BẢN CÓ CHỦ Ý — sửa 1 chỗ phải sửa mấy chỗ
- **Danh sách collection sổ riêng** `BOOK_COLLECTIONS` (`public/index.html`) ↔ `BOOK_COLLECTIONS` (`functions/members.js`) ↔ chú thích
  nhánh `users/{uid}` trong `firestore.rules`. Thêm collection sổ mới → thêm cả ba; app đọc/ghi sổ CHỈ qua `bookCol`/`bookDoc`/`watch`.
- **Tour hướng dẫn chỉ vào id thật** của `index.html` (`#setup-card`, `#compact-summary-toggle`, `#advice-section`, `#compact-positions-slot`,
  `#compact-trade`, `#global-price-refresh`, `#tab-*`, `#tb-help`) — đổi id thì sửa `guide-tours.js`.
- **Ngưỡng mua/bán có 3 tầng:** hằng số mặc định `RULE_BUY_DROP`/`RULE_SELL_RISE`/`RULE_LOT`
  → phiên bản trong `strategies` → nơi dùng gọi `activeStrategy(ngày)`. Ba nơi dùng phải
  ra cùng một số cho cùng một ngày: `renderCompact` (cột Mua / Bán + tầng mở của bảng mã), `buildSignals` (phần T+ ghi log
  tín hiệu), `renderStrategy` (thẻ "Đang áp dụng"), `buildPlan` (kế hoạch ngày, theo `activeStrategy(ngày phiên)`). **Thêm chỗ dùng mới thì gọi
  `activeStrategy()`, đừng gõ số và cũng đừng đọc thẳng hằng số.**
  Phiên bản chiến lược **chỉ thêm, không sửa đè** — sửa đè là tín hiệu cũ mất ngưỡng gốc.
- **Phần đọc datafeed giá ở app chỉ có MỘT chỗ là `fetchQuotes()`** (gọi từ nút lấy giá chung và nút
  xem giá trong form thêm mã). Thêm chỗ lấy giá mới thì gọi hàm đó, đừng chép lại phần đọc JSON.
  Server đọc CÙNG datafeed VPS ở `parseVpsQuote()` (`functions/orderflow.js`, thêm 3 mức bid/ask) — bản sao có chủ ý vì
  app cần giá tham chiếu trước giờ mở cửa khi sổ lệnh trống. Đổi cách hiểu `lastPrice`/`r` → sửa cả hai.
- **Khung giờ sàng lọc** `SLOTS` (`functions/index.js`) ↔ `SCREENING_SLOTS` (`public/index.html`) là
  bản sao có chủ ý, cùng id/giờ/phase. Bot chạy mỗi 30 phút, chỉ làm việc khi khung đang bật trong
  `settings/screening`. **Chỉ lượt "post" (sau đóng cửa) đầu tiên thành công trong ngày ghi
  `screening_runs`/`screening_results`**; lượt trước/trong phiên chỉ gửi Telegram có nhãn.
- **Thông số sàng lọc** `DEFAULT_CONFIG` + `normalizeConfig()` (`functions/scoring.js`) ↔
  `SCREENING_DEFAULTS` + `SCREENING_LIMITS` + `screeningConfig()` (`public/index.html`) là bản sao có chủ ý,
  cùng khoá/mặc định/giới hạn. Cách chọn kết quả cũng nhân bản: `selectResults` (bot) ↔ `runManualScreening`
  (Quét ngay) — **mỗi nhóm xếp riêng**, mã mới tối đa `maxNew`, mã theo dõi đạt chuẩn hiện hết.
  Đừng quay lại kiểu lấy top N chung rồi mới tách nhóm.
- **Khối ngoại** `foreignFlow()` (`functions/scoring.js`, dùng cho cả Cơ hội lẫn Điểm quyết định) ↔ `screenForeignFlow()`;
  `fetchForeign()` + `FOREIGN_API` (`functions/index.js`) ↔ `screenFetchForeign()` + `SCREENING_FOREIGN_API` (`public/index.html`).
  Cùng 5 phiên, cùng cách khớp ngày, trung lập 5/10 khi thiếu dữ liệu hoặc hết room. Đổi một bên → sửa bên kia + nâng version.
- **Điểm quyết định (server) chép lại logic app:** `DEFAULT_STRATEGY` + `activeStrategy()` + `holdings()` +
  ngưỡng legacy `buyAt/sellAt` (`functions/decision-service.js`) ↔ `RULE_*` + `activeStrategy()` + `computeLedger()`
  + `strategyLevels()` (`public/index.html`). Đổi cách chọn phiên bản chiến lược hay tính giá vốn → sửa cả hai.
  Từ 13/10/2026 cả hai bên cùng có `maLength`/`maDays`/`maMaxDays` (mặc định 10 · 5 · 15) — thêm khoá chiến lược mới thì thêm cả hai bên.
- **Cờ "VN-Index đang yếu"** trong `riskFlags` (`functions/decision-scoring.js`) cũng là `MARKET_WEAK_FLAG` của `marketState()` (cửa lọc
  mua của kế hoạch ngày). Đổi chữ cờ phía bot → sửa hằng số này, không thì app coi thị trường luôn "ổn".
- **Giờ nghỉ trưa** `NOON_START`/`NOON_END` (`functions/decision-service.js`) ↔ `LUNCH_START_MIN`/`LUNCH_END_MIN` (`public/index.html`);
  `PM_SHADOW_SESSIONS` (`functions/noon-plan.js`) ↔ cùng tên ở app. `noonSummary` (Telegram) chỉ là bản sơ bộ của `buildPlan(…, noon)`,
  cố ý không chép gồng/cửa lọc — đổi luật kế hoạch chiều KHÔNG cần sửa bot.
- **Luật vùng mua MA** `maInZone()` (`functions/decision-service.js`, Telegram dùng) ↔ `maInZone()` (`public/index.html`, bảng mã +
  Khuyến nghị + `signalMaAbove`). Đổi điều kiện vùng → sửa cả hai.
- **Chuỗi cảnh báo `riskFlags`** (`functions/decision-scoring.js`) ↔ khoá của `DECISION_RISK_TEXT` (bản lời thường ở
  tab Phân tích) + chuỗi "Xu hướng yếu — nguy cơ bắt dao rơi" mà `renderDecisionPilot` dùng để đếm (`public/index.html`).
  Đổi chữ cảnh báo phía bot → sửa cả hai chỗ bên app, không thì cảnh báo hiện nguyên văn kỹ thuật và bộ đếm về 0.
  Phần diễn giải ở `analysisDetail` dựng câu từ số bot đã lưu (`market`, `sector`, `buyParts`/`sellParts`), không tính lại điểm.
- **Rổ ngành** `SECTORS` (`functions/decision-scoring.js`, bot dùng cho Điểm quyết định + so mã cùng ngành) ↔ `TICKER_SECTORS`
  (`public/index.html`, chỉ để nhóm dòng bảng mã; owner gán đè từng mã ở `tickers.sector`). Thêm/bớt mã trong rổ bot → chép sang app
  (đổi rổ bot là đổi điểm ngành → nâng `scoreVersion`). Gán tay của owner KHÔNG đẩy ngược về bot.
- **Mua giá ≤ 0,1 = nhận cổ tức cổ phiếu** (owner chốt 12/10/2026, `isStockDividend`): vẫn cộng số CP + hạ giá vốn như lệnh mua;
  biểu đồ không vẽ điểm M, nhật ký ghi "Nhận cổ tức". Bot (`holdings()`) tính y như lệnh mua thường — đúng ý, không cần sửa.
- **Mã đang nắm giữ không ra tín hiệu T+ `watch`** dù còn trong watchlist (`buildSignals`, khối Khuyến nghị
  `renderAdvice` đọc từ đây) — tránh hai lệnh mua cùng mã một ngày TỪ CÙNG MÁY. Mã đó chỉ theo ngưỡng giá vốn.
  Từ v2.0.0 cung cầu không ra dòng riêng (owner chốt 08/10/2026): mỗi mã một dòng T+ kèm nhận xét cung cầu.
- **Id `signals`:** `ngày_mã_loại`. Doc cung cầu riêng của 07/10/2026 (hậu tố `_cungcau` + `engine:"orderflow"`) chỉ còn là lịch sử.
  Nhận diện máy chỉ qua `signalEngine()` (doc cũ không có `engine`: có `orderflowVersion` = cung cầu, còn lại = T+; doc T+ mới
  luôn có `engine:"tplus"` nên có `orderflowVersion` cũng không bị nhận nhầm).
  `signalDocId()` là nơi DUY NHẤT dựng id — `writeSignals`, nút Đặt, lệnh chờ đều gọi hàm này.
- **Mốc T+ phía server** `tplusLevels()` (`functions/decision-service.js`, dùng cho legacy Điểm quyết định + mốc cung cầu)
  ↔ `strategyLevels()` + giá kỳ vọng watchlist ở app. Đổi cách tính mốc → sửa cả hai.
- **Nhận xét cung cầu** `scoreOrderflow` (server) ↔ `orderflowAdvice` (app: chỉ lấy `ready`, đúng ngày, bản v2; mã Giữ và
  giá bán ≤ giá vốn bị bỏ) — `buildSignals`, `orderflowLine`, `orderflowDetail`, xuất dữ liệu đều đọc qua hàm này.
  Nhãn `FLOW_VERDICT_LABEL` ↔ verdict `now|wait|hold` phía server. Đổi luật phía server → xem lại hàm này.
- **Mỗi doc `signals` chép lại `buyDrop`/`sellRise`/`strategyId` của phiên bản lúc đó** (từ 07/10/2026: `orderflowVersion` + `lotSize`).
  Bản sao có chủ ý, cùng bản chất với `daily_snapshots`: đổi ngưỡng về sau thì tín hiệu cũ
  **vẫn giữ ngưỡng cũ** — đúng ý, vì đó mới là cái đã thực sự sinh ra tín hiệu hôm đó.
  Đừng "vá lại cho nhất quán".
- **`daily_snapshots.prices` từ nay chứa CẢ MÃ KHÔNG NẮM GIỮ** (mã trong watchlist), vì
  watchlist cũng cần lịch sử giá để đánh giá "chờ có đáng không". `computeSummary` bỏ qua
  mã không giữ nên vô hại — nhưng ai đọc snapshot phải biết, đừng suy ra danh mục từ `prices`.
- **`daily_snapshots` chép lại `cash`/`investedCost`/`marketValue`** vốn tính được từ `transactions`+`cashflows`. Đây là **bản sao có chủ ý** để giữ lịch sử theo ngày. Đổi công thức trong `computeSummary` thì **snapshot cũ vẫn giữ số cũ** — đúng ý, đừng "vá lại cho nhất quán".

---

## Một view duy nhất (đã gỡ Đầy đủ 01/11/2026)
- **Chỉ còn view Gọn** (owner chốt gom từ 02/10/2026, gỡ hẳn view Đầy đủ + nút Gọn/Đầy đủ + `fin2-view` ngày 01/11/2026 — đừng dựng lại).
  Một thanh tab 5 tab Danh mục · Theo dõi · Cơ hội · Chiến lược · Phân tích; Danh mục/Theo dõi nằm trong `#compact-view`, 3 tầng:
  dòng → bấm mở → **Chi tiết** (`#ticker-dialog`, `renderTickerDetail`). Ẩn/hiện panel chỉ đi qua `syncPanels()` — thêm tab mới thì
  thêm vào `TABS`, đừng tự bật `hidden` chỗ khác.
  Form nhập (`#tx-form`, `#cf-form`, `#wl-form`, `#today-body`) nằm ẩn trong `#form-store`, chỉ hiện khi mượn vào popup qua
  `openCompactForm` — thêm form nhập mới thì đặt vào đây, đừng làm khu form riêng.

---

## Đã CHỐT và CẤM dựng lại
- **Firebase project đặt trên tài khoản công ty `nghiant@youmed.vn`.** Claude đã nêu rủi ro (IT admin tổ chức truy cập được dữ liệu tài chính cá nhân); owner cân nhắc và **chọn giữ**. Không nêu lại.
- **Không có ngưỡng chặn mua thêm theo mã** (số lần / % vốn tối đa mỗi mã) — vẫn giữ. Từ 16/10/2026 owner chốt thêm cửa lọc
  CHUNG của kế hoạch ngày: tối đa `maxBuys` lệnh mua/ngày + tiền mặt sau lệnh ≥ `minCashRatio` (thay quyết định cũ "không chặn").
- **Sổ lệnh 3 mức cho máy cung–cầu cũng lấy từ `bgapidatafeed.vps.com.vn`, gọi từ Cloud Function** — đo thật 07/10/2026:
  chạy mỗi phút, 24/24 mã có dữ liệu, ~1 giây/lượt (khác `histdatafeed` của VPS bị timeout ở #012). Nền 5 phiên dư mua/dư bán
  lấy từ Người Quan Sát (`dulieu.nguoiquansat.vn/Company/OrderHistory`), cũng đo được từ Cloud Function. DNSE là phương án sau (cần API key).
- **Giá lấy từ datafeed VPS** (`bgapidatafeed.vps.com.vn`) — nguồn duy nhất kiểm chứng được
  là cho gọi cross-origin. TCBS, SSI, VNDirect, CafeF, DNSE, Yahoo **đều bị CORS chặn**,
  đã đo thật ngày 10/09/2026 (từ trình duyệt). Đừng thử lại nếu chưa có bằng chứng mới.
- **Lịch sử giá để CHẤM ĐIỂM lấy từ VNDirect** (`dchart-api.vndirect.com.vn/dchart/history`), đổi
  ngày 24/09/2026 vì VPS không nhận kết nối từ Google Cloud (#012). Đã đo thật từ Cloud Function:
  VNDirect và DNSE trả dữ liệu; VPS timeout; SSI 403; TCBS bị Cloudflare chặn. VNDirect cho gọi
  cross-origin (`Access-Control-Allow-Origin: *`) nên nút Quét ngay dùng CÙNG nguồn với bot.
  Gửi header `accept: */*` — chỉ `application/json` thì VNDirect trả 406. DNSE là nguồn dự phòng
  đã đo được nếu VNDirect hỏng. Giá hiện tại và biểu đồ vẫn dùng VPS.
- **Khối ngoại lấy từ VNDirect** (`api-finfo.vndirect.com.vn/v4/foreigns`), owner chốt 06/10/2026: thành phần 10 điểm của
  Cơ hội v1.1.0 (Xu hướng/Sức mạnh 25→20) và Điểm quyết định v1.2.0 (Mua: Thị trường 25→20, Đà tăng 20→15; Bán: Đà tăng
  25→20, So thị trường 20→15). Đo thật từ Cloud Function 06/10/2026: 104 mã một lần gọi, <0,6 giây; cho gọi cross-origin.
  Dữ liệu thị trường của TCBS OpenAPI (khối ngoại, mua/bán chủ động, "thông tin chứng khoán") đều cần phiên iOTP (401 nếu
  thiếu) — trái quyết định không cất phiên, đừng dùng cho bot. "Thông tin chứng khoán" TCBS chỉ là thông tin niêm yết,
  KHÔNG có báo cáo tài chính. **Mua/bán chủ động** chỉ TCBS có (bản công khai bị Cloudflare chặn) → để sau.
  Mô phỏng `backtest.js` chưa có lịch sử khối ngoại: mọi mã tính trung lập 5/10.
- **Một nút lấy giá chung ở header** (`#global-price-refresh` → `refreshAllPrices()`), owner chốt 24/09/2026.
  Ghi THẲNG giá hiện tại vào `tickers` cho mọi mã nắm giữ + theo dõi, ghi `watch_prices` cho mã
  watchlist và điền sẵn ô giá ở tab Danh mục. **Không tạo `daily_snapshots` hay `signals`** — hai
  thứ này vẫn chỉ sinh khi owner bấm **Lưu** nhật ký. Các nút cũ `#fetch-price`, `#wl-fetch`,
  `#compact-prices` đã bỏ; đừng dựng lại nút lấy giá riêng từng khu vực.
- **Bỏ Artifact `window.claude.use("db")`**, đã chuyển sang Firestore. Không quay lại.
- **Không lưu cờ "đã làm theo tín hiệu hay chưa" trong `signals`.** Cái đó suy ra được từ
  `transactions` cùng ngày + cùng mã + cùng chiều, tính lúc xuất dữ liệu. Cố ý không lưu để
  tránh bản sao dễ lệch. Đừng thêm cột `followed`.
- **Log tín hiệu ghi tự động khi bấm "Lưu nhật ký hôm nay"**, không có nút "đã làm / bỏ qua"
  cho owner bấm tay. Owner đã cân nhắc và chọn phương án không thêm thao tác.
  Nút **“Bỏ qua”** ở khối *Khuyến nghị* (trước là dải Highlight, từ 24/09/2026) KHÔNG phải nút này: nó chỉ
  ẩn tín hiệu khỏi khối trên đúng máy đó tới hết ngày (localStorage `fin2-skip-highlight`), không ghi
  Firestore, không đụng `signals` hay lệnh. Đừng biến nó thành cờ lưu vào tín hiệu.
- **Khuyến nghị thay Highlight + Hàng đợi tín hiệu + Lệnh đang chờ** (owner chốt 02/10/2026; từ 16/10/2026 phần "Tín hiệu" thay bằng
  **Kế hoạch ngày** — xem mục KỶ LUẬT ở trên, đoạn dưới đây là lịch sử): một danh sách theo
  vòng đời lệnh — tín hiệu đã đạt ngưỡng hôm nay (**Đặt** / **Bỏ qua**) → lệnh đã đặt còn chờ (**Khớp** / **Hủy**).
  Từ 08/10/2026 hai nhóm trong CÙNG khối: **Tín hiệu** (dòng T+ kèm nhãn cung cầu, nút Đặt điền giá cung cầu) · **Đã đặt**.
  Mục "sắp tới ngưỡng" và watchlist gần giá kỳ vọng KHÔNG vào Khuyến nghị (bảng mã đã báo). Từ 16/10/2026 mua còn chờ
  (cung cầu "Chờ giá thấp hơn", vùng MA chờ bật lên) cũng KHÔNG vào — chỉ lọc hiển thị ở `renderAdvice`, `signals` vẫn ghi đủ.
  Chi tiết phân tích (Điểm quyết định, Điểm Cơ hội) mở đầu bằng **Tóm lại** lời thường, số liệu gập "Xem số liệu". Tab Phân tích chỉ
  còn "Hiệu quả tín hiệu" (chất lượng tín hiệu + đóng góp lãi/lỗ). Đừng dựng lại hàng đợi thứ hai.
- **Không có mô phỏng ngược** (tính lại "nếu dùng ngưỡng khác từ đầu thì sao"). Owner chọn
  cách so sánh theo giai đoạn hiệu lực thật. Đừng tự thêm.
- **Điểm quyết định hiển thị thang 10** (7,4), server vẫn lưu 0–100. Điểm chỉ hiện ở **tầng 2** bảng mã
  (điểm + trạng thái); phân tích chi tiết + tổng kết chạy bóng nằm ở **tab Phân tích**. Owner chốt 27/09/2026.
  Từ 02/10/2026 bấm điểm/“Chi tiết” ở tầng 2 mở popup Chi tiết mã (tầng 3) — cùng `analysisDetail()` với tab Phân tích, không nhảy tab.
- **Ngưỡng của Điểm quyết định cố định theo `scoreVersion`** (`POLICY` trong `functions/decision-scoring.js`),
  cố ý KHÔNG đọc tab Chiến lược/`settings/screening`: đang chạy bóng, đổi giữa chừng thì mẫu không so được.
  Đổi ngưỡng/công thức → nâng version, bộ đếm 20 phiên chạy lại. Sự kiện chỉ sinh ở lượt sau đóng cửa;
  đo đối xứng (Bán đúng khi giá giảm winPct trước khi tăng lossPct).
- **TCBS OpenAPI chỉ dùng để ĐỐI CHIẾU, sổ tay vẫn là nguồn chính** (owner chốt 28/09/2026). Nút `#tcbs-btn` ở header →
  nhập iOTP → `readTcbsPortfolio` đổi iOTP lấy phiên, đọc tài sản/tiền/lệnh khớp tiểu khoản NORMAL rồi **bỏ phiên ngay —
  KHÔNG cất phiên** ở đâu cả (owner chọn để người có quyền vào Google Cloud không cầm được phiên đặt lệnh). Mỗi lần đối
  chiếu nhập iOTP mới. API Key + mã lưu ký trong Secret Manager (`TCBS_API_KEY`, `TCBS_CUSTODY_CODE`), web chỉ gửi iOTP.
  App so theo nhóm ngày·mã·chiều (`tcbsMissingTrades`), chỉ từ ngày đầu của sổ tay; vị thế lệch vì lý do khác (cổ tức
  cổ phiếu, quyền, cách TCBS tính giá vốn) **chỉ hiện để xem**, không có loại "điều chỉnh vị thế". Không đồng bộ theo lịch.
  Đã đo 28/09/2026: `openapi.tcbs.com.vn` nhận kết nối từ Cloud Function (khác các API giá của TCBS).
  ⚠️ **Tài liệu developers.tcbs.com.vn lệch thực tế** (đo 01/10/2026): `/se` trả `stock[]`·`totalQtty`·`costPrice`, không phải
  `assets[]`·`quantity`·`avgPrice`. Tin log hình dạng dữ liệu thật hơn tài liệu. API Key hết hạn sau 12 tháng (FAQ TCBS).
- **Lệnh điều kiện qua API (đã xem 28/09/2026):** API TCBS chỉ có lệnh điều kiện cho phái sinh; tự dựng cho cổ
  phiếu buộc phải giữ phiên có quyền đặt lệnh — trái quyết định không cất phiên. Hiện KHÔNG làm.
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
⚠️ Từ 28/09/2026 Functions gắn 2 secret TCBS (`TCBS_API_KEY`, `TCBS_CUSTODY_CODE`) — thiếu thì deploy Functions không qua.

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
