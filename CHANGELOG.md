# CHANGELOG — Fin2

Ngày mới nhất trên đầu.

---

## 2026-10-20 (Review 360 độ trước mỗi lệnh — giai đoạn 1)

Owner phỏng vấn + chốt 20/10/2026: trước mỗi lệnh có một lượt rà soát độc lập để chắc không mua/bán theo cảm xúc. Giai đoạn 1 chỉ ở máy, chưa ghi Fin2.
- **Skill `review-ma`** (`.claude/skills/review-ma/`): review một mã, hoặc cả kế hoạch phiên sắp tới vào buổi tối trước khi Chốt. Kết luận
  Đồng ý / Chờ / Không + giá đặt + 3 lý do + phản biện. Luật cứng của owner đứng trước (không bán lỗ, cửa lọc mua, trong phiên không khuyến nghị mới);
  lệnh ngoài kế hoạch tốt nhất chỉ được "đưa vào kế hoạch phiên sau". Tin tức xếp 3 mức (đã xảy ra / cam kết có thể huỷ / ý định–tin đồn
  không cộng điểm), đối chiếu thời điểm tin với vị trí giá → cờ nghi xả hàng / nghi gom hàng. Chạy bóng 20 phiên: lệnh vẫn theo kế hoạch.
- **Script `functions/review-ma.js`**: gom dữ liệu 360 độ của mã (giá sống VPS, xu hướng MA10–200, so VN-Index, khối lượng đột biến, khối ngoại
  20 phiên, dư mua/dư bán 5 phiên, điểm Cơ hội + mã cùng ngành, công bố HNX) + vị thế/kế hoạch từ file xuất. Dùng lại hàm của bot, không chép phần đọc datafeed.
  Mới: **hộp giá 1–3 tháng** (đáy/đỉnh, nhịp đáy↔đỉnh, đếm 1 năm mỗi lần chạm đáy bao nhiêu lần bật / thủng) — chỉ để tinh chỉnh giá trong 3% quanh mốc, không ra lệnh.
- **Xuất dữ liệu thêm `keHoachSapToi`** (kế hoạch phiên sắp tới, nháp hoặc đã chốt) để review được trước khi Chốt.
- Bản review lưu ở `reviews/` trên máy (gitignore). Giai đoạn 2: nút "Nhập review" + chip trên mục kế hoạch + đo độ đúng.

· `functions/review-ma.js` · `.claude/skills/review-ma/SKILL.md` · `public/index.html` · `.gitignore` · `CHANGELOG.md` · `CLAUDE.md` · `CODEMAP.md`

## 2026-10-19 (Khuyến nghị bán / gồng — sell-v1.0.0)

Owner phỏng vấn + chốt 19/10/2026: chống bán non và bán cảm xúc, cùng tinh thần kế hoạch chốt trước phiên. Chỉ sửa app, bot không đổi.
- **Tới mốc bán T+ thì bán theo số dấu hiệu giữ.** MA10 bắt buộc (đóng cửa trên MA, MA đi lên) + 3 xác nhận: VN-Index không yếu ·
  khối ngoại mua ròng 5 phiên · cầu còn mạnh cuối phiên trước. Không MA hoặc MA+0 → bán hết · MA+1 → bán 1/2 · MA+2 → bán 1/3 ·
  đủ 4/4 → gồng hết. Làm tròn theo lô 100; mã không chia được thì gồng cả. Trước đây bán cố định 100 CP.
- **Phần gồng** thoát khi đóng cửa dưới MA10 (kế hoạch hôm sau bán hết tại giá tham chiếu) hoặc chạm **sàn = mốc T+ lúc bán đợt đầu**
  (dòng "Lệnh điều kiện" để owner đặt bên TCBS). Sàn giữ nguyên dù mua thêm theo MA. Mã đang gồng có nhãn "Gồng" ở bảng mã.
- **Lãi mỏng** (giá vốn +1% → mốc T+): chỉ bán khi đóng cửa dưới MA10 hoặc VN-Index yếu, bán hết tại giá tham chiếu.
- Dòng bán ở Khuyến nghị ghi rõ phần bán / phần gồng / sàn + "Giữ x/4" từng dấu hiệu. Luật không bán lỗ vẫn là lớp chặn cuối.
- Mục bán của kế hoạch lưu thêm `mode`, `keepQty`, `floor`, `holdCount`, `holdSignals`, `rideSince`, `why`, `sellVersion` để đo gồng có đáng không;
  xuất dữ liệu thêm `cheDoBan`, `dauHieuGiu`, `giuLai`, `san`, `gongTu`. Tự chốt kế hoạch chờ thêm dữ liệu cung cầu.
- Chưa đổi: log `signals` lúc Lưu nhật ký và nhãn "Bán 100 CP" ở tầng mở bảng mã vẫn theo luật cũ.

· `public/index.html` · `CHANGELOG.md` · `CLAUDE.md` · `CODEMAP.md`

## 2026-10-16b (Kỷ luật: kế hoạch chốt trước phiên)

Review 10/09–16/10/2026 (owner nhờ): lệnh tự phát lỗ −5,9% so với −2,2% khi theo tín hiệu; 26/45 lệnh mua đặt lúc giá cao hơn
phiên trước (5 phiên sau −2,1%, 4/22 lệnh có lãi); khi VN-Index yếu, các lần mua T+ được 1 thắng / 16 thua; 10 phiên bản chiến lược trong 31 ngày. Owner chốt
làm cả 6 đề xuất:
- **Khuyến nghị thành Kế hoạch ngày** (`plans/{ngày}`, collection mới + nhánh rules). Ngoài phiên: bản nháp cho phiên kế tiếp
  (mỗi mục là lệnh giới hạn đặt sẵn: bán/mua thêm tại mốc T+, mã theo dõi tại giá kỳ vọng, vùng MA tại giá tham chiếu; mốc đã
  vượt thì đặt ở giá tham chiếu, mốc ngoài biên độ 7% thì chưa vào kế hoạch) + nút **Chốt kế hoạch** (chốt lại được tới 9:00).
  Trong phiên chỉ còn kế hoạch đã chốt, không ra khuyến nghị mới; chưa chốt thì app tự chốt bản nháp. Nút Đặt điền giá + ngày kế hoạch.
- **Cửa lọc lệnh MUA:** VN-Index yếu → dừng mua T+ (kể cả mã theo dõi), mua theo MA vẫn được · tối đa **3 lệnh mua/ngày**
  (ô mới ở tab Chiến lược, theo phiên bản `maxBuys`) xếp theo vùng MA rồi Điểm mua · **tiền mặt sau lệnh dưới mức tối thiểu** thì
  không mua (thay quyết định cũ "không có ngưỡng chặn mua thêm"). Mục bị lọc vẫn lưu trong kế hoạch kèm lý do để đo về sau.
- **Chế độ trong phiên (9:00–15:00):** bảng mã bỏ mũi tên/% trong ngày, ẩn cung cầu, biểu đồ bỏ nến hôm nay. Nút lấy giá hỏi
  "Vẫn xem?" — đồng ý thì mở 15 phút trên máy đó và **đếm** vào `plans.peeks`. Bot cung cầu vẫn chạy để đo.
- **Lệnh ngoài kế hoạch:** form Giao dịch báo ngay "Ngoài kế hoạch" / "Mua cao hơn giá tham chiếu" (không chặn); Nhật ký ghi
  "· ngoài kế hoạch", "· giá xanh". Lệnh mới chép `refPrice` (giá tham chiếu hôm đó). Trước ngày có kế hoạch đầu tiên: theo tín hiệu cùng ngày.
- **Báo cáo Kỷ luật** đầu tab Phân tích (7/30 ngày): % lệnh theo kế hoạch, lãi/lỗ theo lô của lệnh mua theo/ngoài kế hoạch, mua
  lúc giá xanh, số lần xem giá trong phiên, số kế hoạch chốt tay/tự chốt.
- **Giãn nhịp đổi chiến lược:** phiên bản mới hiệu lực sớm nhất từ phiên chưa mở và cách bản mới nhất ≥ 5 phiên.
- Xuất dữ liệu thêm `keHoach` + cờ `theoKeHoach`/`muaLucGiaXanh` ở giao dịch. Server chỉ thêm khoá `maxBuys` vào bản sao chiến lược.

· `public/index.html` · `firestore.rules` · `functions/decision-service.js` · `CHANGELOG.md` · `CLAUDE.md` · `CODEMAP.md`

## 2026-10-16 (Khuyến nghị gọn hơn + phân tích lời thường)

Owner thấy danh sách Khuyến nghị dài và phần phân tích khó hiểu. Chốt:
- **Khuyến nghị bỏ các mục mua còn chờ:** cung cầu "Chờ giá thấp hơn" và nhóm "Chờ bật lên" (vùng MA) không còn hiện. Tín hiệu vẫn
  ghi log `signals` như cũ; bảng mã vẫn báo (dòng cung cầu, nhãn "MA10 chờ"). Trong ngày chuyển sang "Mua ngay" thì tự hiện lại.
  Chiều bán "Giữ thêm" giữ nguyên.
- **Điểm quyết định** (Chi tiết mã + tab Phân tích): thêm **Tóm lại** ở đầu — kết luận Mua/Bán bằng lời, điểm cộng, điểm trừ, lý do
  nên chốt lời (chỉ khi áp lực bán ≥ 6). Bảng thành phần gập vào "Xem số liệu".
- **Điểm Cơ hội** (nút Chấm cơ hội): thêm kết luận + điểm cộng/điểm trừ lời thường; so cùng ngành còn một câu "1 tháng qua tăng
  tốt hơn/kém hơn". Bảng điểm và bảng so sánh gập vào "Xem số liệu".
- Không đổi công thức, điểm hay ngưỡng nào — chỉ đổi cách hiển thị.

· `public/index.html` · `CHANGELOG.md` · `CLAUDE.md`

## 2026-10-14b (Bảng mã: cột STT trước mã)

- Bảng nắm giữ và bảng theo dõi có **số thứ tự** trước mã, đếm theo đúng thứ tự đang hiện (sau sắp xếp/kéo thả, liền mạch qua
  các nhóm ngành; nhóm đang gập không đếm).
- Sửa kèm: trên điện thoại ô mã bị tràn sang cột số lượng khi có cả nút lô và nhãn MA10↑ — nay nhãn MA tự xuống dòng khi thiếu chỗ.

· `public/index.html` · `CHANGELOG.md`

## 2026-10-14 (Quản lý cổ phiếu theo lô)

Owner muốn thấy một mã đang lỗ vẫn có lô lãi, để biết bán lô nào, bao nhiêu. Phỏng vấn + chốt bước 1 (chỉ xem và tính lãi/lỗ):
- **Mỗi lệnh mua là một lô**, mã lô `FPT-L1-1203` (mã · thứ tự mua · ngày). Cổ tức cổ phiếu là lô riêng, nhãn "Cổ tức".
- **Bảng nắm giữ:** nút **mũi tên + số lô** đặt ngay trước mã (không cần mở dòng; owner chốt đưa ra ngoài) xổ các lô còn giữ thành hàng dưới dòng mã: số CP còn/gốc, giá mua, lãi/lỗ (K) + %, nhãn "Chờ về" khi chưa về T+2.
  **Chi tiết mã** có mục Lô (cả lô đã bán hết, hiện lãi đã chốt) và dòng lệnh bán ghi lô đã bán.
- **Khi bán, owner tự chọn lô** (không điền sẵn): form Giao dịch và popup Khớp lệnh bán hiện từng lô (ngày, giá, còn bao nhiêu,
  lãi/lỗ % nếu bán ở giá đang nhập), nhập số CP từng lô, chưa đủ số CP thì không lưu; lô chưa về thì khoá. Lệnh bán đặt từ form
  có chọn lô thì popup Khớp điền sẵn lô đó. Lệnh bán ghi thêm `lots [{ id, qty }]`.
- **Lệnh bán cũ / Đồng bộ TCBS** (chưa có lô): app tự trừ lô mua trước. Nhật ký có nút **Chọn lô** (đang tự gán) / **Lô** trên
  từng lệnh bán để sửa.
- **Lãi/lỗ đã chốt + đang treo tính theo lô** (Tổng quan, bảng mã, nhóm ngành, Đã chốt theo mã, Dự kiến bán, Hiệu quả tín hiệu,
  file xuất cho AI có `cacLo`/`giaVonTheoLo`/`tuGanLo`). Bán hết một mã thì tổng lãi/lỗ không đổi so với cách bình quân.
  Nhật ký ngày lưu từ nay ghi `investedCost` theo lô; ngày cũ giữ số cũ.
