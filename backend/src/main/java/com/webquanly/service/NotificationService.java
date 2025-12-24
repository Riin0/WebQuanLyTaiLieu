package com.webquanly.service;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.webquanly.dto.NotificationResponse;
import com.webquanly.model.BinhLuan;
import com.webquanly.model.Notification;
import com.webquanly.model.TaiLieu;
import com.webquanly.model.User;
import com.webquanly.repository.NotificationRepository;
import com.webquanly.repository.UserRepository;

@Service
public class NotificationService {

    public static final String TYPE_PENDING_SUBJECT = "PENDING_SUBJECT";
    public static final String TYPE_COMMENT_REPORT = "COMMENT_REPORT";
    public static final String TYPE_DOCUMENT_REPORT = "DOCUMENT_REPORT";
    public static final String TYPE_DOCUMENT_REMOVAL = "DOCUMENT_REMOVAL";
    public static final String TYPE_COMMENT_REMOVAL = "COMMENT_REMOVAL";
    public static final String TYPE_DOCUMENT_SUBJECT_CHANGE = "DOCUMENT_SUBJECT_CHANGE";
    public static final String TYPE_DOCUMENT_REVIEW_APPROVED = "DOCUMENT_REVIEW_APPROVED";
    public static final String TYPE_DOCUMENT_REVIEW_REJECTED = "DOCUMENT_REVIEW_REJECTED";
    public static final String TYPE_DOCUMENT_REVIEW_PENDING = "DOCUMENT_REVIEW_PENDING";

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    public List<NotificationResponse> listForUser(String email) {
        User user = requireUser(email);
        return notificationRepository.findTop50ByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(String email, Long notificationId) {
        if (notificationId == null) {
            throw new IllegalArgumentException("Thiếu mã thông báo");
        }
        User user = requireUser(email);
        Notification notification = notificationRepository.findByIdAndUser(notificationId, user)
                .orElseThrow(() -> new IllegalArgumentException("Thông báo không tồn tại"));
        if (!notification.isRead()) {
            notification.setRead(true);
            notificationRepository.save(notification);
        }
    }

    @Transactional
    public void markAllAsRead(String email) {
        User user = requireUser(email);
        notificationRepository.findByUserAndReadIsFalse(user).forEach(notification -> {
            notification.setRead(true);
            notificationRepository.save(notification);
        });
    }

    @Transactional
    public void deleteNotification(String email, Long notificationId) {
        if (notificationId == null) {
            throw new IllegalArgumentException("Thiếu mã thông báo");
        }
        User user = requireUser(email);
        Notification notification = notificationRepository.findByIdAndUser(notificationId, user)
                .orElseThrow(() -> new IllegalArgumentException("Thông báo không tồn tại"));
        notificationRepository.delete(notification);
    }

    @Transactional
    public void notifyAdminsOfCommentReport(BinhLuan comment, User reporter, String reason) {
        if (comment == null || comment.getTaiLieu() == null) {
            return;
        }
        List<User> admins = findAdminUsers();
        if (admins.isEmpty()) {
            return;
        }
        TaiLieu document = comment.getTaiLieu();
        for (User admin : admins) {
            Notification notification = new Notification();
            notification.setUser(admin);
            notification.setDocument(document);
            notification.setDocumentTitle(document.getTenTaiLieu());
            notification.setType(TYPE_COMMENT_REPORT);
            notification.setMessage(buildCommentReportMessage(document, comment, reporter, reason));
            notification.setReason(reason);
            notificationRepository.save(notification);
        }
    }

    @Transactional
    public void notifyAdminsOfDocumentReport(TaiLieu document, User reporter, String reason) {
        if (document == null) {
            return;
        }
        List<User> admins = findAdminUsers();
        if (admins.isEmpty()) {
            return;
        }
        for (User admin : admins) {
            Notification notification = new Notification();
            notification.setUser(admin);
            notification.setDocument(document);
            notification.setDocumentTitle(document.getTenTaiLieu());
            notification.setType(TYPE_DOCUMENT_REPORT);
            notification.setMessage(buildDocumentReportMessage(document, reporter, reason));
            notification.setReason(reason);
            notificationRepository.save(notification);
        }
    }

    @Transactional
    public void notifyPendingSubjectSelection(TaiLieu document, String removedSubjectName) {
        if (document == null || document.getUser() == null) {
            return;
        }
        Notification notification = new Notification();
        notification.setUser(document.getUser());
        notification.setDocument(document);
        notification.setDocumentTitle(document.getTenTaiLieu());
        notification.setSubjectName(removedSubjectName);
        notification.setType(TYPE_PENDING_SUBJECT);
        notification.setMessage(buildPendingSubjectMessage(document, removedSubjectName));
        notificationRepository.save(notification);
    }

    @Transactional
    public void notifyDocumentOwnerDeletion(TaiLieu document, String reason) {
        if (document == null || document.getUser() == null) {
            return;
        }
        Notification notification = new Notification();
        notification.setUser(document.getUser());
        notification.setDocumentTitle(document.getTenTaiLieu());
        notification.setType(TYPE_DOCUMENT_REMOVAL);
        notification.setMessage(buildDocumentRemovalMessage(document, reason));
        notification.setReason(reason);
        notificationRepository.save(notification);
    }

    @Transactional
    public void notifyCommentAuthorDeletion(BinhLuan comment, String reason) {
        if (comment == null || comment.getUser() == null) {
            return;
        }
        Notification notification = new Notification();
        notification.setUser(comment.getUser());
        if (comment.getTaiLieu() != null) {
            notification.setDocument(comment.getTaiLieu());
            notification.setDocumentTitle(comment.getTaiLieu().getTenTaiLieu());
        }
        notification.setType(TYPE_COMMENT_REMOVAL);
        notification.setMessage(buildCommentRemovalMessage(comment, reason));
        notification.setReason(reason);
        notificationRepository.save(notification);
    }

    @Transactional
    public void notifyDocumentSubjectChange(TaiLieu document, String previousSubjectName, String newSubjectName) {
        if (document == null || document.getUser() == null) {
            return;
        }
        Notification notification = new Notification();
        notification.setUser(document.getUser());
        notification.setDocument(document);
        notification.setDocumentTitle(document.getTenTaiLieu());
        notification.setType(TYPE_DOCUMENT_SUBJECT_CHANGE);
        notification.setMessage(buildDocumentSubjectChangeMessage(document, previousSubjectName, newSubjectName));
        notificationRepository.save(notification);
    }

    @Transactional
    public void notifyDocumentReviewApproved(TaiLieu document) {
        if (document == null || document.getUser() == null) {
            return;
        }
        Notification notification = new Notification();
        notification.setUser(document.getUser());
        notification.setDocument(document);
        notification.setDocumentTitle(document.getTenTaiLieu());
        notification.setType(TYPE_DOCUMENT_REVIEW_APPROVED);
        notification.setMessage(buildDocumentReviewApprovedMessage(document));
        notificationRepository.save(notification);
    }

    @Transactional
    public void notifyDocumentReviewRejected(TaiLieu document, String reason) {
        if (document == null || document.getUser() == null) {
            return;
        }
        Notification notification = new Notification();
        notification.setUser(document.getUser());
        notification.setDocument(document);
        notification.setDocumentTitle(document.getTenTaiLieu());
        notification.setType(TYPE_DOCUMENT_REVIEW_REJECTED);
        notification.setMessage(buildDocumentReviewRejectedMessage(document, reason));
        notification.setReason(reason);
        notificationRepository.save(notification);
    }

    @Transactional
    public void notifyAdminsOfPendingReview(TaiLieu document, long pendingCount) {
        if (document == null) {
            return;
        }
        List<User> admins = findAdminUsers();
        if (admins.isEmpty()) {
            return;
        }
        String message = buildPendingReviewAlertMessage(document, pendingCount);
        for (User admin : admins) {
            Notification notification = new Notification();
            notification.setUser(admin);
            notification.setDocument(document);
            notification.setDocumentTitle(document.getTenTaiLieu());
            notification.setType(TYPE_DOCUMENT_REVIEW_PENDING);
            notification.setMessage(message);
            notificationRepository.save(notification);
        }
    }

    private String buildPendingSubjectMessage(TaiLieu document, String removedSubjectName) {
        String title = document.getTenTaiLieu() != null ? document.getTenTaiLieu() : document.getFileName();
        String subject = removedSubjectName != null ? removedSubjectName : "môn học đã xóa";
        return String.format(Locale.ROOT,
                "\"%s\" cần chọn môn học mới vì %s không còn tồn tại.",
                title,
                subject);
    }

    private String buildCommentReportMessage(TaiLieu document, BinhLuan comment, User reporter, String reason) {
        String title = document.getTenTaiLieu() != null ? document.getTenTaiLieu() : document.getFileName();
        String reporterName = (reporter != null && reporter.getTenUser() != null && !reporter.getTenUser().isBlank())
                ? reporter.getTenUser()
                : "Một người dùng";
        String contentSnippet = comment.getNoiDung();
        if (contentSnippet != null) {
            contentSnippet = contentSnippet.trim();
        }
        if (contentSnippet != null && contentSnippet.length() > 80) {
            contentSnippet = contentSnippet.substring(0, 77) + "...";
        }
        if (contentSnippet == null || contentSnippet.isBlank()) {
            String base = String.format(Locale.ROOT,
                    "%s đã báo cáo một bình luận trong \"%s\".",
                    reporterName,
                    title);
            return appendReason(base, reason);
        }
        String base = String.format(Locale.ROOT,
                "%s đã báo cáo: \"%s\" trong \"%s\".",
                reporterName,
                contentSnippet,
                title);
        return appendReason(base, reason);
    }

    private String buildDocumentReportMessage(TaiLieu document, User reporter, String reason) {
        String title = document.getTenTaiLieu();
        if (title == null || title.isBlank()) {
            title = document.getFileName();
        }
        if (title == null || title.isBlank()) {
            title = "tài liệu";
        }
        String reporterName = (reporter != null && reporter.getTenUser() != null && !reporter.getTenUser().isBlank())
                ? reporter.getTenUser()
                : "Một người dùng";
        String base = String.format(Locale.ROOT,
                "%s đã báo cáo tài liệu \"%s\".",
                reporterName,
                title);
        return appendReason(base, reason);
    }

    private String appendReason(String base, String reason) {
        if (reason == null || reason.isBlank()) {
            return base;
        }
        return base + " Lý do: " + reason;
    }

    private String buildDocumentRemovalMessage(TaiLieu document, String reason) {
        String title = document.getTenTaiLieu();
        if (title == null || title.isBlank()) {
            title = document.getFileName();
        }
        if (title == null || title.isBlank()) {
            title = "tài liệu";
        }
        String base = String.format(Locale.ROOT,
                "Tài liệu \"%s\" đã bị quản trị viên xóa khỏi hệ thống.",
                title);
        if (reason != null && !reason.isBlank()) {
            base += " Lý do: " + reason;
        }
        return base;
    }

    private String buildDocumentReviewApprovedMessage(TaiLieu document) {
        String title = document.getTenTaiLieu();
        if (title == null || title.isBlank()) {
            title = document.getFileName();
        }
        if (title == null || title.isBlank()) {
            title = "tài liệu";
        }
        return String.format(Locale.ROOT,
                "Tài liệu \"%s\" đã được quản trị viên duyệt và hiển thị công khai.",
                title);
    }

    private String buildDocumentReviewRejectedMessage(TaiLieu document, String reason) {
        String title = document.getTenTaiLieu();
        if (title == null || title.isBlank()) {
            title = document.getFileName();
        }
        if (title == null || title.isBlank()) {
            title = "tài liệu";
        }
        String base = String.format(Locale.ROOT,
                "Tài liệu \"%s\" đã bị từ chối khi kiểm duyệt.",
                title);
        return appendReason(base, reason);
    }

    private String buildPendingReviewAlertMessage(TaiLieu document, long pendingCount) {
        String title = document.getTenTaiLieu();
        if (title == null || title.isBlank()) {
            title = document.getFileName();
        }
        if (title == null || title.isBlank()) {
            title = "tài liệu";
        }
        String subjectName = null;
        if (document.getMonHoc() != null && document.getMonHoc().getTenMonHoc() != null) {
            subjectName = document.getMonHoc().getTenMonHoc();
        }
        long safePendingCount = pendingCount <= 0 ? 1 : pendingCount;
        StringBuilder builder = new StringBuilder();
        builder.append("Hiện có ")
            .append(safePendingCount)
                .append(" tài liệu cần kiểm duyệt.");
        builder.append(' ')
                .append('"').append(title).append('"')
                .append(" vừa được tải lên và đang chờ xử lý");
        if (subjectName != null && !subjectName.isBlank()) {
            builder.append(" cho môn \"").append(subjectName).append('\"');
        }
        builder.append('.');
        return builder.toString();
    }

    private String buildCommentRemovalMessage(BinhLuan comment, String reason) {
        TaiLieu document = comment.getTaiLieu();
        String title = document != null ? document.getTenTaiLieu() : null;
        if ((title == null || title.isBlank()) && document != null) {
            title = document.getFileName();
        }
        String base;
        if (title == null || title.isBlank()) {
            base = "Bình luận của bạn đã bị quản trị viên xóa.";
        } else {
            base = String.format(Locale.ROOT,
                    "Bình luận của bạn trong \"%s\" đã bị quản trị viên xóa.",
                    title);
        }
        if (reason != null && !reason.isBlank()) {
            base += " Lý do: " + reason;
        }
        return base;
    }

    private String buildDocumentSubjectChangeMessage(TaiLieu document, String previousSubjectName, String newSubjectName) {
        String title = document.getTenTaiLieu();
        if (title == null || title.isBlank()) {
            title = document.getFileName();
        }
        if (title == null || title.isBlank()) {
            title = "tài liệu";
        }
        String targetSubject = (newSubjectName != null && !newSubjectName.isBlank()) ? newSubjectName : "môn học mới";
        if (previousSubjectName != null && !previousSubjectName.isBlank()) {
            return String.format(Locale.ROOT,
                    "Tài liệu \"%s\" đã được chuyển từ môn \"%s\" sang \"%s\".",
                    title,
                    previousSubjectName,
                    targetSubject);
        }
        return String.format(Locale.ROOT,
                "Tài liệu \"%s\" đã được gán vào môn \"%s\".",
                title,
                targetSubject);
    }

    private List<User> findAdminUsers() {
        return userRepository.findAll().stream()
                .filter(this::isAdminUser)
                .collect(Collectors.toList());
    }

    private boolean isAdminUser(User user) {
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

    private NotificationResponse toResponse(Notification notification) {
        NotificationResponse response = new NotificationResponse();
        response.setId(notification.getId());
        response.setMessage(notification.getMessage());
        response.setType(notification.getType());
        response.setRead(notification.isRead());
        response.setCreatedAt(notification.getCreatedAt());
        if (notification.getDocument() != null) {
            response.setDocumentId(notification.getDocument().getId());
        }
        response.setDocumentTitle(notification.getDocumentTitle());
        response.setSubjectName(notification.getSubjectName());
        response.setReason(extractReason(notification));
        return response;
    }

    private String extractReason(Notification notification) {
        if (notification == null) {
            return null;
        }
        String storedReason = notification.getReason();
        if (storedReason != null && !storedReason.isBlank()) {
            return storedReason.trim();
        }
        String message = notification.getMessage();
        if (message == null) {
            return null;
        }
        int idx = message.indexOf("Lý do:");
        if (idx < 0) {
            return null;
        }
        return message.substring(idx + "Lý do:".length()).trim();
    }

    private User requireUser(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Bạn cần đăng nhập để xem thông báo");
        }
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));
    }
}
