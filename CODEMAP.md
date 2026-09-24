# CODEMAP — Fin2

## 1. Sơ đồ phụ thuộc

```
public/index.html ──> Firebase JS SDK 10.12.5 (ESM, gstatic CDN)
                        ├── firebase-app.js       initializeApp
                        ├── firebase-auth.js      Google Sign-In
                        └── firebase-firestore.js đọc 12 collection;
                            2 collection screening chỉ đọc
                      Google Fonts (Inter 400/500)
                      bgapidatafeed.vps.com.vn   giá thị trường (chỉ đọc,
                        chỉ gửi đi danh sách MÃ — không gửi SL hay số dư)
                      histdatafeed.vps.com.vn    lịch sử OHLCV theo ngày;
                        gọi khi owner mở biểu đồ hoặc bấm Quét ngay;
                        kết quả quét tay không lưu vào Firestore
                      localStorage               fin2-theme     (sáng/tối)
                                                 fin2-tab       (tab đang mở)
                                                 fin2-view      (Gọn / Đầy đủ)
                                                 fin2-pnl-range (Tuần/Tháng/Quý/Tất cả)
                                                 fin2-hide-pnl  (ẩn / hiện số lãi lỗ)
                                                 fin2-exclude-hold-pnl (có / không tính mã dài hạn vào lãi/lỗ tổng)
                                                 fin2-sort-*    (cột / chiều sort 2 bảng Gọn)
                                                 fin2-order-*   (thứ tự mã do owner kéo thả)
                                                 fin2-collapsed (section nào đang gập)
                                                 fin2-skip-highlight (mục Bỏ qua ở Highlight, hết hạn theo ngày)
                        ⚠️ các khoá này thuộc về MÁY, không đồng bộ giữa thiết bị
                      tải file .json xuống máy   downloadExport() — không gửi
                        đi đâu cả; owner tự đem file đi hỏi AI

functions/index.js ──> Firebase Functions v2 · Node.js 22
                        ├── lịch 16:10 T2–T6, Asia/Ho_Chi_Minh
                        ├── functions/scoring.js  chấm điểm + đánh giá 20 phiên
                        ├── functions/universe.js khoảng 100 mã ứng viên
                        ├── histdatafeed.vps.com.vn  OHLCV + VN-Index
                        ├── Firestore Admin SDK   ghi screening_runs/results
                        └── Telegram Bot API      token/chat ID ở Secret Manager

firestore.rules   ──  hàng rào thật. Không file nào import, nhưng
                      SỬA COLLECTION Ở index.html LÀ PHẢI SỬA ĐÂY.
```

Không có bundler. Logic danh mục vẫn ở `public/index.html`.
`public/install.js` xử lý nút Cài đặt độc lập với Firebase; `manifest.webmanifest`
khai tên Danh Mục, scope `/`, chế độ standalone và icon trong `public/icons/`.
Icon SVG là nguồn vector; PNG 192/512 và maskable dùng khi cài Android. Không có cache offline.

Thứ tự thẻ: `sortTickers` áp dụng thứ tự ở `fin2-order-positions` / `fin2-order-watchlist`
(localStorage, riêng từng máy). `initSorting` dùng pointer events qua tay nắm, hỗ trợ cuộn sát mép
và phím mũi tên; `saveTickerOrder` ghi thứ tự. Trong khi kéo, hai grid tạm hoãn render để
đồng bộ Firestore không làm mất thẻ đang kéo; thả/huỷ thì render dữ liệu mới nhất.

View Gọn (`compact-view`) và Đầy đủ (`full-view`) dùng cùng dữ liệu. `initCompact` nhớ
`fin2-view` và sort riêng từng bảng trên từng máy; mặc định Đầy đủ, giữ nguyên tab khi đổi view.
Filter chỉ giữ trong phiên trang. Form giao dịch, form thêm mã và nút lấy giá watchlist được
chuyển vị trí thật trong DOM, không sao chép.
Khối `decision-hub` (tín hiệu, lệnh chờ, chất lượng tín hiệu, đóng góp) cũng được chuyển
giữa `compact-decision-slot` và `full-decision-slot`; hai view không có bản render riêng.
Khối `screening-hub` cũng được chuyển giữa `compact-screening-slot` và vị trí trong tab
Theo dõi của view Đầy đủ. Nút thêm mã mở lại đúng form watchlist dùng chung, không ghi thẳng.

