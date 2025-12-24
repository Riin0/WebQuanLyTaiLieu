package com.webquanly.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.webquanly.dto.admin.AdminCommentSummary;
import com.webquanly.dto.admin.AdminDocumentSummary;
import com.webquanly.dto.admin.AdminOverviewResponse;
import com.webquanly.dto.admin.AdminUserSummary;
import com.webquanly.dto.admin.AdminUserUpdateRequest;
import com.webquanly.model.BinhLuan;
import com.webquanly.model.PhanQuyen;
import com.webquanly.model.TaiLieu;
import com.webquanly.model.User;
import com.webquanly.repository.BinhLuanReportRepository;
import com.webquanly.repository.BinhLuanRepository;
import com.webquanly.repository.PhanQuyenRepository;
import com.webquanly.repository.TaiLieuReportRepository;
import com.webquanly.repository.TaiLieuRepository;
import com.webquanly.repository.UserRepository;

@Service
public class AdminService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaiLieuRepository taiLieuRepository;

    @Autowired
    private BinhLuanRepository binhLuanRepository;

    @Autowired
    private BinhLuanReportRepository binhLuanReportRepository;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private PhanQuyenRepository phanQuyenRepository;

    @Autowired
    private TaiLieuReportRepository taiLieuReportRepository;

    public boolean isAdmin(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        return userOpt.filter(this::hasAdminRole).isPresent();
    }

    private boolean hasAdminRole(User user) {
        if (user == null) {
            return false;
        }
        if (user.getIdLoaiNguoiDung() != null && user.getIdLoaiNguoiDung() == 2L) {
            return true;
        }
        return user.getPhanQuyen() != null
            && user.getPhanQuyen().getTenLoaiNguoiDung() != null
            && user.getPhanQuyen().getTenLoaiNguoiDung().equalsIgnoreCase("ADMIN");
    }

    public AdminOverviewResponse getOverview() {
        AdminOverviewResponse overview = new AdminOverviewResponse();
        overview.setTotalUsers(userRepository.count());
        overview.setVerifiedUsers(userRepository.countByVerifiedTrue());
        overview.setTotalDocuments(taiLieuRepository.count());
        Long downloads = taiLieuRepository.sumDownloadCount();
        overview.setTotalDownloads(downloads == null ? 0 : downloads);
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = LocalDateTime.of(today, LocalTime.MAX);
        overview.setDocumentsToday(taiLieuRepository.countByThoiGianDangBetween(startOfDay, endOfDay));
        overview.setTotalComments(binhLuanRepository.count());
        return overview;
    }

    public List<AdminUserSummary> listUsers() {
        return userRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(this::toUserSummary)
            .collect(Collectors.toList());
    }

    @Transactional
    public AdminUserSummary updateUser(Long userId, AdminUserUpdateRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại"));

        if (request.getRoleId() != null || (request.getRoleSlug() != null && !request.getRoleSlug().isBlank())) {
            PhanQuyen role = resolveRole(request);
            user.setIdLoaiNguoiDung(role.getId());
            user.setPhanQuyen(role);
        }

        if (request.getVerified() != null) {
            user.setVerified(request.getVerified());
        }

        if (request.getAccountLocked() != null) {
            boolean locking = request.getAccountLocked();
            user.setAccountLocked(locking);
            if (locking) {
                String reason = normalizeLockReason(request.getLockReason());
                if (reason == null || reason.isBlank()) {
                    throw new IllegalArgumentException("Vui lòng cung cấp lý do khóa tài khoản");
                }
                user.setLockReason(reason);
            } else {
                user.setLockReason(null);
            }
        } else if (request.getLockReason() != null) {
            String reason = normalizeLockReason(request.getLockReason());
            if (user.isAccountLocked() && (reason == null || reason.isBlank())) {
                throw new IllegalArgumentException("Vui lòng cung cấp lý do khóa tài khoản");
            }
            user.setLockReason(reason);
        }

        userRepository.save(user);
        return toUserSummary(user);
    }

    public List<AdminDocumentSummary> listDocuments() {
        List<TaiLieu> documents = taiLieuRepository.findTop20ByOrderByThoiGianDangDesc();
        Map<Long, Long> reportCounts = mapDocumentReportCounts(documents);
        return documents.stream()
            .map(doc -> toDocumentSummary(doc, reportCounts.getOrDefault(doc.getId(), 0L)))
            .collect(Collectors.toList());
    }

    public List<AdminDocumentSummary> listPendingReviewDocuments() {
        List<TaiLieu> pendingDocuments = taiLieuRepository
            .findTop20ByTrangThaiKiemDuyetIgnoreCaseOrderByThoiGianDangDesc(DocumentService.REVIEW_PENDING);
        Map<Long, Long> reportCounts = mapDocumentReportCounts(pendingDocuments);
        return pendingDocuments.stream()
            .map(doc -> toDocumentSummary(doc, reportCounts.getOrDefault(doc.getId(), 0L)))
            .collect(Collectors.toList());
    }

    @Transactional
    public void reviewDocument(Long documentId, String action, String reason, String adminEmail) {
        if (documentId == null) {
            throw new IllegalArgumentException("Thiếu mã tài liệu");
        }
        if (action == null || action.isBlank()) {
            throw new IllegalArgumentException("Thiếu hành động kiểm duyệt");
        }
        String normalizedAction = action.trim().toUpperCase(Locale.ROOT);

        TaiLieu taiLieu = taiLieuRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));

        LocalDateTime now = LocalDateTime.now();
        taiLieu.setNguoiKiemDuyet(adminEmail);
        taiLieu.setThoiGianKiemDuyet(now);

        if ("APPROVE".equals(normalizedAction) || "APPROVED".equals(normalizedAction)) {
            taiLieu.setTrangThaiKiemDuyet(DocumentService.REVIEW_APPROVED);
            taiLieu.setLyDoKiemDuyet(null);
            taiLieuRepository.save(taiLieu);
            notificationService.notifyDocumentReviewApproved(taiLieu);
            return;
        }

        if ("REJECT".equals(normalizedAction) || "REJECTED".equals(normalizedAction)) {
            String normalizedReason = reason == null ? null : reason.trim();
            if (normalizedReason == null || normalizedReason.isBlank()) {
                throw new IllegalArgumentException("Vui lòng nhập lý do từ chối");
            }
            notificationService.notifyDocumentReviewRejected(taiLieu, normalizedReason);
            documentService.deleteDocumentSilently(taiLieu.getId(), normalizedReason);
            return;
        }

        throw new IllegalArgumentException("Hành động kiểm duyệt không hợp lệ");
    }

    @Transactional
    public void deleteDocument(Long documentId, String reason) {
        documentService.deleteDocument(documentId, reason);
    }

    public AdminDocumentSummary updateDocumentSubject(Long documentId, Long subjectId) {
        if (subjectId == null) {
            throw new IllegalArgumentException("Môn học mới là bắt buộc");
        }
        TaiLieu updated = documentService.changeDocumentSubject(documentId, subjectId);
        return toDocumentSummary(updated);
    }

    public List<AdminCommentSummary> listComments() {
        List<BinhLuan> comments = binhLuanRepository.findTop50ByOrderByThoiGianDesc();
        Map<Long, Long> reportCounts = Collections.emptyMap();
        if (!comments.isEmpty()) {
            List<Long> ids = comments.stream()
                .map(BinhLuan::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
            if (!ids.isEmpty()) {
                reportCounts = binhLuanReportRepository.mapCounts(ids);
            }
        }
        Map<Long, Long> finalReportCounts = reportCounts;
        return comments.stream()
            .map(comment -> toCommentSummary(comment, finalReportCounts.getOrDefault(comment.getId(), 0L)))
            .collect(Collectors.toList());
    }

    public void deleteComment(Long commentId, String reason) {
        documentService.deleteCommentByAdmin(commentId, reason);
    }

    private PhanQuyen resolveRole(AdminUserUpdateRequest request) {
        if (request.getRoleId() != null) {
            return phanQuyenRepository.findById(request.getRoleId())
                .orElseThrow(() -> new IllegalArgumentException("Vai trò không tồn tại"));
        }
        String normalized = normalizeRole(request.getRoleSlug());
        return phanQuyenRepository.findByTenLoaiNguoiDungIgnoreCase(normalized)
            .orElseThrow(() -> new IllegalArgumentException("Vai trò không tồn tại"));
    }

    private String normalizeRole(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeLockReason(String raw) {
        return raw == null ? null : raw.trim();
    }

    private AdminUserSummary toUserSummary(User user) {
        AdminUserSummary summary = new AdminUserSummary();
        summary.setId(user.getIdUser());
        summary.setUsername(user.getTenUser());
        summary.setEmail(user.getEmail());
        summary.setAvatarUrl(buildAvatarUrl(user));
        summary.setRoleId(user.getIdLoaiNguoiDung());
        summary.setRole(user.getPhanQuyen() != null ? user.getPhanQuyen().getTenLoaiNguoiDung() : null);
        summary.setVerified(user.isVerified());
        summary.setAccountLocked(user.isAccountLocked());
        summary.setLockReason(user.getLockReason());
        summary.setCreatedAt(user.getCreatedAt());
        summary.setLastUpload(resolveLastUpload(user.getIdUser()));
        summary.setTotalDocuments(taiLieuRepository.countByUserIdUser(user.getIdUser()));
        Long downloads = taiLieuRepository.sumDownloadCountByUser(user.getIdUser());
        summary.setTotalDownloads(downloads == null ? 0 : downloads);
        return summary;
    }

    private String buildAvatarUrl(User user) {
        if (user == null) {
            return null;
        }
        String stored = user.getAvatarPath();
        if (stored == null || stored.isBlank()) {
            return null;
        }
        if (stored.startsWith("http://") || stored.startsWith("https://")) {
            return stored;
        }
        String normalized = stored.charAt(0) == '/' ? stored.substring(1) : stored;
        return "/api/profile/avatar/" + normalized;
    }

    private LocalDateTime resolveLastUpload(Long userId) {
        if (userId == null) {
            return null;
        }
        TaiLieu latest = taiLieuRepository.findTop1ByUserIdUserOrderByThoiGianDangDesc(userId);
        return latest != null ? latest.getThoiGianDang() : null;
    }

    private AdminDocumentSummary toDocumentSummary(TaiLieu taiLieu) {
        long reportCount = resolveDocumentReportCount(taiLieu.getId());
        return toDocumentSummary(taiLieu, reportCount);
    }

    private AdminDocumentSummary toDocumentSummary(TaiLieu taiLieu, long reportCount) {
        AdminDocumentSummary summary = new AdminDocumentSummary();
        summary.setId(taiLieu.getId());
        summary.setTitle(taiLieu.getTenTaiLieu());
        summary.setSubject(taiLieu.getMonHoc() != null ? taiLieu.getMonHoc().getTenMonHoc() : null);
        summary.setType(taiLieu.getLoaiTaiLieu() != null ? taiLieu.getLoaiTaiLieu().getTenLoaiTaiLieu() : null);
        if (taiLieu.getMonHoc() != null) {
            summary.setSubjectId(taiLieu.getMonHoc().getId());
        }
        if (taiLieu.getUser() != null) {
            summary.setUploader(taiLieu.getUser().getTenUser());
            summary.setUploaderEmail(taiLieu.getUser().getEmail());
        }
        summary.setDownloadCount(taiLieu.getSoLuongNguoiTai());
        summary.setUploadedAt(taiLieu.getThoiGianDang());
        summary.setPendingSubject(taiLieu.isDangXetChonMon());
        summary.setReviewStatus(taiLieu.getTrangThaiKiemDuyet());
        summary.setReportCount(reportCount);
        summary.setReported(reportCount > 0);
        return summary;
    }

    private AdminCommentSummary toCommentSummary(BinhLuan comment, long reportCount) {
        AdminCommentSummary summary = new AdminCommentSummary();
        summary.setId(comment.getId());
        if (comment.getTaiLieu() != null) {
            summary.setDocumentId(comment.getTaiLieu().getId());
            summary.setDocumentTitle(comment.getTaiLieu().getTenTaiLieu());
        }
        if (comment.getUser() != null) {
            summary.setAuthor(comment.getUser().getTenUser());
        }
        summary.setContent(comment.getNoiDung());
        summary.setCreatedAt(comment.getThoiGian());
        summary.setReportCount(reportCount);
        summary.setFlagged(reportCount > 0);
        return summary;
    }

    private Map<Long, Long> mapDocumentReportCounts(List<TaiLieu> documents) {
        if (documents == null || documents.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> ids = documents.stream()
                .map(TaiLieu::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        return taiLieuReportRepository.mapCounts(ids);
    }

    private long resolveDocumentReportCount(Long documentId) {
        if (documentId == null) {
            return 0L;
        }
        return taiLieuReportRepository.countByDocument_Id(documentId);
    }
}
