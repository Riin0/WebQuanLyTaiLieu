# Frontend (Vite + React)

Giao diện người dùng cho dự án **WebQuanLyTaiLieu**.

## Yêu cầu

- Node.js 18+ (khuyến nghị 18 hoặc 20)
- npm (đi kèm Node.js)

## Chạy ở môi trường phát triển (Dev)

Mặc định Vite chạy ở `http://localhost:5173`.

Trong dev, frontend sẽ gọi API theo đường dẫn tương đối `/api/...` và **được proxy** sang backend qua cấu hình trong `vite.config.ts`:

- `/api` → `http://localhost:8082`

Chạy (PowerShell):

```powershell
cd frontend
npm install
npm run dev
```

## Build & Preview (giống Production)

```powershell
cd frontend
npm install
npm run build
npm run preview
```

Lưu ý: khi deploy production, bạn cần cấu hình web server/reverse proxy để route `/api` về backend (vì proxy của Vite chỉ dùng cho dev).