View Đầy đủ chia **3 tab** trong cùng 1 trang (`nav.tabs` + 3 `div.panel`):
`panel-danh-muc` · `panel-theo-doi` · `panel-chien-luoc`. Không phải 3 trang, không có router.

---

## 2. `public/index.html` — các hàm quan trọng

| Nhóm | Hàm | Việc |
|---|---|---|
| Tiện ích | `dateStrOf(d)` `todayStr` `daysAgoStr(n)` `fmtDateVN` `fmtPrice` `fmtVND` `fmtPct` `nowISO` `esc` `toast` | định dạng + chống XSS + báo ngắn. `todayStr` gọi `dateStrOf`; `daysAgoStr` dùng để lọc khoảng ngày lúc xuất dữ liệu |
| **Tính toán** | `transactionTaxVND(t)` | đọc thuế TNCN đã lưu trên lệnh bán; giao dịch cũ thiếu `taxAmount` trả 0 để không hồi tố |
| | `computeLedger(transactions)` `computeHoldings(transactions)` | duyệt giao dịch theo thứ tự `date_createdAt`, trả vị thế và từng sự kiện lãi/lỗ bán sau thuế. Mỗi vị thế giữ `cycleRealizedPnl`; bán hết đặt lại chu kỳ để tính Giá vốn sau lướt khi mua lại |
| | `computeCashVND(transactions, cashflows)` | Σ nạp − Σ rút − Σ mua + Σ bán − thuế bán |
| | `sellableAt(dateStr)` `computeSellAvailability(transactions,ticker,now)` | tính số CP được bán từ 11:35 ngày làm việc thứ hai sau ngày mua; chỉ loại T7/CN. Trừ mọi lệnh bán đã ghi và không chặn submit |
| | `currentPriceFor(ticker, avgCost)` | lấy `tickers.lastPrice`, **không có thì rơi về avgCost** (⇒ lãi/lỗ = 0, không phải lỗi) |
| | `computeSummary()` | gộp tất cả, trả tiền mặt, tổng tài sản, lãi/lỗ chưa bán, vị thế kèm `netCost` và danh sách sự kiện bán để dashboard lọc theo kỳ |
| | `unrealizedPnlScope(summary)` | giữ nguyên summary gốc; khi tuỳ chọn bật thì lọc mã `hold` khỏi riêng tổng lãi/lỗ chưa bán và tỷ suất đi kèm ở cả Gọn lẫn Đầy đủ |
| | `activeStrategy(dateStr)` | **nguồn duy nhất của ngưỡng.** Trả phiên bản trong `strategies` có `effectiveFrom` lớn nhất mà ≤ ngày đưa vào, gồm ngưỡng điểm, ngưỡng % tuỳ chọn, `nearRange`, `watchNearRange` và mục tiêu tiền mặt. Bản cũ thiếu % thì trả `null`, tức chỉ dùng điểm |
| | `dashboardData(summary)` `realizedEventsInRange(events,range)` `cashRatioFor(summary)` `cashRatioStatus(ratio,strategy)` | tính 4 chỉ số dashboard theo Tuần / Tháng / Quý / Tất cả và trạng thái tỷ lệ tiền mặt so với chiến lược |
| | `sellForecast(summary)` | mô phỏng bán 30% / 50% / 100% các vị thế đang lãi theo giá hiện tại, làm tròn xuống bội số 100 CP của từng mã và trừ thuế bán; phần dưới 100 CP bỏ qua, không ghi dữ liệu |
| | `projectedCash(summary,signal)` `signalQualityAt(signal,offset)` `contributionRows(summary)` | tính tỷ lệ tiền mặt sau tín hiệu, hiệu quả đúng chiều sau 5/10/20 lần lưu và đóng góp đã chốt + chưa bán theo mã |
| | `strategyLevels(avgCost,strategy)` `strategyAlert(h,strategy,meta)` | quy đổi ngưỡng điểm và % thành giá kích hoạt thực tế theo luật “mức nào đến trước”; trả trạng thái sắp đạt hoặc đã đạt cho cả UI và tín hiệu. Mã `hold` không có cảnh báo bán |
| | `watchPriceSeries(ticker)` `watchTrend(ticker)` | ghép giá watchlist cũ trong `daily_snapshots` với `watch_prices`, chỉ lấy từ `addedAt` của chu kỳ theo dõi hiện tại; tính biến động điểm và % so với mốc đầu |
| | `watchLatestMove(ticker)` `watchProximity(ticker,watch,meta,strategy)` | lấy lần ghi giá liền trước và trả trạng thái "Chuẩn bị mua" khi giá hiện tại còn cao hơn mục tiêu không quá `watchNearRange` đồng thời thấp hơn giá trước. Thiếu giá trước hoặc đã đạt mục tiêu thì không trả trạng thái |
| | `priceTickers(held)` | danh sách mã cần lấy/nhập giá = mã đang giữ **+** mã trong `watchlist` |
| Vẽ | `render()` | **cửa duy nhất** — mọi thay đổi dữ liệu đều đi qua đây rồi gọi các hàm con |
| | `renderCompact(s)` `compactRows(rows,group)` | dashboard Gọn gồm đúng 4 chỉ số dùng chung công thức với Đầy đủ; hai bảng tìm/lọc/sort như cũ. Tên mã mở biểu đồ. Dòng mã nắm giữ hiện tuổi vị thế, cảnh báo gần ngưỡng và hành động mua/bán khi đã đạt; watchlist giữ highlight riêng qua `watchProximity` |
| | `renderDashboardDetails(summary,data)` `renderSellForecast(summary)` `renderRangeSwitches()` | Đầy đủ vẽ phân nhóm, lãi/lỗ đã chốt theo mã và ba kịch bản chốt lời; đồng bộ bộ chọn kỳ ở cả hai view |
| | `renderDecisionHub(summary)` | một khối dùng chung hai view: hàng đợi tín hiệu, lệnh đang chờ, chất lượng tín hiệu và đóng góp lãi/lỗ; mua còn hiện tỷ lệ tiền mặt dự kiến |
| | `renderScreeningHub()` `screeningRowHtml(row,canAdd)` `screeningEvaluationHtml(row)` | vẽ dữ liệu Firestore hoặc kết quả Quét ngay đang giữ tạm cho cả Gọn và Đầy đủ; tách cơ hội mới/mã theo dõi, hiện điểm thành phần, lý do và nhãn nguồn kết quả |
| | `renderPositions(held)` | lưới thẻ vị thế + nút nhóm; tên mã mở biểu đồ; hiện Giá vốn sau lướt, thời gian nắm giữ, giá kích hoạt đã quy đổi từ điểm/% và highlight cả lúc sắp đạt lẫn đã đạt. Ngưỡng đọc từ `activeStrategy(todayStr())` |
| | `renderPriceInputs(tickers)` | ô nhập giá. Nhận **mảng MÃ** (từ `priceTickers`), không còn nhận mảng held. **Chỉ dựng lại khi tập mã đổi**; dựng lại thì chụp và trả lại chữ đang gõ |
| | `renderTodayBanner(tickers)` | banner trạng thái ngày. Cũng nhận **mảng MÃ** |
| | `renderTickerList(held)` | datalist gợi ý mã — gộp mã đang giữ **+** mã watchlist |
| | `renderWatchlist()` `renderStrategy()` | thẻ Theo dõi giữ giá, mục tiêu và thời gian; tên mã mở biểu đồ qua `openStockChart`; biến động không hiện tại thẻ; "Đạt giá mua" ưu tiên hơn highlight "Chuẩn bị mua". Chiến lược hiện/lưu riêng `nearRange`, `watchNearRange` và mục tiêu tiền mặt |
| Biểu đồ | `fetchPriceHistory(ticker)` `renderStockChart()` | khi owner bấm mã mới lấy tối đa 370 ngày giá đóng cửa từ `histdatafeed.vps.com.vn`; vẽ thêm giá vốn, ngưỡng mua/bán, mục tiêu watchlist và điểm giao dịch. Giao dịch ngoài khung giá chỉ báo số lượng, không kéo méo trục |
| | `showChartPoint(e)` `hideChartPoint()` | chạm/rê trên biểu đồ để tìm điểm gần nhất và hiện tooltip gồm giá + ngày; rời biểu đồ thì ẩn tooltip |
| | `openStockChart(ticker,trigger)` `initStockChart()` | mở modal cho mã được bấm ở cả Gọn và Đầy đủ, đổi kỳ xem, vẽ lại khi màn hình đổi kích thước; đóng thì huỷ yêu cầu, dọn dữ liệu tạm và trả focus về nút vừa bấm |
| | `renderLog()` | danh sách nhật ký; hợp ngày có snapshot, giao dịch, lệnh đặt, nạp-rút và `watch_prices`. Lệnh giữ trạng thái chờ/khớp một phần/đã khớp/đã hủy |
| Giá | `fetchQuotes(syms)` | **chỗ duy nhất đọc JSON của datafeed VPS.** Trả `{MÃ:{p,ref}}`, `ref:true` = mã chưa khớp lệnh nên đang lấy giá tham chiếu `r`. Cả hai nút lấy giá đều gọi hàm này — thêm nút thứ ba cũng gọi, đừng chép lại |
| | `refreshAllPrices()` | **nút lấy giá DUY NHẤT** (`#global-price-refresh`, icon trên header, dùng cho cả Gọn và Đầy đủ). Gộp + loại trùng mã nắm giữ và theo dõi, gọi `fetchQuotes` **đúng 1 lần**, ghi thẳng `tickers` từng mã (mã trùng chỉ ghi 1 lần), ghi `watch_prices` cho mã watchlist, điền giá vào ô nhập nhật ký của Đầy đủ. **Không tạo `daily_snapshots` / `signals`**. Trạng thái (đang tải, số mã cập nhật, mã thiếu/giá tham chiếu, giờ) ở `#global-price-status`; lỗi một phần vẫn lưu các mã còn lại |
| Ghi | `toggleHold(ticker)` | lật cờ `hold` trên `tickers/{TICKER}` |
| | `removeTransaction(id, btn)` | nút Xóa trên từng giao dịch trong Nhật ký; tìm lại giao dịch theo id, xác nhận đủ mã/số lượng/giá/ngày rồi xóa đúng `transactions/{id}` |
| | `saveTodaySnapshot()` | ghi `tickers.lastPrice` → `daily_snapshots/{hôm nay}` → `watch_prices` cho mã đang theo dõi → **gọi `writeSignals(hôm nay)`** |
| | `writeWatchPriceHistory(date,prices)` | ghi `watch_prices/{YYYY-MM-DD_MÃ}`; lấy lại trong ngày cập nhật đúng doc, bỏ qua mã không còn trong watchlist |
| | `addWatch(ticker,target,quote)` `removeWatch(ticker)` | thêm / xoá mã theo dõi; quote xem trước (nếu có) ghi cùng watchlist và điểm lịch sử đầu tiên bằng batch khi Lưu |
| | `wl-quote-btn` trong `initForms` | gọi `fetchQuotes` xem giá trước khi nhập mục tiêu; đổi mã vô hiệu kết quả cũ, không ghi database lúc lấy giá |
| | `editWatch(ticker)` | mở dialog sửa giá mục tiêu; form `wl-edit-form` dùng `updateDoc` giữ ngày thêm mã, chặn lưu lặp và báo lỗi tại chỗ |
| Lệnh | `createOrder(data)` `remainingOrderQty(order)` `reservedSellQty(ticker)` `validateOrderSell(...)` | lưu lệnh chờ riêng khỏi giao dịch; lệnh bán đang mở giữ chỗ CP và không vượt số có thể bán |
| | `openOrderDialog(signal)` `openFillDialog(order)` `fillOrder(order,qty,price,date)` `initDecisionTools()` | đặt từ tín hiệu, khớp một phần/toàn bộ bằng batch tạo `transactions` + cập nhật `orders` + `tickers`, hoặc hủy nhưng không xóa lịch sử |
| Luận điểm | `thesisBadge(ticker)` `openThesisDialog(ticker)` + `thesis-form` | lưu lý do, điều kiện sai và ngày xem lại theo mã; nút mở có ở thẻ/bảng của cả Gọn và Đầy đủ |
| Tín hiệu | `buildSignals(dateStr, summary)` | dùng chung `strategyAlert`: `buy` / `sell` khi đạt ngưỡng điểm **hoặc** % đến trước (`hold` chặn bán), `watch` khi đạt `targetBuy`. Gắn `strategyId` và cả bốn ngưỡng điểm/% lúc đó |
| | `writeSignals(dateStr)` | ghi `signals` với id tất định `ngày_MÃ_loại`; tín hiệu cùng ngày không còn thoả nữa thì **xoá doc** |
| Xuất | `buildExport(days)` `downloadExport()` `HUONG_DAN_AI` | xuất thêm lệnh đặt, trạng thái khớp/hủy và luận điểm. `daDatLenh` suy từ `orders`; **`daLamTheo` suy tại chỗ** từ giao dịch gắn `signalId` hoặc giao dịch cũ cùng ngày/mã/chiều |
| Form | `setupSeg` `setMsg` `clearOversellAck` `showOversellAck` `refreshSellAvailability` `initForms` | các form (`tx-form`, `cf-form`, `wl-form`, `st-form`), nút `ex-btn`, chặn bán vượt, báo số CP có thể bán theo T+2, tự gắn thuế cho lệnh bán mới, nút theme, đăng xuất |
| Tab | `showTab(name)` `initTabs()` `initDashboard()` `renderPrivacyControl()` `renderPnlScopeControls()` | bật 1 trong 3 panel, nhớ tab; dashboard nhớ kỳ xem, trạng thái ẩn/hiện số và tuỳ chọn không tính mã dài hạn vào riêng tổng lãi/lỗ chưa bán. Bảng/thẻ vị thế và Nhật ký không bị che |
| View | `initCompact()` `openCompactForm(kind,ticker)` `renderCompactToday(s)` `readSkippedHighlights()` `writeSkippedHighlights(keys)` `compactRowMenu(ticker,watch)` | chuyển Gọn / Đầy đủ; dải **Highlight hôm nay** chỉ tổng hợp tín hiệu đã/sắp đạt (`strategyAlert`), lệnh chờ và watchlist gần mục tiêu, không lưu gì vào Firestore. Mỗi mục có khoá ổn định (`signal_loại_MÃ`, `order_id`, `near_loại_MÃ`, `watch_MÃ`) và nút **Bỏ qua** ẩn mục tới hết ngày trên máy đó (`fin2-skip-highlight`), nút **Hiện lại** xoá danh sách; không ảnh hưởng khối Quyết định; thao tác ít dùng của từng mã (luận điểm, sửa giá kỳ vọng, bỏ theo dõi) nằm trong menu ba chấm. Mobile ≤768px bảng chuyển thành dòng thẻ hai tầng, desktop giữ dạng cột; sort/filter 2 bảng; chuyển form giao dịch hoặc thêm mã vào dialog và trả về khi đóng, giữ bản nháp. Bấm giá kỳ vọng dùng `editWatch`; `tx-submit` bị khoá trong lúc ghi để tránh gửi lặp |
| Sàng lọc | `runManualScreening()` `screenFetchHistory(ticker,maxAttempts)` `screenMapWithConcurrency(items,limit,worker,onProgress)` | nút “Quét ngay” lấy OHLCV VPS trên thiết bị với concurrency 5, chấm tối đa 5 mã theo công thức v1.0.0 và chỉ giữ kết quả trong `state.manualScreening`; không ghi Firestore, không gửi Telegram |
| | `screenScoreTicker(ticker,bars,benchmarkBars)` và nhóm hàm `screen*Score` | bản công thức chấm điểm phía client cho Quét ngay; phải cho cùng kết quả với `functions/scoring.js` khi cùng dữ liệu và `SCREENING_SCORE_VERSION` |
| | `initScreening()` `openScreeningWatch(ticker,price)` | bắt sự kiện một lần trên khối dùng chung; “Đưa vào theo dõi” chỉ điền mã và hiện giá lúc đề cử, còn giá muốn mua do owner nhập rồi tự Lưu |
| | `pendingDrafts` trong `initCompact` | ghi cờ form giao dịch / giá chưa lưu để `beforeunload` yêu cầu cảnh báo khi rời trang. `refreshAllPrices` cũng đặt cờ khi điền giá; lưu giao dịch hoặc `saveTodaySnapshot` thành công xoá cờ tương ứng. Không lưu bản nháp vào localStorage |
| Thu gọn | `initCollapse()` `setCollapsed(head,on)` `readCollapsed()` `writeCollapsed(list)` hằng `CHEVRON` | chèn mũi tên vào mọi `.sec-head[data-sec]`; bấm đầu đề thì gắn class `collapsed` lên **thẻ cha** (section hoặc .card), CSS `.collapsed > *:not(.sec-head)` giấu phần thân — **không bọc thêm thẻ nào**. Phần đang gập nhớ ở localStorage `fin2-collapsed` (mảng khoá). Section mới muốn gập được thì chỉ cần thêm `data-sec`. Muốn hiện số tóm tắt lúc gập thì đặt `class="only-collapsed"` lên ô đó — thuần CSS, `render()` không cần biết đang gập hay mở |
| Dữ liệu | `setSync` `watch(name, apply)` `watchRef(ref,name,apply)` `startData()` | 10 listener collection cũ và 2 query screening; mỗi lần có dữ liệu đều gọi `render()` |
| Cổng | `showGate` `initGate()` | `onAuthStateChanged` → 3 nhánh: chưa đăng nhập · sai email · đúng email |

