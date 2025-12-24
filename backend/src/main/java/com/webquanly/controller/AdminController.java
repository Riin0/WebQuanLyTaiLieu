package com.webquanly.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.webquanly.dto.admin.AdminCommentSummary;
import com.webquanly.dto.admin.AdminDeletionRequest;
import com.webquanly.dto.admin.AdminDocumentReviewRequest;
import com.webquanly.dto.admin.AdminDocumentSubjectUpdateRequest;
import com.webquanly.dto.admin.AdminDocumentSummary;
import com.webquanly.dto.admin.AdminOverviewResponse;
import com.webquanly.dto.admin.AdminUserSummary;
import com.webquanly.dto.admin.AdminUserUpdateRequest;
import com.webquanly.service.AdminService;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(
    origins = {"http://localhost:5173", "http://127.0.0.1:5173"},
    allowCredentials = "true"
)
public class AdminController {

    @Autowired
    private AdminService adminService;

    @GetMapping("/overview")
    public AdminOverviewResponse overview(Authentication authentication) {
        assertAdmin(authentication);
        return adminService.getOverview();
    }

    @GetMapping("/users")
    public List<AdminUserSummary> users(Authentication authentication) {
        assertAdmin(authentication);
        return adminService.listUsers();
    }

    @PatchMapping("/users/{id}")
    public AdminUserSummary updateUser(@PathVariable Long id,
                                        @RequestBody AdminUserUpdateRequest request,
                                        Authentication authentication) {
        assertAdmin(authentication);
        return adminService.updateUser(id, request);
    }

    @GetMapping("/documents")
    public List<AdminDocumentSummary> documents(Authentication authentication) {
        assertAdmin(authentication);
        return adminService.listDocuments();
    }

    @GetMapping("/review/documents")
    public List<AdminDocumentSummary> pendingReviewDocuments(Authentication authentication) {
        assertAdmin(authentication);
        return adminService.listPendingReviewDocuments();
    }

    @PatchMapping("/review/documents/{id}")
    public ResponseEntity<Map<String, String>> reviewDocument(@PathVariable Long id,
                                                              @RequestBody AdminDocumentReviewRequest request,
                                                              Authentication authentication) {
        assertAdmin(authentication);
        if (request == null || request.getAction() == null || request.getAction().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu hành động kiểm duyệt");
        }
        try {
            adminService.reviewDocument(id, request.getAction(), request.getReason(), authentication.getName());
            return ResponseEntity.ok(Map.of("message", "Đã cập nhật kiểm duyệt"));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @DeleteMapping("/documents/{id}")
    public ResponseEntity<Map<String, String>> deleteDocument(@PathVariable Long id,
                                                              @RequestBody(required = false) AdminDeletionRequest request,
                                                              Authentication authentication) {
        assertAdmin(authentication);
        String reason = request != null ? request.getReason() : null;
        adminService.deleteDocument(id, reason);
        return ResponseEntity.ok(Map.of("message", "Đã xóa tài liệu"));
    }

    @GetMapping("/comments")
    public List<AdminCommentSummary> comments(Authentication authentication) {
        assertAdmin(authentication);
        return adminService.listComments();
    }

    @PatchMapping("/documents/{id}/subject")
    public AdminDocumentSummary changeDocumentSubject(@PathVariable Long id,
                                                      @RequestBody AdminDocumentSubjectUpdateRequest request,
                                                      Authentication authentication) {
        assertAdmin(authentication);
        if (request == null || request.getSubjectId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng chọn môn học mới");
        }
        return adminService.updateDocumentSubject(id, request.getSubjectId());
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Map<String, String>> deleteComment(@PathVariable Long id,
                                                             @RequestBody(required = false) AdminDeletionRequest request,
                                                             Authentication authentication) {
        assertAdmin(authentication);
        String reason = request != null ? request.getReason() : null;
        adminService.deleteComment(id, reason);
        return ResponseEntity.ok(Map.of("message", "Đã xóa bình luận"));
    }

    private void assertAdmin(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || !adminService.isAdmin(authentication.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chức năng chỉ dành cho quản trị viên");
        }
    }
}
