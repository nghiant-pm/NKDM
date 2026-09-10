# CODEMAP — Fin2

## 1. Sơ đồ phụ thuộc

```
public/index.html ──> Firebase JS SDK 10.12.5 (ESM, gstatic CDN)
                        ├── firebase-app.js       initializeApp
                        ├── firebase-auth.js      Google Sign-In
                        └── firebase-firestore.js đọc/ghi 7 collection
                      Google Fonts (Inter 400/500)
                      bgapidatafeed.vps.com.vn   giá thị trường (chỉ đọc,
                        chỉ gửi đi danh sách MÃ — không gửi SL hay số dư)
                      localStorage               fin2-theme     (sáng/tối)
                                                 fin2-tab       (tab đang mở)
                                                 fin2-collapsed (section nào đang gập)
                        ⚠️ ba khoá này thuộc về MÁY, không đồng bộ giữa thiết bị
                      tải file .json xuống máy   downloadExport() — không gửi
                        đi đâu cả; owner tự đem file đi hỏi AI

public/seed.html  ──> cùng bộ SDK. Trang DÙNG MỘT LẦN, không liên quan app.

firestore.rules   ──  hàng rào thật. Không file nào import, nhưng
                      SỬA COLLECTION Ở index.html LÀ PHẢI SỬA ĐÂY.
```

Không có bundler, không có file JS rời. **Toàn bộ app nằm trong 1 file.**

Giao diện chia **3 tab** trong cùng 1 trang (`nav.tabs` + 3 `div.panel`):
`panel-danh-muc` · `panel-theo-doi` · `panel-chien-luoc`. Không phải 3 trang, không có router.

---

## 2. `public/index.html` — các hàm quan trọng

