# ⛵ TAM THANH KỲ SẮC — SỔ HÀNH TRÌNH SÁU BẾN PHƯƠNG NAM
### Hệ thống thuyết trình tương tác thời gian thực đa màn hình (Real-time Collaborative Presentation)

---

## 📌 1. Giới thiệu tổng quan
Dự án được thiết kế chuyên biệt cho buổi thuyết trình / triển lãm văn hóa **"Tam Thanh Kỳ Sắc - Sáu bến phương Nam"** (Nhóm 1 - Văn hóa Nam Bộ). Hệ thống kết nối đồng bộ nhiều thiết bị cùng lúc:

1. **Màn hình Sân khấu / Máy chiếu (`/stage`)**:
   - Trình chiếu toàn màn hình 46 trang slide flipbook (ưu tiên hiển thị ảnh từ thư mục `public/slides/`).
   - Mã QR duy nhất tự động nhận diện domain của website để khán giả quét lên đò.
   - Hiển thị danh mục 6 bến, hình ảnh nền sông nước/chợ nổi/lễ hội và cập nhật trực tiếp số lượng khán giả đang tham gia, số người đã nhận đủ 6 dấu.
   - Nút công cụ cài đặt ⚙ cho phép tải thêm video tư liệu, nhạc nền hoặc slide PDF/ảnh trực tiếp từ máy chiếu nếu cần.

2. **Bảng điều khiển Ban tổ chức / Kỹ thuật / MC (`/control` hoặc `/admin`)**:
   - Đăng nhập bảo mật bằng mã PIN (mặc định: `nambo2026`).
   - **Nhiều máy kỹ thuật cùng vào điều khiển song song**: Khi một người bấm mở bến hoặc chuyển slide, tất cả các máy khác lập tức đổi theo.
   - Điều khiển mở 6 bến theo kịch bản:
     - *Bến 01: Con nước phương Nam*
     - *Bến 02: Phiên chợ tình người*
     - *Bến 03: Kho báu di sản*
     - *Bến 04: Giỏ sản vật mùa nước nổi*
     - *Bến 05: Hiểu người Nam Bộ*
     - *Bến 06: Gửi lời phương Nam*
   - Nút **"Bật nhiệm vụ cho cả lớp"**: Mở thử thách trên điện thoại khán giả đúng lúc MC yêu cầu.
   - Theo dõi danh sách du khách theo thời gian thực, tìm kiếm theo tên, xem tiến độ thu thập dấu.
   - Nút **Xuất CSV** để lấy danh sách du khách đã hoàn thành trao quà.
   - Nút **Reset (Xóa dữ liệu)** để đưa hành trình về trạng thái ban đầu cho lượt diễn mới.

3. **Sổ hành trình Khán giả (`/`)**:
   - Khán giả chỉ cần quét mã QR một lần trên điện thoại, nhập biệt danh để "Lên đò".
   - Tự động nhận nhiệm vụ khi ban kỹ thuật mở bến.
   - Trả lời đúng nhận dấu mộc phương Nam có hiệu ứng đóng dấu cộp và rung xúc giác.
   - Hỗ trợ nhập **Mã dự phòng** nếu mạng yếu hoặc vào muộn.
   - Đủ 6 dấu tự động mở **Chứng nhận hoàn thành** và nút "Lưu ảnh kỷ niệm" để khoe trên mạng xã hội.

---

## 📂 2. Cấu trúc thư mục dự án

```text
tam_thanh_ky_sac(banh)/
├── server.js              # Server chính viết bằng Node.js (Express + SSE + Dynamic QR)
├── run_local.py           # Server dự phòng viết bằng Python (chạy thử ngay không cần cài đặt thư viện)
├── package.json           # Khai báo thư viện Node.js (express, cors, dotenv, qrcode)
├── .env                   # Cấu hình biến môi trường (PORT, ADMIN_PIN)
├── .env.example           # File mẫu biến môi trường
├── Dockerfile             # Cấu hình đóng gói container chuẩn Docker
├── .dockerignore          # Danh sách file bỏ qua khi build Docker
├── render.yaml            # Cấu hình deploy 1-click tự động lên Render.com
├── Procfile               # Cấu hình khởi động cho Heroku / Railway
├── data/
│   └── session.json       # Lưu trữ bền vững dữ liệu buổi diễn (tự khôi phục khi server khởi động lại)
└── public/
    ├── index.html         # Giao diện chính (Khán giả, Kỹ thuật, Sân khấu)
    └── slides/            # Thư mục chứa 46 trang slide thuyết trình
        ├── 1.svg ... 46.svg # 46 slide mẫu nghệ thuật theo chủ đề Nam Bộ
        └── HUONG_DAN_SU_DUNG.txt
```

---

## 🚀 3. Hướng dẫn chạy thử trên máy tính (Local)

