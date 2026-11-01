/* ══════════════════════════════════════════════════════════════
   guide-tours.js — NỘI DUNG tour hướng dẫn trên màn hình (phần chạy: guide.js). Owner duyệt chữ trước khi deploy.

   Một tour = { id, title, done?, steps }
     done : phần tử bấm khi tour kết thúc (trả về tab Danh mục)
     ⚠️ id đã deploy thì KHÔNG đổi: app nhớ "đã xem" theo id (members/{email}.guideSeen). Sửa chữ thì giữ id;
        muốn mọi người xem lại → id mới.
   Một bước = { key, el?, text, title?, alt?, click? }
     el    : phần tử được khoanh sáng; không có / không thấy → thẻ nằm giữa màn hình, chữ = alt (nếu có) hoặc text
     click : bấm phần tử này trước khi hiện bước (chỉ đổi tab — không bấm nút ghi dữ liệu)
   {name} trong chữ = tên người đang đăng nhập.
   ⚠️ el/click là id trong public/index.html (#setup-card, #compact-summary-toggle, #advice-section, #compact-positions-slot,
      #compact-trade, #global-price-refresh, #tab-…) — đổi id ở trang thì sửa theo.
   ══════════════════════════════════════════════════════════════ */

export const TOURS = [
  {
    id: "fin2-start", title: "Làm quen với Fin2", done: "#tab-danh-muc",
    steps: [
      { key: "hello", title: "Chào {name}",
        text: "Fin2 là sổ theo dõi danh mục cổ phiếu và kế hoạch giao dịch của riêng bạn — không ai khác xem được. Xem nhanh 1 phút nhé." },
      { key: "setup", el: "#setup-card", click: "#tab-danh-muc",
        text: "Bắt đầu từ đây: nạp số tiền ban đầu, ghi các mã đang giữ, xem lại chiến lược. Làm xong mục nào, mục đó tự đánh dấu.",
        alt: "Bắt đầu bằng 3 việc: nạp số tiền ban đầu, ghi các mã đang giữ, xem lại chiến lược. Mở lại danh sách này ở nút ? → Thiết lập sổ." },
      { key: "money", el: "#compact-summary-toggle",
        text: "Tiền mặt và lãi/lỗ. Bấm để xem lãi đã chốt theo tuần, tháng, quý." },
      { key: "plan", el: "#advice-section",
        text: "Khuyến nghị là kế hoạch cho phiên tới: lệnh giới hạn đặt sẵn tại mốc giá. Ngoài giờ là bản nháp, bấm Chốt trước 9:00; vào phiên mà chưa chốt thì app tự chốt." },
      { key: "table", el: "#compact-positions-slot",
        text: "Bảng mã: mỗi dòng là một mã đang giữ, kèm mốc giá Mua thêm / Bán theo chiến lược. Bấm một dòng để xem chi tiết." },
      { key: "trade", el: "#compact-trade",
        text: "Khớp lệnh ở công ty chứng khoán xong thì ghi vào đây — sổ tự tính giá vốn, tiền mặt và lãi/lỗ." },
      { key: "price", el: "#global-price-refresh",
        text: "Lấy giá mới cho mọi mã. Trong giờ phiên app giấu biến động giá để giữ kỷ luật; vẫn xem được nếu cần." },
      { key: "chances", el: "#tab-co-hoi",
        text: "Cơ hội: mã HOSE đạt điểm cao do bot sàng lọc sau mỗi phiên, kèm hiệu quả các lần đề cử trước." },
      { key: "strategy", el: "#tab-chien-luoc",
        text: "Chiến lược: mốc chốt lời, cắt lỗ, lô, vùng MA, số lệnh mua tối đa mỗi ngày. Mỗi lần đổi lưu thành một phiên bản mới có ngày hiệu lực." },
      { key: "help", el: "#tb-help",
        text: "Bấm ? để xem lại hướng dẫn này, đọc giải thích chiến thuật hoặc đăng xuất." },
    ],
  },
];