**Boot:** đúng 11 lời gọi ở cấp module, cuối file, theo thứ tự
`initTabs() → initDashboard() → initCollapse() → initForms() → initDecisionTools() → initScreening() → initSorting() → initCompact() → initStockChart() → render() → initGate()`.
⚠️ Đừng thêm lời gọi cấp module đọc biến khai phía dưới — cả khối script sẽ chết im lặng (bài học mục 12).

---

## 3. `functions/` — bot sàng lọc

| File | Hàm | Việc |
|---|---|---|
| `index.js` | `screenShortTermOpportunities` | lịch chính 16:10 T2–T6; tải dữ liệu, loại mã đang giữ, lấy tối đa 5 mã tổng cộng, ghi Firestore, cập nhật đánh giá và gửi Telegram |
| | `fetchHistory(ticker,historyDays,maxAttempts)` `parseHistory(payload)` `mapWithConcurrency(items,limit,worker)` | đọc OHLCV lịch sử VPS với header JSON/user-agent, timeout 9 giây/lần và backoff; VN-Index thử tối đa 3 lần, mã thường 2 lần. Vẫn giới hạn 5 request đồng thời; thiếu trên 20% mã thì dừng toàn bộ lần chạy |
| | `acquireRun(db,date)` `claimNotification(db,runRef,type)` `markFailure(...)` | khóa theo ngày, không cho gửi Telegram trùng kể cả khi retry, lưu trạng thái lỗi và thử gửi một cảnh báo riêng |
| | `updateEvaluations(db,historyByTicker,benchmarkBars)` | chấm tiếp các đề cử cũ chưa đủ 20 phiên và ghi `evaluation` vào đúng document cũ |
| `scoring.js` | `scoreTicker(ticker,bars,benchmarkBars)` | lọc tối thiểu 60 phiên + 20 tỷ đồng/ngày; chấm 100 điểm và lưu riêng xu hướng, sức mạnh tương đối, bứt phá, điều chỉnh, thanh khoản/rủi ro, vùng giá |
| | `evaluateCandidate(result,bars,benchmarkBars)` | xác định +6% trước −3% trong 20 phiên; cùng một nến chạm hai mức là `indeterminate`; ghi thêm lợi nhuận phiên 20 và phần vượt/trượt VN-Index |
| `universe.js` | `UNIVERSE` | danh sách khoảng 100 mã thanh khoản cao dùng làm tập ứng viên ban đầu; watchlist và mã cũ đang chờ đánh giá được ghép thêm lúc chạy |
| `smoke.js` | các ca kiểm nhanh | kiểm bứt phá, thanh khoản yếu, mã ngoài vùng 40–70 vẫn được xét, hai ngưỡng cùng phiên và không nhìn dữ liệu tương lai |
| `backtest.js` | `main()` | walk-forward lịch sử để đo công thức trước khi bật; chỉ dùng dữ liệu có tại ngày chấm, nhưng vẫn có sai lệch sống sót vì dùng universe hiện tại |