| Nhóm | Hàm | Việc |
|---|---|---|
| Tiện ích | `dateStrOf(d)` `todayStr` `daysAgoStr(n)` `fmtDateVN` `fmtPrice` `fmtVND` `fmtPct` `nowISO` `esc` `toast` | định dạng + chống XSS + báo ngắn. `todayStr` gọi `dateStrOf`; `daysAgoStr` dùng để lọc khoảng ngày lúc xuất dữ liệu |
| **Tính toán** | `computeHoldings(transactions)` | duyệt giao dịch theo thứ tự `date_createdAt`, ra `{ticker:{qty,avgCost,realizedPnl}}`. Mua → bình quân gia quyền lại; bán → giữ nguyên avgCost, cộng realizedPnl |
| | `computeCashVND(transactions, cashflows)` | Σ nạp − Σ rút − Σ mua + Σ bán |
| | `currentPriceFor(ticker, avgCost)` | lấy `tickers.lastPrice`, **không có thì rơi về avgCost** (⇒ lãi/lỗ = 0, không phải lỗi) |
| | `computeSummary()` | gộp tất cả, trả `{cash, investedCost, marketValue, total, unrealizedPnl, realizedPnl, held[], holdings}` |
| | `activeStrategy(dateStr)` | **nguồn duy nhất của ngưỡng.** Trả phiên bản trong `strategies` có `effectiveFrom` lớn nhất mà ≤ ngày đưa vào. Chưa có bản nào → rơi về hằng số `RULE_BUY_DROP` / `RULE_SELL_RISE` / `RULE_LOT` (2 / 3 / 100) |
| | `priceTickers(held)` | danh sách mã cần lấy/nhập giá = mã đang giữ **+** mã trong `watchlist` |
| Vẽ | `render()` | **cửa duy nhất** — mọi thay đổi dữ liệu đều đi qua đây rồi gọi các hàm con |
| | `renderPositions(held)` | lưới thẻ vị thế + nút Giữ. Ngưỡng đọc từ `activeStrategy(todayStr())`, **không gõ số** |
| | `renderPriceInputs(tickers)` | ô nhập giá. Nhận **mảng MÃ** (từ `priceTickers`), không còn nhận mảng held. **Chỉ dựng lại khi tập mã đổi**; dựng lại thì chụp và trả lại chữ đang gõ |
| | `renderTodayBanner(tickers)` | banner trạng thái ngày. Cũng nhận **mảng MÃ** |
| | `renderTickerList(held)` | datalist gợi ý mã — gộp mã đang giữ **+** mã watchlist |
| | `renderWatchlist()` `renderStrategy()` | bảng tab Theo dõi · danh sách phiên bản chiến lược ở tab Chiến lược |
| | `renderLog()` | danh sách nhật ký |
| Giá | `fetchQuotes(syms)` | **chỗ duy nhất đọc JSON của datafeed VPS.** Trả `{MÃ:{p,ref}}`, `ref:true` = mã chưa khớp lệnh nên đang lấy giá tham chiếu `r`. Cả hai nút lấy giá đều gọi hàm này — thêm nút thứ ba cũng gọi, đừng chép lại |
| | `fetchMarketPrices()` | nút tab **Danh mục** (`#fetch-price`): **điền vào ô nhập, KHÔNG ghi database**. Nói rõ mã nào là giá tham chiếu / không có giá trên `#price-source` |
| | `fetchWatchPrices()` | nút tab **Theo dõi** (`#wl-fetch`): lấy giá mã trong `watchlist` rồi **GHI THẲNG vào `tickers`** (`lastPrice`, `lastPriceDate`, `updatedAt`), không chờ bấm Lưu. ⚠️ **Ngoại lệ có chủ ý** — mã theo dõi không nằm trong danh mục nên giá sai không lệch lãi/lỗ. Trạng thái hiện ở `#wl-source` |
| Ghi | `toggleHold(ticker)` | lật cờ `hold` trên `tickers/{TICKER}` |
| | `saveTodaySnapshot()` | ghi `tickers.lastPrice` từng mã → gộp vào cache cục bộ → ghi `daily_snapshots/{hôm nay}` → **gọi `writeSignals(hôm nay)`**. Toast báo thêm số tín hiệu đã ghi |
| | `addWatch(ticker,target)` `removeWatch(ticker)` | thêm / xoá mã theo dõi |
| Tín hiệu | `buildSignals(dateStr, summary)` | tính gợi ý của một ngày: `buy` khi giá ≤ avgCost − ngưỡng · `sell` khi ≥ avgCost + ngưỡng (**cờ `hold` chặn**) · `watch` khi mã theo dõi rơi xuống ≤ `targetBuy`. Chỉ tính mã **có giá**. Gắn kèm `strategyId` + ngưỡng lúc đó |
| | `writeSignals(dateStr)` | ghi `signals` với id tất định `ngày_MÃ_loại`; tín hiệu cùng ngày không còn thoả nữa thì **xoá doc** |
| Xuất | `buildExport(days)` `downloadExport()` `HUONG_DAN_AI` | gom chiến lược + tín hiệu + giao dịch + nạp/rút + nhật ký ngày + watchlist + vị thế thành 1 file JSON tiếng Việt, tải xuống máy. **`daLamTheo` suy ra tại chỗ** từ `transactions` cùng ngày/mã/chiều — không đọc cờ nào cả. `giaSauDo` lấy giá ở 5/10/20 **bản ghi nhật ký kế tiếp** |
| Form | `setupSeg` `setMsg` `clearOversellAck` `showOversellAck` `initForms` | các form (`tx-form`, `cf-form`, `wl-form`, `st-form`), nút `ex-btn`, chặn bán vượt, nút theme, đăng xuất |
| Tab | `showTab(name)` `initTabs()` | bật 1 trong 3 panel, nhớ lựa chọn ở localStorage `fin2-tab` |
| Thu gọn | `initCollapse()` `setCollapsed(head,on)` `readCollapsed()` `writeCollapsed(list)` hằng `CHEVRON` | chèn mũi tên vào mọi `.sec-head[data-sec]`; bấm đầu đề thì gắn class `collapsed` lên **thẻ cha** (section hoặc .card), CSS `.collapsed > *:not(.sec-head)` giấu phần thân — **không bọc thêm thẻ nào**. Phần đang gập nhớ ở localStorage `fin2-collapsed` (mảng khoá). Section mới muốn gập được thì chỉ cần thêm `data-sec`. Muốn hiện số tóm tắt lúc gập thì đặt `class="only-collapsed"` lên ô đó — thuần CSS, `render()` không cần biết đang gập hay mở |
| Dữ liệu | `setSync` `watch(name, apply)` `startData()` | 7 `onSnapshot`, mỗi cái xong thì gọi `render()` |
| Cổng | `showGate` `initGate()` | `onAuthStateChanged` → 3 nhánh: chưa đăng nhập · sai email · đúng email |

**Boot:** đúng 5 lời gọi ở cấp module, cuối file, theo thứ tự
`initTabs() → initCollapse() → initForms() → render() → initGate()`.
⚠️ Đừng thêm lời gọi cấp module đọc biến khai phía dưới — cả khối script sẽ chết im lặng (bài học mục 12).

---

## 3. Ma trận collection ↔ nơi dùng

