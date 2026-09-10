# Agents

Bốn agent rút từ một dự án Firebase nội bộ chạy thật. Tất cả đều **chỉ đọc** trừ `ghi-tai-lieu` (được sửa đúng 3 file tài liệu).

| Agent | Khi nào gọi | Được sửa file? |
|---|---|---|
| `ghi-tai-lieu` | Sau khi sửa code xong, **trước khi deploy** | Chỉ CHANGELOG / ISSUES / CODEMAP |
| `sync-agent` | Trước khi deploy, khi thay đổi đụng một nhóm code nhân bản | Không |
| `ux-review` | Owner gọi chủ động: *"soi chất lượng giúp anh"* | Không |
| `qa-luong` | Owner gọi chủ động: *"test thử luồng ... giúp anh"* | Không |

---

## Phải sửa gì trước khi dùng

### `sync-agent.md` — BẮT BUỘC
Bảng nhóm nhân bản **bắt đầu từ rỗng**, chỉ có 2 dòng ví dụ. **Không khai thì agent này vô dụng.**
Mỗi lần cố ý chép một công thức/hàm/danh sách field sang chỗ thứ hai, thêm một dòng vào bảng đó **và** vào `CLAUDE.md`.

### `qa-luong.md`
Đổi URL app (`<URL app>`) thành URL thật. Agent này dùng Chrome MCP để dùng chung phiên đăng nhập sẵn có — Browser pane là trình duyệt riêng nên sẽ kẹt ở màn đăng nhập Google.

### `ux-review.md` và `ghi-tai-lieu.md`
Chạy được ngay. Cả hai đọc `CLAUDE.md` của dự án hiện tại làm chuẩn — nên chất lượng đầu ra phụ thuộc trực tiếp vào việc `CLAUDE.md` có được viết tử tế không.

---

## Nguyên tắc chung của cả 4 agent

- **Không bịa để có gì báo cáo.** Không thấy vấn đề thì nói "không thấy vấn đề".
- **Không tự sửa file** ngoài phạm vi được cấp — kể cả khi thấy chỗ nên sửa. Báo, để owner quyết.
- **Không đề xuất refactor** ngoài phạm vi thay đổi đang xét.
