# WebQuanLyTaiLieu

Dự án quản lý & chia sẻ tài liệu học tập gồm:

- **Backend**: Spring Boot (Java 17), chạy cổng `8082`
- **Frontend**: Vite + React, chạy cổng `5173` (dev)

## Chạy nhanh (Windows / PowerShell)

### 1) Backend

```powershell
cd backend

# (Khuyến nghị) cấu hình Postgres
$env:SPRING_DATASOURCE_URL = "jdbc:postgresql://localhost:5432/QLTaiLieu"
$env:SPRING_DATASOURCE_USERNAME = "postgres"
$env:SPRING_DATASOURCE_PASSWORD = "your_password"

mvn spring-boot:run
```

Backend mặc định: `http://localhost:8082`

### 2) Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend dev: `http://localhost:5173`

Trong dev, Vite sẽ proxy các request `/api/...` sang backend `http://localhost:8082`.

## Tài liệu chi tiết

- Xem hướng dẫn frontend tại [frontend/README.md](frontend/README.md)
- Xem hướng dẫn backend tại [backend/README.md](backend/README.md)