| Collection | Đọc ở | Ghi ở | Nhánh rules |
|---|---|---|---|
| `transactions` | `watch("transactions")` → `computeHoldings`, `computeCashVND`, `renderLog`, `renderTickerList`, `buildExport` (đối chiếu `daLamTheo`) | `tx-form` submit (`addDoc`) | ✅ |
| `cashflows` | `watch("cashflows")` → `computeCashVND`, `renderLog`, `buildExport` | `cf-form` submit (`addDoc`) | ✅ |
| `tickers` | `watch("tickers")` → `currentPriceFor`, `renderPositions`, `renderPriceInputs`, `buildSignals` | `toggleHold`, `saveTodaySnapshot`, `fetchWatchPrices`, `tx-form` submit | ✅ |
| `daily_snapshots` | `watch("daily_snapshots")` → `renderTodayBanner`, `renderLog`, `buildExport` (`giaSauDo`) | `saveTodaySnapshot` (`setDoc` id = ngày) | ✅ |
| `watchlist` | `watch("watchlist")` → `renderWatchlist`, `priceTickers`, `renderTickerList`, `buildSignals`, `buildExport` | `addWatch`, `removeWatch` (`setDoc` / `deleteDoc`, id = MÃ) | ✅ |
| `strategies` | `watch("strategies")` → `activeStrategy`, `renderStrategy`, `buildExport` | `st-form` submit (`addDoc`) | ✅ |
| `signals` | `watch("signals")` → `writeSignals` (biết doc nào cần xoá), `buildExport` | `writeSignals` (`setDoc` / `deleteDoc`, id = `ngày_MÃ_loại`) | ✅ |

⚠️ **Thêm collection mới = thêm 1 dòng bảng này + 1 nhánh trong `firestore.rules` NGAY.**

---

## 4. Contract chung

- **Đơn vị tiền.** `price`, `lastPrice`, `targetBuy`, `buyDrop`, `sellRise`, mọi thứ hiện qua `fmtPrice` = **nghìn đồng**. `amount`, `cash`, `investedCost`, `marketValue`, `totalAssets`, mọi thứ qua `fmtVND` = **VND nguyên**. Cầu nối duy nhất là `×1000`.
  Riêng ô nhập nạp/rút gõ theo **triệu đồng**, nhân `×1000000` ngay tại chỗ submit.
- **Ngưỡng mua/bán có 3 tầng, đọc theo đúng thứ tự:** hằng số mặc định (`RULE_BUY_DROP` / `RULE_SELL_RISE` / `RULE_LOT`) → phiên bản trong `strategies` → **nơi dùng luôn gọi `activeStrategy(ngày)`**. Không nơi nào được gõ số, cũng không đọc thẳng hằng số.
- **Phiên bản chiến lược chỉ THÊM, không sửa đè.** Đổi ngưỡng = tạo bản ghi mới với `effectiveFrom` mới. Bản cũ phải còn nguyên, không thì tín hiệu cũ mất ngưỡng gốc và hết đường chấm lại.
- **Doc id.** `tickers` và `watchlist` id = mã CP viết hoa. `daily_snapshots` id = `YYYY-MM-DD`. `signals` id = `YYYY-MM-DD_MÃ_loại`. Cả ba đều **tất định ⇒ lưu lại là ghi đè, không đẻ bản trùng**. `transactions` / `cashflows` / `strategies` dùng auto id.
- **KHÔNG lưu trạng thái suy ra được.** `signals` cố ý không có cờ "đã làm theo hay chưa" — `buildExport` đối chiếu với `transactions` cùng ngày/mã/chiều ngay lúc xuất. Thêm cờ vào là tự tạo một bản sao dễ lệch.
- **`daily_snapshots.prices` chứa cả mã KHÔNG nắm giữ** (mã watchlist). `computeSummary` bỏ qua mã không giữ nên số liệu không đổi — nhưng snapshot ghi trước 10/09/2026 chỉ có mã đang giữ, hai giai đoạn khác phạm vi.
- **Mọi chuỗi người dùng gõ chèn vào HTML phải qua `esc()`.** Không có ngoại lệ.
- **Mọi thay đổi dữ liệu chỉ vẽ lại qua `render()`.** Không có đường dựng DOM thứ hai — cố ý, để không dính bug "tính năng chỉ chạy ở một trong hai đường".
- **Hai nút lấy giá, hai nếp khác nhau — cố ý.** `#fetch-price` (tab Danh mục) chỉ ĐIỀN vào ô, owner phải bấm Lưu. `#wl-fetch` (tab Theo dõi) GHI THẲNG vào `tickers`. Lý do: mã watchlist không nằm trong danh mục nên giá sai không làm lệch lãi/lỗ hay tổng tài sản. **Đừng gộp lại cho "nhất quán".** Phần đọc datafeed thì ngược lại: chỉ được có MỘT chỗ là `fetchQuotes`.
- **localStorage chỉ giữ thứ thuộc về MÁY.** `fin2-theme` · `fin2-tab` · `fin2-collapsed`. Đây là sở thích hiển thị, không phải dữ liệu — mất cũng không sao, và cố ý KHÔNG đồng bộ giữa thiết bị. Dữ liệu thật luôn nằm ở Firestore.
- **Nút icon phải có `aria-label`.** Nút bật/tắt trạng thái thêm `aria-pressed`.

---

_Cập nhật lần cuối: 2026-09-10 — thêm nút lấy giá cho tab Theo dõi (`fetchWatchPrices`, ghi thẳng `tickers`), tách `fetchQuotes` dùng chung, nhóm hàm thu gọn section + khoá localStorage `fin2-collapsed`, boot lên 5 lời gọi._
