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
deploy.bat           Deploy 1 chạm trên Windows: lấy nhánh từ GitHub → smoke → hỏi xác nhận → deploy.
                     Biến BRANCH đầu file: đổi thành main sau khi PR #1 được gộp.
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
- Broker TCBS miễn phí môi giới; chỉ còn thuế TNCN 0.1% giá trị bán — chưa đưa vào tính toán.

---

## Mô hình dữ liệu
```
transactions/{autoId}       ticker, side "buy"|"sell", qty, price (nghìn đ), date, note, createdAt
cashflows/{autoId}          type "deposit"|"withdraw"|"adjust", amount (VND nguyên), date, note, createdAt
                            ("adjust" = đối chiếu số dư TCBS, amount CÓ DẤU, không phải vốn nạp/rút thật)
tickers/{TICKER}            lastPrice (nghìn đ), lastPriceDate, refPrice? (giá tham chiếu, nghìn đ), refPriceDate?, hold?, updatedAt
                            (refPrice chỉ ghi ở nút lấy giá chung; % trong ngày chỉ tính khi refPriceDate = lastPriceDate)
daily_snapshots/{YYYY-MM-DD}  date, cash, investedCost, marketValue, totalAssets, prices{}, createdAt, updatedAt
watchlist/{TICKER}          targetBuy (nghìn đ), addedAt, updatedAt
strategies/{autoId}         buyDrop, sellRise, lotSize, effectiveFrom (YYYY-MM-DD), reason, createdAt
signals/{YYYY-MM-DD_MÃ_loại}  date, ticker, kind "buy"|"sell"|"watch", price, avgCost,
                            targetBuy, qty, strategyId, buyDrop, sellRise, createdAt, updatedAt
settings/screening          slots { "0830"|"1030"|"1330"|"1530"|"1600"|"2000": bool }, updatedAt
                            (không có doc = chỉ bật 16:00). Owner bật/tắt khung giờ nhận tin Telegram
                            analysis { minScore, maxNew, minLiquidityBn (tỷ đ), fitMin, fitMax (nghìn đ),
                            winPct, lossPct, evalSessions }, analysisUpdatedAt — thông số sàng lọc chỉnh ở
                            tab Chiến lược (thiếu = mặc định 70·5·20·40–70·6·3·20). Ghi doc này LUÔN `merge`
screening_runs/{YYYY-MM-DD}      …, analysis (chép bộ thông số đã dùng lượt đó)
screening_results/{YYYY-MM-DD_MÃ}  …, targetBuy? (mã theo dõi), evalWinPct, evalLossPct, evalSessions
                            (chép ngưỡng đo lúc đề cử — đổi thông số không chấm lại kết quả cũ)
                            fiveSessionEvaluation? { sessions, sessionsObserved, complete, entryPrice, exitDate,
                            exitPrice, returnPct, path[{date, close}], pathComplete } — chỉ đề cử totalScore > 90: mua giả
                            định giá đóng cửa ngày đề cử. Các trường 5 phiên giữ nghĩa cũ; `path` = giá đóng cửa từng phiên
                            tới phiên 20, bot đo tới khi `pathComplete` (bản cũ thiếu `path` được đo bù). App chọn phiên chốt
                            1–20 từ `path`. Báo cáo chỉ tính lần đầu mỗi đợt n phiên (`fiveSessionSamples`)
                            từ v1.1.0: foreignScore (0–10), foreign { status ok|missing|room-full, netBuyDays,
                            netSellDays, netRatioPct, netValue (VND) } — khối ngoại 5 phiên
screening_slots/{YYYY-MM-DD_HHMM}  khoá mỗi khung giờ: status, phase, marketDate, notificationAttemptedAt…
                            (chỉ Cloud Function ghi)
decision_latest/{TICKER}    điểm quyết định gần nhất: buyScore, sellScore (0–100), buyParts, sellParts, threshold,
                            phase, scoreVersion, buyAbove/sellAbove/legacyBuyAbove/legacySellAbove…
                            từ decision-v1.2.0: buyParts.foreign/sellParts.foreign (0–10) + foreign { …như trên }
decision_snapshots/{runId_MÃ} · decision_runs/{ngày_post|ngày_giờ} · decision_versions/{version}
decision_events/{ngày_MÃ_chiều_engine_version}  sự kiện vượt ngưỡng + evaluation (engine decision|legacy)
decision_news/{hash} · decision_control/{runtime|news}   (tất cả decision_*: chỉ Cloud Function ghi, owner đọc)
```
**Đối chiếu TCBS không có collection riêng:** xác nhận thì ghi thẳng vào sổ như nhập tay — lệnh thiếu vào
`transactions` (note "Đồng bộ TCBS", `createdAt` = giờ khớp), lệch tiền vào `cashflows` "adjust" (note "Đối chiếu TCBS").
Id của `signals` là **tất định** (ngày_mã_loại) ⇒ lưu lại trong ngày là ghi đè, không đẻ bản trùng.
**Lưu ở MÁY (localStorage, KHÔNG đồng bộ giữa thiết bị):** `fin2-theme` (sáng/tối) ·
`fin2-tab` (tab đang mở) · `fin2-collapsed` (section nào đang gập) · `fin2-skip-highlight`
(tín hiệu đã Bỏ qua ở khối Khuyến nghị, tự hết hạn khi sang ngày) · `fin2-hold-sessions` (phiên chốt
đang xem ở báo cáo >90 điểm). Đây là sở thích hiển thị,
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
  ra cùng một số cho cùng một ngày: `renderCompact` (cột Mua / Bán + tầng mở của bảng mã), `buildSignals` (ghi log
  tín hiệu), `renderStrategy` (thẻ "Đang áp dụng"). **Thêm chỗ dùng mới thì gọi
  `activeStrategy()`, đừng gõ số và cũng đừng đọc thẳng hằng số.**
  Phiên bản chiến lược **chỉ thêm, không sửa đè** — sửa đè là tín hiệu cũ mất ngưỡng gốc.
