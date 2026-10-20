---
name: review-ma
description: Review 360 độ một mã cổ phiếu (hoặc cả kế hoạch phiên sắp tới) TRƯỚC khi owner mua/bán, để chắc lệnh không theo cảm xúc. Kết luận Đồng ý / Chờ / Không + giá đặt + 3 lý do, đối chiếu chiến lược và luật đã chốt của Fin2. Dùng khi owner nói "review FPT", "anh định mua/bán X", "xem giúp mã X", "review kế hoạch tối nay", hoặc /review-ma.
---

Owner (Trung Nghĩa, không lập trình) sắp đặt lệnh và muốn một lượt rà soát độc lập. Việc của em: **đọc hết dữ liệu thay owner, rồi ra một kết luận rõ ràng**. Không phải bày bức tranh để owner tự chọn chi tiết ủng hộ cảm xúc.

Kết luận là **đối chiếu với chiến lược và luật của chính owner**, không phải tư vấn đầu tư có giấy phép. Owner là người quyết định cuối cùng.

## 0. Hai chế độ

- **Một mã**: "review FPT", "anh định mua thêm MWG". Hỏi chiều mua/bán nếu chưa rõ (đang giữ mà không nói gì thì mặc định là chiều kế hoạch có, không có thì hỏi).
- **Kế hoạch tối**: "review kế hoạch", "review trước khi chốt". Review mọi mục của kế hoạch phiên sắp tới. Đây là nhịp chính (owner chốt 20/10/2026).

## 1. Lấy dữ liệu

1. **File xuất của app.** Script tự tìm file `fin2-nhat-ky*.json` mới nhất ở `D:\TCBS` hoặc thư mục Tải về.
   - Kết quả có `ledger.stale: true` (cũ hơn 24 giờ), HOẶC chế độ kế hoạch mà file chưa có `keHoachSapToi` → nhắc owner: *"Anh bấm Xuất dữ liệu cho AI trong Fin2 giúp em"*, rồi mới chạy tiếp. Một mã thì vẫn chạy được với file cũ nhưng phải ghi rõ vị thế có thể đã đổi.
2. **Chạy script** (mất vài giây):
   ```
   node functions/review-ma.js FPT --side buy > "%TEMP%\review-FPT.json"
   node functions/review-ma.js --plan > "%TEMP%\review-plan.json"
   ```
   Đọc toàn bộ JSON. Các khối: `quote` (giá sống VPS) · `ledger` (vị thế, lô, kế hoạch, điểm quyết định, cung cầu, luận điểm, lệnh cũ) · `levels` (mốc T+, mức đỡ/cản 5–20 phiên) · `trend` · `ma` · `box` · `volume` · `foreign` · `orderBookHistory` (dư mua/dư bán 5 phiên) · `opportunity` (điểm Cơ hội + so mã cùng ngành) · `disclosuresHnx` · `hard.rules`.
3. **Tin tức**: tự tìm trên web, 30 ngày gần nhất. Mỗi mã tìm:
   - tin báo tài chính (CafeF, Vietstock, NDH, VnEconomy…);
   - công bố thông tin: báo cáo tài chính quý gần nhất, nghị quyết, cổ tức, giao dịch cổ đông lớn/nội bộ;
   - báo cáo của công ty chứng khoán nếu có bản công khai.

   Gom thành danh sách tin kèm ngày đăng.

## 2. Đọc tin: 3 mức chắc chắn

Owner lưu ý: tin có thể do đội lái tung ra. Xếp **từng tin** vào một mức:

| Mức | Gồm | Cách dùng |
|---|---|---|
| **Đã xảy ra** | Số liệu khớp lệnh, báo cáo tài chính, công bố thông tin chính thức, khối ngoại mua/bán ròng có số | Được tính vào kết luận |
| **Cam kết, có thể huỷ** | *Đăng ký* mua/bán của cổ đông lớn/nội bộ, kế hoạch được Đại hội cổ đông duyệt, chỉ tiêu năm | Tính nhẹ; đăng ký mua ≠ đã mua (nhiều đợt đăng ký xong không mua) |
| **Ý định / tin đồn** | Các chữ "muốn", "dự kiến", "có thể", "kỳ vọng", "nguồn tin cho biết", "quỹ ngoại quan tâm", "sắp", "lọt rổ" chưa công bố | **Không cộng điểm.** Chỉ nêu tên |