**Trạng thái production:** `screenShortTermOpportunities` v2 đã deploy tại
`asia-southeast1`, Node.js 22, 512 MB. Hai secret Telegram đang ở Secret Manager phiên bản 1;
Artifact Registry xoá image cũ hơn 1 ngày. Firestore rules và Hosting đã phát hành cùng đợt.
Bản retry VPS đã deploy nhưng production vẫn timeout đủ 3 lần ở VN-Index: VPS không nhận
kết nối từ Cloud Function/Google Cloud. Vì vậy lịch 16:10 chưa vận hành được cho tới khi có
nguồn dữ liệu server thay thế hoặc proxy phù hợp. Round thủ công từ máy owner chỉ gửi
Telegram, có nhãn rõ và không ghi `screening_runs` / `screening_results`.

---

## 4. Ma trận collection ↔ nơi dùng

| Collection | Đọc ở | Ghi ở | Nhánh rules |
|---|---|---|---|
| `transactions` | `watch("transactions")` → `computeHoldings`, `computeCashVND`, `renderLog`, `renderTickerList`, `buildExport` (đối chiếu `daLamTheo`) | `tx-form` submit (`addDoc`); `fillOrder` (`batch.set`); `removeTransaction` (`deleteDoc`) | ✅ |
| `cashflows` | `watch("cashflows")` → `computeCashVND`, `renderLog`, `buildExport` | `cf-form` submit (`addDoc`) | ✅ |
| `tickers` | `watch("tickers")` → `currentPriceFor`, `renderPositions`, `renderPriceInputs`, `buildSignals` | `toggleHold`, `saveTodaySnapshot`, `refreshAllPrices`, `addWatch`, `tx-form` submit, `fillOrder` | ✅ |
| `daily_snapshots` | `watch("daily_snapshots")` → `renderTodayBanner`, `renderLog`, `buildExport` (`giaSauDo`) | `saveTodaySnapshot` (`setDoc` id = ngày) | ✅ |
| `watchlist` | `watch("watchlist")` → `renderWatchlist`, `priceTickers`, `renderTickerList`, `buildSignals`, `buildExport` | `addWatch`, `removeWatch` (`setDoc` / `deleteDoc`, id = MÃ) | ✅ |
| `strategies` | `watch("strategies")` → `activeStrategy`, `renderStrategy`, `buildExport` | `st-form` submit (`addDoc`) | ✅ |
| `signals` | `watch("signals")` → `writeSignals` (biết doc nào cần xoá), `buildExport` | `writeSignals` (`setDoc` / `deleteDoc`, id = `ngày_MÃ_loại`) | ✅ |
| `watch_prices` | `watch("watch_prices")` → `watchPriceSeries`, `watchTrend`, hai view watchlist | `writeWatchPriceHistory`, `addWatch` (`setDoc`, id = `YYYY-MM-DD_MÃ`) | ✅ |
| `orders` | `watch("orders")` → `renderDecisionHub`, `renderLog`, `buildExport`, giữ chỗ CP bán | `createOrder`, `fillOrder`, nút Hủy (`setDoc` / `updateDoc`) | ✅ |
| `theses` | `watch("theses")` → badge và form luận điểm, `buildExport` | `thesis-form` (`setDoc`, id = MÃ) | ✅ |
| `screening_runs` | `watchRef` query 40 lần gần nhất → `renderScreeningHub` | Cloud Function `screenShortTermOpportunities`; client không được ghi | ✅ chỉ owner đọc |
| `screening_results` | `watchRef` query 250 kết quả gần nhất → `renderScreeningHub` | Cloud Function `screenShortTermOpportunities`, `updateEvaluations`; client không được ghi | ✅ chỉ owner đọc |

