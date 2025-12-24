package com.webquanly.controller;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.webquanly.dto.CommentResponse;
import com.webquanly.dto.CreateCommentRequest;
import com.webquanly.dto.DocumentDetailResponse;
import com.webquanly.dto.DocumentResponse;
import com.webquanly.dto.DocumentSubjectAssignRequest;
import com.webquanly.dto.RatingRequest;
import com.webquanly.dto.RatingSummaryResponse;
import com.webquanly.dto.ReportCommentRequest;
import com.webquanly.dto.ReportDocumentRequest;
import com.webquanly.service.AdminService;
import com.webquanly.service.DocumentService;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    @Autowired
    private DocumentService documentService;

    @Autowired
    private AdminService adminService;

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam(name = "title", required = false) String title,
                                    @RequestParam("subjectId") Long subjectId,
                                    Authentication authentication) {
        try {
            String username = authentication != null ? authentication.getName() : null;
            DocumentResponse dto = documentService.store(file, title, subjectId, username);
            return ResponseEntity.status(201).body(dto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(java.util.Map.of("error", "Failed to store file"));
        }
    }

    @PostMapping("/preview")
    public ResponseEntity<?> preview(@RequestParam("file") MultipartFile file) {
        try {
            byte[] png = documentService.generatePreviewSafe(file);
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(png);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(java.util.Map.of("error", "Failed to render preview"));
        }
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<?> previewStored(@PathVariable Long id, Authentication authentication) {
        try {
            String viewer = authentication != null ? authentication.getName() : null;
            boolean isAdmin = viewer != null && adminService.isAdmin(viewer);
            byte[] png = documentService.generateStoredPreviewSafeWithAccess(id, viewer, isAdmin);
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(png);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(java.util.Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(java.util.Map.of("error", "Failed to render preview"));
        }
    }

    @GetMapping("/{id}/full-preview")
    public ResponseEntity<?> fullPreview(@PathVariable Long id, Authentication authentication) {
        try {
            String viewer = authentication != null ? authentication.getName() : null;
            boolean isAdmin = viewer != null && adminService.isAdmin(viewer);
            byte[] pdfBytes = documentService.generateStoredFullPreviewPdfWithAccess(id, viewer, isAdmin);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"preview.pdf\"")
                    .body(pdfBytes);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(java.util.Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(java.util.Map.of("error", "Failed to render preview"));
        }
    }

    @GetMapping("/{id}/reports")
    public ResponseEntity<?> listReports(@PathVariable Long id, Authentication authentication) {
        if (authentication == null || !adminService.isAdmin(authentication.getName())) {
            return ResponseEntity.status(403).body(Map.of("error", "Bạn không có quyền"));
        }
        try {
            return ResponseEntity.ok(documentService.listDocumentReportsForAdmin(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/reports")
    public ResponseEntity<?> clearReports(@PathVariable Long id, Authentication authentication) {
        if (authentication == null || !adminService.isAdmin(authentication.getName())) {
            return ResponseEntity.status(403).body(Map.of("error", "Bạn không có quyền"));
        }
        try {
            documentService.clearDocumentReportsForAdmin(id);
            return ResponseEntity.ok(Map.of("message", "Đã bác bỏ báo cáo"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public List<DocumentResponse> list() {
        return documentService.listAll();
    }

    @PatchMapping("/{id}/subject")
    public ResponseEntity<?> assignSubject(@PathVariable Long id,
                                           @RequestBody(required = false) DocumentSubjectAssignRequest request,
                                           Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Bạn cần đăng nhập"));
        }
        if (request == null || request.getSubjectId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Vui lòng chọn môn học"));
        }
        try {
            boolean isAdmin = adminService.isAdmin(authentication.getName());
            DocumentResponse response = documentService.assignSubjectForOwner(
                    id,
                    request.getSubjectId(),
                    authentication.getName(),
                    isAdmin
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id, Authentication authentication) {
        String viewer = authentication != null ? authentication.getName() : null;
        boolean isAdmin = viewer != null && adminService.isAdmin(viewer);
        DocumentResponse d = documentService.findByIdWithAccess(id, viewer, isAdmin);
        if (d == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(d);
    }

    @GetMapping("/{id}/detail")
    public ResponseEntity<?> detail(@PathVariable Long id, Authentication authentication) {
        try {
            String viewer = authentication != null ? authentication.getName() : null;
            boolean isAdmin = viewer != null && adminService.isAdmin(viewer);
            DocumentDetailResponse detail = documentService.getDetailWithAccess(id, viewer, isAdmin);
            return ResponseEntity.ok(detail);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<?> comments(@PathVariable Long id, Authentication authentication) {
        try {
            String viewer = authentication != null ? authentication.getName() : null;
            boolean isAdmin = viewer != null && adminService.isAdmin(viewer);
            if (documentService.findByIdWithAccess(id, viewer, isAdmin) == null) {
                return ResponseEntity.notFound().build();
            }
            List<CommentResponse> comments = documentService.listComments(id, viewer);
            return ResponseEntity.ok(comments);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<?> addComment(@PathVariable Long id,
                                        @RequestBody CreateCommentRequest request,
                                        Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(java.util.Map.of("error", "Bạn cần đăng nhập để bình luận"));
        }
        if (!adminService.isAdmin(authentication.getName())
                && documentService.findByIdWithAccess(id, authentication.getName(), false) == null) {
            return ResponseEntity.status(404).body(java.util.Map.of("error", "Tài liệu không tồn tại"));
        }
        try {
            CommentResponse response = documentService.addComment(
                    id,
                    request.getContent(),
                    request.getParentId(),
                    authentication.getName()
            );
            return ResponseEntity.status(201).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{documentId}/comments/{commentId}/report")
    public ResponseEntity<?> reportComment(@PathVariable Long documentId,
                                           @PathVariable Long commentId,
                                           @RequestBody(required = false) ReportCommentRequest request,
                                           Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(java.util.Map.of("error", "Bạn cần đăng nhập để báo cáo"));
        }
        if (!adminService.isAdmin(authentication.getName())
                && documentService.findByIdWithAccess(documentId, authentication.getName(), false) == null) {
            return ResponseEntity.status(404).body(java.util.Map.of("error", "Tài liệu không tồn tại"));
        }
        try {
            String reason = request != null ? request.getReason() : null;
            documentService.reportComment(documentId, commentId, reason, authentication.getName());
            return ResponseEntity.ok(java.util.Map.of("message", "Đã ghi nhận báo cáo"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/report")
    public ResponseEntity<?> reportDocument(@PathVariable Long id,
                                            @RequestBody(required = false) ReportDocumentRequest request,
                                            Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Bạn cần đăng nhập để báo cáo"));
        }
        try {
            String reason = request != null ? request.getReason() : null;
            documentService.reportDocument(id, reason, authentication.getName());
            return ResponseEntity.ok(Map.of("message", "Đã ghi nhận báo cáo"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/rating")
    public ResponseEntity<?> rating(@PathVariable Long id, Authentication authentication) {
        try {
            String viewer = authentication != null ? authentication.getName() : null;
            boolean isAdmin = viewer != null && adminService.isAdmin(viewer);
            if (documentService.findByIdWithAccess(id, viewer, isAdmin) == null) {
                return ResponseEntity.notFound().build();
            }
            RatingSummaryResponse summary = documentService.getRatingSummary(id, viewer);
            return ResponseEntity.ok(summary);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/rating")
    public ResponseEntity<?> rate(@PathVariable Long id,
                                   @RequestBody RatingRequest request,
                                   Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(java.util.Map.of("error", "Bạn cần đăng nhập để đánh giá"));
        }
        if (!adminService.isAdmin(authentication.getName())
                && documentService.findByIdWithAccess(id, authentication.getName(), false) == null) {
            return ResponseEntity.status(404).body(java.util.Map.of("error", "Tài liệu không tồn tại"));
        }
        Integer score = request.getScore();
        if (score == null) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Vui lòng chọn số sao hợp lệ"));
        }
        try {
            RatingSummaryResponse summary = documentService.rateDocument(id, score, authentication.getName());
            return ResponseEntity.ok(summary);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> download(@PathVariable Long id, Authentication authentication) {
        String viewer = authentication != null ? authentication.getName() : null;
        boolean isAdmin = viewer != null && adminService.isAdmin(viewer);
        var dto = documentService.findByIdWithAccess(id, viewer, isAdmin);
        if (dto == null) return ResponseEntity.notFound().build();
        try {
            Path p = documentService.getPathByIdWithAccess(id, viewer, isAdmin);
            Resource resource = new UrlResource(p.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.status(404).body(java.util.Map.of("error", "File không tồn tại"));
            }
            documentService.incrementDownloadCount(id);
            String ct = dto.getContentType() != null ? dto.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
            String downloadName = resolveDownloadFilename(dto);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(ct))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + downloadName + "\"")
                    .body(resource);
        } catch (MalformedURLException e) {
            return ResponseEntity.status(500).body(java.util.Map.of("error", "File access error"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }

    }

    private String resolveDownloadFilename(DocumentResponse dto) {
        String original = dto.getFilename();
        String base = dto.getTitle();
        if (base == null || base.isBlank()) {
            return original != null ? original : "document";
        }
        String sanitized = base.replace('"', ' ').trim();
        if (original != null && original.contains(".")) {
            String ext = original.substring(original.lastIndexOf('.'));
            if (!sanitized.toLowerCase().endsWith(ext.toLowerCase())) {
                sanitized += ext;
            }
        }
        return sanitized;
    }
}
