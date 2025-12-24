package com.webquanly.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.webquanly.dto.PasswordChangeRequest;
import com.webquanly.dto.UserProfileResponse;
import com.webquanly.service.ProfileService;

@RestController
@RequestMapping("/api/profile")
@CrossOrigin(
    origins = {"http://localhost:5173", "http://127.0.0.1:5173"},
    allowCredentials = "true"
)
public class ProfileController {

    @Autowired
    private ProfileService profileService;

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Bạn cần đăng nhập"));
        }
        try {
            UserProfileResponse profile = profileService.getProfile(authentication.getName());
            return ResponseEntity.ok(profile);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/avatar")
    public ResponseEntity<?> uploadAvatar(@RequestParam("file") MultipartFile file, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Bạn cần đăng nhập"));
        }
        try {
            String avatarUrl = profileService.updateAvatar(file, authentication.getName());
            return ResponseEntity.ok(Map.of("avatarUrl", avatarUrl));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Không thể cập nhật avatar"));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody PasswordChangeRequest request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Bạn cần đăng nhập"));
        }
        try {
            profileService.changePassword(authentication.getName(), request);
            return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/avatar/{fileName:.+}")
    public ResponseEntity<?> fetchAvatar(@PathVariable String fileName) {
        try {
            Resource resource = profileService.loadAvatar(fileName);
            MediaType mediaType = resolveMediaType(fileName);
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noCache())
                    .contentType(mediaType)
                    .body(resource);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(404).body(Map.of("error", ex.getMessage()));
        }
    }

    private MediaType resolveMediaType(String fileName) {
        String lower = fileName == null ? "" : fileName.toLowerCase();
        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (lower.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }
        return MediaType.IMAGE_JPEG;
    }
}
