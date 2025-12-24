# Backend (Spring Boot)

API server cho dự án **WebQuanLyTaiLieu** (Spring Boot 3.x, Java 17).

## Yêu cầu

- JDK 17
- Maven 3.8+
- (Khuyến nghị) PostgreSQL

Mặc định backend chạy ở `http://localhost:8082`.

## Cấu hình nhanh (Windows / PowerShell)

Backend đọc cấu hình DB từ biến môi trường (có giá trị mặc định trong `application.properties`):

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`

Ví dụ dùng PostgreSQL:

```powershell
$env:SPRING_DATASOURCE_URL = "jdbc:postgresql://localhost:5432/QLTaiLieu"
$env:SPRING_DATASOURCE_USERNAME = "postgres"
$env:SPRING_DATASOURCE_PASSWORD = "your_password"

cd backend
mvn spring-boot:run
```

### Dùng H2 để test nhanh (không cần Postgres)

```powershell
$env:SPRING_DATASOURCE_URL = "jdbc:h2:mem:db;DB_CLOSE_DELAY=-1"

cd backend
mvn spring-boot:run
```

## Upload/Storage

File upload mặc định lưu ở:

- Tài liệu: `backend/storage/documents`
- Avatar: `backend/storage/avatars`

Có thể đổi bằng cấu hình:

- `file.upload-dir`
- `file.avatar-dir`

## Mail (SMTP)

Ứng dụng có cấu hình gửi mail (ví dụ Gmail SMTP). Nên cấu hình bằng biến môi trường để tránh lộ mật khẩu:

```powershell
$env:SPRING_MAIL_USERNAME = "your_email@gmail.com"
$env:SPRING_MAIL_PASSWORD = "your_app_password"
```

## Một số API thường dùng

- `POST /api/auth/register`  (đăng ký)
- `POST /api/auth/login`     (đăng nhập)
- `GET  /api/auth/user-info` (thông tin người dùng)
- `GET  /api/documents`      (danh sách tài liệu)
- `POST /api/documents/upload` (upload multipart)

## Ghi chú

- `spring.jpa.hibernate.ddl-auto` đang để `none` (an toàn hơn khi làm việc với schema có sẵn). Nếu DB mới hoàn toàn, bạn cần tạo schema theo cách của bạn (script/migration) trước khi chạy.
