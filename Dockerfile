# Sử dụng Node.js LTS bản nhẹ Alpine
FROM node:20-alpine

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép package.json và cài đặt dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Sao chép toàn bộ mã nguồn
COPY . .

# Tạo thư mục dữ liệu và phân quyền
RUN mkdir -p data

# Khai báo cổng mạng
EXPOSE 3000

# Biến môi trường mặc định
ENV PORT=3000
ENV NODE_ENV=production

# Lệnh khởi động
CMD ["node", "server.js"]
