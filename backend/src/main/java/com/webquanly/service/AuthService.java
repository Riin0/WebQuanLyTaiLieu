package com.webquanly.service;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.webquanly.dto.AuthRequest;
import com.webquanly.dto.AuthResponse;
import com.webquanly.dto.RegisterRequest;
import com.webquanly.exception.MailDeliveryException;
import com.webquanly.exception.ResourceNotFoundException;
import com.webquanly.model.User;
import com.webquanly.repository.PhanQuyenRepository;
import com.webquanly.repository.UserRepository;
import com.webquanly.security.JwtUtil;

import jakarta.mail.internet.MimeMessage;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PhanQuyenRepository phanQuyenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;


    private String normalizeEmail(String email) {
        return (email == null) ? null : email.trim().toLowerCase();
    }
    
    private String normalizeTenUser(String tenUser) {
        return (tenUser == null) ? null : tenUser.trim().toLowerCase();
    }

    private Optional<User> findUserByIdentifier(String identifier) {
        if (identifier == null) return Optional.empty();
        String norm = normalizeEmail(identifier); 

        try {
            var byEmail = userRepository.findByEmailNormalized(norm);
            if (byEmail.isPresent()) return byEmail;
        } catch (Exception e) {
            log.warn("Query email error: {}", e.getMessage());
        }

        try {
            String normTenUser = normalizeTenUser(identifier);
            var byTenUser = userRepository.findByTenUserNormalized(normTenUser);
            if (byTenUser.isPresent()) return byTenUser;
        } catch (Exception e) {
            log.warn("Query username error: {}", e.getMessage());
        }

        return Optional.empty();
    }

    private String normalizeRoleName(String raw) {
        if (raw == null) return "";
        String normalized = Normalizer.normalize(raw, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return normalized.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
    }

    private long resolveRoleId(RegisterRequest req) {
        if (req.getRoleId() != null) {
            var role = phanQuyenRepository.findById(req.getRoleId())
                .orElseThrow(() -> new IllegalArgumentException("Vai trò không tồn tại"));
            return applyRolePolicy(role.getId(), role.getTenLoaiNguoiDung());
        }
        return applyRolePolicy(null, req.getRole());
    }

    private long applyRolePolicy(Long requestedId, String rawRoleName) {
        Long resolvedById = mapRoleId(requestedId);
        if (resolvedById != null) {
            return resolvedById;
        }

        if (requestedId != null) {
            log.warn("Vai trò id {} không thuộc danh sách cho phép, sử dụng tên vai trò để xử lý", requestedId);
        }

        String normalized = normalizeRoleName(rawRoleName);
        return switch (normalized) {
            case "ADMIN" -> 2L;
            case "GIANGVIEN" -> 3L;
            case "SINHVIEN" -> 4L;
            default -> {
                log.warn("Không xác định được vai trò từ giá trị '{}', mặc định SINHVIEN", rawRoleName);
                yield 4L;
            }
        };
    }

    private Long mapRoleId(Long roleId) {
        if (roleId == null) {
            return null;
        }
        return switch (roleId.intValue()) {
            case 2 -> 2L;
            case 3 -> 3L;
            case 4 -> 4L;
            default -> null;
        };
    }

    // === Đăng ký tài khoản (3 vai trò hợp lệ) ===
    public void register(RegisterRequest req) {
        String normEmail = normalizeEmail(req.getEmail());
        if (normEmail == null || normEmail.isBlank()) {
            throw new IllegalArgumentException("Email không hợp lệ");
        }

        Optional<User> ex = userRepository.findByEmailNormalized(normEmail);
        User u;

        if (ex.isEmpty()) {
            throw new IllegalArgumentException("Email chưa được xác minh. Vui lòng gửi và xác minh mã OTP trước.");
        }
        
        u = ex.get();

        if (!u.isVerified()) {
            throw new IllegalArgumentException("Email chưa được xác minh. Vui lòng xác minh email trước khi đăng ký.");
        }

        if (u.getPassword() != null && !u.getPassword().startsWith("TEMP_")) {
            throw new IllegalArgumentException("Email này đã được đăng ký tài khoản. Vui lòng đăng nhập.");
        }
        
        log.info("Hoàn tất đăng ký cho người dùng đã xác minh email: {}", u.getEmail());
        
        if (req.getPassword() == null || req.getPassword().isBlank()) {
            throw new IllegalArgumentException("Mật khẩu là bắt buộc.");
        }
        if (req.getConfirmPassword() == null || !req.getPassword().equals(req.getConfirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu xác nhận không khớp.");
        }

        if (req.getName() == null || req.getName().isBlank()) {
            throw new IllegalArgumentException("Tên đăng nhập là bắt buộc.");
        }

        String ten = req.getName().trim();
        String normTen = normalizeTenUser(ten);
        var existingTenUser = userRepository.findByTenUserNormalized(normTen);

        if (existingTenUser.isPresent() && !existingTenUser.get().getIdUser().equals(u.getIdUser())) {
            throw new IllegalArgumentException("Tên đăng nhập này đã tồn tại. Vui lòng chọn tên khác.");
        }

        u.setTenUser(ten);
        u.setPassword(passwordEncoder.encode(req.getPassword())); 

        long resolvedRoleId = resolveRoleId(req);
        u.setIdLoaiNguoiDung(resolvedRoleId);
        u.setVerificationCode(null);
        u.setVerificationExpiry(null);

        userRepository.save(u);
        log.info("Người dùng đăng ký thành công: email={}", u.getEmail());
    }

    private void sendVerificationEmail(String to, String code, boolean resend) {
        if (mailSender == null) {
            log.warn("MailSender not configured - email verification not sent for {}", to);
            throw new MailDeliveryException("Mail server chưa được cấu hình");
        }
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            
            if (mailUsername != null && !mailUsername.isBlank()) helper.setFrom(mailUsername);
            helper.setTo(to);
            helper.setSubject(resend ? "[QLTaiLieu] Mã xác nhận đăng ký (Gửi lại)" : "[QLTaiLieu] Mã xác nhận đăng ký");
            
            String htmlContent = "<!DOCTYPE html>"
                + "<html>"
                + "<head>"
                + "<meta charset='UTF-8'>"
                + "<style>"
                + "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }"
                + ".container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }"
                + ".header { background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); color: white; padding: 40px 30px; text-align: center; }"
                + ".header h1 { margin: 0; font-size: 24px; font-weight: 600; }"
                + ".content { padding: 40px 30px; text-align: center; }"
                + ".title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 0 0 10px 0; }"
                + ".subtitle { font-size: 14px; color: #666; margin: 0 0 30px 0; line-height: 1.5; }"
                + ".code-box { background: #f9f9f9; border: 2px solid #e0e0e0; border-radius: 12px; padding: 30px 20px; margin: 20px 0; }"
                + ".code { font-size: 48px; font-weight: 700; color: #2563eb; letter-spacing: 8px; margin: 10px 0; font-family: 'Courier New', monospace; }"
                + ".expiry { font-size: 13px; color: #666; margin-top: 15px; }"
                + ".footer { background: #fafafa; padding: 20px 30px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #e0e0e0; }"
                + ".warning { background: #fff5f5; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; text-align: left; }"
                + ".warning p { margin: 5px 0; font-size: 13px; color: #991b1b; }"
                + "</style>"
                + "</head>"
                + "<body>"
                + "<div class='container'>"
                + "<div class='header'>"
                + "<h1>📨 Hệ Thống Quản Lý Tài Liệu</h1>"
                + "</div>"
                + "<div class='content'>"
                + "<p class='title'>Mã xác thực của bạn</p>"
                + "<p class='subtitle'>Vui lòng sử dụng mã 6 số dưới đây để hoàn tất đăng ký.</p>"
                + "<div class='code-box'>"
                + "<div class='code'>" + code + "</div>"
                + "<p class='expiry'>Mã này có hiệu lực trong <strong>3 phút</strong>.</p>"
                + "</div>"
                + "<div class='warning'>"
                + "<p><strong>⚠️ Lưu ý:</strong></p>"
                + "<p>• Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>"
                + "<p>• Không chia sẻ mã này với bất kỳ ai.</p>"
                + "</div>"
                + "</div>"
                + "<div class='footer'>"
                + "<p>© 2025 Web Quản Lý Tài Liệu. All rights reserved.</p>"
                + "<p>Email này được gửi tự động, vui lòng không trả lời.</p>"
                + "</div>"
                + "</div>"
                + "</body>"
                + "</html>";
            
            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
            log.info("Verification email sent to {}", to);
        } catch (Exception e) {
            log.error("Không thể gửi email xác nhận cho {}: {}", to, e.getMessage());
            throw new MailDeliveryException("Không thể gửi email xác nhận. Email có thể không tồn tại.", e);
        }
    }

    public void verifyEmail(String email, String code) {
        var opt = userRepository.findByEmailNormalized(normalizeEmail(email));
        if (opt.isEmpty()) throw new IllegalArgumentException("Email không hợp lệ hoặc chưa đăng ký");
        User u = opt.get();

        if (u.getVerificationCode() == null || !u.getVerificationCode().equals(code))
            throw new IllegalArgumentException("Mã xác nhận không đúng");
        if (u.getVerificationExpiry() == null || u.getVerificationExpiry().isBefore(LocalDateTime.now()))
            throw new IllegalArgumentException("Mã xác nhận đã hết hạn");

        u.setVerified(true);
        u.setVerificationCode(null);
        userRepository.save(u);
        log.info("Email verified successfully for user: {}", u.getEmail());
    }

    public AuthResponse login(AuthRequest req) {
        var opt = findUserByIdentifier(req.getEmail());
        if (opt.isEmpty()) throw new IllegalArgumentException("Sai thông tin đăng nhập");
        User u = opt.get();

        if (!passwordEncoder.matches(req.getPassword(), u.getPassword()))
            throw new IllegalArgumentException("Sai thông tin đăng nhập");

        if (u.isAccountLocked()) {
            String normalizedReason = u.getLockReason() == null ? null : u.getLockReason().trim();
            String message = (normalizedReason == null || normalizedReason.isBlank())
                ? "Tài khoản của bạn đã bị khóa bởi quản trị viên."
                : "Tài khoản của bạn đã bị khóa: " + normalizedReason;
            throw new IllegalArgumentException(message);
        }

        if (!u.isVerified())
            throw new IllegalArgumentException("Email chưa được xác minh");

        String token = jwtUtil.generateToken(u.getEmail());
        return new AuthResponse(token);
    }

    public boolean resendVerification(String email) {
        String norm = normalizeEmail(email);
        var opt = userRepository.findByEmailNormalized(norm);
        if (opt.isEmpty()) throw new ResourceNotFoundException("Email không tồn tại");
        User u = opt.get();

        if (u.isVerified())
            throw new IllegalArgumentException("Email đã được xác minh");

        if (u.getVerificationExpiry() != null && u.getVerificationExpiry().isAfter(LocalDateTime.now().plusSeconds(30)))
            throw new IllegalArgumentException("Vui lòng chờ 30 giây trước khi gửi lại mã");

        String code = String.format("%06d", new Random().nextInt(1_000_000));
        u.setVerificationCode(code);
        u.setVerificationExpiry(LocalDateTime.now().plusMinutes(3));
        userRepository.save(u);

        sendVerificationEmail(u.getEmail(), code, true);
        return true;
    }

    public Map<String, Object> getUserInfo(String email) {
        var opt = userRepository.findByEmailNormalized(normalizeEmail(email));
        if (opt.isEmpty()) throw new ResourceNotFoundException("Không tìm thấy người dùng");
        User u = opt.get();

        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getIdUser());
        m.put("email", u.getEmail());
        m.put("verified", u.isVerified());
        m.put("verificationExpiry", u.getVerificationExpiry());
        m.put("username", u.getTenUser());
        return m;
    }

    public List<Map<String, Object>> listUsers() {
        return userRepository.findAll().stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getIdUser());
            m.put("email", u.getEmail());
            m.put("verified", u.isVerified());
            return m;
        }).toList();
    }

    public boolean sendVerificationCode(String email) {
        String norm = normalizeEmail(email);

        if (norm == null || norm.isBlank() || !norm.matches("^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$")) {
            throw new IllegalArgumentException("Định dạng email không hợp lệ");
        }

        var existing = userRepository.findByEmailNormalized(norm);
        User u;
        if (existing.isPresent()) {
            u = existing.get();
            if (u.getPassword() != null && !u.getPassword().startsWith("TEMP_")) {
                throw new IllegalArgumentException("Email này đã được đăng ký tài khoản. Vui lòng đăng nhập.");
            }
        } else {
            u = new User();
            u.setEmail(norm);
            u.setTenUser(norm); 
            u.setPassword("TEMP_" + new Random().nextInt(999999));
            u.setIdLoaiNguoiDung(4L); // Mặc định là SINHVIEN
            u.setVerified(false);
            u.setCreatedAt(LocalDateTime.now());
            u.setLichSuDang(LocalDateTime.now());
        }

        if (u.getVerificationExpiry() != null && u.getVerificationExpiry().isAfter(LocalDateTime.now().plusSeconds(30))) {
            throw new IllegalArgumentException("Vui lòng chờ 30 giây trước khi yêu cầu lại mã");
        }

        String code = String.format("%06d", new Random().nextInt(1_000_000));
        u.setVerificationCode(code);
        u.setVerificationExpiry(LocalDateTime.now().plusMinutes(3));

        sendVerificationEmail(u.getEmail(), code, false); 
        
        userRepository.save(u);
        log.info("Verification code generated, sent, and user saved for {}", norm);
        return true;
    }
    
    /**
     * Hàm giữ lại để frontend có thể áp dụng các quy tắc đặc biệt
     * đối với người dùng đầu tiên (nếu cần).
     */
    public boolean isFirstUser() {
        return userRepository.count() == 0;
    }

    // === Quên mật khẩu - Gửi mã reset ===
    public void sendPasswordResetCode(String email) {
        String norm = normalizeEmail(email);
        if (norm == null || norm.isBlank()) {
            throw new IllegalArgumentException("Email không hợp lệ");
        }

        var opt = userRepository.findByEmailNormalized(norm);
        if (opt.isEmpty()) {
            throw new IllegalArgumentException("Email này chưa được đăng ký");
        }

        User u = opt.get();
        if (!u.isVerified()) {
            throw new IllegalArgumentException("Email chưa được xác minh. Vui lòng hoàn tất đăng ký trước.");
        }

        // Kiểm tra rate limit (30s giữa các lần gửi)
        if (u.getVerificationExpiry() != null && 
            u.getVerificationExpiry().isAfter(LocalDateTime.now().plusSeconds(30))) {
            throw new IllegalArgumentException("Vui lòng chờ 30 giây trước khi gửi lại mã");
        }

        // Tạo mã reset
        String code = String.format("%06d", new Random().nextInt(1_000_000));
        u.setVerificationCode(code);
        u.setVerificationExpiry(LocalDateTime.now().plusMinutes(5)); // 5 phút cho reset password
        userRepository.save(u);

        // Gửi email
        sendPasswordResetEmail(u.getEmail(), code);
        log.info("Password reset code sent to {}", u.getEmail());
    }

    private void sendPasswordResetEmail(String to, String code) {
        if (mailSender == null) {
            log.warn("MailSender not configured - password reset email not sent for {}", to);
            throw new MailDeliveryException("Mail server chưa được cấu hình");
        }
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            
            if (mailUsername != null && !mailUsername.isBlank()) helper.setFrom(mailUsername);
            helper.setTo(to);
            helper.setSubject("[QLTaiLieu] Mã đặt lại mật khẩu");
            
            String htmlContent = "<!DOCTYPE html>"
                + "<html>"
                + "<head>"
                + "<meta charset='UTF-8'>"
                + "<style>"
                + "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }"
                + ".container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }"
                + ".header { background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); color: white; padding: 40px 30px; text-align: center; }"
                + ".header h1 { margin: 0; font-size: 24px; font-weight: 600; }"
                + ".content { padding: 40px 30px; text-align: center; }"
                + ".title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 0 0 10px 0; }"
                + ".subtitle { font-size: 14px; color: #666; margin: 0 0 30px 0; line-height: 1.5; }"
                + ".code-box { background: #f9f9f9; border: 2px solid #e0e0e0; border-radius: 12px; padding: 30px 20px; margin: 20px 0; }"
                + ".code { font-size: 48px; font-weight: 700; color: #2563eb; letter-spacing: 8px; margin: 10px 0; font-family: 'Courier New', monospace; }"
                + ".expiry { font-size: 13px; color: #666; margin-top: 15px; }"
                + ".footer { background: #fafafa; padding: 20px 30px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #e0e0e0; }"
                + ".warning { background: #fff5f5; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; text-align: left; }"
                + ".warning p { margin: 5px 0; font-size: 13px; color: #991b1b; }"
                + "</style>"
                + "</head>"
                + "<body>"
                + "<div class='container'>"
                + "<div class='header'>"
                + "<h1>🔑 Đặt Lại Mật Khẩu</h1>"
                + "</div>"
                + "<div class='content'>"
                + "<p class='title'>Mã xác thực của bạn</p>"
                + "<p class='subtitle'>Vui lòng sử dụng mã 6 số dưới đây để đặt lại mật khẩu.</p>"
                + "<div class='code-box'>"
                + "<div class='code'>" + code + "</div>"
                + "<p class='expiry'>Mã này có hiệu lực trong <strong>5 phút</strong>.</p>"
                + "</div>"
                + "<div class='warning'>"
                + "<p><strong>⚠️ Lưu ý:</strong></p>"
                + "<p>• Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>"
                + "<p>• Không chia sẻ mã này với bất kỳ ai.</p>"
                + "<p>• Nếu bạn không thực hiện hành động này, hãy thay đổi mật khẩu ngay.</p>"
                + "</div>"
                + "</div>"
                + "<div class='footer'>"
                + "<p>© 2025 Web Quản Lý Tài Liệu. All rights reserved.</p>"
                + "<p>Email này được gửi tự động, vui lòng không trả lời.</p>"
                + "</div>"
                + "</div>"
                + "</body>"
                + "</html>";
            
            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
            log.info("Password reset email sent to {}", to);
        } catch (Exception e) {
            log.error("Không thể gửi email reset mật khẩu cho {}: {}", to, e.getMessage());
            throw new MailDeliveryException("Không thể gửi email. Vui lòng kiểm tra lại địa chỉ email.", e);
        }
    }

    // === Reset mật khẩu với mã xác nhận ===
    public void resetPassword(String email, String code, String newPassword, String confirmPassword) {
        String norm = normalizeEmail(email);
        if (norm == null || norm.isBlank()) {
            throw new IllegalArgumentException("Email không hợp lệ");
        }

        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("Mật khẩu mới không được để trống");
        }

        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Mật khẩu xác nhận không khớp");
        }

        var opt = userRepository.findByEmailNormalized(norm);
        if (opt.isEmpty()) {
            throw new IllegalArgumentException("Email không hợp lệ");
        }

        User u = opt.get();

        // Kiểm tra mã xác nhận
        if (u.getVerificationCode() == null || !u.getVerificationCode().equals(code)) {
            throw new IllegalArgumentException("Mã xác nhận không đúng");
        }

        if (u.getVerificationExpiry() == null || u.getVerificationExpiry().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Mã xác nhận đã hết hạn");
        }

        // Đặt lại mật khẩu
        u.setPassword(passwordEncoder.encode(newPassword));
        u.setVerificationCode(null);
        u.setVerificationExpiry(null);
        userRepository.save(u);

        log.info("Password reset successfully for user: {}", u.getEmail());
    }

    // === Test Email ===
    public void sendTestEmail(String email) throws MailDeliveryException {
        // ... (Giữ nguyên hàm test email)
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("Email không hợp lệ.");
        }

        if (mailSender == null) {
            log.warn("MailSender not configured - test email not sent for {}", email);
            throw new MailDeliveryException("Mail server chưa được cấu hình");
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, "UTF-8");

            helper.setTo(email);
            if (mailUsername != null && !mailUsername.isBlank()) {
                helper.setFrom(mailUsername);
            }
            helper.setSubject("[QLTaiLieu] Test Email");
            helper.setText("Đây là email test từ hệ thống.", false);

            mailSender.send(mimeMessage);
            log.info("Test email sent to {}", email);
        } catch (Exception e) {
            log.error("Không thể gửi email test cho {}: {}", email, e.getMessage());
            throw new MailDeliveryException("Không thể gửi email test", e);
        }
    }
}