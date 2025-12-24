package com.webquanly.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.webquanly.service.NotificationService;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(
    origins = {"http://localhost:5173", "http://127.0.0.1:5173"},
    allowCredentials = "true"
)
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<?> list(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Bạn cần đăng nhập"));
        }
        try {
            return ResponseEntity.ok(notificationService.listForUser(authentication.getName()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Bạn cần đăng nhập"));
        }
        try {
            notificationService.markAsRead(authentication.getName(), id);
            return ResponseEntity.ok(Map.of("message", "Đã cập nhật"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> markAll(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Bạn cần đăng nhập"));
        }
        try {
            notificationService.markAllAsRead(authentication.getName());
            return ResponseEntity.ok(Map.of("message", "Đã cập nhật"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Bạn cần đăng nhập"));
        }
        try {
            notificationService.deleteNotification(authentication.getName(), id);
            return ResponseEntity.ok(Map.of("message", "Đã xóa"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }
}
