---
name: token-control
description: Ước lượng chi phí token TRƯỚC khi làm một việc lớn trong dự án, chia thành 3 gói Tối giản / Vừa / Đầy đủ để owner chọn. Tự chạy khi việc sắp làm ước tính vượt 1 triệu token quy đổi; owner cũng gọi tay được bằng /token-control. Chỉ ước lượng và trình bày lựa chọn, KHÔNG tự cắt bớt việc.
---

Bạn đang chuẩn bị làm một việc trong dự án hiện tại. Trước khi bắt tay, ước lượng chi phí và để owner (owner không biết lập trình) chọn phạm vi.

## Khi nào chạy

**Tự chạy** khi ước lượng thô cho việc sắp làm **vượt 1.000.000 token quy đổi** — tức khoảng **trên 33 lượt gọi công cụ**. Nhẩm nhanh: việc đụng ≥2 file lớn, hoặc có test trên emulator/trình duyệt, hoặc có sửa `firestore.rules`, thì gần như chắc chắn vượt.

Dưới ngưỡng đó thì **im lặng làm luôn** — đừng bắt owner duyệt những việc nhỏ.

Owner gọi tay `/token-control` thì chạy bất kể quy mô.

## Công thức ước lượng (đo trên phiên thật 14/08/2026)

**1 lượt gọi công cụ ≈ 30.000 token quy đổi.** Kích thước kết quả trả về gần như không ảnh hưởng — cả một phiên 261 lượt chỉ có 41.000 token là nội dung công cụ trả về, phần còn lại là đọc lại hướng dẫn nền + lịch sử hội thoại mỗi lượt.

→ **Ước lượng = (số lượt gọi công cụ dự kiến) × 30.000.** Đừng ước theo "file to hay nhỏ", hãy đếm số LƯỢT.

Số lượt điển hình cho từng loại việc trong dự án này:

| Việc | Số lượt |
|---|---|
| Đọc hiểu 1 vùng code trong file lớn (tasks.html, gantt.html) | 3–6 |
| Sửa 1 chỗ đã biết rõ vị trí | 1–2 |
| Thêm 1 tính năng nhỏ trong 1 file | 8–15 |
| Tính năng đụng 2–3 file + rules | 25–45 |
| Test thật trên emulator (khởi động, seed, đăng nhập, bấm thử) | 15–25 |
| Test phân quyền bằng rules (nhiều vai trò) | 5–10 |
| Cập nhật AGENTS.md + CHANGELOG + CODEMAP | 6–10 |
| Deploy + commit | 2–3 |

## Trình bày cho owner

Ra đúng 1 bảng, **3 gói**, mỗi gói 1 con số, kèm **% hạn mức phiên còn lại**:

```
Việc: <tên việc, 1 dòng>

           Gói            Token      % hạn mức   Bỏ qua gì
  A. Tối giản           ~xxx.000        x%       <bỏ những gì>
  B. Vừa                ~xxx.000        x%       <bỏ những gì>
  C. Đầy đủ             ~x,x triệu      x%       — (làm hết)

Rủi ro nếu chọn A: <1 dòng, nói thẳng cái gì có thể vỡ mà không ai biết>
```

Rồi hỏi đúng 1 câu: **"Anh chọn A, B hay C?"** — không giải thích thêm.

## Cắt gì khi rút gọn (chốt owner 14/08/2026)

Cắt theo thứ tự này, **KHÔNG cắt phần phân tích/thiết kế**:

1. **Test thật** trên emulator/trình duyệt → thay bằng đọc lại code cho kỹ. Đây là khoản to nhất (~15% chi phí một phiên).
2. **Đọc code** ít lại — tra `CODEMAP.md` để biết hàm nằm đâu thay vì mở nhiều đoạn file dò tìm.
3. **Phần giải thích cho owner trong chat** — viết ngắn, không dựng bảng so sánh, không kể lại quá trình.

**TUYỆT ĐỐI không cắt:** phần suy nghĩ/phân tích kỹ trước khi code, việc hỏi trắc nghiệm khi yêu cầu mơ hồ, và việc ghi CHANGELOG. Owner đã chốt: *"giữ nguyên phân tích kỹ, chỉ đừng mất công giải thích cho anh"*.

Gói **Tối giản** = làm đủ việc + bỏ mục 1,2,3. Gói **Vừa** = có test những chỗ dễ vỡ nhất (phân quyền, dữ liệu ghi xuống Firestore), bỏ phần bấm thử giao diện. Gói **Đầy đủ** = như phiên 14/08/2026.

## Sau khi owner chọn

Làm đúng gói đã chọn, **không tự ý làm thêm** phần đã bị cắt. Nếu giữa chừng phát hiện phải vượt gói (VD chọn A nhưng rules không thể không test), dừng lại báo 1 dòng rồi hỏi, đừng âm thầm làm tiếp.

Không ghi lại đối chiếu ước lượng/thực tế (owner chốt: không cần).