⚠️ **Thêm collection mới = thêm 1 dòng bảng này + 1 nhánh trong `firestore.rules` NGAY.**

---

## 5. Contract chung

- **Đơn vị tiền.** `price`, `lastPrice`, `targetBuy`, `buyDrop`, `sellRise` là **nghìn đồng**. `buyDropPct` / `sellRisePct` là **%**. `amount`, `cash`, `investedCost`, `marketValue`, `totalAssets` là **VND nguyên**. Cầu nối tiền là `×1000`.
  Riêng ô nhập nạp/rút gõ theo **triệu đồng**, nhân `×1000000` ngay tại chỗ submit.
- **Thuế bán chỉ áp dụng về sau.** Lệnh bán mới lưu `taxRate: 0.001` và `taxAmount` theo VND nguyên; lệnh cũ không có trường thuế được tính 0. `computeCashVND` và `computeHoldings` cùng đọc qua `transactionTaxVND`, không tự tính lại từ ngày giao dịch.
- **Số có thể bán là thông tin.** Mua được bán từ 11:35 ngày làm việc thứ hai sau ngày mua, chỉ loại T7/CN. `computeSellAvailability` không chặn lệnh; chốt bán vượt tổng số đang giữ vẫn hoạt động riêng như cũ.
- **Ngưỡng mua/bán có điểm + % tuỳ chọn.** Hai loại chạy song song; mua dùng giá kích hoạt cao hơn, bán dùng giá kích hoạt thấp hơn, tức mức nào đến trước. Bản cũ thiếu % dùng `null` và giữ nguyên logic điểm. Mọi nơi phải đọc `activeStrategy(ngày)` rồi qua `strategyLevels` / `strategyAlert`.
- **"Chuẩn bị mua" của watchlist chỉ là hiển thị.** Giá phải còn cao hơn mục tiêu không quá `watchNearRange` và thấp hơn lần ghi liền trước. Thiếu lần trước thì không highlight; giá đã ≤ mục tiêu dùng "Đạt giá mua". `buildSignals` vẫn chỉ tạo `watch` khi thật sự đạt mục tiêu.
- **Phiên bản chiến lược chỉ THÊM, không sửa đè.** Đổi ngưỡng = tạo bản ghi mới với `effectiveFrom` mới. Bản cũ phải còn nguyên, không thì tín hiệu cũ mất ngưỡng gốc và hết đường chấm lại.
- **Doc id.** `tickers` và `watchlist` id = mã CP viết hoa. `daily_snapshots` id = `YYYY-MM-DD`; `watch_prices` id = `YYYY-MM-DD_MÃ`; `signals` id = `YYYY-MM-DD_MÃ_loại`. Các id này **tất định ⇒ lưu lại là ghi đè, không đẻ bản trùng**. `transactions` / `cashflows` / `strategies` dùng auto id.
- **Kết quả sàng lọc có phiên bản.** `screening_runs` id = `YYYY-MM-DD`; `screening_results` id = `YYYY-MM-DD_MÃ`. Mỗi kết quả chép `scoreVersion`, các điểm thành phần, lý do và trạng thái đánh giá để đổi công thức sau này không viết lại lịch sử. Client chỉ đọc hai collection này.
- **Quét ngay là dữ liệu tạm.** `state.manualScreening` chỉ sống trong tab hiện tại, ưu tiên hiển thị hơn kết quả Firestore cho tới khi tải lại trang. Không ghi collection screening và không gửi Telegram. Công thức `screenScoreTicker` phía client là bản sao có chủ ý của `functions/scoring.js`; đổi phiên bản phải sửa cả hai và giữ cùng `v1.0.0`/phiên bản kế tiếp.
- **Vòng đời lệnh.** `orders` dùng auto id và đi qua `pending` → `partial` → `filled`, hoặc sang `cancelled`. Chỉ số lượng xác nhận khớp mới sinh `transactions`; mỗi giao dịch khớp giữ `orderId` và `signalId` để tra ngược. Lệnh chờ/hủy vẫn ở Nhật ký nhưng không đổi tiền mặt hay vị thế. `theses` dùng id = mã CP viết hoa.
- **KHÔNG lưu trạng thái suy ra được.** `signals` cố ý không có cờ "đã làm theo hay chưa" — `buildExport` đối chiếu với `transactions` cùng ngày/mã/chiều ngay lúc xuất. Thêm cờ vào là tự tạo một bản sao dễ lệch.
- **`daily_snapshots.prices` chứa cả mã KHÔNG nắm giữ** (mã watchlist). `computeSummary` bỏ qua mã không giữ nên số liệu không đổi — nhưng snapshot ghi trước 10/09/2026 chỉ có mã đang giữ, hai giai đoạn khác phạm vi.
- **Mọi chuỗi người dùng gõ chèn vào HTML phải qua `esc()`.** Không có ngoại lệ.
- **Mọi thay đổi dữ liệu đều đi qua `render()`, gồm cả `renderCompact`.** Chuyển view cũng gọi `renderCompact(computeSummary())` để lấy thứ tự mã mới nhất; không mở listener riêng.
- **Một nút lấy giá chung (từ 24/09/2026) — owner chốt.** `#global-price-refresh` ghi thẳng giá hiện tại vào `tickers` cho mọi mã, nhưng **không thay bước chốt nhật ký**: `daily_snapshots` và `signals` vẫn chỉ sinh khi bấm Lưu ở tab Danh mục. Các nút cũ `#fetch-price`, `#wl-fetch`, `#compact-prices` đã bỏ. Phần đọc datafeed chỉ được có MỘT chỗ là `fetchQuotes` (hiện 2 nơi gọi: nút chung và nút xem giá trong form thêm mã).
- **localStorage chỉ giữ thứ thuộc về MÁY.** `fin2-theme` · `fin2-tab` · `fin2-collapsed` · `fin2-skip-highlight` · `fin2-view` · `fin2-pnl-range` · `fin2-hide-pnl` · `fin2-exclude-hold-pnl` · `fin2-order-positions` · `fin2-order-watchlist`. Đây là sở thích hiển thị, không phải dữ liệu — mất cũng không sao, và cố ý KHÔNG đồng bộ giữa thiết bị. Dữ liệu thật luôn nằm ở Firestore.
- **Nút icon phải có `aria-label`.** Nút bật/tắt trạng thái thêm `aria-pressed`.

---

_Cập nhật lần cuối: 2026-09-24 — một nút lấy giá chung ở header, view Gọn tối ưu mobile (Việc cần làm, dòng thẻ hai tầng, menu ba chấm)._
