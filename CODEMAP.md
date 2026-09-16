# CODEMAP — Fin2

## 1. Sơ đồ phụ thuộc

```
public/index.html ──> Firebase JS SDK 10.12.5 (ESM, gstatic CDN)
                        ├── firebase-app.js       initializeApp
                        ├── firebase-auth.js      Google Sign-In
                        └── firebase-firestore.js đọc/ghi 8 collection
                      Google Fonts (Inter 400/500)
                      bgapidatafeed.vps.com.vn   giá thị trường (chỉ đọc,
                        chỉ gửi đi danh sách MÃ — không gửi SL hay số dư)
                      localStorage               fin2-theme     (sáng/tối)
                                                 fin2-tab       (tab đang mở)
                                                 fin2-view      (Gọn / Đầy đủ)
                                                 fin2-pnl-range (Tuần/Tháng/Quý/Tất cả)
                                                 fin2-hide-pnl  (ẩn / hiện số lãi lỗ)
                                                 fin2-sort-*    (cột / chiều sort 2 bảng Gọn)
                                                 fin2-collapsed (section nào đang gập)
                        ⚠️ các khoá này thuộc về MÁY, không đồng bộ giữa thiết bị
                      tải file .json xuống máy   downloadExport() — không gửi
                        đi đâu cả; owner tự đem file đi hỏi AI

public/seed.html  ──> cùng bộ SDK. Trang DÙNG MỘT LẦN, không liên quan app.

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
| | `activeStrategy(dateStr)` | **nguồn duy nhất của ngưỡng.** Trả phiên bản trong `strategies` có `effectiveFrom` lớn nhất mà ≤ ngày đưa vào, gồm `nearRange` và mục tiêu tiền mặt `minCashRatio` / `maxCashRatio`. Bản cũ thiếu trường dùng mặc định 20–30% |
| | `dashboardData(summary)` `realizedEventsInRange(events,range)` `cashRatioFor(summary)` `cashRatioStatus(ratio,strategy)` | tính 4 chỉ số dashboard theo Tuần / Tháng / Quý / Tất cả và trạng thái tỷ lệ tiền mặt so với chiến lược |
| | `sellForecast(summary)` | mô phỏng bán 30% / 50% / 100% các vị thế đang lãi theo giá hiện tại, làm tròn xuống CP nguyên và trừ thuế bán; chỉ tính để hiển thị, không ghi dữ liệu |
| | `strategyProximity(h,strategy,meta)` | trả trạng thái `buy` / `sell` khi giá chưa chạm ngưỡng nhưng còn cách không quá `nearRange`; mã `hold` không có cảnh báo bán |
| | `watchPriceSeries(ticker)` `watchTrend(ticker)` | ghép giá watchlist cũ trong `daily_snapshots` với `watch_prices`, chỉ lấy từ `addedAt` của chu kỳ theo dõi hiện tại; tính biến động điểm và % so với mốc đầu |
| | `priceTickers(held)` | danh sách mã cần lấy/nhập giá = mã đang giữ **+** mã trong `watchlist` |
| Vẽ | `render()` | **cửa duy nhất** — mọi thay đổi dữ liệu đều đi qua đây rồi gọi các hàm con |
| | `renderCompact(s)` `compactRows(rows,group)` | dashboard Gọn gồm đúng 4 chỉ số dùng chung công thức với Đầy đủ; hai bảng tìm/lọc/sort như cũ. Dòng mã nắm giữ có tuổi vị thế + cảnh báo gần ngưỡng; dòng watchlist chỉ giữ tuổi theo dõi, không hiện biến động |
| | `renderDashboardDetails(summary,data)` `renderSellForecast(summary)` `renderRangeSwitches()` | Đầy đủ vẽ phân nhóm, lãi/lỗ đã chốt theo mã và ba kịch bản chốt lời; đồng bộ bộ chọn kỳ ở cả hai view |
| | `renderPositions(held)` | lưới thẻ vị thế + nút nhóm; hiện Giá vốn sau lướt, lãi/lỗ đã chốt trong chu kỳ, thời gian nắm giữ và highlight gần điểm mua/bán. Ngưỡng đọc từ `activeStrategy(todayStr())`, **không gõ số** |
| | `renderPriceInputs(tickers)` | ô nhập giá. Nhận **mảng MÃ** (từ `priceTickers`), không còn nhận mảng held. **Chỉ dựng lại khi tập mã đổi**; dựng lại thì chụp và trả lại chữ đang gõ |
| | `renderTodayBanner(tickers)` | banner trạng thái ngày. Cũng nhận **mảng MÃ** |
| | `renderTickerList(held)` | datalist gợi ý mã — gộp mã đang giữ **+** mã watchlist |
| | `renderWatchlist()` `renderStrategy()` | thẻ Theo dõi giữ giá, mục tiêu và thời gian; biến động không hiện tại thẻ. Chiến lược hiện/lưu khoảng cảnh báo `nearRange` và mục tiêu tiền mặt |
| | `renderLog()` | danh sách nhật ký; hợp ngày có snapshot, giao dịch, nạp-rút và `watch_prices`. Giá theo dõi hiện thay đổi điểm/% so với lần ghi trước |
| Giá | `fetchQuotes(syms)` | **chỗ duy nhất đọc JSON của datafeed VPS.** Trả `{MÃ:{p,ref}}`, `ref:true` = mã chưa khớp lệnh nên đang lấy giá tham chiếu `r`. Cả hai nút lấy giá đều gọi hàm này — thêm nút thứ ba cũng gọi, đừng chép lại |
| | `fetchMarketPrices()` | nút tab **Danh mục** (`#fetch-price`): **điền vào ô nhập, KHÔNG ghi database**. Nói rõ mã nào là giá tham chiếu / không có giá trên `#price-source` |
| | `fetchCompactPrices()` → `fetchWatchPrices(symbols,buttonId,sourceId)` | nút **Lấy giá** bảng nắm giữ Gọn và tab Theo dõi cùng ghi thẳng `tickers`; mã nào đang ở watchlist còn ghi một điểm/ngày vào `watch_prices`. Gọn vẫn không tạo snapshot/signals; tab Danh mục Đầy đủ vẫn chỉ điền ô |
| Ghi | `toggleHold(ticker)` | lật cờ `hold` trên `tickers/{TICKER}` |
| | `removeTransaction(id, btn)` | nút Xóa trên từng giao dịch trong Nhật ký; tìm lại giao dịch theo id, xác nhận đủ mã/số lượng/giá/ngày rồi xóa đúng `transactions/{id}` |
| | `saveTodaySnapshot()` | ghi `tickers.lastPrice` → `daily_snapshots/{hôm nay}` → `watch_prices` cho mã đang theo dõi → **gọi `writeSignals(hôm nay)`** |
| | `writeWatchPriceHistory(date,prices)` | ghi `watch_prices/{YYYY-MM-DD_MÃ}`; lấy lại trong ngày cập nhật đúng doc, bỏ qua mã không còn trong watchlist |
| | `addWatch(ticker,target,quote)` `removeWatch(ticker)` | thêm / xoá mã theo dõi; quote xem trước (nếu có) ghi cùng watchlist và điểm lịch sử đầu tiên bằng batch khi Lưu |
| | `wl-quote-btn` trong `initForms` | gọi `fetchQuotes` xem giá trước khi nhập mục tiêu; đổi mã vô hiệu kết quả cũ, không ghi database lúc lấy giá |
| | `editWatch(ticker)` | mở dialog sửa giá mục tiêu; form `wl-edit-form` dùng `updateDoc` giữ ngày thêm mã, chặn lưu lặp và báo lỗi tại chỗ |
| Tín hiệu | `buildSignals(dateStr, summary)` | tính gợi ý của một ngày: `buy` khi giá ≤ avgCost − ngưỡng · `sell` khi ≥ avgCost + ngưỡng (**cờ `hold` chặn**) · `watch` khi mã theo dõi rơi xuống ≤ `targetBuy`. Chỉ tính mã **có giá**. Gắn kèm `strategyId` + ngưỡng lúc đó |
| | `writeSignals(dateStr)` | ghi `signals` với id tất định `ngày_MÃ_loại`; tín hiệu cùng ngày không còn thoả nữa thì **xoá doc** |
| Xuất | `buildExport(days)` `downloadExport()` `HUONG_DAN_AI` | nút ở Nhật ký gom chiến lược + tín hiệu + giao dịch + nạp/rút + snapshot + lịch sử giá theo dõi + lãi/lỗ bán sau thuế + vị thế thành JSON cho AI. Cho xuất khi không có tín hiệu nếu vẫn có dữ liệu khác. **`daLamTheo` suy ra tại chỗ** từ giao dịch |
| Form | `setupSeg` `setMsg` `clearOversellAck` `showOversellAck` `refreshSellAvailability` `initForms` | các form (`tx-form`, `cf-form`, `wl-form`, `st-form`), nút `ex-btn`, chặn bán vượt, báo số CP có thể bán theo T+2, tự gắn thuế cho lệnh bán mới, nút theme, đăng xuất |
| Tab | `showTab(name)` `initTabs()` `initDashboard()` `renderPrivacyControl()` | bật 1 trong 3 panel, nhớ tab; dashboard nhớ kỳ xem và trạng thái ẩn/hiện lãi lỗ trên máy |
| View | `initCompact()` `openCompactForm(kind,ticker)` | chuyển Gọn / Đầy đủ; sort/filter 2 bảng; chuyển form giao dịch hoặc thêm mã vào dialog và trả về khi đóng, giữ bản nháp. Bấm giá kỳ vọng dùng `editWatch`; `tx-submit` bị khoá trong lúc ghi để tránh gửi lặp |
| | `pendingDrafts` trong `initCompact` | ghi cờ form giao dịch / giá chưa lưu để `beforeunload` yêu cầu cảnh báo khi rời trang. `fetchMarketPrices` cũng đặt cờ khi điền giá; lưu giao dịch hoặc `saveTodaySnapshot` thành công xoá cờ tương ứng. Không lưu bản nháp vào localStorage |
| Thu gọn | `initCollapse()` `setCollapsed(head,on)` `readCollapsed()` `writeCollapsed(list)` hằng `CHEVRON` | chèn mũi tên vào mọi `.sec-head[data-sec]`; bấm đầu đề thì gắn class `collapsed` lên **thẻ cha** (section hoặc .card), CSS `.collapsed > *:not(.sec-head)` giấu phần thân — **không bọc thêm thẻ nào**. Phần đang gập nhớ ở localStorage `fin2-collapsed` (mảng khoá). Section mới muốn gập được thì chỉ cần thêm `data-sec`. Muốn hiện số tóm tắt lúc gập thì đặt `class="only-collapsed"` lên ô đó — thuần CSS, `render()` không cần biết đang gập hay mở |
| Dữ liệu | `setSync` `watch(name, apply)` `startData()` | 7 `onSnapshot`, mỗi cái xong thì gọi `render()` |
| Cổng | `showGate` `initGate()` | `onAuthStateChanged` → 3 nhánh: chưa đăng nhập · sai email · đúng email |

