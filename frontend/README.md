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

## Deploy lên Render (Static Site)

Lỗi kiểu `Couldn't find a package.json file in "/opt/render/project/src"` thường do Render đang build ở **repo root** trong khi `package.json` nằm ở `frontend/`.

Cách làm nhanh:

1) Tạo **Static Site** trên Render
2) Cấu hình:
	- **Root Directory**: `frontend`
	- **Build Command**: `npm install && npm run build`
	- **Publish Directory**: `dist`
3) Nếu frontend gọi API bằng đường dẫn `/api/...`, hãy set biến môi trường để trỏ về backend production:
	- `VITE_API_BASE_URL=https://<your-backend-service>.onrender.com`

Ghi chú:
- Proxy trong `vite.config.ts` chỉ áp dụng cho dev; production cần `VITE_API_BASE_URL` hoặc cơ chế reverse proxy thực sự.