### Cách 1: Chạy bằng Node.js (Khuyên dùng khi triển khai chính thức)
1. Cài đặt [Node.js](https://nodejs.org/) (phiên bản LTS 18 hoặc 20 trở lên).
2. Mở cửa sổ dòng lệnh (Terminal / PowerShell / CMD) tại thư mục dự án:
   ```bash
   npm install
   npm start
   ```
3. Truy cập các giao diện trên trình duyệt:
   - Khán giả: `http://localhost:3000/`
   - Kỹ thuật / MC: `http://localhost:3000/control`
   - Sân khấu máy chiếu: `http://localhost:3000/stage`

### Cách 2: Chạy bằng Python (Không cần cài thêm thư viện gì)
Nếu máy bạn đã có sẵn Python 3 (ví dụ Python 3.12 trên máy bạn):
```bash
python run_local.py
```
Server sẽ tự khởi động và in ra địa chỉ IP mạng nội bộ của bạn (ví dụ `http://192.168.1.15:3000/`).

> **Mẹo trình chiếu cùng mạng Wi-Fi phòng học/hội trường:**  
> Nếu bạn kết nối máy tính kỹ thuật và điện thoại khán giả vào **cùng một mạng Wi-Fi**, bạn chỉ cần mở đường dẫn `http://<IP_MÁY_TÍNH>:3000/` (ví dụ `http://192.168.1.15:3000/control`), dán URL này vào ô "Đường dẫn cho khán giả" trong tab QR, QR code trên máy chiếu sẽ lập tức trỏ về IP này để cả lớp quét bằng Wi-Fi phòng học.

---

## 🌐 4. Hướng dẫn Deploy lên mạng Internet (Miễn phí có HTTPS)

Để khán giả ở bất kỳ đâu đều quét QR được qua mạng 4G/5G hoặc Wi-Fi bất kỳ, bạn nên deploy lên một dịch vụ Cloud có sẵn tên miền HTTPS.

### Cách 1: Deploy lên Render.com (Miễn phí, khuyên dùng nhất)
1. **Đưa code lên GitHub:**
   - Tạo một tài khoản trên [GitHub](https://github.com/).
   - Tạo một repository mới (ví dụ đặt tên `sau-ben-phuong-nam`).
   - Đẩy toàn bộ thư mục dự án lên repository đó:
     ```bash
     git init
     git add .
     git commit -m "Khoi tao he thong Sau Ben Phuong Nam"
     git branch -M main
     git remote add origin <URL_GITHUB_CUA_BAN>
     git push -u origin main
     ```
2. **Triển khai trên Render:**
   - Truy cập [dashboard.render.com](https://dashboard.render.com/) (đăng nhập bằng GitHub).
   - Bấm **New +** -> Chọn **Web Service**.
   - Chọn repository `sau-ben-phuong-nam` vừa đẩy lên.
   - Cấu hình như sau:
     - **Name**: `sau-ben-phuong-nam` (hoặc tên bạn thích)
     - **Region**: Singapore (gần Việt Nam, tốc độ cao nhất)
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `node server.js`
     - **Plan**: `Free`
   - Bấm **Deploy Web Service**.
3. **Sử dụng:**
   - Sau 1 - 2 phút, Render sẽ cấp cho bạn đường link HTTPS miễn phí dạng:  
     `https://sau-ben-phuong-nam.onrender.com`
   - Mở màn hình Sân khấu: `https://sau-ben-phuong-nam.onrender.com/stage`
   - Mở bảng Điều khiển: `https://sau-ben-phuong-nam.onrender.com/control` (PIN: `nambo2026`)
   - Mã QR trên sân khấu sẽ tự động chuyển thành mã QR thật dẫn thẳng tới link web của bạn!

---

### Cách 2: Chia sẻ link tức thì qua Cloudflare Tunnel (Không cần tạo tài khoản Cloud)
Nếu bạn chạy server trên laptop và muốn ngay lập tức có một đường link HTTPS công khai trong buổi thuyết trình:
1. Tải [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Chạy server trên laptop (`npm start` hoặc `python run_local.py`).
3. Mở thêm 1 cửa sổ CMD chạy lệnh:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
4. Cloudflare sẽ tạo một link ngẫu nhiên dạng `https://xyz.trycloudflare.com`. Copy link này dán vào tab QR trong `/control` để cập nhật mã QR trên sân khấu!

---

## 🎨 5. Quản lý & Tải Media Trình Chiếu Sân Khấu (Từ Trang Kỹ Thuật)

Giao diện trang Kỹ thuật (`/control`) và Sân khấu (`/stage`) được thiết kế đồng bộ và tuyệt đối chuẩn theo phong cách gốc của `XEM_THU_SAU_BEN (1).html`:

### 1. Chuyển cụm nạp file từ Sân khấu sang Kỹ thuật:
- Toàn bộ tính năng nạp tài liệu trước đây ở nút bánh răng ⚙ trên sân khấu đã được **chuyển trọn vẹn sang đặt gọn gàng trong Tab "02. Sân khấu" của trang Kỹ thuật** (ngay dưới thanh trượt trang sách):
  - **▤ Tải ảnh slide (nhiều ảnh):** Chọn cùng lúc nhiều file ảnh PNG/JPG để làm các trang sách Flipbook (tự động đếm tổng số trang).
  - **▤ Tải PDF bài thuyết trình:** Nạp file slide PDF của nhóm (hệ thống tự động chiếu theo từng trang sách với hiệu ứng lật trang 3D). *(Mẹo: Lưu file PowerPoint sang PDF trước khi tải để 100% giữ đúng font chữ).*
  - **▶ Tải video tư liệu:** Nạp file video (MP4/WebM) để chiếu lên sân khấu khi bấm ô "Phát video".
  - **♫ Tải nhạc nền (MP3):** Nạp bài nhạc nền cho chuyến đò và bấm nút **"▶ Bật nhạc sân khấu"** / **"⏸ Tạm dừng"** để điều khiển âm thanh trên máy chiếu từ xa.
- Kỹ thuật viên sau khi nhập mã PIN `nambo2026` sẽ toàn quyền quản lý cụm tải file này.

### 2. 10 Ô chuyển cảnh sân khấu (Giữ 100% giao diện gốc):
- 10 ô bấm lớn phía trên (`Đón đoàn/QR`, `Flipbook`, `Bến sông`, `Chợ nổi`, `Củ Chi`, `Khmer`, `Gian bếp`, `Truyền thông`, `Phát video`, `Khép sách`) được giữ nguyên vẹn 100% thiết kế đồ họa gốc, bấm mượt mà, chuyển cảnh tức thì lên màn hình máy chiếu.

### 3. Màn hình Sân khấu máy chiếu (`/stage`):
- Đã được ẩn nút bánh răng ⚙ trôi nổi, giúp màn hình chiếu luôn sạch đẹp, không bị vướng icon cài đặt hay menu trước mắt người xem.
- Nhấn phím **F** hoặc **nhấp đúp chuột** vào màn hình để bật/tắt chế độ Toàn màn hình (Fullscreen).
- Nhấn phím mũi tên `←` / `→` trên bàn phím máy chiếu để lật trang slide.

---

## 🔑 6. Bảng đáp án & Mã dự phòng của 6 bến

| Bến | Tên bến | Đáp án đúng | Mã dự phòng |
| :---: | :--- | :--- | :---: |
| **01** | Con nước phương Nam | Tuyến **Tây Nam Bộ** | `CONNUOC` |
| **02** | Phiên chợ tình người | Món hàng **Dứa** (trên cây bẹo) | `NEPSONG` |
| **03** | Kho báu di sản | Nghệ thuật **Đờn ca tài tử** | `DISAN` |
| **04** | Giỏ sản vật mùa nước | Chọn 2 cách: **Làm mắm** & **Phơi khô** | `TRITHUC` |
| **05** | Hiểu người Nam Bộ | Nguồn tin: **Người quen tin cậy** | `CONGDONG` |
| **06** | Gửi lời phương Nam | **7h sáng Chủ nhật tại nhà văn hóa dọn bến sông** | `LANGNGHE` |

- Mã PIN quản trị mặc định: `nambo2026` (có thể đổi trong file `.env` qua biến `ADMIN_PIN`).

---

## 💡 7. Kịch bản phối hợp trong buổi diễn
1. **Trước giờ diễn**:
   - Mở màn hình Sân khấu (`/stage`) trên máy tính nối máy chiếu, bấm **F** để hiển thị toàn màn hình (Fullscreen).
   - Máy chiếu sẽ hiện màn chào đón với tranh sông nước Nam Bộ và mã QR to rõ ràng.
   - Khán giả ổn định chỗ ngồi, dùng camera điện thoại quét mã QR và nhập biệt danh.
   - Các bạn trong ban kỹ thuật / MC mở `/control` trên điện thoại hoặc laptop riêng, nhập mã PIN `nambo2026` để vào bảng điều khiển. Số lượng khán giả tham gia sẽ hiển thị nhảy số trực tiếp trên tất cả các màn hình.
2. **Trong lúc diễn**:
   - MC thuyết trình đến bến nào -> Kỹ thuật viên bấm chọn bến đó trên `/control`.
   - Khi MC mời cả lớp tham gia -> Kỹ thuật viên bấm **"Bật nhiệm vụ cho cả lớp ↗"**. Màn hình điện thoại của toàn bộ khán giả sẽ rung nhẹ và hiện câu đố tương ứng.
   - Khán giả bấm chọn đáp án đúng -> Nhận được dấu mộc đóng cộp vào sổ.
   - Thống kê số người hoàn thành tại bến đó sẽ cập nhật ngay trên máy MC và máy chiếu sân khấu.
3. **Kết thúc chương trình**:
   - Khi khán giả nhận đủ 6 dấu, điện thoại sẽ tự chuyển sang trang Giấy chứng nhận hoàn thành mang tên của họ.
   - Ban kỹ thuật chuyển màn hình Sân khấu sang chế độ **"Khép trang sách"** (`finish`) để vinh danh tổng số du khách đã đồng hành và đạt trọn vẹn 6 dấu ấn.
   - Bấm **"Xuất CSV"** trong bảng điều khiển để tải danh sách khán giả về trao quà!

---
*Chúc Nhóm 1 và dự án Tam Thanh Kỳ Sắc có một buổi thuyết trình thành công rực rỡ!* ⛵