- **Phần đọc datafeed giá chỉ có MỘT chỗ là `fetchQuotes()`** (gọi từ nút lấy giá chung và nút
  xem giá trong form thêm mã). Thêm chỗ lấy giá mới thì gọi hàm đó, đừng chép lại phần đọc JSON.
- **Khung giờ sàng lọc** `SLOTS` (`functions/index.js`) ↔ `SCREENING_SLOTS` (`public/index.html`) là
  bản sao có chủ ý, cùng id/giờ/phase. Bot chạy mỗi 30 phút, chỉ làm việc khi khung đang bật trong
  `settings/screening`. **Chỉ lượt "post" (sau đóng cửa) đầu tiên thành công trong ngày ghi
  `screening_runs`/`screening_results`**; lượt trước/trong phiên chỉ gửi Telegram có nhãn.
- **Thông số sàng lọc** `DEFAULT_CONFIG` + `normalizeConfig()` (`functions/scoring.js`) ↔
  `SCREENING_DEFAULTS` + `SCREENING_LIMITS` + `screeningConfig()` (`public/index.html`) là bản sao có chủ ý,
  cùng khoá/mặc định/giới hạn. Cách chọn kết quả cũng nhân bản: `selectResults` (bot) ↔ `runManualScreening`
  (Quét ngay) — **mỗi nhóm xếp riêng**, mã mới tối đa `maxNew`, mã theo dõi đạt chuẩn hiện hết.
  Đừng quay lại kiểu lấy top N chung rồi mới tách nhóm.
- **Phiên chốt >90 điểm:** `HOLD_MAX_SESSIONS` (`functions/scoring.js` ↔ `public/index.html`); cách gom đợt + tiêu chí
  điểm ngọt `holdStats`/`holdSweetSpot` + `HOLD_MIN_WIN`/`HOLD_MIN_SAMPLES` (`functions/backtest.js` ↔ `public/index.html`).
  Điểm ngọt = lãi bình quân MỖI PHIÊN cao nhất, với ≥50% lần có lãi và ≥30 mẫu. Phiên chốt chỉ là tham số xem —
  không chấm lại, không nâng version. Tăng `HOLD_MAX_SESSIONS` thì mẫu cũ tự đo bù (nếu lịch sử 240 ngày còn phủ).
- **Khối ngoại** `foreignFlow()` (`functions/scoring.js`, dùng cho cả Cơ hội lẫn Điểm quyết định) ↔ `screenForeignFlow()`;
  `fetchForeign()` + `FOREIGN_API` (`functions/index.js`) ↔ `screenFetchForeign()` + `SCREENING_FOREIGN_API` (`public/index.html`).
  Cùng 5 phiên, cùng cách khớp ngày, trung lập 5/10 khi thiếu dữ liệu hoặc hết room. Đổi một bên → sửa bên kia + nâng version.
