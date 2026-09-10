/* Hook PostToolUse — nhắc cập nhật CODEMAP.md khi vừa sửa file code.
   Gọi từ settings.json:  node hooks/codemap-reminder.js
   Nhận JSON của hook qua stdin, in ra JSON gợi ý context (hoặc không in gì).

   ⚠️ TODO: sửa CODE_DIRS cho khớp thư mục code của dự án.

   Vì sao dùng file thay vì one-liner trong settings.json: bản one-liner cũ dùng
   grep trên chuỗi JSON, rất dễ vỡ khi đường dẫn có ký tự lạ và gần như không
   sửa được. Đọc JSON bằng node thì rõ ràng và sửa được. */

const CODE_DIRS = ['public'];
const CODE_EXT  = ['.html', '.js', '.ts', '.jsx', '.tsx', '.css'];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let p = '';
  try { p = (JSON.parse(raw).tool_input || {}).file_path || ''; } catch (e) { return; }
  if (!p) return;

  const norm = p.replace(/\\/g, '/');
  const inCode = CODE_DIRS.some((d) => norm.includes('/' + d + '/') || norm.startsWith(d + '/'));
  const isCode = CODE_EXT.some((e) => norm.toLowerCase().endsWith(e));
  if (!inCode || !isCode) return;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext:
        '[CODEMAP] Vừa sửa file code — kiểm tra CODEMAP.md có cần cập nhật không '
        + '(thêm/xoá hàm quan trọng, file mới, collection mới). '
        + 'Và nếu thay đổi này tạo ra một chỗ NHÂN BẢN mới thì khai vào CLAUDE.md.',
    },
  }));
});