- **Không đổi:** cột Giá vốn, mốc Mua/Bán, tín hiệu T+ / cung cầu / MA, luật không bán lỗ, bot server, đối chiếu TCBS — vẫn theo giá
  vốn bình quân như TCBS. Không collection mới, không đổi rules.

· `public/index.html` · `CLAUDE.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-13c (Vùng mua MA: giá đang giảm về MA thì Chờ bật lên)

Owner thấy MWG đang giảm 4 phiên về sát MA10 (76,9 → 74,8, cách MA +0,7%) mà app vẫn khuyên mua. Gốc: luật chỉ xét "giá trên MA"
+ "MA đi lên", không xét đà của chính giá — MA10 chậm nên vẫn đi lên khi giá đã quay đầu. Owner chọn "Chờ bật lên":
- Trong vùng mua MA + **phiên cuối đóng cửa TĂNG** → khuyến nghị Mua · theo MA (như cũ).
- Trong vùng mua MA + phiên cuối giảm/đứng → nhóm mới **"Chờ bật lên"** trong Khuyến nghị (giá · giảm N phiên liền + dòng chi tiết),
  không nút Đặt, không ghi `signals`. Bảng mã: nhãn vàng "MA10 chờ". Chip "Ưu tiên" trên dòng T+ cũng chỉ khi phiên cuối tăng.
- Telegram thêm dòng "Bật lên lại, mua được" (đang chờ → hôm nay tăng); mã mới vào vùng mà phiên cuối giảm ghi kèm "(chờ bật lên)".
- Bot: `maStreak` thêm `up`/`prevUp`/`down`; tín hiệu chép `maUp`. Dữ liệu bot cũ thiếu `up` → không hiện nhãn tới lượt chạy sau.

· `functions/decision-service.js` · `functions/index.js` · `functions/smoke.js` · `public/index.html` · `CLAUDE.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-13b (Vùng mua MA: tự ra khuyến nghị mua · dòng chi tiết Khuyến nghị mới)

Owner review bản sáng nay: luật "đang trên MA10 ≥5 phiên" chưa đúng ý. Owner chốt lại:
- **Vùng mua MA** = giá cắt lên MA10, đóng cửa trên MA10 **từ 5 tới 15 phiên** liền, và **đường MA10 đi lên** ≥5 phiên gần nhất.
  Trên MA quá 15 phiên → bỏ qua (khó lướt). Ba số 10 · 5 · 15 chỉnh ở tab Chiến lược (thêm ô "Trên MA tối đa").
- **Tự ra khuyến nghị "Mua · theo MA10"** (tín hiệu `trend`, id `ngày_MÃ_trend`, engine `ma`) dù chưa tới mốc T+: mã đang có kể cả
  giá trên giá vốn (dòng ghi "Giá vốn X → Y"), mã theo dõi không cần chạm giá kỳ vọng. Nút Đặt điền giá hiện tại, không kèm cung cầu.
  Mã đã có tín hiệu mua T+ hôm nay → chỉ một dòng T+ kèm chip "Ưu tiên · MA10↑". Chờ hàng T+2 → không ra.
- **Mỗi đợt chỉ khuyến nghị tới khi mua:** đã khớp mua hoặc còn lệnh mua chờ của mã từ ngày bắt đầu đợt → thôi, đợt sau mới ra lại.
- **Dòng chi tiết Khuyến nghị:** bỏ "Sau lệnh x% tiền mặt" (bỏ hẳn, kể cả cảnh báo). Thay bằng: điểm Mua/Bán x/10 · phiên n/15 trên MA10
  (cách MA bao nhiêu %) · khối ngoại mua/bán ròng n/5 phiên · mạnh/yếu hơn VN-Index 20 phiên; chiều mua thêm dòng đỏ cảnh báo rủi ro.
- Nhãn "MA10↑" ở bảng mã chỉ hiện khi mã đang trong vùng mua. Telegram báo: mới vào vùng / rơi dưới MA / quá 15 phiên / MA hết đi lên.
- Tab Phân tích: so "Mua theo MA" với "Mua T+" (thay "có/không có MA↑"). Xuất dữ liệu: `may: "MA"`, `xuHuongMA`.
- Bot: `maStreak` thêm `rise`/`prevRise` (số phiên MA đi lên) + `since` (ngày bắt đầu đợt); `maInZone()` dùng chung bot/Telegram.

· `functions/decision-service.js` · `functions/index.js` · `functions/smoke.js` · `public/index.html` · `CLAUDE.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-13 (Ưu tiên mua khi mã nằm trên MA10 từ 5 phiên)

Owner muốn ưu tiên mua mã (đang có + theo dõi) đã đóng cửa trên MA10 nhiều phiên liền. Owner chốt qua phỏng vấn:
- **Điều kiện:** giá ĐÓNG CỬA nằm trên MA từ N phiên liền trở lên (mặc định MA10 · 5 phiên), chỉ tính phiên đã đóng cửa
  → trạng thái đứng yên suốt ngày hôm sau, không nhấp nháy giữa phiên.
- **Ưu tiên = chỉ gắn nhãn + xếp lên đầu**, KHÔNG tự sinh tín hiệu mua: tín hiệu mua T+ (giá vốn −2 / giá kỳ vọng) của mã đủ
  điều kiện có chip "Ưu tiên · MA10↑" và lên đầu nhóm Tín hiệu ở Khuyến nghị. T+ vẫn quyết định KHI NÀO. Rơi xuống dưới MA chỉ mất nhãn.
- **Bảng mã:** nhãn nhỏ "MA10↑" cạnh mã cho mọi mã đủ điều kiện (cả khi chưa tới mốc mua).
- **Telegram** (lượt sau đóng cửa): mục MA chỉ báo THAY ĐỔI — mã mới đủ N phiên hôm nay, mã vừa rơi xuống dưới MA.
- **Chỉnh ở tab Chiến lược** (2 ô mới: đường MA 2–100 phiên, số phiên trên MA 1–30) — lưu như một phiên bản chiến lược có ngày
  hiệu lực, bản cũ thiếu 2 ô này rơi về 10 · 5.
- **Đo song song:** doc `signals` chép `maLength`/`maDays`/`maStreak` lúc Lưu nhật ký; tab Phân tích → Chất lượng tín hiệu
  thêm 2 dòng "Mua có MA↑" / "Mua không có MA↑" (sau 5 · 10 · 20 lần lưu). Xuất dữ liệu thêm `uuTienMA`.
- Bot: `maStreak()` đếm số phiên ở lượt Điểm quyết định, lưu `decision_latest.maTrend` (không đổi điểm → không nâng `scoreVersion`).

· `functions/decision-service.js` · `functions/index.js` · `functions/smoke.js` · `public/index.html` · `CLAUDE.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-12b (Bấm "Mã" để bật/tắt chia ngành)

Owner thấy chia ngành làm sắp theo lãi/lỗ chỉ còn xếp trong từng ngành. Nay chữ **Mã** ở đầu mỗi bảng là nút bật/tắt chia ngành
(màu brand = đang bật), thay cho sắp theo mã. Tắt thì bảng về như trước: sắp theo cột trên toàn bảng, kéo thả tự do.
Mỗi bảng (Nắm giữ / Theo dõi) bật/tắt riêng, nhớ theo máy (`fin2-sector-off`). Lựa chọn "sắp theo mã" đã lưu trước đây bị bỏ.

· `public/index.html` · `CLAUDE.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-12 (Cổ tức cổ phiếu không còn méo biểu đồ · Bảng mã chia theo ngành)

- **Lệnh mua giá 0,1 = nhận cổ tức cổ phiếu** (FPT, TCX…): biểu đồ không vẽ điểm M cho lệnh này và không kéo trục giá xuống
  gần 0 nữa. Nhật ký ghi "Nhận cổ tức 1000 FPT" (tóm tắt ngày: "Cổ tức N"). Số CP và giá vốn vẫn tính như cũ.
- **Bảng Nắm giữ và Theo dõi chia theo nhóm ngành**: dòng tiêu đề ngành có số mã; bảng Nắm giữ thêm tổng giá trị + lãi/lỗ chưa bán
  của ngành, ngành nhiều vốn nhất lên đầu. Bấm tiêu đề để gập/mở (nhớ theo máy). "Khác" luôn cuối.
- Ngành lấy theo rổ ngành sẵn có của bot; mã ngoài rổ (như TCX) vào "Khác" — sửa ở menu ⋯ của dòng → **Đổi ngành**
  (ghi `tickers/{MÃ}.sector`, để trống = quay về rổ mặc định). Sắp theo cột vẫn chạy trong từng ngành; kéo thả chỉ trong cùng ngành.

· `public/index.html` · `CLAUDE.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-09b (orderflow-v2.1.0: Cung cầu có nền ngày trước, không phải chờ 30 phút)