**Đối chiếu thời điểm tin ra với giá:**
- Tin tốt + giá ở đỉnh hộp (`box.active.positionPct` ≥ 75) hoặc ngay sau phiên khối lượng đột biến tăng mạnh → gắn cờ **"nghi tin đẩy giá để xả hàng"**.
- Tin xấu + giá ở đáy hộp + khối lượng đột biến nhưng giá không thủng đáy → gắn cờ **"nghi tin ép giá để gom hàng"**.
- Giá mục tiêu của công ty chứng khoán thường là 12 tháng → chỉ dùng làm bối cảnh, không dùng cho khung lướt.

## 3. Phân tích theo thứ tự cố định

Khung chính là **ngắn hạn (vài phiên–vài tuần)**. Dài hạn 3–12 tháng chỉ để biết mã đang ở đỉnh hay đáy chu kỳ.

1. **Luật cứng** (`hard.rules`): vi phạm điều nào là **Không**, khỏi bàn thêm.
   - Không bao giờ bán lỗ: giá bán ≥ giá vốn TB +1%.
   - Mã đang giữ chỉ mua thêm ≤ giá vốn −1% (trừ máy MA).
   - Hàng chưa về thì không mua thêm.
   - VN-Index yếu → dừng mua T+.
   - Tiền mặt sau lệnh ≥ mức tối thiểu.
   - Mã gắn Giữ thì không bán.
   - Trong phiên 9:00–15:00 không ra khuyến nghị mới: vẫn review được nhưng kết luận dành cho kế hoạch phiên sau.
2. **Thị trường chung** (`market.vnIndex`): VN-Index trên/dưới MA20, MA50, MA20 đi lên hay xuống. Review 16/10 cho thấy mua T+ khi VN-Index yếu thì 1 thắng / 16 thua.
3. **Xu hướng mã** (`trend`, `ma`):
   - Giá so với MA10/20/50/200, độ dốc của MA20/MA50.
   - So với VN-Index 20/60 phiên.
   - Khoảng cách tới đỉnh/đáy 1 năm.
   - Kết luận một câu: *tăng ngắn / giảm ngắn / đi ngang*, trên nền *tăng dài / giảm dài*.
4. **Hộp giá 1–3 tháng** (`box`):
   - `active`: hộp đang chạy (đáy, đỉnh, bề rộng, vị trí giá trong hộp %).
   - `rhythm`: nhịp đáy↔đỉnh mất bao nhiêu phiên.
   - `history1y`: trong 1 năm, mỗi lần chạm đáy thì bao nhiêu lần bật lên / thủng / lình xình (đỉnh tương tự).
   - Nói bằng số mẫu: *"1 năm qua chạm đáy hộp 14 lần: 4 lần bật, 8 lần thủng"*. **Không nói "đội lái sẽ…"**. Không có hộp (`active: null`) thì nói rõ mã đang đi theo kênh hoặc không có cấu trúc.
5. **Khối lượng & dòng tiền** (`volume`, `foreign`, `orderBookHistory`, `ledger.orderflow`):
   - Khối lượng hôm nay so với trung bình 20 phiên.
   - Tỷ lệ khối lượng phiên tăng/phiên giảm (`upDownRatio20` < 0,7 = bên bán áp đảo).
   - Phiên khối lượng đột biến nằm ở đâu trong hộp và 5 phiên sau giá đi thế nào. Đột biến gần đỉnh rồi giá giảm = dấu hiệu phân phối; gần đáy mà không thủng = dấu hiệu gom.
   - Khối ngoại 5 và 20 phiên.
   - Dư mua/dư bán 5 phiên.
   - Nhận xét cung cầu của máy (nếu có).
6. **Tin tức**: theo mục 2.
7. **Điểm của bot** (`ledger.decision`, `opportunity`): chỉ là tham khảo, Điểm quyết định đang chạy bóng. Nêu `riskFlags` nếu có.

## 4. Chống tự hợp thức hoá cảm xúc

- Viết **phản biện mạnh nhất** chống lại lệnh owner định đặt. Luôn có, kể cả khi kết luận Đồng ý.
- Đếm yếu tố ủng hộ / chống. Không được bỏ yếu tố chống chỉ vì đã có nhiều yếu tố ủng hộ.
- Lệnh **không có trong kế hoạch** (`ledger.plan.items` rỗng) là lệnh tự phát: kết luận tốt nhất chỉ là *"Đồng ý đưa vào kế hoạch phiên sau / thêm watchlist giá X"*, không bao giờ là "đặt ngay".
- Owner hối ("mua nhanh kẻo lỡ", "đang tăng mạnh") → nhắc số liệu review 16/10: lệnh tự phát lỗ −5,9%, mua lúc giá xanh tốn nhất.

## 5. Ra kết luận

