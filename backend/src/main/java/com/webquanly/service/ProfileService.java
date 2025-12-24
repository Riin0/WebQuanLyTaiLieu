package com.webquanly.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.webquanly.dto.DocumentResponse;
import com.webquanly.dto.PasswordChangeRequest;
import com.webquanly.dto.UserProfileResponse;
import com.webquanly.model.TaiLieu;
import com.webquanly.model.User;
import com.webquanly.repository.TaiLieuRepository;
import com.webquanly.repository.UserRepository;

@Service
public class ProfileService {
    private static final Logger LOGGER = LoggerFactory.getLogger(ProfileService.class);
    private static final long MAX_AVATAR_SIZE = 5L * 1024 * 1024; // 5MB
    private static final List<String> SUPPORTED_AVATAR_CONTENT_TYPES = List.of("image/png", "image/jpeg", "image/webp");

    @Value("${file.avatar-dir:storage/avatars}")
    private String avatarDir;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaiLieuRepository taiLieuRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private DocumentService documentService;

    public UserProfileResponse getProfile(String email) {
        User user = requireUser(email);
        List<TaiLieu> documents = taiLieuRepository.findByUserIdUserOrderByThoiGianDangDesc(user.getIdUser());

        UserProfileResponse response = new UserProfileResponse();
        response.setId(user.getIdUser());
        response.setEmail(user.getEmail());
        response.setName(user.getTenUser());
        response.setRole(user.getPhanQuyen() != null ? user.getPhanQuyen().getTenLoaiNguoiDung() : null);
        response.setCreatedAt(user.getCreatedAt());
        response.setAvatarUrl(buildAvatarUrl(user.getAvatarPath()));

        List<DocumentResponse> mappedDocuments = documents.stream()
                .map(documentService::toSummaryDto)
                .toList();
        response.setDocuments(mappedDocuments);
        response.setTotalDocuments(mappedDocuments.size());
        response.setTotalDownloads(documents.stream()
                .mapToLong(doc -> doc.getSoLuongNguoiTai() == null ? 0 : doc.getSoLuongNguoiTai())
                .sum());
        response.setLastUpload(documents.stream()
                .map(TaiLieu::getThoiGianDang)
                .filter(java.util.Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null));
        return response;
    }

    public String updateAvatar(MultipartFile file, String email) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn ảnh đại diện");
        }
        if (file.getSize() > MAX_AVATAR_SIZE) {
            throw new IllegalArgumentException("Ảnh đại diện không được vượt quá 5MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || SUPPORTED_AVATAR_CONTENT_TYPES.stream().noneMatch(contentType::equalsIgnoreCase)) {
            throw new IllegalArgumentException("Chỉ hỗ trợ PNG, JPG hoặc WEBP");
        }

        User user = requireUser(email);
        Files.createDirectories(getAvatarRoot());

        String storedFileName = buildAvatarFilename(user, contentType);
        Path destination = getAvatarRoot().resolve(storedFileName);
        Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

        String previousAvatar = user.getAvatarPath();
        user.setAvatarPath(storedFileName);
        userRepository.save(user);

        deleteOldAvatar(previousAvatar, storedFileName);
        LOGGER.info("Updated avatar for user {}", user.getEmail());
        return buildAvatarUrl(storedFileName);
    }

    public Resource loadAvatar(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException("Ảnh không tồn tại");
        }
        if (fileName.contains("..")) {
            throw new IllegalArgumentException("Đường dẫn ảnh không hợp lệ");
        }
        try {
            Path filePath = getAvatarRoot().resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new IllegalArgumentException("Không thể đọc ảnh đại diện");
            }
            return resource;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Không thể tải ảnh đại diện", ex);
        }
    }

    public void changePassword(String email, PasswordChangeRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Thiếu thông tin đổi mật khẩu");
        }
        User user = requireUser(email);
        if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập mật khẩu hiện tại");
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không đúng");
        }
        if (request.getNewPassword() == null || request.getNewPassword().length() < 8) {
            throw new IllegalArgumentException("Mật khẩu mới phải có ít nhất 8 ký tự");
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu xác nhận không khớp");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        LOGGER.info("Password updated for user {}", user.getEmail());
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private User requireUser(String email) {
        return userRepository.findByEmailNormalized(normalizeEmail(email))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));
    }

    private Path getAvatarRoot() {
        return Paths.get(avatarDir).toAbsolutePath().normalize();
    }

    private String buildAvatarFilename(User user, String contentType) {
        String extension = switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
        return "avatar-" + user.getIdUser() + "-" + System.currentTimeMillis() + extension;
    }

    private void deleteOldAvatar(String previous, String replacement) {
        if (previous == null || previous.isBlank() || previous.equals(replacement)) {
            return;
        }
        try {
            Files.deleteIfExists(getAvatarRoot().resolve(previous));
        } catch (IOException ex) {
            LOGGER.warn("Không thể xóa avatar cũ {}: {}", previous, ex.getMessage());
        }
    }

    private String buildAvatarUrl(String storedName) {
        if (storedName == null || storedName.isBlank()) {
            return null;
        }
        return "/api/profile/avatar/" + storedName;
    }
}
