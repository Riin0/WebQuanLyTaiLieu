package com.webquanly.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.webquanly.dto.AuthRequest;
import com.webquanly.dto.RegisterRequest;
import com.webquanly.dto.VerifyRequest;
import com.webquanly.exception.MailDeliveryException;
import com.webquanly.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(
    origins = {"http://localhost:5173", "http://127.0.0.1:5173"},
    allowCredentials = "true"
)
public class AuthController {

    @Autowired
    private AuthService authService;

    // === Gửi mã xác nhận khi người dùng nhập email trước khi đăng ký ===
    // === Gửi email test để kiểm tra hệ thống gửi mail ===
@PostMapping("/send-test-email")
public ResponseEntity<?> sendTestEmail(@RequestBody Map<String, String> req) {
    try {
        String email = req.get("email");
        authService.sendTestEmail(email); // Bạn cần thêm phương thức này trong AuthService
        return ResponseEntity.ok(Map.of("message", "Email test đã được gửi tới: " + email));
    } catch (IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    } catch (MailDeliveryException e) {
        return ResponseEntity.internalServerError().body(Map.of("error", "Không thể gửi email test: " + e.getMessage()));
    } catch (Exception e) {
        return ResponseEntity.internalServerError().body(Map.of("error", "Lỗi server: " + e.getMessage()));
    }
}
    @PostMapping("/send-code")
    public ResponseEntity<?> sendCode(@RequestBody Map<String, String> req) {
        try {
            String email = req.get("email");
            authService.sendVerificationCode(email);
            return ResponseEntity.ok(Map.of("message", "Mã xác nhận đã được gửi tới email."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (MailDeliveryException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Không thể gửi email xác nhận: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }

    // === Đăng ký tài khoản (sau khi người dùng nhập mã xác nhận hợp lệ) ===
    @PostMapping("/register")
    public ResponseEntity<?> register(@Validated @RequestBody RegisterRequest req) {
        try {
            authService.register(req);
            return ResponseEntity.status(201).body(Map.of(
                "message", "Đăng ký thành công. Vui lòng kiểm tra email để xác minh."
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (MailDeliveryException e) {
            return ResponseEntity.status(201).body(Map.of(
                "message", "Tài khoản được tạo nhưng gửi email thất bại.",
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }

    // === Xác minh mã xác nhận email ===
    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody VerifyRequest req) {
        try {
            authService.verifyEmail(req.getEmail(), req.getCode());
            return ResponseEntity.ok(Map.of("message", "Xác minh email thành công."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }

    @GetMapping("/user-info")
    public ResponseEntity<?> getUserInfo(@RequestParam String email) {
        try {
            return ResponseEntity.ok(authService.getUserInfo(email));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }

    // === Gửi lại mã xác nhận ===
    @PostMapping("/resend")
    public ResponseEntity<?> resend(@RequestBody Map<String, String> req) {
        try {
            authService.resendVerification(req.get("email"));
            return ResponseEntity.ok(Map.of("message", "Đã gửi lại mã xác nhận."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (MailDeliveryException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Không thể gửi email xác nhận: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }

    // === Đăng nhập ===
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest req) {
        try {
            var res = authService.login(req);
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }

    // === Quên mật khẩu - Gửi mã reset ===
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> req) {
        try {
            String email = req.get("email");
            authService.sendPasswordResetCode(email);
            return ResponseEntity.ok(Map.of("message", "Mã đặt lại mật khẩu đã được gửi tới email của bạn."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (MailDeliveryException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Không thể gửi email: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }

    // === Reset mật khẩu ===
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> req) {
        try {
            String email = req.get("email");
            String code = req.get("code");
            String newPassword = req.get("newPassword");
            String confirmPassword = req.get("confirmPassword");
            
            authService.resetPassword(email, code, newPassword, confirmPassword);
            return ResponseEntity.ok(Map.of("message", "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay bây giờ."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }
}