- **Điểm quyết định (server) chép lại logic app:** `DEFAULT_STRATEGY` + `activeStrategy()` + `holdings()` +
  ngưỡng legacy `buyAt/sellAt` (`functions/decision-service.js`) ↔ `RULE_*` + `activeStrategy()` + `computeLedger()`
  + `strategyLevels()` (`public/index.html`). Đổi cách chọn phiên bản chiến lược hay tính giá vốn → sửa cả hai.
- **Chuỗi cảnh báo `riskFlags`** (`functions/decision-scoring.js`) ↔ khoá của `DECISION_RISK_TEXT` (bản lời thường ở
  tab Phân tích) + chuỗi "Xu hướng yếu — nguy cơ bắt dao rơi" mà `renderDecisionPilot` dùng để đếm (`public/index.html`).
  Đổi chữ cảnh báo phía bot → sửa cả hai chỗ bên app, không thì cảnh báo hiện nguyên văn kỹ thuật và bộ đếm về 0.
  Phần diễn giải ở `analysisDetail` dựng câu từ số bot đã lưu (`market`, `sector`, `buyParts`/`sellParts`), không tính lại điểm.
- **Mã đang nắm giữ không ra tín hiệu `watch`** dù còn trong watchlist (`buildSignals`, khối Khuyến nghị
  `renderAdvice` đọc từ đây) — tránh hai lệnh mua cùng mã một ngày. Mã đó chỉ theo ngưỡng giá vốn.
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
- **Gọn ↔ Đầy đủ** (`fin2-view`): một thanh tab chung 5 tab Danh mục · Theo dõi · Cơ hội · Chiến lược · Phân tích.
  Hai view chỉ khác nhau ở **Danh mục** và **Theo dõi** (`VIEW_TABS`); bảng mã vẫn là MỘT DOM được chuyển slot.
  Cơ hội (Cơ hội ngắn hạn + báo cáo 5 phiên), Chiến lược, Phân tích (Hiệu quả tín hiệu ở đầu) là một bản dùng chung.
  Khối Khuyến nghị (`#advice-section`) chuyển slot giữa Gọn và Đầy đủ như bảng mã.
  Ẩn/hiện panel chỉ đi qua `syncPanels()` — thêm tab mới thì thêm vào `TABS`, đừng tự bật `hidden` chỗ khác.
  **Đang gom về một view (owner chốt 02/10/2026):** Gọn là view chính, 3 tầng: dòng → bấm mở → **Chi tiết**.
  Bước 1 xong: phần Tổng quan mở rộng (`#overview-more`) và Nhật ký (`#journal-section`) chuyển slot như bảng mã;
  Lưu nhật ký (`#today-body`), Nạp/rút (`#cf-form`) mượn vào popup qua `openCompactForm`; Chi tiết mã là
  `#ticker-dialog` (`renderTickerDetail`). Bước 2 (CHỜ owner dùng thử): gỡ view Đầy đủ + nút Gọn/Đầy đủ + `fin2-view`.

---

## Đã CHỐT và CẤM dựng lại
- **Firebase project đặt trên tài khoản công ty `nghiant@youmed.vn`.** Claude đã nêu rủi ro (IT admin tổ chức truy cập được dữ liệu tài chính cá nhân); owner cân nhắc và **chọn giữ**. Không nêu lại.
- **Không có ngưỡng chặn mua thêm** (số lần / % vốn tối đa mỗi mã). Owner biết rủi ro dồn vốn và **chốt chưa làm**. Đừng tự thêm.
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
- **Khuyến nghị thay Highlight + Hàng đợi tín hiệu + Lệnh đang chờ** (owner chốt 02/10/2026): một danh sách theo
  vòng đời lệnh — tín hiệu đã đạt ngưỡng hôm nay (**Đặt** / **Bỏ qua**) → lệnh đã đặt còn chờ (**Khớp** / **Hủy**).
  Mục "sắp tới ngưỡng" và watchlist gần giá kỳ vọng KHÔNG vào Khuyến nghị (bảng mã đã báo). Tab Phân tích chỉ
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