Owner đề xuất đưa dữ liệu các ngày trước vào và quét 5 phút/lần để có nhận xét liên tục. Claude phản biện: giữ nhịp **mỗi phút**
(thưa mẫu thì mù kê/rút lệnh, chống nhảy thành 15'; thời gian chờ do luật 30 phút chứ không do nhịp quét) và **không trộn mẫu
phút qua đêm** (sổ lệnh xoá sau mỗi phiên) — ngày trước chỉ làm nền. Owner chọn phương án C:
- **Sửa lỗi nền 5 phiên đứng yên** (#021): nay làm mới mỗi ngày. Phiên máy đã tự thu đủ mẫu (≥150 phút) dùng dữ liệu tự thu
  (khớp chủ động cả ngày + cân bằng sổ lệnh 3 mức); phiên thiếu dùng dư mua/dư bán Người Quan Sát. Phiên gần hơn nặng hơn.
- **Khung 30 phút nối qua nghỉ trưa**: 13:00 nối tiếp 11:30 → hết cảnh chờ tới 13:30.
- **Nhận xét sơ bộ từ phút thứ 15** (~9:15): điểm trộn giữa hôm nay và nền theo số phút đã có/30 (15 phút ≈ nửa nền);
  lý do ghi "(sơ bộ)", Chi tiết mã ghi "Sơ bộ · N phút hôm nay + nền 5 phiên trước". Đủ 30 phút thì như v2.0.0.
- Đo hiệu quả theo phút giao dịch (nối qua trưa); sự kiện v2.0.0 cũ vẫn tiếp tục được đo 20 phiên; sự kiện mới ghi `provisional`.
- Ghi seed vào `orderflow_daily` không còn gửi `samples: []` (trước đây có thể xoá mẫu tự thu nếu chạy lại).

· `functions/orderflow.js` · `functions/orderflow-service.js` · `functions/smoke.js` · `public/index.html` · `CLAUDE.md` · `CODEMAP.md` · `ISSUES.md` · `CHANGELOG.md`

## 2026-10-09 (Biểu đồ mã: điểm mua/bán hiện đủ, đúng ngày)

Owner thấy điểm M/B trên biểu đồ chỗ có chỗ không. Gốc: app so GIỜ của lệnh (12:00 trưa VN) với giờ nến VPS (07:00 sáng VN)
→ lệnh ngày cuối khung luôn bị loại; lệnh có giá ngoài khung giá đóng cửa cũng bị ẩn.
- Gắn lệnh theo NGÀY vào đúng nến; lệnh sau nến cuối (dữ liệu chưa cập nhật) dồn về nến cuối.
- Khung giá trục dọc tính cả giá các lệnh → không còn lệnh bị ẩn ("giao dịch ngoài khung giá" bỏ).
- Nhiều lệnh cùng ngày cùng chiều gộp một điểm (giá bình quân). Chữ M luôn dưới điểm, B luôn trên.
- Chạm/rê vào ngày có lệnh: tooltip hiện "Mua 200 CP · 45.20".

· `public/index.html` · `CHANGELOG.md`

## 2026-10-08c (Cung cầu: vùng mua/bán bám giá mới nhất)

Owner thấy FPT đã xuống 59,4 mà vùng mua vẫn 59,6–60. Gốc: vùng được bot tính theo giá lúc đó (vùng luôn dưới giá bot thấy),
nhưng app ghép với giá mới hơn lấy từ nút lấy giá mà không kiểm tra lệch — nhất là sau 14:45 / nghỉ trưa khi bot không chạy.
Owner chọn A (chỉ sửa app, không nâng version bot):
- Giá app lấy SAU lượt tính của bot mà đã tốt hơn mức đề xuất (mua: thấp hơn · bán: cao hơn) → giá đề xuất = giá app,
  cắt phần vùng đã bị vượt, kèm "giá hiện đã thấp/cao hơn mức đề xuất". Nút Đặt điền theo giá này.
- Nhận xét cũ quá 5 phút ghi kèm "tính lúc HH:MM".
- Một chỗ duy nhất: `orderflowRefit()` gọi trong `orderflowAdvice` → bảng mã, Khuyến nghị, Chi tiết mã, log `signals` cùng thấy.

· `public/index.html` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-08b (Mã vừa mua: Chờ hàng)

Owner: mã mới mua phải chờ hàng về (T+2) mới bán được nên khuyến nghị mua/bán trong lúc chờ không có ý nghĩa.
- Mã còn lô chưa về tài khoản và chưa có CP nào bán được (theo `sellableAt`: 11:35 ngày làm việc thứ hai, chỉ loại T7/CN) → cột Mua/Bán hiện **Chờ hàng**,
  phần mở rộng hiện "Chờ hàng · về 11:35 dd/mm" thay cảnh báo T+ và dòng cung cầu; Chi tiết mã cũng vậy.
- Mã đó **không ra tín hiệu** mua/bán (Khuyến nghị, log `signals` khi Lưu nhật ký); xuất dữ liệu ghi `trangThaiNguong: "cho-hang"`.
- Còn lô cũ đã về (owner chốt): **vẫn khuyến nghị bán**, tối đa số CP bán được; cột Mua/Bán hiện ngưỡng bán, chiều mua vẫn Chờ hàng.
  Hàng về thì tự trở lại bình thường. Chặn chung qua `awaitingBlocks(mã, chiều)`.

· `public/index.html` · `CLAUDE.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-08 (orderflow-v2.0.0: Cung cầu tinh chỉnh trên mốc T+)

Owner thấy khuyến nghị cung cầu dính sát giá vốn. Gốc: máy lấy giá vốn ±1% làm điểm kích hoạt thay vì mốc T+, và gợi ý giá
ngược chiều (phe bán áp đảo lại gợi ý bán giá cao hơn). Owner chốt 1A · 2A · 3A:
- **Mốc = mốc T+** (giá vốn −2/+3 theo tab Chiến lược; mã watchlist = giá kỳ vọng). Máy cung cầu chỉ nhận xét khi giá đã tới mốc:
  bên mua *Mua ngay* (lực bán đã yếu) hoặc *Chờ giá thấp hơn* (lực bán trong ngày còn mạnh, gợi ý mức đỡ trong 3% dưới mốc);
  bên bán *Bán ngay* (cầu đã yếu) hoặc *Giữ thêm* (cầu còn mạnh, gợi ý mức cản trong 3% trên mốc). Giá "ngay" không kém mốc T+.
- **Khuyến nghị gộp một dòng mỗi mã**: dòng T+ kèm nhãn cung cầu; nút Đặt điền sẵn giá cung cầu (chờ/giữ → giá tốt hơn).
  Bỏ nhóm "Cung cầu" riêng — hết rủi ro bấm Đặt hai lần cùng mã. `signals` T+ chép thêm `flowVerdict`/`flowPrice`/`flowZone*`/`flowReason`/`orderflowVersion`.
- Giữ sàn an toàn: không bán dưới giá vốn +1%, mua thêm ≤ giá vốn −1%. Đổi nhận xét phải lặp 3 phút liên tiếp.
- Sự kiện đo hiệu quả có 4 loại: Mua ngay / Bán ngay (đo 15/30/60' + 20 phiên), Chờ / Giữ thêm (đo giá tốt hơn có tới trong 30').
- Công thức mốc T+ phía server gom về `tplusLevels()` (`decision-service.js`), dùng chung cho Điểm quyết định và cung cầu.

· `functions/orderflow.js` · `functions/orderflow-service.js` · `functions/decision-service.js` · `functions/smoke.js` · `public/index.html` · `CLAUDE.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-07f (Chạy song song T+ và Cung cầu)

Owner thấy thay hẳn T+ bằng cung cầu chưa đọc được giá trị — giữ lại cả hai.
- **T+ trở lại y như trước**: ngưỡng −2/+3 ở cột Mua/Bán và cảnh báo "Sắp mua/bán" trên bảng mã, ô sửa ngưỡng ở tab Chiến lược,
  ngưỡng trong Chi tiết mã và trên biểu đồ, tín hiệu T+ + giá kỳ vọng watchlist, xuất dữ liệu ngưỡng.
- **Cung cầu chạy song song**: dòng trạng thái ở phần mở rộng của bảng mã + mục Cung cầu trong Chi tiết mã.
- Khuyến nghị chia 3 nhóm **T+ · Cung cầu · Đã đặt**; hai máy cùng báo một mã thì hiện hai dòng riêng.
- Tín hiệu cung cầu lưu với id `ngày_mã_loại_cungcau` + `engine` để không ghi đè tín hiệu T+ cùng mã cùng ngày; xuất dữ liệu ghi rõ máy.
- Điểm quyết định ghi lại sự kiện đối chứng của ngưỡng T+ (legacy) như trước.
- Dòng Cung cầu ở bảng mã **luôn hiện giá tối ưu** kể cả khi Chờ: "Mua tối ưu 58,7 (58,5–58,9) · Bán tối ưu 60,2 (…)"; mã đang giữ mà giá chưa qua ±1% giá vốn thì hiện "Mua thêm khi ≤ …" / "Bán khi ≥ …". Ngoài giờ hiện giá phiên gần nhất kèm ngày. Chỉ để tham khảo — khuyến nghị thật vẫn chỉ khi máy báo Mua/Bán.

· `public/index.html` · `functions/decision-service.js` · `CLAUDE.md` · `CHANGELOG.md`

## 2026-10-07e (orderflow-v1.2.0: vùng giá tối ưu + Mua thêm dưới giá vốn 1%)

Owner thấy giá đề xuất chỉ là giá hiện tại. Gốc: VPS chỉ có 3 mức giá mỗi bên, cách giá khớp 1–3 bước giá.
- Giá Mua/Bán đề xuất giờ lấy trong **vùng tối ưu cách giá hiện tại tối đa 3%**, gộp ba nguồn: mức khớp nhiều trong phiên
  (≥10% khối lượng ngày), lệnh treo bền 3/5 mẫu, và đáy/đỉnh 5–20 phiên + 3 mức đóng cửa có khối lượng lớn nhất (nến VNDirect,
  tính một lần mỗi ngày, làm tròn về bước giá HOSE). Mức trùng nhiều nguồn được ưu tiên; bằng nhau thì chọn mức gần giá hiện tại.
- Mã đang giữ chỉ **Mua thêm khi giá thấp hơn giá vốn TB ít nhất 1%**; vùng Mua không vượt giá vốn −1%, vùng Bán không dưới +1%.
- Khuyến nghị, dòng mã và Chi tiết mã hiện vùng giá + giá đề xuất + nguồn. `signals` có thêm `zoneLow`/`zoneHigh`.
- Nâng `orderflow-v1.2.0` — đối chứng 20 phiên tính lại. Deploy sau giờ giao dịch, chạy thật từ phiên 08/10/2026.

· `functions/orderflow.js` · `functions/orderflow-service.js` · `functions/index.js` · `functions/smoke.js` · `public/index.html` · `CLAUDE.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-07d (orderflow-v1.1.0: không bao giờ khuyến nghị bán lỗ)

Owner thử thấy VPI ra "Giảm rủi ro" (bán khi đang lỗ) — không chấp nhận.
- Bỏ hẳn hành động **Giảm rủi ro**. Bán chỉ khi giá hiện tại và giá đề xuất cao hơn giá vốn TB **ít nhất 1%** (đã gồm thuế 0,1%).
  Áp lực bán khi chưa đủ lãi chỉ hiện cảnh báo trong Chi tiết mã kèm mức giá cần đạt.
- App chặn thêm một lớp: không hiện Bán nếu giá đề xuất không cao hơn giá vốn đang thấy ở app, kể cả dữ liệu bản cũ.
- Nâng `orderflow-v1.1.0` — bộ đếm 20 phiên đối chứng tính lại từ hôm nay. Giá đề xuất vẫn sát giá hiện tại (VPS chỉ có 3 mức) — làm ở bản sau.

· `functions/orderflow.js` · `functions/smoke.js` · `public/index.html` · `CLAUDE.md` · `CHANGELOG.md`

## 2026-10-07c (Khuyến nghị theo cung–cầu orderflow-v1.0.0)

- Khuyến nghị chính chuyển từ ngưỡng giá vốn sang cung–cầu: VPS chụp 3 mức mua/bán mỗi phút trong phiên; Người Quan Sát cấp nền dư mua/dư bán và khối lượng trung bình lệnh của 5 phiên. Nút lấy giá của app vẫn gọi VPS thẳng từ trình duyệt; callable `getMarketQuotes` có sẵn nhưng chỉ chuyển sang khi đã xác nhận Cloud Function gọi được VPS (#012).
- Máy chỉ phát **Mua / Bán / Giảm rủi ro** khi đủ 5 phiên nền, 30 mẫu liên tục và các điều kiện điểm, chênh lệch, độ bền, rủi ro kê/rút. Thiếu/lỗi/cũ hiện **Chờ / Đang học**. Mã Giữ chỉ hiện cảnh báo áp lực bán trong chi tiết, không vào Khuyến nghị bán.
- Giữ một vòng đời lệnh Đặt/Bỏ qua → Khớp/Hủy. `signals` giữ `kind=buy|sell`, bổ sung `action`, `orderflowVersion`, độ tin cậy, giá đề xuất, lý do và rủi ro kê/rút. Số lượng vẫn đọc `lotSize`.
- Điểm quyết định v1.2.0 tiếp tục chạy bóng; ngưỡng giá vốn cũ không sinh khuyến nghị/sự kiện mới nhưng dữ liệu, phiên bản chiến lược và phép tính lịch sử vẫn giữ nguyên.
- Tỷ lệ phủ 80% tính trên 30 phút đồng hồ (mẫu buổi sáng không bù cho buổi chiều); thiếu dữ liệu thì về Chờ ngay, không giữ hành động cũ. Mã đang giữ hiện **Mua thêm**. Popup Chi tiết mã và biểu đồ bỏ ngưỡng −2/+3. Bảng mã dùng cùng điều kiện với Khuyến nghị (mã Giữ không tô Bán, thiếu giá đề xuất thì Chờ). Xuất dữ liệu có thêm hành động, phiên bản máy, độ tin cậy. Mã nằm sàn/trần (sổ lệnh một bên) không còn bị bỏ qua (#020).
- Thêm `orderflow_daily/latest/events/versions/control`; owner chỉ đọc, Cloud Function mới được ghi. Sự kiện đo hướng 15/30/60 phút, khả năng chạm giá 30 phút và kết quả +6%/−3% trong 20 phiên.
- Kiểm nguồn thật **từ Cloud Function** 07/10/2026 phiên chiều: 24/24 mã có sổ lệnh VPS mỗi phút, đủ 5 phiên nền Người Quan Sát. Deploy Functions trước (12:05), giao diện sau khi thu đủ 30 phút.
- Kiểm nguồn ban đầu: VPS trả đủ 3 tầng sổ lệnh; Người Quan Sát trả đủ 5 phiên gần nhất. Smoke kiểm đủ dữ liệu, thiếu dữ liệu, tường lệnh bị rút, Giảm rủi ro và mã Giữ.

· `functions/orderflow.js` · `functions/orderflow-service.js` · `functions/index.js` · `functions/decision-service.js` · `functions/smoke.js` · `public/index.html` · `firestore.rules` · `ISSUES.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-07b (Chọn số phiên ở báo cáo đề cử trên 90 điểm)

Owner muốn xem hiệu quả đề cử Cơ hội sau một số phiên tự chọn, không chỉ 5 phiên.

- **Tab Cơ hội → Hiệu quả >90 điểm** có ô chọn **3–20 phiên** (mặc định 5). Đổi số phiên thì 4 ô tổng hợp (Đã đủ N phiên · Đang chờ · Có lãi · Lãi/lỗ bình quân) và từng dòng "Phiên N" tính lại theo số đó. Lựa chọn chỉ giữ trong lúc mở app, tải lại về 5.
- **Gộp đợt** vẫn chỉ tính lần đầu khi một mã lên trên 90 điểm nhiều ngày liền; khoảng "cùng đợt" dài theo số phiên đang xem.
- **Bot** chép thêm giá đóng cửa của **20 phiên** sau ngày đề cử (`fiveSessionEvaluation.closes`), đo tiếp tới khi đủ 20 phiên. Đề cử cũ được điền bù ở lượt sau đóng cửa gần nhất; trước đó chọn số phiên khác 5 thì mã cũ hiện "Chờ bot cập nhật". Lúc điền bù bot tính lại cả phần 5 phiên trên cùng chuỗi giá: % lãi/lỗ giữ nguyên, giá hiển thị có thể đổi nếu nguồn đã điều chỉnh theo cổ tức.
- **Kiểm:** `npm run smoke` qua (thêm phép thử: chép đủ chuỗi giá, dừng ở 20 phiên, khi nào đo tiếp/điền bù). Dựng báo cáo với dữ liệu giả ở 375px, đổi 3/5/10/20 phiên: số đúng, gộp đợt đúng, ô chọn cao 44px, không tràn ngang.

· `functions/scoring.js` · `functions/index.js` · `functions/smoke.js` · `public/index.html` · `CLAUDE.md` · `AGENTS.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-07 (Biểu đồ mã thêm đường MA10)

Owner muốn thấy thêm MA10 cạnh MA20 / MA50 khi xem biểu đồ mã.

- Popup Biểu đồ vẽ thêm **MA10** (nét đứt, màu cam; nền tối dùng cam sáng hơn cho dễ nhìn). Chú thích dưới biểu đồ và ô hiện số khi chạm/rê đều có MA10.
- Chỉ hiển thị, không đổi tín hiệu, điểm hay Firestore.
- Kiểm tra trên bản thử với dữ liệu giả lập, khổ điện thoại 375px: đủ 3 đường, chú thích một hàng, không tràn ngang.

· `public/index.html` · `CHANGELOG.md`

## 2026-10-06 (Khối ngoại vào chấm điểm — Cơ hội v1.1.0, Điểm quyết định v1.2.0)

Owner hỏi tài liệu TCBS OpenAPI có gì về doanh nghiệp dùng được cho chấm điểm. Đọc hết tài liệu: mục "Tra cứu thông tin chứng khoán" chỉ là thông tin niêm yết (trạng thái cảnh báo/kiểm soát, margin, room ngoại), không có báo cáo tài chính; dữ liệu thị trường hữu ích là **khối ngoại** và **mua/bán chủ động**, nhưng mọi API TCBS đều cần phiên iOTP (đo: 401 nếu thiếu) nên bot không tự gọi được. Owner chọn đưa khối ngoại vào CẢ HAI bộ điểm bằng cách **chia lại trọng số**, mua/bán chủ động để sau.

- **Nguồn:** VNDirect `api-finfo.vndirect.com.vn/v4/foreigns` (cùng hãng với nguồn giá chấm điểm). Đo thật từ Cloud Function bằng hàm thử tạm (đã xoá ngay): 104 mã một lần gọi, 0,2–0,6 giây; lịch sử hơn 1 năm; cho gọi cross-origin nên nút Quét ngay dùng cùng nguồn. Mua/bán chủ động: thử 5 nguồn, chỉ TCBS có (OpenAPI cần iOTP, bản công khai bị Cloudflare chặn).
- **Cách chấm Khối ngoại (0–10):** 5 phiên gần nhất — tỷ lệ mua ròng so với giá trị giao dịch của mã (≥5% → 6 · ≥2% → 5 · trong ±2% → 3 · đến −5% → 1 · dưới −5% → 0) + số phiên mua ròng (tối đa 4). Điểm Bán chấm ngược lại. Thiếu dữ liệu hoặc hết room ngoại (<1%) → trung lập 5, không thưởng không phạt; thiếu dữ liệu có cờ "Chưa có dữ liệu khối ngoại".
- **Cơ hội ngắn hạn v1.0.0 → v1.1.0:** Xu hướng 25→20, Sức mạnh 25→20, thêm Khối ngoại 10. Tổng vẫn 100. Mua ròng mạnh có thêm lý do "Khối ngoại mua ròng x/5 phiên". Bot, Quét ngay và Chấm một mã cùng công thức; đã so trên dữ liệu thật 06/10: 69/69 mã được chấm ra kết quả trùng khớp giữa app và bot.
- **Điểm quyết định decision-v1.1.0 → v1.2.0:** Mua — Thị trường 25→20, Đà tăng 20→15, thêm Khối ngoại 10. Bán — Đà tăng yếu đi 25→20, So với thị trường 20→15, thêm Khối ngoại bán ra 10. **Bộ đếm chạy bóng 20 phiên bắt đầu lại**; sự kiện bản cũ giữ nguyên kết quả.
- **Hiển thị:** popup Chấm một mã có ô "Khối ngoại x/10" + câu "Khối ngoại mua ròng 4/5 phiên · ròng +102,6 tỷ (+19,2% giá trị giao dịch)"; tab Phân tích có dòng Khối ngoại ở cả Mua và Bán. Kết quả cũ chưa chấm lại vẫn hiện theo thang cũ.
- **Chưa làm:** báo cáo 5 phiên (>90 điểm) chưa tách theo phiên bản công thức; mô phỏng `backtest.js` chưa có lịch sử khối ngoại (mọi mã trung lập 5/10).
- **Kiểm:** `npm run smoke` qua (thêm phép thử khối ngoại: mua/bán ròng đều, hết room, thiếu phiên, nguồn chậm 1 phiên, trần từng phần Điểm quyết định). Dựng phần hiển thị với điểm thật của DGW ở 375px: đủ chữ, không tràn ngang — qua đó bắt và sửa lỗi "bán ròng undefined/5 phiên" và "−0%".

· `functions/scoring.js` · `functions/decision-scoring.js` · `functions/decision-service.js` · `functions/index.js` · `functions/ticker-analysis.js` · `functions/smoke.js` · `public/index.html` · `CLAUDE.md` · `AGENTS.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-05b (Chấm chủ động một mã và so với mã cùng ngành)

Owner muốn tự chấm một cổ phiếu HOSE bất kỳ và biết mã đó đang mạnh hay yếu hơn các mã tương đương trên thị trường, không cần đưa mã vào danh mục trước.

- **Chấm một mã từ header:** nút kính lúp mở ô nhập mã; app chỉ nhận cổ phiếu HOSE đã xác nhận qua danh sách VPS. Kết quả mở trong popup Chi tiết mã. Với mã đang nắm giữ hoặc theo dõi, nút **Chấm cơ hội** chạy cùng luồng này; kết quả chỉ giữ trong bộ nhớ đến khi đóng app, bấm **Chấm lại** để lấy mới. Trên màn ≤430px ẩn chữ tiêu đề header để 5 nút vẫn giữ vùng chạm 44px và không chồng nhau.
- **Điểm Cơ hội dùng đúng công thức Quét ngay:** callable `analyzeTicker` chỉ cho email owner đã xác minh, đọc thông số sàng lọc hiện hành rồi lấy OHLCV từ VNDirect và gọi lại `scoreTicker()`. Không tạo công thức chấm thứ ba.
- **So với mã tương đương:** `ticker-analysis.js` dùng rổ ngành `SECTORS` hiện có, bỏ mã chính và mã thiếu 60 phiên/lệch ngày, rồi chọn tối đa 5 mã gần thanh khoản nhất theo tỷ lệ log. Popup so biến động 5/20/60 phiên, thanh khoản TB20 và ATR14 với trung vị nhóm; chưa có ngành hoặc chưa đủ 2 mã thì nói rõ giới hạn.
- **Chỉ để xem:** kết quả không ghi Firestore, không tạo `signals`, `screening_results` hay `decision_events`. Smoke test kiểm công thức biến động, trung vị, giới hạn 5 mã, loại mã chính/lệch phiên và thứ tự gần thanh khoản.
- **Sửa sau lần bấm production đầu tiên:** popup từng bị kẹt ở “Đang chấm…” vì gọi nhầm hàm định dạng số chỉ có trong khối Điểm quyết định. Đã tách định dạng tại đúng khối và bấm lại luồng thật.

· `public/index.html` · `functions/index.js` · `functions/ticker-analysis.js` · `functions/smoke.js` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-05 (Nhật ký gọn mỗi ngày một dòng)

Owner thấy Nhật ký dài vì dữ liệu nhiều.

- Mỗi ngày gọn còn **một dòng**: ngày · tóm tắt (vd "Mua 2 · Bán 1 · Nạp · Đặt 1 · Theo dõi 5") · tổng tài sản · mũi tên. Bấm vào dòng mở ra chi tiết như cũ (Đầu tư / Tiền mặt / Lãi-lỗ, các giao dịch kèm nút Xóa).
- Mặc định gập hết. Ngày đang mở được nhớ trong lúc dùng (dữ liệu về vẽ lại không bị gập), tải lại trang thì gập lại. Cùng kiểu mở/gập với tab Phân tích.
- Chỉ đổi hiển thị, không đổi dữ liệu. Kiểm tra trên trang thử với dữ liệu giả, khổ điện thoại 375px.

· `public/index.html` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-05 (Xóa được khoản nạp/rút trong Nhật ký)

Owner đôi lúc nhập sai số tiền nạp/rút mà không có cách gỡ như giao dịch cổ phiếu.

- Mỗi khoản Nạp / Rút / Điều chỉnh trong Nhật ký có nút **Xóa** giống giao dịch cổ phiếu. Bấm → hỏi xác nhận (số tiền + ngày) → xóa đúng khoản đó khỏi `cashflows`. Nhập sai thì xóa rồi nhập lại.
- Tiền mặt, vốn ròng, lãi/lỗ tự tính lại ngay. Ảnh chụp `daily_snapshots` các ngày đã lưu vẫn giữ số cũ (đúng thiết kế) — muốn ảnh hôm nay đúng thì bấm Lưu nhật ký lại.

· `public/index.html` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-02 (Biểu đồ mã có đường MA20 và MA50)

Owner muốn thấy MA20 / MA50 khi bấm vào mã để xem xu hướng.

- Popup Biểu đồ vẽ thêm 2 đường trung bình giá đóng cửa: **MA20** (liền, xám đậm) và **MA50** (chấm, xám nhạt). Chú thích dưới biểu đồ ghi giá trị MA của phiên cuối; chạm/rê vào biểu đồ thấy MA20 · MA50 của ngày đó.
- Biểu đồ tải thêm ~80 ngày lịch sử (`fetchPriceHistory(…, 450)`) để khung 1 năm có MA50 từ đầu. File xuất cho AI vẫn 370 ngày như cũ.
- Chỉ hiển thị, không đổi tín hiệu, điểm hay Firestore. Nguồn giá biểu đồ vẫn là VPS (sàng lọc dùng VNDirect) nên MA có thể lệch vài đồng lẻ so với số trong phần chấm điểm.
- Kiểm tra trên bản thử với dữ liệu giả lập: 3 khung 1 tháng / 3 tháng / 1 năm, tooltip ở mép trái, khổ điện thoại.

· `public/index.html` · `CHANGELOG.md`

## 2026-10-02 (Khuyến nghị gập được như các section khác)

Owner thấy Khuyến nghị chưa có nút thu gọn như các phần khác (cơ chế riêng chỉ chạy trên điện thoại, không có trên máy tính).

- Đầu đề Khuyến nghị dùng chung `initCollapse` (`data-sec="khuyen-nghi"`): mũi tên ở mọi màn hình, cùng kiểu với Đang nắm giữ / Nhật ký, nhớ theo máy trong `fin2-collapsed`. Khi gập vẫn thấy số mục.
- Bỏ cơ chế gập riêng cũ (`compactHighlightsExpanded`, nút `#compact-today-chevron`, CSS `.compact-today.open`). Khác trước: điện thoại không còn tự thu Khuyến nghị mỗi lần mở app — anh gập một lần là máy nhớ.

· `public/index.html` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-02 (View Gọn: gập được Đang nắm giữ và Đang theo dõi)

Owner muốn view Gọn có cơ chế thu gọn section như view Đầy đủ.

- "Đang nắm giữ" và "Đang theo dõi" của view Gọn dùng chung `initCollapse` (đầu đề có `data-sec` `gon-nam-giu` / `gon-theo-doi`): bấm tiêu đề hoặc mũi tên để gập/mở, nhớ theo máy trong `fin2-collapsed`.
- `initCollapse` bỏ qua cú bấm vào nút/link trong đầu đề (Lưu, Nạp/rút, Giao dịch, Thêm mã…) để thao tác không làm gập section.
- Khuyến nghị và dòng tóm tắt vẫn giữ cách thu 1 dòng trên điện thoại như trước; Nhật ký và các tab Cơ hội/Chiến lược/Phân tích vốn đã gập được.
- Ghi chú quy trình: lần deploy này chạy trước khi mục CHANGELOG được ghi (lệnh ghi lỗi do kiểu xuống dòng CRLF nhưng chuỗi lệnh vẫn đi tiếp); mục này ghi bù ngay sau đó.

· `public/index.html` · `CHANGELOG.md`

## 2026-10-02 (Khuyến nghị thay Highlight và Hàng đợi tín hiệu)

Owner thấy Highlight (Danh mục) và Quyết định (Phân tích) trùng nhau, muốn gom thành Khuyến nghị có hai nút Đặt và Bỏ qua, đặt vào chỗ Highlight. Chốt thêm: lệnh đã đặt nối tiếp ngay trong Khuyến nghị (Khớp / Hủy); bỏ các mục "sắp tới ngưỡng" và watchlist gần giá kỳ vọng khỏi Khuyến nghị.

- **Khuyến nghị** (`renderAdvice`, thay `renderCompactToday`): tín hiệu hôm nay đã đạt ngưỡng → **Đặt** (mở form đặt lệnh gắn tín hiệu, như nút "Đã đặt" cũ) hoặc **Bỏ qua** (ẩn tới hết ngày trên máy đó, như cũ). Đặt xong mục chuyển thành "Đã đặt" với **Khớp** / **Hủy**; khớp hoặc hủy thì rời danh sách.
- Khối nằm chỗ Highlight ở view Gọn, và chuyển sang đầu tab Danh mục khi ở view Đầy đủ (cùng một khối, chuyển chỗ như bảng mã). Điện thoại vẫn thu thành 1 dòng "Khuyến nghị · N mục", bấm mới mở; nút nằm bên phải để mỗi mục gọn.
- **Tab Phân tích:** khối "Quyết định" đổi tên "Hiệu quả tín hiệu", chỉ còn Chất lượng tín hiệu + Đóng góp lãi/lỗ.
- Mục "sắp tới ngưỡng" vẫn thấy ở bảng mã (vạch trái mảnh + dòng "Sắp mua/bán" khi mở dòng). Tín hiệu, lệnh, Firestore không đổi.
- Kiểm tra trên bản thử dữ liệu mẫu: Đặt mở form gắn đúng tín hiệu, Khớp mở form khớp, Hủy hỏi xác nhận, Bỏ qua ẩn + "Hiện lại", đổi Gọn ↔ Đầy đủ, khổ 375px.

· `public/index.html` · `CLAUDE.md` · `AGENTS.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-02 (Vốn nạp ròng + Lãi/lỗ từ đầu)

Owner thấy thiếu thông tin tổng đầu tư. Kiểm tra: cả hai view không còn hiện tiền đã bỏ vào (ô vốn nạp ròng có từ 14/09 nhưng mất khi khối tóm tắt Gọn đổi sang Đã chốt · Tỷ lệ tiền mặt). Owner chọn A: đặt ở phần mở rộng "Tổng tài sản …".

- **Vốn nạp ròng** = Σ nạp − Σ rút (`netCapitalVND`). Bỏ dòng "Điều chỉnh" đối chiếu TCBS vì không phải tiền nạp thật.
- **Lãi/lỗ từ đầu** = Tổng tài sản − vốn nạp ròng, kèm % trên vốn nạp ròng; theo nút ẩn số lãi/lỗ như các số lãi/lỗ khác.
- Nằm cạnh Giá trị cổ phiếu và Vốn mua trong `#overview-more`, dùng chung hai view. Dòng tóm tắt và 4 ô chỉ số giữ nguyên.
- Sửa ghi chú cũ trong AGENTS.md ("Gọn dùng vốn nạp ròng") cho đúng hiện trạng.

· `public/index.html` · `AGENTS.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-02 (Gom view — bước 1: view Gọn đủ chức năng, thêm tầng Chi tiết)

Owner ít dùng view Đầy đủ, muốn lấy Gọn làm view chính theo kiểu bấm để mở rộng, bấm Chi tiết để xem đầy đủ. Chốt: dòng tóm tắt giữ như Gọn, Tổng tài sản ở phần mở rộng (1A); một bố cục cho mọi màn hình (2A). Làm 2 bước, bước 2 (gỡ view Đầy đủ) chờ owner dùng thử.

- **Tổng quan 3 tầng:** dòng "Chưa bán · Tiền mặt" → 4 chỉ số → nút "Tổng tài sản …" mở giá trị cổ phiếu, vốn mua, Phân nhóm vị thế, Đã chốt theo mã, Nếu chốt các mã đang lãi. Khối có sẵn được chuyển chỗ, không chép bản thứ hai.
- **Nút Lưu nhật ký hôm nay** cạnh nút Giao dịch, mở popup danh sách giá rồi bấm Lưu; có chấm vàng khi hôm nay chưa lưu. Cách ghi không đổi: chỉ tạo `daily_snapshots` + `signals` khi bấm Lưu. Lý do: bản xuất 28/09 thiếu ngày 18/09 và 24/09 vì nút Lưu chỉ có ở view Đầy đủ.
- **Nút Nạp / rút vốn** cạnh nút Giao dịch, mở popup như form Giao dịch.
- **Nhật ký + Xuất nhật ký** ở cuối tab Danh mục của view Gọn (gập được, nhớ trạng thái gập như trước).
- **Chi tiết mã (tầng 3):** nút "Chi tiết" ở hàng mở của mã nắm giữ và mã theo dõi, hoặc bấm dòng điểm → popup gồm nút Biểu đồ / Luận điểm / Ghi giao dịch, số chính của mã, luận điểm, Điểm quyết định (cùng `analysisDetail` với tab Phân tích), lệnh đang chờ và lệnh đã ghi. Bấm điểm không còn nhảy sang tab Phân tích (`openAnalysis` bỏ).
- **Popup dùng chung bền hơn:** form mượn vào popup được trả về chỗ ngay khi đóng hoặc khi mở popup khác, không phụ thuộc sự kiện `close` của trình duyệt (sự kiện này có thể đến trễ và kéo nhầm nội dung popup vừa mở).
- Kiểm tra: dựng bản thử trên máy với dữ liệu mẫu (không đụng Firestore), bấm đủ 4 popup, popup Chi tiết của mã nắm giữ/theo dõi, đổi Gọn ↔ Đầy đủ, khổ 375px và máy tính.

· `public/index.html` · `CLAUDE.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-02 (Tab Cơ hội riêng, view Gọn có tab như Đầy đủ)

Owner xem báo cáo cơ hội ngắn hạn thường xuyên, muốn có tab riêng thay vì gập ở cuối Danh mục; đồng thời muốn view Gọn chia tab giống view Đầy đủ.

- **Thanh tab chung cho cả hai view:** Danh mục · Theo dõi · **Cơ hội** · Chiến lược · Phân tích. Gọn/Đầy đủ chỉ đổi cách hiện ở Danh mục và Theo dõi; ba tab còn lại giống hệt nhau. Owner chọn phương án này.
- **Tab Cơ hội:** chứa Cơ hội ngắn hạn (khung giờ Telegram, Cơ hội mới, Đang theo dõi, Hiệu quả >90 điểm · 5 phiên). Cài đặt thông số sàng lọc vẫn ở Chiến lược (owner chọn).
- **Khối Quyết định chuyển lên đầu tab Phân tích** cho cả hai view (owner chọn). View Gọn bỏ mục gập "Phân tích chi tiết".
- **View Gọn:** tab Danh mục = tóm tắt + Highlight + bảng nắm giữ; tab Theo dõi = bảng theo dõi.
- **Code gọn hơn:** bỏ đoạn chuyển `decision-hub`/`screening-hub` qua lại giữa hai view; ẩn/hiện tab, panel, view gom vào một hàm `syncPanels()`.
- **Điện thoại:** ≤430px mỗi tab rộng theo độ dài chữ để 5 tab vừa khổ 375px, không bị cắt chữ.

· `public/index.html` · `CLAUDE.md` · `AGENTS.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-10-02 (Highlight và Cơ hội ngắn hạn: cùng ngưỡng, mở biểu đồ, đo sau 5 phiên)

Owner báo MSN chưa đạt mục tiêu nhưng Highlight vẫn khuyến nghị bán; đồng thời muốn xem biểu đồ ngay từ Cơ hội ngắn hạn và biết các đề cử điểm rất cao thực tế lời/lỗ thế nào sau 5 phiên.

- **Highlight và cột Mua / Bán nay nói cùng một chiều:** khi `strategyAlert()` đã có cảnh báo mua hoặc bán, `renderCompact()` ưu tiên hiện đúng ngưỡng đó. Nếu chưa có cảnh báo mới dùng chiều tăng/giảm trong ngày; mã Giữ vẫn không có khuyến nghị bán. Sửa bug #018.
- **Bấm mã trong Cơ hội ngắn hạn để xem biểu đồ:** tên mã ở cả Cơ hội mới, Đang theo dõi và báo cáo 5 phiên dùng lại popup `openStockChart()` đang có. Nút “Đưa vào theo dõi” vẫn là thao tác riêng.
- **Đo riêng đề cử trên 90 điểm:** `evaluateFiveSession()` giả định mua bằng `close` ngày đề cử, chốt bằng giá đóng cửa đúng phiên giao dịch thứ 5 sau đó và lưu `fiveSessionEvaluation` ngay trong `screening_results`. Điểm đúng 90 không tính; Quét ngay trên máy không lưu nên cũng không tính.
- **Tự theo dõi và bù dữ liệu cũ:** `updateEvaluations()` tiếp tục đo các mẫu chưa đủ 5 phiên và tự bổ sung kết quả cũ còn thiếu trường này. Khi đã chốt phiên thứ 5 thì các phiên sau không đổi kết quả.
- **Báo cáo dễ đọc:** `renderFiveSessionReport()` hiện số mẫu đã đủ 5 phiên, đang chờ, tỷ lệ có lãi, lãi/lỗ bình quân và từng mã trong khối Cơ hội ngắn hạn. Dữ liệu xuất cho AI nhận luôn trường đánh giá mới qua kết quả sàng lọc đã có.
- **Mỗi đợt chỉ tính một mẫu:** mã lên trên 90 điểm nhiều ngày liền chỉ tính lần đề cử đầu tiên; đề cử lặp lại trong 5 phiên của mẫu trước không vào thống kê (`fiveSessionSamples`). Owner chọn 4B.
- **Giá mua lấy cùng chuỗi giá với phiên 5:** `entryPrice` đọc từ lịch sử VNDirect đúng ngày đề cử, để nếu nguồn điều chỉnh giá theo cổ tức thì hai đầu cùng điều chỉnh. Vẫn là giá đóng cửa ngày đề cử (owner chọn 3A).
- **Thống kê tính trên toàn bộ lịch sử:** báo cáo đọc query riêng `totalScore > 90`, không còn phụ thuộc 250 kết quả gần nhất.
- **Không mở thêm nơi lưu:** giữ nguyên collection và Firestore Rules; chỉ thêm trường vào document `screening_results` hiện có.

· `public/index.html` · `functions/index.js` · `functions/scoring.js` · `functions/smoke.js` · `AGENTS.md` · `CHANGELOG.md` · `ISSUES.md` · `CODEMAP.md`

## 2026-10-01 (Đối chiếu TCBS: hiện nguyên văn lỗi của TCBS)

Lần thử thật đầu tiên: owner nhập đúng iOTP vẫn báo "TCBS từ chối iOTP", vì app gộp mọi lỗi đổi token thành một câu chung — không biết lỗi nằm ở iOTP hay API Key.
- Hộp Đối chiếu giờ hiện nguyên văn câu báo + mã lỗi của TCBS (VD "TCBS từ chối: The API key is invalid (203074)").
- Server ghi log cảnh báo kèm mã lỗi TCBS và **hình dạng** API Key (độ dài, có dấu cách/ký tự lạ không) — không ghi nội dung key hay iOTP.
- Kết quả: key lần đầu bị dính 4 khoảng trắng giữa chuỗi khi dán → TCBS báo `User not found (203007)`. Owner nhập lại key sạch → đổi token thành công.
- **Tài liệu TCBS sai với thực tế ở `/se`:** thật ra trả `stock[]` với `totalQtty` + `costPrice` (tài liệu ghi `assets[]`, `quantity`, `avgPrice`) → báo "TCBS không trả tài sản". Sửa `normalizeAssets` đọc theo bản thật (giữ tên theo tài liệu làm dự phòng); mã lạ (quyền mua…) chỉ bị bỏ riêng. Số dư `/cashInvestments` đúng tài liệu.
- Tạm ghi log **hình dạng** câu trả lời TCBS (tên trường + kiểu, không giá trị) để soát nốt lệnh khớp khi có dữ liệu.

· `functions/tcbs-service.js` · `public/index.html` · `CLAUDE.md` · `AGENTS.md` · `CHANGELOG.md`

## 2026-09-28d (Đối chiếu TCBS: bấm tay, nhập iOTP, chỉ đọc)

Owner muốn so sổ tay với tài khoản TCBS thật mà không phải gõ lại từng lệnh. Owner chốt: **sổ tay vẫn là nguồn chính**, TCBS chỉ để đối chiếu khi owner bấm.

- **Nút mới ở header** (`#tcbs-btn`, biểu tượng ngân hàng, cạnh nút lấy giá) → mở hộp **Đối chiếu TCBS** (`#tcbs-dialog`): nhập iOTP → bấm **Đọc TCBS** → hiện 3 phần:
  1. **Lệnh thiếu trong sổ** — có ô chọn, mặc định chọn hết.
  2. **Tiền mặt** — lệch thì có ô chọn; đồng bộ sẽ ghi một dòng "Đối chiếu" (`cashflows` type `adjust`, note "Đối chiếu TCBS").
  3. **Vị thế** — bảng Tool / TCBS các mã lệch số lượng hoặc giá vốn. **Chỉ để xem**, không ghi gì (lệch vì cổ tức cổ phiếu, quyền mua, cách TCBS tính giá vốn…).
  Bấm **Đồng bộ mục đã chọn** → ghi một lần duy nhất (1 batch).
- **Cách tìm lệnh thiếu** (`tcbsMissingTrades`): gom theo ngày · mã · chiều mua/bán. Sổ tay ít hơn TCBS thì đề xuất đúng phần thiếu, giá = bình quân các lệnh khớp của nhóm đó. Chỉ xét từ ngày giao dịch đầu tiên trong sổ tay — lịch sử TCBS cũ hơn không tính là "thiếu". Đọc lại lần 2 không đề xuất trùng vì phần đã ghi được trừ ra.
- **Lệnh ghi vào sổ giống nhập tay** (`tcbsTransaction`): note "Đồng bộ TCBS", thời điểm ghi = giờ khớp thật, lệnh bán tự gắn thuế 0,1%.
- **Tiền mặt và vị thế luôn so SAU các lệnh đang chọn** (`renderTcbsReview`): bỏ chọn một lệnh thì số lệch tiền/vị thế tự tính lại ngay.
- **Phía server:** một hàm `readTcbsPortfolio` (`functions/tcbs-service.js` → `readPortfolio`). Chỉ chạy khi đúng email owner đã xác minh. Đổi iOTP lấy phiên TCBS → đọc tiểu khoản cổ phiếu thường (bỏ margin, phái sinh): tài sản, số dư tiền, lệnh khớp → trả về app rồi **bỏ phiên ngay**. Không cất phiên, không ghi Firestore, **không collection mới, không đổi `firestore.rules`**. Nhiều tiểu khoản thì cộng dồn, giá vốn bình quân gia quyền. Giá TCBS tính bằng đồng → đổi sang nghìn đồng cho khớp app. Giờ khớp TCBS không ghi múi giờ → hiểu là giờ Việt Nam (`execIso`).
- **Bảo mật:** API Key và mã lưu ký nằm trong Secret Manager (`TCBS_API_KEY`, `TCBS_CUSTODY_CODE`); web chỉ gửi iOTP. **Vì sao không cất phiên để khỏi nhập iOTP mỗi lần:** phiên TCBS có quyền đặt lệnh; ai có quyền quản trị Google Cloud project đều lấy được phiên nếu nó được cất. (API TCBS không có chuyển tiền ra ngoài, chỉ chuyển giữa các tiểu khoản của chính owner.)
- **Đã đo 28/09/2026:** `openapi.tcbs.com.vn` nhận kết nối từ Cloud Function (trả 400 "API key is invalid" với key giả, ~0,1 giây, không bị Cloudflare chặn như các API giá của TCBS).
- **Lệnh điều kiện — đã xem, KHÔNG làm:** API TCBS chỉ có lệnh điều kiện cho phái sinh; tự dựng cho cổ phiếu thì phải giữ phiên TCBS lâu dài, trái nguyên tắc bảo mật ở trên.
- ~~Bản nháp trước đó (chế độ "nguồn TCBS" thay cho sổ tay)~~ — **đã bỏ hoàn toàn**, thay bằng đối chiếu bấm tay ở trên.
- **Chưa kiểm với tài khoản thật.** Việc của owner: tạo 2 secret `TCBS_API_KEY`, `TCBS_CUSTODY_CODE` (thiếu thì deploy Functions không qua), rồi thử một lượt với iOTP thật. Còn 3 điểm chưa rõ ghi ở #015, #016, #017.

· `public/index.html` (khối "đối chiếu TCBS": `tcbsMissingTrades`, `tcbsTransaction`, `tcbsSelectedTrades`, `renderTcbsReview`, `openTcbsDialog`, `initTcbs`; `tcbsReadApi`) · `functions/tcbs-service.js` (mới) · `functions/index.js` · `CLAUDE.md` · `AGENTS.md` · `CHANGELOG.md` · `ISSUES.md` · `CODEMAP.md`

## 2026-09-28c (Tab Phân tích viết lời thường)

Owner thấy phần chi tiết chấm điểm quá kỹ thuật. Chỉ đổi cách hiển thị; công thức, điểm và bot giữ nguyên.

- **Từng thành phần điểm** đổi tên dễ hiểu (VD "Giá–khối lượng" → "Phiên gần nhất", "Phân phối" → "Có người bán ra mạnh"), thay con số x/y bằng mức **Tốt / Vừa / Kém** (áp lực Bán: **Cao / Vừa / Thấp / Không**), kèm một câu dựng từ số liệu thật: VD "Giá cao hơn 7,4% so với giá trung bình 1 tháng — đang tăng nóng", "Còn cao hơn mức mua thêm 59.00 khoảng 10,2%".
- **Dòng đầu mỗi điểm:** "Điểm Mua 5,2/10 · trung bình · giảm 0,3 so với lần trước".
- **Cảnh báo** dịch sang lời thường dưới mục "Cần lưu ý" (VD "Biến động ATR14 trên 6%" → "Giá lên xuống rất mạnh (hơn 6% mỗi phiên)"). Điểm Mua bị giữ ở 7,5 thì có câu giải thích.
- Bỏ các chữ kỹ thuật: tên phiên bản công thức, "OHLCV", "TB20", "±0,5". Tin tức ghi rõ có tính vào điểm hay không.
- **Mục "Chạy bóng" đổi tên "Chạy thử"**, viết lại: cách chấm đúng/sai một câu, kết quả dạng "đúng 1/2 lần (50%)", tách "Điểm chấm" và "Quy tắc giá vốn của anh", phần khác biệt chỉ hiện khi có.
- File xuất cho AI không đổi (vẫn giữ số gốc).
- **Kiểm:** chạy app với 3 mã dữ liệu giả (đang lãi có áp lực bán cao, đang lỗ có cảnh báo, mã theo dõi chấm trong phiên) ở 375px: đủ câu, mức đánh giá khớp câu mô tả, không tràn ngang, không lỗi JS. Kiểm cú pháp qua; `npm run smoke` qua. Chưa xem với điểm thật.

· `public/index.html` · `CLAUDE.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-09-28b (File xuất cho AI đầy đủ hơn)

Owner muốn file "Xuất nhật ký" đủ dữ liệu để đem đi phân tích, vẫn giữ cách tải file về như cũ.

- **Vị thế hiện tại** (`viTheHienTai`) thêm: số CP bán được (T+2), ngày giá, % trong ngày, lãi/lỗ chưa chốt (đ và %), tỷ trọng trên tổng tài sản, nắm từ ngày nào/bao nhiêu ngày, ngưỡng mua/bán đang áp dụng và còn cách bao xa, trạng thái (đã chạm / gần / bình thường), điểm quyết định. Mã "Giữ" không có ngưỡng bán.
- **Watchlist** (`dangTheoDoi`) thêm: giá mới nhất, cách giá kỳ vọng (điểm và %), đã chạm chưa, theo dõi bao nhiêu ngày.
- **Mục mới `homNay`:** tiền mặt, giá vốn, giá trị thị trường, tổng tài sản, lãi/lỗ, tỷ lệ tiền mặt so với mục tiêu, tín hiệu tính theo giá hiện tại (chỉ để xem, không ghi vào log tín hiệu), lệnh đang chờ.
- **Mục mới `lichSuGiaDongCua`:** ~1 năm giá đóng cửa từng phiên cho mọi mã giữ + theo dõi (cùng nguồn VPS với biểu đồ). Trước đây file chỉ có giá ở những ngày owner bấm Lưu nhật ký. Mã nào lấy không được thì ghi tên, không chặn cả file.
- **Mục mới `sangLoc`:** bộ thông số đang dùng, khung giờ Telegram, các lượt quét và mã được đề cử kèm kết quả chấm.
- **`diemQuyetDinh.lichSuTheoNgay`:** điểm Mua/Bán từng mã qua các lượt sau đóng cửa.
- Hướng dẫn cho AI trong file có thêm ý (7)–(9) giải thích các mục mới.
- Nút Xuất giờ chờ lấy lịch sử giá (~1 giây) rồi mới tải file; lúc chờ hiện "Đang lấy lịch sử giá…".
- **Kiểm:** chạy app với dữ liệu giả (3 mã giữ, 2 mã theo dõi, có mã Giữ, lệnh chờ, sàng lọc): file ra đủ các mục, ngưỡng khớp với tín hiệu app tính, lịch sử giá thật 251 phiên/mã. Popup biểu đồ vẫn chạy. Kiểm cú pháp qua; `npm run smoke` qua. Chưa xuất với dữ liệu thật.

· `public/index.html` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-09-28 (Tên công ty trong popup biểu đồ)

- Bấm mã mở biểu đồ → dưới tiêu đề hiện **tên công ty + sàn** (VD "Công ty Cổ phần FPT · HOSE") để chắc đang xem đúng mã. Tên dài tự xuống dòng, không bị cắt.
- Nguồn: danh sách toàn bộ mã của datafeed VPS (`getlistallstock`, ~650KB, cho gọi từ trình duyệt). Tải **1 lần mỗi phiên** ở lần mở biểu đồ đầu tiên, giữ trong bộ nhớ, không ghi Firestore/localStorage. Lỗi mạng thì chỉ không hiện dòng tên, biểu đồ vẫn chạy.
- **Kiểm:** gọi nguồn từ đúng tên miền app (3.528 mã, ~1,3 giây); dựng popup ở 375px với tên dài nhất thường gặp — đủ chữ, nút đóng không lệch. Kiểm cú pháp script qua; `npm run smoke` qua. Chưa bấm với tài khoản đăng nhập thật.

· `public/index.html` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-09-27c (File deploy.bat)

- Thêm `deploy.bat` ở thư mục gốc: bấm đúp để deploy. Tự lấy code nhánh trên GitHub, hỏi trước khi cất tạm thay đổi chưa commit, chạy smoke nếu máy có thư viện, hỏi xác nhận rồi mới `firebase deploy`. Lỗi ở bước nào thì dừng và báo "Deploy CHƯA xong".
- `.gitattributes` giữ file `.bat` xuống dòng kiểu Windows.
- **Sửa sau lần chạy đầu (lỗi thật trên máy owner):** bước cất tạm bỏ sót file mới chưa được git theo dõi (`deploy.bat`, `functions/decision-*.js`) nên chuyển nhánh bị từ chối. Giờ kiểm cả file mới và cất bằng `git stash -u`; file tự chạy từ bản sao trong `%TEMP%` để việc cất tạm/chuyển nhánh thay chính nó không làm cmd đọc lệch.
- **Kiểm:** chưa chạy thử trên Windows (máy cloud là Linux); đã kiểm định dạng file (UTF-8, CRLF).

· `deploy.bat` · `.gitattributes` · `CLAUDE.md` · `AGENTS.md` · `CHANGELOG.md`

## 2026-09-27b (Điểm quyết định v1.1.0: đo công bằng, thang 10, tab Phân tích)

Sau buổi review tính năng, owner chọn sửa hết các điểm đã nêu, đổi sang thang 10 và tách phần chi tiết cho đỡ rối.

- **Đo chiều Bán công bằng:** trước đây Bán "đúng" khi giá chỉ cần giảm 3%, còn Mua phải tăng 6% → tỷ lệ đúng của Bán bị thổi phồng. Giờ đối xứng: Bán đúng khi giảm 6% trước khi tăng 3%.
- **Sự kiện chỉ ghi lúc đóng cửa:** vượt ngưỡng giữa phiên rồi tụt lại không còn tính là một mẫu. Lượt trong phiên vẫn chấm để xem, nhãn "Trong phiên · tạm tính".
- **Mã ngoài rổ ngành không bị trừ 10 điểm:** thiếu dữ liệu ngành thì phần Thị trường tính trọn từ VN-Index.
- **Ngưỡng cố định theo phiên bản** (8,0 · thanh khoản 20 tỷ · +6/−3 · 20 phiên), ghi rõ trong code và hiện ở tab Phân tích. Không đọc tab Chiến lược để mẫu chạy bóng so được với nhau.
- **Nâng công thức lên `decision-v1.1.0`:** bộ đếm 20 phiên chạy lại từ đầu. Sự kiện bản v1.0.0 giữ nguyên kết quả cũ, không bị chấm lại, không tính vào tổng kết mới.
- **Thang 10:** mọi điểm, thành phần, biến động và tác động tin hiện dạng 7,4 (server vẫn lưu 0–100; file xuất ghi rõ `thangDiem`). Dòng lý do từ server cũng đổi sang /10.
- **Tầng 1 bảng mã bỏ dòng điểm.** Điểm + trạng thái chỉ hiện ở tầng 2 khi bấm mở mã; bấm vào điểm chuyển sang tab mới **Phân tích**, mở đúng mã đó.
- **Tab Phân tích:** tổng kết chạy bóng (chuyển từ khu Quyết định) + danh sách mã nắm giữ / theo dõi xếp theo điểm Mua, mỗi mã gập/mở để xem thành phần, lý do, rủi ro, tin. Tab trên điện thoại thu gọn chữ để 4 tab không bị cắt ở 344px.
- **CLAUDE.md:** thêm các collection `decision_*`, chỗ nhân bản server ↔ app và quyết định đã chốt.
- **Kiểm:** `npm run smoke` qua; kiểm riêng bằng dữ liệu giả: đo đối xứng Mua/Bán, sự kiện chỉ ở lượt đóng cửa, cờ ngưỡng giữ nguyên trong phiên, thiếu ngành không bị phạt. Bấm thử app với Firebase giả lập ở 344px và 1280px: mở tầng 2 → bấm điểm → sang tab Phân tích mở đúng mã, gập/mở mã khác, không tràn ngang, không lỗi JS. Chưa bấm với dữ liệu thật.
- **Deploy:** CHƯA. Cần owner chạy `firebase deploy --project fin2-danh-muc` (máy cloud không có quyền vào project).

· `functions/decision-scoring.js` · `functions/decision-service.js` · `public/index.html` · `CLAUDE.md` · `AGENTS.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-09-27 (Điểm quyết định: chạy bóng mua/bán trên danh mục + theo dõi)

Owner yêu cầu triển khai ý tưởng sau phỏng vấn: ưu tiên tăng lợi nhuận, mua nhịp điều chỉnh trong xu hướng và bán khi xu hướng suy yếu; hệ thống chấm điểm để owner tự quyết định.

- Hai điểm độc lập 0–100, xếp hạng riêng: Mua cho mã đang giữ/theo dõi; Áp lực Bán chỉ khi vị thế có lãi. Mã Giữ vẫn thấy điểm bán. Cùng một bảng ở Gọn/Đầy đủ; bấm điểm mở thành phần, biến động điểm, lý do và tin có dẫn nguồn.
- Công thức `decision-v1.0.0` chạy ở server. Thị trường/rổ ngành có trọng số lớn; rổ ngành nội bộ ngang trọng số, loại chính mã đang chấm khỏi rổ. Thiếu ngành ghi rõ và không tự cho điểm ngành. `-2/+3` đọc phiên bản chiến lược theo ngày; tiền mặt/T+2 hiện riêng.
- Nút lấy giá chung gọi chấm điểm sau khi lưu giá thành công. Thêm callable `refreshDecisionScores` chỉ cho email owner; scheduler `closeDecisionScores` chạy 9:30–15:30 T2–T6, độc lập với công tắc Telegram. Trong phiên có nhãn tạm tính; sau đóng cửa dùng OHLCV VNDirect.
- Lưu mỗi lần chấm, phiên bản công thức và sự kiện vượt 80. Đo +6% trước −3% trong 20 phiên; chiều bán đảo kết quả. Hai ngưỡng cùng phiên = không xác định. Ghi cả mẫu chiến lược cũ theo cùng giai đoạn để so sánh tiến tới, không mô phỏng ngược. Không sửa tín hiệu/lệnh thật và không gửi Telegram cho điểm mới.
- Chạy bóng ít nhất 20 phiên đóng cửa có đủ dữ liệu, ít nhất 10 sự kiện mới; đủ mẫu vẫn không tự chuyển sang cơ chế chính. Thiếu dữ liệu đánh dấu kết quả cũ; lỗi nguồn không làm mất giá đã cập nhật. File xuất Nhật ký có thêm điểm/sự kiện chạy bóng.
- Thu thập RSS chính thức HNX, đọc phần nội dung bài thay vì menu trang; tối đa 50 bài mới mỗi lượt, cache 1 giờ. AI tùy chọn (`DECISION_OPENAI_API_KEY` ở Secret Manager), chỉ phân loại/tóm tắt, có đoạn chứng cứ và tin cậy ≥80% mới tác động. Tin trùng gộp, giảm ảnh hưởng trong 20 ngày, tổng giới hạn ±5. Chưa có khóa hoặc lỗi đọc tin = tác động 0, hiện rõ trạng thái.
- **Giới hạn chưa hoàn tất:** chưa cấu hình khóa AI; HNX RSS chưa bao phủ đầy đủ HOSE và nguồn ngành. Ghi #014 trong ISSUES, không coi đây là lớp tin tức hoàn chỉnh theo ý tưởng.
- **Kiểm:** cú pháp client/server; smoke sàng lọc cũ; ca dữ liệu giả vị thế lỗ, Giữ, thiếu lịch sử, trùng sự kiện, đếm phiên, so chiến lược cũ, đo phiên kế tiếp, hai ngưỡng cùng phiên. Bấm thật bản fixture 344px và 1280px, Gọn/Đầy đủ, mở/thu chi tiết, sáng/tối; không tràn ngang. Không ghi giao dịch thử vào Firestore thật.
- **Deploy:** đã thành công lên Firebase Hosting, Firestore rules và hai Cloud Functions mới ngày 27/09/2026; callable production từ chối người chưa đăng nhập với HTTP 403. Chưa kiểm chứng AI đọc tin thật vì chưa cấu hình khóa.

· `public/index.html` · `functions/index.js` · `functions/scoring.js` · `functions/decision-scoring.js` · `functions/decision-service.js` · `functions/decision-news.js` · `firestore.rules` · `CHANGELOG.md` · `ISSUES.md` · `CODEMAP.md`

## 2026-09-25g (Sàng lọc: mỗi nhóm chọn riêng, không mua trùng, thông số chỉnh được)

Làm sau buổi review cơ chế quét và khuyến nghị. Owner chọn A + B + C, thêm chỗ chỉnh thông số trong tab Chiến lược.

- **A. Mã theo dõi không bị chiếm chỗ:** trước đây lấy 5 mã cao nhất chung cho cả hai nhóm rồi mới tách, nên mã theo dõi đạt chuẩn vẫn có thể biến mất và app báo "chưa có mã đạt 70 điểm". Giờ mã mới lấy tối đa N mã, mã theo dõi đạt chuẩn thì hiện hết. Áp dụng cho bot, Telegram và nút Quét ngay.
- **B. Không ra 2 tín hiệu mua cho một mã:** mã đang nắm giữ mà vẫn nằm trong watchlist thì không ra tín hiệu "Theo dõi" và không hiện "Theo dõi … còn X điểm" ở dải Highlight nữa. Chỉ còn tín hiệu theo giá vốn.
- **C. Khoảng cách tới giá kỳ vọng:** mỗi dòng "Đang theo dõi" (app và Telegram) ghi "Còn X điểm tới giá kỳ vọng Y", hoặc "Đã tới giá kỳ vọng Y".
- **Khu "Sàng lọc cơ hội" trong tab Chiến lược:** chỉnh điểm tối thiểu, số mã mới tối đa, vùng giá phù hợp, thanh khoản TB20 tối thiểu, ngưỡng đạt/hỏng (%) và số phiên đo. Có nút "Về mặc định" (70 · 5 · 40–70 · 20 tỷ · +6% / −3% · 20 phiên). Lưu một bộ vào `settings/screening.analysis`, áp dụng từ lượt quét kế tiếp.
- **Lịch sử không bị chấm lại:** mỗi `screening_runs` chép bộ thông số đã dùng (`analysis`). Mỗi `screening_results` chép ngưỡng đo (`evalWinPct`, `evalLossPct`, `evalSessions`), nên đổi ngưỡng về sau không chấm lại kết quả cũ. Kết quả cũ chưa có các trường này thì dùng mặc định +6% / −3% / 20 phiên, đúng với lúc chúng được sinh ra.
- **Sửa kèm (bắt buộc):** bật/tắt khung giờ Telegram trước đây ghi đè cả doc `settings/screening`, nên sẽ xoá mất thông số sàng lọc. Giờ chỉ ghi phần khung giờ (`merge`).
- Công thức chấm điểm giữ nguyên `v1.0.0`. Với thông số mặc định, điểm ra đúng như cũ.
- **Kiểm:** `npm run smoke` qua, có thêm các ca: chọn theo nhóm, dòng khoảng cách, thông số sai thì dùng mặc định, ngưỡng đo đọc từ kết quả. Đã so bản chấm điểm của app với bot trên 240 lượt dữ liệu giả với 4 bộ thông số: lệch 0. Form mới hiển thị đúng ở 375px, không tràn ngang. Chưa bấm thử với dữ liệu thật vì cần đăng nhập Google.

· `functions/scoring.js` · `functions/index.js` · `functions/smoke.js` · `public/index.html` · `CLAUDE.md` · `AGENTS.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-09-25f (Cột Lãi tính theo K + menu ··· đủ thao tác)

- **Cột "Lãi (K)":** lãi/lỗ trong bảng mã tính theo nghìn đồng (1tr = 1.000K), VD `-6.200` thay cho `-6.2`. Dòng tóm tắt đầu trang và cột GTTT / Vốn vẫn tính theo triệu (owner chọn chỉ đổi cột Lãi).
- **Menu ··· của mã nắm giữ:** Ghi giao dịch (mở form điền sẵn mã) · Chuyển sang Giữ dài hạn / Giao dịch · Luận điểm. Mã theo dõi: Mua mã này (form giao dịch điền sẵn mã) · Luận điểm · Sửa giá kỳ vọng · Bỏ theo dõi. Chọn xong menu tự đóng.
- Nút Giữ / Giao dịch rời ở hàng mở được bỏ (đã vào menu); mã Giữ hiện nhãn "Giữ dài hạn" ở hàng mở.
- Dọn 3 icon không còn dùng (lọc, sắp xếp, đặt lại) sót từ lần bỏ công cụ lọc.
- **Kiểm:** dữ liệu giả 344 / 393px — menu đủ mục, không tràn màn, "Ghi giao dịch" mở form điền đúng mã, cột Lãi ra K, không lỗi JS.

· `public/index.html` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-09-25e (Bảng mã mới dùng chung cho Gọn và Đầy đủ, mọi màn hình)

Owner ưng giao diện bảng kiểu TCBS trên điện thoại và muốn dùng chung cho web, cả view Đầy đủ.

- **Một bảng duy nhất cho hai view:** bảng Đang nắm giữ / Đang theo dõi là một DOM, đổi view thì chuyển chỗ (cùng cách khối Quyết định). Thẻ vị thế và thẻ theo dõi ở Đầy đủ bị thay; `renderPositions` / `renderWatchlist` và CSS thẻ đã xoá.
- **Màn rộng (>768px):** thêm cột tay nắm kéo thả và cột **GTTT / Vốn (tr)** như TCBS: Mã · KL/Giá vốn · GTTT/Vốn · Mua/Bán · Lãi/Lãi%. Điện thoại giữ 4 cột.
- **Chức năng thẻ cũ chuyển vào hàng mở của dòng:** nắm giữ X ngày · vốn sau lướt · đã chốt chu kỳ, chữ tín hiệu ("Mua thêm 100 CP"), badge luận điểm, nút **Giữ dài hạn / Giao dịch**, menu ···. Theo dõi: số ngày, % cần giảm, ngày cập nhật giá, sửa giá kỳ vọng, bỏ theo dõi.
- **Giữ kéo thả:** máy tính có tay nắm ở cột trái; điện thoại tay nắm nằm trong hàng mở. Bấm tiêu đề cột: tăng → giảm → **bỏ sắp xếp** (về thứ tự đã kéo). Đang sắp theo cột thì ẩn tay nắm.
- **Công cụ trên máy tính chỉ còn ô tìm mã;** bỏ bộ lọc Lãi/Lỗ, nút sắp xếp, nút đặt lại và key `fin2-filter-*`.
- **Kiểm:** bản dữ liệu giả ở 344px và 1000–1200px, cả Gọn lẫn Đầy đủ: không lỗi JS, không tràn ngang, bảng chuyển đúng chỗ khi đổi view, kéo thả bằng phím lưu đúng thứ tự, sắp xếp 3 trạng thái, mở dòng hiện đủ thông tin.

· `public/index.html` · `CLAUDE.md` · `AGENTS.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-09-25d (Cột Mua / Bán chỉ hiện một ngưỡng theo chiều giá trong ngày)

Owner thấy cột hai số (`✓ / +9.20`) khó hiểu; muốn giá đang giảm thì thấy ngưỡng mua thêm, đang tăng thì thấy ngưỡng bán.

- **Một giá ngưỡng duy nhất:** giá ↓ so với tham chiếu trong ngày → hiện **giá ngưỡng mua thêm** (đỏ); giá ↑ → hiện **giá ngưỡng bán** (xanh); mã Giữ đang tăng → chữ "Giữ" (xám).
- **Đứng giá hoặc chưa có giá tham chiếu:** so với giá vốn — đang lỗ hiện ngưỡng mua, đang lãi hiện ngưỡng bán.
- Ngưỡng vẫn lấy từ `activeStrategy()` qua `strategyLevels`. Bấm tiêu đề "Mua / Bán" sắp xếp theo số điểm còn cách ngưỡng đang hiện (gần nhất lên đầu).
- **Kiểm:** bản dữ liệu giả 344px — 5 trường hợp (giảm, tăng, Giữ, đứng giá, chưa tham chiếu) ra đúng ngưỡng, không tràn ngang.

· `public/index.html` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-09-25c (View Gọn mobile theo mẫu bảng tài sản TCBS)

Owner gửi ảnh màn Tài sản › Cổ phiếu của app TCBS làm mẫu: muốn lãi/lỗ hiện ngay trên dòng, và thay dãy chip lọc bằng hàng tiêu đề cột.

- **Dòng mã 4 cột, mỗi cột 2 số:** Mã + ô giá · KL / Giá vốn · Mua / Bán (cách ngưỡng, thay cột GTTT/Vốn của TCBS) · Lãi (tr) / Lãi %. Watchlist: Mã + ô giá · Kỳ vọng · Cách.
- **Ô giá có ↑↓ và % trong ngày** (xanh tăng, đỏ giảm, vàng đứng giá) so với giá tham chiếu. Nút lấy giá chung giờ ghi thêm `refPrice` / `refPriceDate` vào `tickers`; chỉ hiện % khi giá tham chiếu cùng ngày với giá hiện tại. Mã chưa lấy giá lại thì chỉ hiện giá.
- **Hàng tiêu đề cột thay chip lọc:** `Mã (5) | KL · Giá vốn | Mua · Bán | Lãi (tr) · Lãi %`, bấm để sắp xếp, bấm lần nữa đảo chiều. Bỏ chip Lãi/Lỗ/Hòa vốn, ô tìm và nút sắp xếp trên điện thoại; máy tính vẫn giữ công cụ cũ.
- **Bấm dòng** vẫn mở thêm: số ngày nắm giữ/theo dõi + menu ··· (menu bung sang trái để không tràn màn).
- **Máy tính:** giữ nguyên bảng, chỉ đổi ghi chú tuổi thành "Nắm giữ 30 ngày" / "Theo dõi 12 ngày".
- **Kiểm:** bản dữ liệu giả ở 393 / 344 / 690 / 1200px — không lỗi JS, không tràn ngang, sắp xếp theo cột, mở dòng, menu ··· đúng.

· `public/index.html` · `CLAUDE.md` · `AGENTS.md` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-09-25b (View Gọn mobile: mã lên đầu, dòng 1 tầng bấm ra 2 tầng)

Owner mở view Gọn trên iPhone 15 Pro và Z Fold 5 (chủ yếu màn gập 344px) để xem giá từng mã. Trước đây phải cuộn ~720px mới tới mã đầu tiên; trên Fold gập chữ tín hiệu bị cắt còn "Mua t…".

- **Đầu trang còn 2 dòng mảnh (≤768px):** khối 4 chỉ số thành `Chưa bán -4,2tr · Tiền mặt 25,6%`, bấm mở lại đủ 4 ô + Tuần/Tháng. Dải Highlight thu về tiêu đề + số mục, bấm mới mở (bỏ kiểu "2 mục + Xem thêm"). Mở máy là thấy ngay danh sách mã.
- **Dòng mã 1 tầng:** Mã · Giá hiện tại · **Mua / Bán** = số điểm còn tới ngưỡng mua và ngưỡng bán (`-0.30 / +4.20`, ✓ khi đã tới; mã Giữ chỉ có vế mua). Ngưỡng lấy từ `activeStrategy()` qua `strategyLevels`, không gõ số. Watchlist: Mã · Giá · Cách kỳ vọng.
- **Bấm dòng mở tầng 2:** số lượng, giá mua TB, lãi/lỗ tiền + %, số ngày, menu ···. Bấm tên mã vẫn mở biểu đồ.
- **Bỏ chữ tín hiệu trong dòng, giữ vạch màu:** vạch đậm = đã tới ngưỡng, vạch mảnh = sắp tới. Tín hiệu đầy đủ vẫn ở Highlight. Watchlist đạt giá kỳ vọng giờ cũng có vạch đậm (cả desktop).
- **Sửa lặt vặt:** nút lấy giá nổi lùi xuống khi cuộn xuống, hiện lại khi cuộn lên (hết che cột phải); hàng chip lọc mờ dần ở mép phải thay vì cắt chữ; khối lãi/lỗ hết dính thanh Tuần/Tháng; Fold mở (~690px) hết lỗi chữ tín hiệu đè vạch màu và dùng chip lọc giống điện thoại.
- **Desktop (>768px) giữ nguyên bảng cũ.**
- **Kiểm:** bấm thử trên bản dữ liệu giả ở 393 / 344 / 690 / 1200px — không lỗi JS, không tràn ngang, mở/đóng dòng, mở Highlight, nút nổi lùi/hiện đúng.

· `public/index.html` · `CODEMAP.md` · `CHANGELOG.md`

## 2026-09-25a (Tối ưu view Gọn trên iPhone + nút cập nhật giá nổi)

Owner dùng view Gọn trên iPhone 15 Pro và cần giảm thao tác lọc, bớt xuống dòng, đồng thời bấm cập nhật giá mà không phải kéo về đầu trang.

- **Header mobile còn một hàng:** nút chuyển Gọn/Đầy đủ được rút thành icon 44px; nút cập nhật giá duy nhất chuyển thành nút nổi 52px ở góc phải dưới, chừa safe-area và khoảng trống cuối trang. Desktop vẫn giữ nút ở header.
- **Filter một chạm:** hai bảng có hàng chip cuộn ngang; lựa chọn được nhớ riêng trên máy qua `fin2-filter-positions` / `fin2-filter-watchlist`. Menu filter desktop vẫn dùng cùng trạng thái.
- **Danh sách gọn hơn:** mobile ≤430px bỏ padding thừa trong ô, giữ lãi/lỗ nổi bật ở dải đầu và ba số lượng/giá ở dải sau; watchlist giữ giá thị trường, giá kỳ vọng và chênh lệch.
- **Highlight mặc định hiện 2 mục:** `Xem thêm N` / `Thu gọn` chỉ thay cách hiển thị; Bỏ qua theo ngày, signals và khối Quyết định không đổi.
- **Phản hồi cập nhật tại chỗ:** icon quay và khóa bấm lặp khi đang tải; toast báo thành công, một phần hoặc lỗi ngay tại vị trí đang cuộn. Luồng vẫn gọi duy nhất `refreshAllPrices()` → `fetchQuotes()`, không tạo snapshot hay signals.
- **Kiểm trước deploy:** JavaScript module qua `node --check`, diff không có lỗi whitespace; bản local tải đúng nhưng Firebase từ chối xác thực trên `127.0.0.1`, nên kiểm dữ liệu thật được thực hiện sau deploy production.

· `public/index.html` · `AGENTS.md` · `CODEMAP.md` · `ISSUES.md` · `CHANGELOG.md`

## 2026-09-24h (Bot sàng lọc chạy lại được + owner chọn khung giờ nhận Telegram)

Owner muốn tự chọn giờ nhận tin quét mã tiềm năng, có khung trước/trong/sau phiên và bật tắt được. Điều kiện tiên quyết: bot phải lấy được dữ liệu từ máy chủ (#012).

- **Đổi nguồn lịch sử giá để chấm điểm sang VNDirect.** Đo thật từ Cloud Function bằng một hàm thử tạm (đã xoá ngay sau khi đo): VPS timeout, SSI 403, VNDirect và DNSE trả dữ liệu. VNDirect cùng định dạng với VPS, giá lệch tối đa 0,001; chạy thử toàn bộ 104 mã: thiếu 0, 8,2 giây, **15/15 mã đạt chuẩn cùng điểm với VPS**. Nút Quét ngay cũng chuyển sang VNDirect (cho gọi từ trình duyệt) để điểm hai bên luôn khớp; biểu đồ và giá hiện tại vẫn dùng VPS.
- **6 khung giờ bật/tắt được trong khối Cơ hội ngắn hạn** (cả Gọn và Đầy đủ): Trước phiên 8:30 · Trong phiên 10:30, 13:30 · Sau phiên 15:30, 16:00, 20:00. Mặc định chỉ bật 16:00. Lưu ở `settings/screening` nên đồng bộ mọi máy.
- **Bot chạy mỗi 30 phút ngày làm việc**, chỉ quét + gửi khi khung đang bật; khung tắt thoát ngay (gần như không tốn phí). Mỗi khung có khoá `screening_slots/{ngày}_{giờ}` nên không bao giờ gửi trùng; ngày nghỉ không nhắn.
- **Tin nhắn ghi rõ loại:** Trước phiên chấm theo phiên gần nhất đã đóng; Trong phiên ghi “tạm tính, nến hôm nay chưa đóng”; Sau phiên kèm số buổi thử nghiệm.
- **Chỉ lượt sau đóng cửa đầu tiên trong ngày ghi lịch sử** (`screening_runs`/`screening_results`) và chấm tiếp đánh giá 20 phiên, theo lựa chọn của owner; các lượt khác chỉ gửi Telegram.
- **Bảo mật:** thêm nhánh rules `settings` (owner đọc/ghi) và `screening_slots` (owner chỉ đọc, bot ghi).
- **Đã kiểm:** smoke test thêm 14 ca khung giờ/phiên (đều đạt); chạy thử quét thật lượt sau phiên và trước phiên không ghi dữ liệu; bấm thử công tắc và Quét ngay trên bản dữ liệu giả ở 375px (lưu đúng, 105 lần gọi VNDirect, 0 lần VPS, cùng top 5 với bot, không tràn, nút 44px).

· `functions/index.js` · `functions/smoke.js` · `public/index.html` · `firestore.rules` · `CLAUDE.md` · `AGENTS.md` · `CODEMAP.md` · `ISSUES.md` · `CHANGELOG.md`

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