**Boot:** đúng 8 lời gọi ở cấp module, cuối file, theo thứ tự
`initTabs() → initDashboard() → initCollapse() → initForms() → initSorting() → initCompact() → render() → initGate()`.
⚠️ Đừng thêm lời gọi cấp module đọc biến khai phía dưới — cả khối script sẽ chết im lặng (bài học mục 12).

---

## 3. Ma trận collection ↔ nơi dùng

| Collection | Đọc ở | Ghi ở | Nhánh rules |
|---|---|---|---|
| `transactions` | `watch("transactions")` → `computeHoldings`, `computeCashVND`, `renderLog`, `renderTickerList`, `buildExport` (đối chiếu `daLamTheo`) | `tx-form` submit (`addDoc`); `removeTransaction` (`deleteDoc`) | ✅ |
| `cashflows` | `watch("cashflows")` → `computeCashVND`, `renderLog`, `buildExport` | `cf-form` submit (`addDoc`) | ✅ |
| `tickers` | `watch("tickers")` → `currentPriceFor`, `renderPositions`, `renderPriceInputs`, `buildSignals` | `toggleHold`, `saveTodaySnapshot`, `fetchWatchPrices`, `tx-form` submit | ✅ |
| `daily_snapshots` | `watch("daily_snapshots")` → `renderTodayBanner`, `renderLog`, `buildExport` (`giaSauDo`) | `saveTodaySnapshot` (`setDoc` id = ngày) | ✅ |
| `watchlist` | `watch("watchlist")` → `renderWatchlist`, `priceTickers`, `renderTickerList`, `buildSignals`, `buildExport` | `addWatch`, `removeWatch` (`setDoc` / `deleteDoc`, id = MÃ) | ✅ |
| `strategies` | `watch("strategies")` → `activeStrategy`, `renderStrategy`, `buildExport` | `st-form` submit (`addDoc`) | ✅ |
| `signals` | `watch("signals")` → `writeSignals` (biết doc nào cần xoá), `buildExport` | `writeSignals` (`setDoc` / `deleteDoc`, id = `ngày_MÃ_loại`) | ✅ |
| `watch_prices` | `watch("watch_prices")` → `watchPriceSeries`, `watchTrend`, hai view watchlist | `writeWatchPriceHistory`, `addWatch` (`setDoc`, id = `YYYY-MM-DD_MÃ`) | ✅ |

