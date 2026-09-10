# Fin2 — Chiến thuật giao dịch cổ phiếu & Trang theo dõi danh mục
 
Tài liệu này backup context để tiếp tục làm việc trên Claude Code (không có ký ức của phiên chat này). Viết ngày 2026-09-10.
 
## 1. Chiến thuật giao dịch đã chốt
 
Quy tắc (đơn giản hóa có chủ đích, Trung Nghĩa đã chấp nhận các đánh đổi bên dưới):
 
- Chỉ mua mã lớn, trụ cột ngành.
- Mua trong tầm giá 40–70 (nghìn đồng/CP).
- Giá giảm 2 điểm so với giá vốn trung bình hiện tại → mua thêm 100 CP/phiên.
- Giá tăng 3 điểm so với giá vốn trung bình hiện tại → bán ra 100 CP/phiên.
- Mã có trend đứng, thông tin rõ ràng → đánh dấu "giữ", không áp dụng quy tắc bán dù đã đạt +3 điểm.
- Đơn vị "điểm" = giá tuyệt đối (nghìn đồng), không phải %. Đã biết đánh đổi: cùng 2–3 điểm nhưng % khác nhau giữa mã giá 40 và mã giá 70 (ví dụ 2 điểm ở giá 40 ≈ 5%, ở giá 70 ≈ 2.9%). Nghĩa chấp nhận vì ưu tiên đơn giản khi tính toán.
- Broker: TCBS — miễn phí môi giới (commission), nhưng vẫn còn thuế TNCN 0.1% trên giá trị bán (thuế nhà nước, không broker nào miễn được). Không đáng kể so với biên lợi nhuận mục tiêu.
### Rủi ro đã chỉ ra, Nghĩa ghi nhận nhưng CHƯA đưa ngưỡng chặn cụ thể vào hệ thống
- Không có giới hạn số lần mua thêm / % vốn tối đa cho một mã → rủi ro dồn vốn nếu một mã "trụ cột" rơi vào khủng hoảng riêng (dẫn chứng: VIC giảm -43.4% năm 2022, tổng -69.3% từ đỉnh 4/2021 đến đáy 2024, không cần thị trường sập toàn diện — nguyên nhân riêng của doanh nghiệp/ngành).
- "Giữ — không bán" là quyết định thủ công, không có tiêu chí đo lường (điểm mù hành vi, dễ thành nơi né tránh cắt lỗ).
- Chưa có stop-loss cứng cho trường hợp thesis sai (khủng hoảng riêng của mã).
- Nếu muốn xử lý: thêm 1) số lần mua thêm tối đa/mã, 2) % lỗ tối đa cứng để cắt, 3) tiêu chí số hóa cho "trend đứng, thông tin rõ ràng" thay vì cảm tính.
## 2. Trang theo dõi danh mục — đã build & publish
 
