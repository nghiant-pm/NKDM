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
                      localStorage               fin2-theme (sáng/tối)
                                                 fin2-tab   (tab đang mở)
                        ⚠️ hai khoá này thuộc về MÁY, không đồng bộ giữa thiết bị
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
| Giá | `fetchMarketPrices()` | gọi `PRICE_API` (datafeed VPS), **điền vào ô nhập, KHÔNG ghi database**. `lastPrice` không có thì rơi về `r` (giá tham chiếu) và nói rõ trên `#price-source` |
| Ghi | `toggleHold(ticker)` | lật cờ `hold` trên `tickers/{TICKER}` |
| | `saveTodaySnapshot()` | ghi `tickers.lastPrice` từng mã → gộp vào cache cục bộ → ghi `daily_snapshots/{hôm nay}` → **gọi `writeSignals(hôm nay)`**. Toast báo thêm số tín hiệu đã ghi |
| | `addWatch(ticker,target)` `removeWatch(ticker)` | thêm / xoá mã theo dõi |
| Tín hiệu | `buildSignals(dateStr, summary)` | tính gợi ý của một ngày: `buy` khi giá ≤ avgCost − ngưỡng · `sell` khi ≥ avgCost + ngưỡng (**cờ `hold` chặn**) · `watch` khi mã theo dõi rơi xuống ≤ `targetBuy`. Chỉ tính mã **có giá**. Gắn kèm `strategyId` + ngưỡng lúc đó |
| | `writeSignals(dateStr)` | ghi `signals` với id tất định `ngày_MÃ_loại`; tín hiệu cùng ngày không còn thoả nữa thì **xoá doc** |
| Xuất | `buildExport(days)` `downloadExport()` `HUONG_DAN_AI` | gom chiến lược + tín hiệu + giao dịch + nạp/rút + nhật ký ngày + watchlist + vị thế thành 1 file JSON tiếng Việt, tải xuống máy. **`daLamTheo` suy ra tại chỗ** từ `transactions` cùng ngày/mã/chiều — không đọc cờ nào cả. `giaSauDo` lấy giá ở 5/10/20 **bản ghi nhật ký kế tiếp** |
| Form | `setupSeg` `setMsg` `clearOversellAck` `showOversellAck` `initForms` | các form (`tx-form`, `cf-form`, `wl-form`, `st-form`), nút `ex-btn`, chặn bán vượt, nút theme, đăng xuất |
| Tab | `showTab(name)` `initTabs()` | bật 1 trong 3 panel, nhớ lựa chọn ở localStorage `fin2-tab` |
| Dữ liệu | `setSync` `watch(name, apply)` `startData()` | 7 `onSnapshot`, mỗi cái xong thì gọi `render()` |
| Cổng | `showGate` `initGate()` | `onAuthStateChanged` → 3 nhánh: chưa đăng nhập · sai email · đúng email |

**Boot:** đúng 4 lời gọi ở cấp module, cuối file, theo thứ tự
`initTabs() → initForms() → render() → initGate()`.
⚠️ Đừng thêm lời gọi cấp module đọc biến khai phía dưới — cả khối script sẽ chết im lặng (bài học mục 12).

---

## 3. Ma trận collection ↔ nơi dùng

| Collection | Đọc ở | Ghi ở | Nhánh rules |
|---|---|---|---|
| `transactions` | `watch("transactions")` → `computeHoldings`, `computeCashVND`, `renderLog`, `renderTickerList`, `buildExport` (đối chiếu `daLamTheo`) | `tx-form` submit (`addDoc`) | ✅ |
| `cashflows` | `watch("cashflows")` → `computeCashVND`, `renderLog`, `buildExport` | `cf-form` submit (`addDoc`) | ✅ |
| `tickers` | `watch("tickers")` → `currentPriceFor`, `renderPositions`, `renderPriceInputs`, `buildSignals` | `toggleHold`, `saveTodaySnapshot`, `tx-form` submit | ✅ |
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
- **Nút icon phải có `aria-label`.** Nút bật/tắt trạng thái thêm `aria-pressed`.

---

_Cập nhật lần cuối: 2026-09-10 — thêm 3 tab, 3 collection mới (`watchlist` / `strategies` / `signals`), nhóm hàm tín hiệu + xuất JSON, ngưỡng chuyển sang đọc qua `activeStrategy`._