- **Không**:
  - vi phạm luật cứng; hoặc
  - chiều mua, xu hướng giảm cả ngắn lẫn trung hạn (giá < MA20 < MA50, MA20 đi xuống) mà giá không nằm ở đáy một hộp có tỷ lệ bật ≥ 50%; hoặc
  - có cờ nghi xả hàng (mua) / nghi gom hàng (bán); hoặc
  - tin xấu loại "đã xảy ra" chưa được giá phản ánh.
- **Chờ**: không có lý do Không, nhưng giá chưa tới mốc, VN-Index yếu, lực bán/cầu còn mạnh, hoặc hộp cho thấy còn khoảng tốt hơn. **Bắt buộc ghi rõ chờ tới giá nào / điều kiện gì.**
- **Đồng ý**: giá đã ở mốc, xu hướng không ngược, không có cờ đỏ.

**Giá đặt:**
- Gốc là mốc T+ / giá kỳ vọng / mốc MA (`levels.tplus`, `ledger.plan.items[].giaDat`).
- Được tinh chỉnh **trong khoảng 3% quanh mốc** theo đáy/đỉnh hộp, mức đỡ/cản `levels.sessionLevels`, mức giá có khối lượng lớn.
- **Không bao giờ kém mốc**: mua không cao hơn, bán không thấp hơn.
- Tôn trọng giá vốn ±1%.
- Làm tròn bước giá HOSE: dưới 10 → 0,01; 10–49,95 → 0,05; từ 50 → 0,1.
- Nằm ngoài biên độ ±7% so với giá tham chiếu thì ghi "chưa vào phiên sau".

**Chiều bán** dùng luật bán/gồng `sell-v1.0.0` của app: số dấu hiệu giữ (MA, VN-Index, khối ngoại, cầu) quyết định bán hết / 1/2 / 1/3 / gồng. Review chỉ nhận xét luật đó có hợp lý với bức tranh hiện tại không, không tự đổi tỷ lệ.

## 6. Trình bày (tiếng Việt, lời thường, không thuật ngữ khó)

**Một mã:**
```
## FPT · Mua thêm · CHỜ
Giá đặt: 55,9 (chờ về đáy hộp 3 tháng) · mốc T+ 59,9
Lý do:
1. …
2. …
3. …
Phản biện: …
Cờ: nghi tin đẩy giá… (nếu có)
```
Sau đó là mục **Chi tiết**, mỗi yếu tố 1–2 dòng có số: thị trường · xu hướng · hộp giá · khối lượng · khối ngoại · cung cầu · tin (theo 3 mức, kèm ngày + nguồn) · điểm bot.

**Kế hoạch tối:**
- Một bảng: Mã · Lệnh (máy, số lượng, giá kế hoạch) · Kết luận · Giá review · Lý do chính.
- Chi tiết chỉ viết cho mục Chờ/Không.
- Cuối bảng nhắc: *đang chạy bóng 20 phiên, lệnh vẫn theo kế hoạch; anh bấm Chốt như bình thường*. Owner tự ý bỏ mục thì ghi nhận, không cản.

## 7. Lưu bản review

Mỗi kết luận ghi một file `D:\TCBS\reviews\{ngày phiên}_{MÃ}_{buy|sell}.json`. Thư mục này gitignore, là dữ liệu cá nhân. Giai đoạn 2 app sẽ có nút "Nhập review". Review lại cùng mã, cùng chiều, cùng ngày thì **ghi đè**.

```json
{ "version": "review-v1.0.0", "date": "2026-10-21", "createdAt": "ISO", "ticker": "FPT", "side": "buy",
  "source": "plan|adhoc", "engine": "tplus|ma|null", "planPrice": 59.9,
  "verdict": "agree|wait|no", "price": 55.9, "waitFor": "chờ về 55,9 hoặc đóng cửa trên MA10",
  "reasons": ["…", "…", "…"], "counter": "…", "flags": ["pump-suspect"],
  "news": { "done": 2, "commit": 1, "rumor": 3 },
  "inputs": { "close": 57.1, "avgCost": 64.41, "buyAt": 59.9, "sellAt": 67.41, "boxFloor": 56.5, "boxTop": 67.5,
    "boxPositionPct": 5, "maStreak": 0, "foreignNet20Bn": -561.7, "vnIndexWeak": true } }
```
- `date` = ngày phiên mà lệnh sẽ đặt (kế hoạch: `keHoachSapToi.ngay`).
- `flags` dùng: `pump-suspect` (nghi xả) · `dump-suspect` (nghi gom) · `off-plan` (lệnh tự phát) · `stale-ledger` (file xuất cũ) · `in-session`.
- Giá nghìn đồng, tiền tỷ đồng như script.

Xong thì báo owner một dòng: đã lưu bao nhiêu bản review.