- **Link (artifact đã publish, private, đồng bộ đa thiết bị):** https://claude.ai/code/artifact/e30e189a-1287-41cc-8f3a-e2c822e1cf6e
- **Title:** Nhật Ký Danh Mục
- **File nguồn HTML:** đã gửi qua chat (`portfolio-tracker.html`) và lưu kèm trong project này tại `claude/portfolio-tracker.html`.
- **Runtime:** Claude Artifact platform, dùng capability `db` (contract 0.2.44) — một document store JSON riêng cho artifact này, đồng bộ realtime giữa mọi thiết bị mở cùng link. Khai báo `capabilities: {db: {}}`, không có `rules` tuỳ biến (mặc định: mọi viewer đọc/ghi chung).
- **Quan trọng:** `window.claude.use("db")` CHỈ hoạt động khi trang được mở qua link artifact đã publish. Nếu mở file `.html` trực tiếp trên máy (double-click / file://), phần lưu dữ liệu sẽ không chạy — trang sẽ hiển thị "Không thể đồng bộ trên thiết bị này". File nguồn chỉ có giá trị làm bản backup mã nguồn hoặc để tự host lại với backend riêng.
### Data model (collections trong `db`)
 
```
transactions/{autoId}     { ticker, side: "buy"|"sell", qty, price (nghìn đ), date "YYYY-MM-DD", note, createdAt (ISO) }
cashflows/{autoId}        { type: "deposit"|"withdraw", amount (VND, số nguyên), date "YYYY-MM-DD", note, createdAt (ISO) }
tickers/{TICKER}          { lastPrice (nghìn đ), lastPriceDate "YYYY-MM-DD", hold (bool, optional), updatedAt (ISO) }
daily_snapshots/{YYYY-MM-DD} { date, cash (VND), investedCost (VND), marketValue (VND), totalAssets (VND), prices: {TICKER: giá}, createdAt, updatedAt }
```
 
### Công thức tính (client-side, trong file HTML — hàm `computeHoldings`, `computeCashVND`, `computeSummary`)
 
- Giá vốn trung bình (weighted average): khi mua, `avgCost_mới = (qty_cũ*avgCost_cũ + qty_mua*giá_mua) / (qty_cũ+qty_mua)`; khi bán, avgCost giữ nguyên, chỉ trừ qty và cộng dồn `realizedPnl`.
- Tiền mặt = Σ nạp − Σ rút − Σ giá_trị_mua + Σ giá_trị_bán (giá_trị = qty × giá(nghìn) × 1000).
- Giá trị đầu tư theo giá vốn = Σ qty_đang_giữ × avgCost × 1000.
- Giá trị đầu tư theo giá thị trường = Σ qty_đang_giữ × giá_TT_gần_nhất (từ `tickers.lastPrice`) × 1000.
- Tổng tài sản = tiền mặt + giá trị theo giá thị trường.
- Lãi/lỗ tạm tính = giá trị theo TT − giá trị theo giá vốn.
- Giá đặt mua thêm đề xuất = avgCost − 2. Giá đặt bán đề xuất = avgCost + 3 (ẩn đi, thay bằng badge "Giữ — không bán" nếu `tickers.{TICKER}.hold === true`).
### Các quyết định đã phỏng vấn & chốt khi thiết kế
1. Nguồn vốn: **có nạp/rút theo thời gian** (không cố định 1 lần) → cần `cashflows` riêng, không phải 1 con số tĩnh.
2. Giá thị trường: **nhập tay mỗi ngày** để tính lãi/lỗ tạm tính (không có live price feed/API).
3. Thiết bị: **nhiều thiết bị, cần đồng bộ** → bắt buộc dùng `db` capability (không dùng localStorage vì không share giữa thiết bị).
4. Nhật ký: **ghi mỗi ngày, kể cả không giao dịch** → `daily_snapshots` là 1 doc/ngày, ghi qua nút "Lưu nhật ký hôm nay" (không tự động, để tránh ghi dữ liệu rác khi chưa xác nhận giá).
### Trạng thái dữ liệu hiện tại (đã seed thủ công từ ảnh chụp app chứng khoán, ngày 2026-09-10)
 
| Mã | SL | Giá vốn TB | Giá TT lúc seed |
|---|---|---|---|
| FPT | 100 | 72.62 | 74.50 |
| TCX | 800 | 40.18 | 39.60 |
| VCB | 400 | 58.97 | 59.00 |
| VTP | 200 | 52.27 | 50.80 |
 
Tiền mặt sau seed: 76,558,231đ. Giá trị vốn (đầu tư theo giá vốn, tự tính từ 4 mã trên): 73,448,000đ (số trên app gốc là 73,442,200đ — lệch ~5,800đ do làm tròn hiển thị 2 chữ số thập phân của app, không đáng kể). Tổng tài sản: 149,448,231đ.
 
Nạp vốn ban đầu (`cashflows/seed-deposit-1`) được tính ngược = tiền mặt mục tiêu + tổng giá trị mua theo giá vốn, để khớp đúng số dư thực tế trên app — không phải số tiền nạp thật sự qua các lần trước đó (lịch sử nạp/rút thật chưa được tái tạo).
 
## 3. Giới hạn đã biết của trang (chưa xử lý)
 
- Không validate khi bán nhiều hơn số đang giữ (không chặn nhập sai, tin tưởng hoàn toàn vào dữ liệu người dùng gõ).
- Không có xác thực/phân quyền — bất kỳ ai có link đều đọc/ghi được (artifact ở chế độ private mặc định, chỉ Nghĩa có link).
- Giá thị trường phải nhập tay mỗi ngày, không có nguồn dữ liệu tự động.
- Chưa có ngưỡng chặn "mua thêm không giới hạn" theo rủi ro đã nêu ở mục 1 — nếu muốn, cần thêm field và logic mới (ví dụ số lần mua thêm tối đa/mã, % vốn tối đa/mã).
## 4. Việc có thể làm tiếp trên Claude Code
 
- Thêm validate oversell / cảnh báo khi SL bán > SL đang giữ.
- Thêm ngưỡng chặn mua thêm (số lần tối đa hoặc % vốn tối đa/mã) theo rủi ro đã ghi nhận ở mục 1.
- Số hóa tiêu chí "giữ — không bán" thay vì toggle thủ công cảm tính.
- Có thể cân nhắc thêm cột "lãi đã chốt" (realized PnL) — hiện chưa hiển thị dù đã tính trong `computeHoldings` (`h.realizedPnl`), chỉ chưa đưa ra UI.
- Nếu cần chỉnh sửa trang: sửa file `portfolio-tracker.html`, publish lại qua Artifact tool với cùng `url` để giữ nguyên link và dữ liệu đã lưu trong `db`.