⚠️ **Thêm collection mới = thêm 1 dòng bảng này + 1 nhánh trong `firestore.rules` NGAY.**

---

## 4. Contract chung

- **Đơn vị tiền.** `price`, `lastPrice`, `targetBuy`, `buyDrop`, `sellRise`, mọi thứ hiện qua `fmtPrice` = **nghìn đồng**. `amount`, `cash`, `investedCost`, `marketValue`, `totalAssets`, mọi thứ qua `fmtVND` = **VND nguyên**. Cầu nối duy nhất là `×1000`.
  Riêng ô nhập nạp/rút gõ theo **triệu đồng**, nhân `×1000000` ngay tại chỗ submit.
- **Thuế bán chỉ áp dụng về sau.** Lệnh bán mới lưu `taxRate: 0.001` và `taxAmount` theo VND nguyên; lệnh cũ không có trường thuế được tính 0. `computeCashVND` và `computeHoldings` cùng đọc qua `transactionTaxVND`, không tự tính lại từ ngày giao dịch.
- **Số có thể bán là thông tin.** Mua được bán từ 11:35 ngày làm việc thứ hai sau ngày mua, chỉ loại T7/CN. `computeSellAvailability` không chặn lệnh; chốt bán vượt tổng số đang giữ vẫn hoạt động riêng như cũ.
- **Ngưỡng mua/bán, khoảng cảnh báo và mục tiêu tiền mặt có 3 tầng, đọc theo đúng thứ tự:** hằng số mặc định → phiên bản trong `strategies` → **nơi dùng luôn gọi `activeStrategy(ngày)`**. Bản cũ thiếu trường dùng 0,5 điểm và 20–30%.
- **Phiên bản chiến lược chỉ THÊM, không sửa đè.** Đổi ngưỡng = tạo bản ghi mới với `effectiveFrom` mới. Bản cũ phải còn nguyên, không thì tín hiệu cũ mất ngưỡng gốc và hết đường chấm lại.
- **Doc id.** `tickers` và `watchlist` id = mã CP viết hoa. `daily_snapshots` id = `YYYY-MM-DD`; `watch_prices` id = `YYYY-MM-DD_MÃ`; `signals` id = `YYYY-MM-DD_MÃ_loại`. Các id này **tất định ⇒ lưu lại là ghi đè, không đẻ bản trùng**. `transactions` / `cashflows` / `strategies` dùng auto id.
- **KHÔNG lưu trạng thái suy ra được.** `signals` cố ý không có cờ "đã làm theo hay chưa" — `buildExport` đối chiếu với `transactions` cùng ngày/mã/chiều ngay lúc xuất. Thêm cờ vào là tự tạo một bản sao dễ lệch.
- **`daily_snapshots.prices` chứa cả mã KHÔNG nắm giữ** (mã watchlist). `computeSummary` bỏ qua mã không giữ nên số liệu không đổi — nhưng snapshot ghi trước 10/09/2026 chỉ có mã đang giữ, hai giai đoạn khác phạm vi.
- **Mọi chuỗi người dùng gõ chèn vào HTML phải qua `esc()`.** Không có ngoại lệ.
- **Mọi thay đổi dữ liệu đều đi qua `render()`, gồm cả `renderCompact`.** Chuyển view cũng gọi `renderCompact(computeSummary())` để lấy thứ tự mã mới nhất; không mở listener riêng.
- **Hai nút lấy giá, hai nếp khác nhau — cố ý.** `#fetch-price` (tab Danh mục) chỉ ĐIỀN vào ô, owner phải bấm Lưu. `#wl-fetch` (tab Theo dõi) GHI THẲNG vào `tickers`. Lý do: mã watchlist không nằm trong danh mục nên giá sai không làm lệch lãi/lỗ hay tổng tài sản. **Đừng gộp lại cho "nhất quán".** Phần đọc datafeed thì ngược lại: chỉ được có MỘT chỗ là `fetchQuotes`.
- **localStorage chỉ giữ thứ thuộc về MÁY.** `fin2-theme` · `fin2-tab` · `fin2-collapsed` · `fin2-view` · `fin2-pnl-range` · `fin2-hide-pnl` · `fin2-order-positions` · `fin2-order-watchlist`. Đây là sở thích hiển thị, không phải dữ liệu — mất cũng không sao, và cố ý KHÔNG đồng bộ giữa thiết bị. Dữ liệu thật luôn nằm ở Firestore.
- **Nút icon phải có `aria-label`.** Nút bật/tắt trạng thái thêm `aria-pressed`.

---

_Cập nhật lần cuối: 2026-09-16 — riêng tư lãi/lỗ, forecast chốt lời và xuất Nhật ký AI._
