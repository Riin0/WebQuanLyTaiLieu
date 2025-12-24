package com.webquanly.service;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.GradientPaint;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import javax.imageio.ImageIO;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.sax.SAXResult;
import javax.xml.transform.stream.StreamResult;
import javax.xml.transform.stream.StreamSource;

import org.apache.fop.apps.FOPException;
import org.apache.fop.apps.FOUserAgent;
import org.apache.fop.apps.Fop;
import org.apache.fop.apps.FopFactory;
import org.apache.fop.apps.MimeConstants;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.poi.hslf.usermodel.HSLFSlide;
import org.apache.poi.hslf.usermodel.HSLFSlideShow;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.converter.PicturesManager;
import org.apache.poi.hwpf.converter.WordToFoConverter;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.docx4j.Docx4J;
import org.docx4j.openpackaging.exceptions.Docx4JException;
import org.docx4j.openpackaging.packages.WordprocessingMLPackage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.webquanly.dto.CommentResponse;
import com.webquanly.dto.DocumentDetailResponse;
import com.webquanly.dto.DocumentReportResponse;
import com.webquanly.dto.DocumentResponse;
import com.webquanly.dto.RatingSummaryResponse;
import com.webquanly.model.BinhLuan;
import com.webquanly.model.BinhLuanReport;
import com.webquanly.model.DanhGia;
import com.webquanly.model.LoaiTaiLieu;
import com.webquanly.model.MonHoc;
import com.webquanly.model.TaiLieu;
import com.webquanly.model.TaiLieuReport;
import com.webquanly.model.User;
import com.webquanly.repository.BinhLuanReportRepository;
import com.webquanly.repository.BinhLuanRepository;
import com.webquanly.repository.DanhGiaRepository;
import com.webquanly.repository.LoaiTaiLieuRepository;
import com.webquanly.repository.MonHocRepository;
import com.webquanly.repository.TaiLieuReportRepository;
import com.webquanly.repository.TaiLieuRepository;
import com.webquanly.repository.UserRepository;

@Service
public class DocumentService {
    private static final Logger LOGGER = LoggerFactory.getLogger(DocumentService.class);

    public static final String REVIEW_PENDING = "PENDING";
    public static final String REVIEW_APPROVED = "APPROVED";
    public static final String REVIEW_REJECTED = "REJECTED";
    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    private static final FopFactory FOP_FACTORY;

    static {
        try {
            FOP_FACTORY = FopFactory.newInstance(new File(".").toURI());
        } catch (Exception e) {
            throw new ExceptionInInitializerError("Cannot initialize FOP factory: " + e.getMessage());
        }
    }

    @Autowired
    private TaiLieuRepository taiLieuRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LoaiTaiLieuRepository loaiTaiLieuRepository;

    @Autowired
    private MonHocRepository monHocRepository;

    @Autowired
    private BinhLuanRepository binhLuanRepository;

    @Autowired
    private DanhGiaRepository danhGiaRepository;

    @Autowired
    private BinhLuanReportRepository binhLuanReportRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private TaiLieuReportRepository taiLieuReportRepository;

    private static final long MAX_PREVIEW_SIZE = 200L * 1024 * 1024; // align with upload size

    public DocumentResponse store(MultipartFile file, String title, Long subjectId, String uploaderEmail) throws IOException {
        if (file.isEmpty()) throw new IllegalArgumentException("Empty file");
        long maxSize = 200L * 1024 * 1024; // 200MB
        if (file.getSize() > maxSize) throw new IllegalArgumentException("File too large");
        if (subjectId == null) throw new IllegalArgumentException("Môn học là bắt buộc");

        var monHoc = monHocRepository.findById(subjectId)
                .orElseThrow(() -> new IllegalArgumentException("Môn học không tồn tại"));

        Path storageRoot = getStorageRoot();
        Files.createDirectories(storageRoot);

        String stored = System.currentTimeMillis() + "_" + Path.of(file.getOriginalFilename()).getFileName().toString();
        Path path = storageRoot.resolve(stored);
        Files.copy(file.getInputStream(), path);

        TaiLieu taiLieu = new TaiLieu();
        taiLieu.setFileName(stored);
        taiLieu.setTenTaiLieu(title == null || title.isBlank() ? file.getOriginalFilename() : title);
        taiLieu.setThoiGianDang(LocalDateTime.now());
        taiLieu.setMonHoc(monHoc);
        taiLieu.setSoLuongNguoiTai(0);
        taiLieu.setDangXetChonMon(false);
        taiLieu.setTrangThaiKiemDuyet(REVIEW_PENDING);
        taiLieu.setLyDoKiemDuyet(null);
        taiLieu.setThoiGianKiemDuyet(null);
        taiLieu.setNguoiKiemDuyet(null);
        resolveLoaiTaiLieu(file).ifPresent(taiLieu::setLoaiTaiLieu);
        if (uploaderEmail != null) {
            userRepository.findByEmailIgnoreCase(uploaderEmail).ifPresent(taiLieu::setUser);
        }
        TaiLieu saved = taiLieuRepository.save(taiLieu);
        long pendingCount = taiLieuRepository.countByTrangThaiKiemDuyetIgnoreCase(REVIEW_PENDING);
        notificationService.notifyAdminsOfPendingReview(saved, pendingCount);
        return toDto(saved);
    }

    public List<DocumentResponse> listAll() {
        return taiLieuRepository.findAll().stream()
                .filter(this::isApproved)
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public DocumentResponse findById(Long id) {
        return taiLieuRepository.findById(id)
                .filter(this::isApproved)
                .map(this::toDto)
                .orElse(null);
    }

    public DocumentResponse findByIdWithAccess(Long id, String viewerEmail, boolean viewerIsAdmin) {
        TaiLieu taiLieu = taiLieuRepository.findById(id).orElse(null);
        if (taiLieu == null) {
            return null;
        }
        User currentUser = findUserByEmail(viewerEmail);
        if (!canViewDocument(taiLieu, currentUser, viewerIsAdmin)) {
            return null;
        }
        return toDto(taiLieu);
    }

    public Path getPath(TaiLieu taiLieu) {
        return getStorageRoot().resolve(taiLieu.getFileName());
    }

    public Path getPathById(Long id) {
        return taiLieuRepository.findById(id)
                .map(this::getPath)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
    }

    @Transactional
    public void deleteDocument(Long id, String reason) {
        deleteDocumentInternal(id, reason, true);
    }

    @Transactional
    public void deleteDocumentSilently(Long id, String reason) {
        deleteDocumentInternal(id, reason, false);
    }

    private void deleteDocumentInternal(Long id, String reason, boolean notifyOwner) {
        TaiLieu taiLieu = taiLieuRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        Path path = null;
        try {
            path = getPath(taiLieu);
        } catch (Exception ex) {
            LOGGER.warn("Không thể xác định đường dẫn tệp cho tài liệu {}: {}", id, ex.getMessage());
        }

        String normalizedReason = normalizeReason(reason);
        if (notifyOwner) {
            notificationService.notifyDocumentOwnerDeletion(taiLieu, normalizedReason);
        }

        binhLuanRepository.deleteByDocumentId(id);
        danhGiaRepository.deleteByDocumentId(id);
        taiLieuRepository.delete(taiLieu);

        if (path != null) {
            try {
                Files.deleteIfExists(path);
            } catch (IOException ex) {
                LOGGER.warn("Không thể xóa tệp của tài liệu {}: {}", id, ex.getMessage());
            }
        }
    }

    @Transactional
    public TaiLieu changeDocumentSubject(Long documentId, Long subjectId) {
        TaiLieu taiLieu = taiLieuRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        return updateDocumentSubject(taiLieu, subjectId, true);
    }

    @Transactional
    public DocumentResponse assignSubjectForOwner(Long documentId, Long subjectId, String requesterEmail, boolean requesterIsAdmin) {
        if (requesterEmail == null || requesterEmail.isBlank()) {
            throw new IllegalArgumentException("Bạn cần đăng nhập");
        }
        TaiLieu taiLieu = taiLieuRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        User requester = requireUser(requesterEmail);
        boolean isOwner = isDocumentOwner(taiLieu, requester);
        if (!isOwner && !requesterIsAdmin) {
            throw new IllegalArgumentException("Bạn không có quyền cập nhật tài liệu này");
        }
        if (!taiLieu.isDangXetChonMon() && taiLieu.getMonHoc() != null) {
            throw new IllegalArgumentException("Tài liệu này đã được gán môn");
        }
        boolean notifyOwner = requesterIsAdmin && !isOwner;
        TaiLieu updated = updateDocumentSubject(taiLieu, subjectId, notifyOwner);
        return toDto(updated);
    }

    private TaiLieu updateDocumentSubject(TaiLieu taiLieu, Long subjectId, boolean notifyOwner) {
        if (subjectId == null) {
            throw new IllegalArgumentException("Môn học là bắt buộc");
        }
        String previousSubject = taiLieu.getMonHoc() != null ? taiLieu.getMonHoc().getTenMonHoc() : null;
        MonHoc subject = monHocRepository.findById(subjectId)
                .orElseThrow(() -> new IllegalArgumentException("Môn học không tồn tại"));
        taiLieu.setMonHoc(subject);
        taiLieu.setDangXetChonMon(false);
        TaiLieu saved = taiLieuRepository.save(taiLieu);
        if (notifyOwner) {
            notificationService.notifyDocumentSubjectChange(saved, previousSubject, subject.getTenMonHoc());
        }
        return saved;
    }

    @Transactional
    public void deleteCommentByAdmin(Long commentId, String reason) {
        BinhLuan comment = binhLuanRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Bình luận không tồn tại"));
        String normalizedReason = normalizeReason(reason);
        notificationService.notifyCommentAuthorDeletion(comment, normalizedReason);
        binhLuanRepository.delete(comment);
    }

    private String normalizeReason(String reason) {
        if (reason == null) {
            return null;
        }
        String trimmed = reason.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Transactional
    public int incrementDownloadCount(Long id) {
        TaiLieu taiLieu = taiLieuRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        int current = taiLieu.getSoLuongNguoiTai() == null ? 0 : taiLieu.getSoLuongNguoiTai();
        int updated = current + 1;
        taiLieu.setSoLuongNguoiTai(updated);
        taiLieuRepository.saveAndFlush(taiLieu);
        return updated;
    }

    public DocumentDetailResponse getDetail(Long id, String userEmail) {
        TaiLieu taiLieu = taiLieuRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        User currentUser = findUserByEmail(userEmail);
        if (!isApproved(taiLieu) && (currentUser == null || !isDocumentOwner(taiLieu, currentUser))) {
            throw new IllegalArgumentException("Tài liệu không tồn tại");
        }
        return toDetailDto(taiLieu, currentUser);
    }

    public DocumentDetailResponse getDetailWithAccess(Long id, String userEmail, boolean viewerIsAdmin) {
        TaiLieu taiLieu = taiLieuRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        User currentUser = findUserByEmail(userEmail);
        if (!canViewDocument(taiLieu, currentUser, viewerIsAdmin)) {
            throw new IllegalArgumentException("Tài liệu không tồn tại");
        }
        return toDetailDto(taiLieu, currentUser);
    }

    public Path getPathByIdWithAccess(Long id, String viewerEmail, boolean viewerIsAdmin) {
        TaiLieu taiLieu = taiLieuRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        User currentUser = findUserByEmail(viewerEmail);
        if (!canViewDocument(taiLieu, currentUser, viewerIsAdmin)) {
            throw new IllegalArgumentException("Tài liệu không tồn tại");
        }
        return getPath(taiLieu);
    }

    public byte[] generateStoredPreviewSafeWithAccess(Long documentId, String viewerEmail, boolean viewerIsAdmin) throws IOException {
        TaiLieu taiLieu = taiLieuRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        User currentUser = findUserByEmail(viewerEmail);
        if (!canViewDocument(taiLieu, currentUser, viewerIsAdmin)) {
            throw new IllegalArgumentException("Tài liệu không tồn tại");
        }
        try {
            return generateStoredPreviewFor(taiLieu);
        } catch (Exception e) {
            return renderGenericPlaceholder(resolveDocumentDisplayName(taiLieu), "Preview fallback");
        }
    }

    public byte[] generateStoredFullPreviewPdfWithAccess(Long documentId, String viewerEmail, boolean viewerIsAdmin) throws IOException {
        TaiLieu taiLieu = taiLieuRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        User currentUser = findUserByEmail(viewerEmail);
        if (!canViewDocument(taiLieu, currentUser, viewerIsAdmin)) {
            throw new IllegalArgumentException("Tài liệu không tồn tại");
        }
        Path path = getPath(taiLieu);
        if (!Files.exists(path)) {
            throw new IllegalArgumentException("File không tồn tại trên hệ thống");
        }
        long size = Files.size(path);
        if (size > MAX_PREVIEW_SIZE) {
            throw new IllegalArgumentException("File quá lớn để xem trước");
        }
        byte[] data = Files.readAllBytes(path);
        String contentType = Files.probeContentType(path);
        if (contentType == null) {
            contentType = guessContentTypeFromName(taiLieu.getFileName());
        }
        String normalizedContentType = contentType != null ? contentType.toLowerCase(Locale.ROOT) : "";
        String extension = extractExtension(taiLieu.getFileName());

        if (isPdf(normalizedContentType, extension)) {
            return data;
        }
        if ("docx".equals(extension)) {
            return convertDocxToPdf(data);
        }
        if ("doc".equals(extension)) {
            return convertDocToPdf(data);
        }
        if ("pptx".equals(extension)) {
            return convertPptxToPdf(data);
        }
        if ("ppt".equals(extension)) {
            return convertPptToPdf(data);
        }
        throw new IllegalArgumentException("Chỉ hỗ trợ xem trước PDF, Word và PowerPoint");
    }

    public List<DocumentReportResponse> listDocumentReportsForAdmin(Long documentId) {
        taiLieuRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        return taiLieuReportRepository.findByDocument_IdOrderByCreatedAtDesc(documentId)
                .stream()
                .map(this::toDocumentReportDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void clearDocumentReportsForAdmin(Long documentId) {
        taiLieuRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        taiLieuReportRepository.deleteByDocument_Id(documentId);
    }

    private DocumentReportResponse toDocumentReportDto(TaiLieuReport report) {
        DocumentReportResponse dto = new DocumentReportResponse();
        dto.setId(report.getId());
        if (report.getReporter() != null) {
            dto.setReporterEmail(report.getReporter().getEmail());
            String name = report.getReporter().getTenUser();
            dto.setReporterName(name);
        }
        dto.setReason(report.getReason());
        dto.setCreatedAt(report.getCreatedAt());
        return dto;
    }

    private boolean isApproved(TaiLieu taiLieu) {
        if (taiLieu == null) {
            return false;
        }
        String status = taiLieu.getTrangThaiKiemDuyet();
        if (status == null || status.isBlank()) {
            return true;
        }
        return REVIEW_APPROVED.equalsIgnoreCase(status);
    }

    private boolean canViewDocument(TaiLieu taiLieu, User currentUser, boolean viewerIsAdmin) {
        if (viewerIsAdmin) {
            return true;
        }
        if (isApproved(taiLieu)) {
            return true;
        }
        return currentUser != null && isDocumentOwner(taiLieu, currentUser);
    }

    public List<CommentResponse> listComments(Long documentId, String userEmail) {
        taiLieuRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        User currentUser = findUserByEmail(userEmail);
        return buildComments(documentId, currentUser);
    }

    @Transactional
    public CommentResponse addComment(Long documentId, String content, Long parentId, String userEmail) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Nội dung bình luận không được để trống");
        }
        TaiLieu taiLieu = taiLieuRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        User user = requireUser(userEmail);
        BinhLuan parent = null;
        if (parentId != null) {
            parent = binhLuanRepository.findById(parentId)
                    .orElseThrow(() -> new IllegalArgumentException("Bình luận gốc không tồn tại"));
            if (parent.getTaiLieu() == null || !parent.getTaiLieu().getId().equals(documentId)) {
                throw new IllegalArgumentException("Không thể phản hồi bình luận thuộc tài liệu khác");
            }
        }
        boolean isOwner = isDocumentOwner(taiLieu, user);
        boolean isReply = parent != null;
        boolean hasRated = isOwner || isReply || danhGiaRepository.findByDocumentAndUser(documentId, user.getIdUser()).isPresent();
        if (!hasRated) {
            throw new IllegalArgumentException("Bạn cần đánh giá tài liệu trước khi bình luận");
        }
        BinhLuan comment = new BinhLuan();
        comment.setTaiLieu(taiLieu);
        comment.setUser(user);
        comment.setNoiDung(content.trim());
        comment.setThoiGian(LocalDateTime.now());
        comment.setParent(parent);
        BinhLuan saved = binhLuanRepository.save(comment);
        return toCommentResponse(saved);
    }

    @Transactional
    public void reportComment(Long documentId, Long commentId, String reason, String userEmail) {
        TaiLieu taiLieu = taiLieuRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        BinhLuan comment = binhLuanRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Bình luận không tồn tại"));
        User reporter = requireUser(userEmail);
        if (comment.getTaiLieu() == null || !Objects.equals(comment.getTaiLieu().getId(), taiLieu.getId())) {
            throw new IllegalArgumentException("Bình luận không thuộc tài liệu này");
        }
        if (comment.getUser() != null && Objects.equals(comment.getUser().getIdUser(), reporter.getIdUser())) {
            throw new IllegalArgumentException("Bạn không thể báo cáo bình luận của chính mình");
        }
        if (binhLuanReportRepository.existsByCommentIdAndUserIdUser(commentId, reporter.getIdUser())) {
            throw new IllegalArgumentException("Bạn đã báo cáo bình luận này");
        }
        BinhLuanReport report = new BinhLuanReport();
        report.setComment(comment);
        report.setUser(reporter);
        String normalizedReason = normalizeReason(reason);
        report.setReason(normalizedReason);
        binhLuanReportRepository.save(report);
        notificationService.notifyAdminsOfCommentReport(comment, reporter, normalizedReason);
    }

    @Transactional
    public void reportDocument(Long documentId, String reason, String userEmail) {
        TaiLieu taiLieu = taiLieuRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        User reporter = requireUser(userEmail);
        if (isDocumentOwner(taiLieu, reporter)) {
            throw new IllegalArgumentException("Bạn không thể báo cáo tài liệu của mình");
        }
        if (taiLieuReportRepository.existsByDocument_IdAndReporter_IdUser(documentId, reporter.getIdUser())) {
            throw new IllegalArgumentException("Bạn đã báo cáo tài liệu này");
        }
        TaiLieuReport report = new TaiLieuReport();
        report.setDocument(taiLieu);
        report.setReporter(reporter);
        report.setReason(normalizeReason(reason));
        taiLieuReportRepository.save(report);
        notificationService.notifyAdminsOfDocumentReport(taiLieu, reporter, report.getReason());
    }

    public RatingSummaryResponse getRatingSummary(Long documentId, String userEmail) {
        taiLieuRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        User currentUser = findUserByEmail(userEmail);
        return buildRatingSummary(documentId, currentUser);
    }

    @Transactional
    public RatingSummaryResponse rateDocument(Long documentId, int score, String userEmail) {
        if (score < 1 || score > 5) {
            throw new IllegalArgumentException("Điểm đánh giá phải nằm trong khoảng 1 đến 5");
        }
        TaiLieu taiLieu = taiLieuRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        User user = requireUser(userEmail);
        if (isDocumentOwner(taiLieu, user)) {
            throw new IllegalArgumentException("Tác giả không thể tự đánh giá tài liệu của mình");
        }
        DanhGia rating = danhGiaRepository.findByDocumentAndUser(documentId, user.getIdUser())
                .orElseGet(() -> {
                    DanhGia entity = new DanhGia();
                    entity.setTaiLieu(taiLieu);
                    entity.setUser(user);
                    return entity;
                });
        rating.setSoDiem(score);
        rating.setThoiGianDanhGia(LocalDateTime.now());
        danhGiaRepository.save(rating);
        return buildRatingSummary(documentId, user);
    }

    private List<CommentResponse> buildComments(Long documentId, User currentUser) {
        List<BinhLuan> entities = binhLuanRepository.findByTaiLieuIdOrderByThoiGianDesc(documentId);
        List<DanhGia> ratings = danhGiaRepository.findByTaiLieuIdOrderByThoiGianDanhGiaDesc(documentId);

        Map<Long, DanhGia> ratingByUser = new LinkedHashMap<>();
        if (ratings != null) {
            for (DanhGia rating : ratings) {
                if (rating.getUser() == null || rating.getUser().getIdUser() == null) {
                    continue;
                }
                ratingByUser.putIfAbsent(rating.getUser().getIdUser(), rating);
            }
        }

        Map<Long, Long> reportCountByComment = java.util.Collections.emptyMap();
        Set<Long> reportedByViewer = java.util.Collections.emptySet();
        if (entities != null && !entities.isEmpty()) {
            List<Long> commentIds = entities.stream()
                    .map(BinhLuan::getId)
                    .filter(java.util.Objects::nonNull)
                    .toList();
            if (!commentIds.isEmpty()) {
                reportCountByComment = binhLuanReportRepository.mapCounts(commentIds);
                if (currentUser != null && currentUser.getIdUser() != null) {
                    List<Long> reportedIds = binhLuanReportRepository.findCommentIdsReportedByUser(commentIds, currentUser.getIdUser());
                    reportedByViewer = new HashSet<>(reportedIds);
                }
            }
        }

        Map<Long, CommentResponse> responseById = new LinkedHashMap<>();
        if (entities != null) {
            for (BinhLuan entity : entities) {
                CommentResponse response = toCommentResponse(entity);
                long reportCount = reportCountByComment.getOrDefault(entity.getId(), 0L);
                response.setReportCount(reportCount);
                response.setReportedByViewer(reportedByViewer.contains(entity.getId()));
                responseById.put(entity.getId(), response);
                Long userId = entity.getUser() != null ? entity.getUser().getIdUser() : null;
                if (userId != null && (entity.getParent() == null)) {
                    DanhGia matchingRating = ratingByUser.remove(userId);
                    if (matchingRating != null) {
                        response.setRatingScore(matchingRating.getSoDiem());
                    }
                }
            }
        }

        List<CommentResponse> roots = new ArrayList<>();
        if (entities != null) {
            for (BinhLuan entity : entities) {
                CommentResponse response = responseById.get(entity.getId());
                if (response == null) {
                    continue;
                }
                Long parentId = entity.getParent() != null ? entity.getParent().getId() : null;
                response.setParentId(parentId);
                if (parentId == null) {
                    roots.add(response);
                } else {
                    CommentResponse parentResponse = responseById.get(parentId);
                    if (parentResponse != null) {
                        parentResponse.getReplies().add(response);
                    } else {
                        roots.add(response); // fallback if parent missing
                    }
                }
            }
        }

        if (!ratingByUser.isEmpty()) {
            ratingByUser.values().stream()
                    .map(this::toRatingOnlyComment)
                    .forEach(roots::add);
        }

        sortCommentsByTime(roots);
        return roots;
    }

    private void sortCommentsByTime(List<CommentResponse> comments) {
        sortByTimestamp(comments, false);
        for (CommentResponse response : comments) {
            sortReplies(response);
        }
    }

    private void sortReplies(CommentResponse parent) {
        if (parent.getReplies() == null || parent.getReplies().isEmpty()) {
            return;
        }
        sortByTimestamp(parent.getReplies(), true);
        for (CommentResponse reply : parent.getReplies()) {
            sortReplies(reply);
        }
    }

    private void sortByTimestamp(List<CommentResponse> comments, boolean ascending) {
        comments.sort((left, right) -> {
            LocalDateTime first = left.getCreatedAt();
            LocalDateTime second = right.getCreatedAt();
            if (first == null && second == null) return 0;
            if (first == null) return ascending ? 1 : -1;
            if (second == null) return ascending ? -1 : 1;
            return ascending ? first.compareTo(second) : second.compareTo(first);
        });
    }

    private CommentResponse toCommentResponse(BinhLuan entity) {
        CommentResponse response = new CommentResponse();
        response.setId(entity.getId());
        response.setContent(entity.getNoiDung());
        response.setCreatedAt(entity.getThoiGian());
        if (entity.getUser() != null) {
            response.setAuthorName(entity.getUser().getTenUser());
            response.setAuthorEmail(entity.getUser().getEmail());
            response.setAuthorAvatarUrl(buildAvatarUrl(entity.getUser()));
            if (entity.getUser().getPhanQuyen() != null) {
                response.setAuthorRole(entity.getUser().getPhanQuyen().getTenLoaiNguoiDung());
            }
        }
        if (entity.getTaiLieu() != null) {
            response.setAuthorIsUploader(isDocumentOwner(entity.getTaiLieu(), entity.getUser()));
        }
        return response;
    }

    private CommentResponse toRatingOnlyComment(DanhGia rating) {
        CommentResponse response = new CommentResponse();
        if (rating.getId() != null) {
            response.setId(-Math.abs(rating.getId()));
        }
        response.setCreatedAt(rating.getThoiGianDanhGia());
        response.setRatingScore(rating.getSoDiem());
        response.setRatingOnly(true);
        response.setAuthorIsUploader(isDocumentOwner(rating.getTaiLieu(), rating.getUser()));
        if (rating.getUser() != null) {
            response.setAuthorName(rating.getUser().getTenUser());
            response.setAuthorEmail(rating.getUser().getEmail());
            response.setAuthorAvatarUrl(buildAvatarUrl(rating.getUser()));
            if (rating.getUser().getPhanQuyen() != null) {
                response.setAuthorRole(rating.getUser().getPhanQuyen().getTenLoaiNguoiDung());
            }
        }
        return response;
    }

    private RatingSummaryResponse buildRatingSummary(Long documentId, User currentUser) {
        RatingSummaryResponse summary = new RatingSummaryResponse();
        try {
            Double average = danhGiaRepository.calculateAverageScore(documentId);
            summary.setAverage(average == null ? null : Math.round(average * 10.0) / 10.0);
            summary.setTotal(Long.valueOf(danhGiaRepository.countByTaiLieuId(documentId)));
            if (currentUser != null) {
                Integer score = danhGiaRepository.findUserScore(documentId, currentUser.getIdUser());
                summary.setUserScore(score);
            }
        } catch (DataAccessException ex) {
            LOGGER.warn("Cannot read ratings for document {} due to database error", documentId, ex);
            summary.setAverage(null);
            summary.setTotal(0L);
            summary.setUserScore(null);
        }
        return summary;
    }

    private boolean isDocumentOwner(TaiLieu taiLieu, User user) {
        if (taiLieu == null || user == null || taiLieu.getUser() == null) {
            return false;
        }
        Long ownerId = taiLieu.getUser().getIdUser();
        Long userId = user.getIdUser();
        return ownerId != null && ownerId.equals(userId);
    }

    private String buildAvatarUrl(User user) {
        if (user == null) {
            return null;
        }
        String stored = user.getAvatarPath();
        if (stored == null || stored.isBlank()) {
            return null;
        }
        return "/api/profile/avatar/" + stored;
    }

    private User findUserByEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return userRepository.findByEmailIgnoreCase(email).orElse(null);
    }

    private User requireUser(String email) {
        User user = findUserByEmail(email);
        if (user == null) {
            throw new IllegalArgumentException("Không tìm thấy thông tin người dùng");
        }
        return user;
    }

    private Path getStorageRoot() {
        return Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public byte[] generatePreview(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Empty file");
        }
        if (file.getSize() > MAX_PREVIEW_SIZE) {
            throw new IllegalArgumentException("File too large for preview");
        }
        byte[] data = file.getBytes();
        return generatePreviewFromBytes(data, file.getOriginalFilename(), file.getContentType());
    }

    public byte[] generateStoredPreview(Long documentId) throws IOException {
        TaiLieu taiLieu = taiLieuRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        return generateStoredPreviewFor(taiLieu);
    }

    public byte[] generateStoredPreviewSafe(Long documentId) throws IOException {
        TaiLieu taiLieu = taiLieuRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Tài liệu không tồn tại"));
        try {
            return generateStoredPreviewFor(taiLieu);
        } catch (Exception e) {
            return renderGenericPlaceholder(resolveDocumentDisplayName(taiLieu), "Preview fallback");
        }
    }

    public DocumentResponse toSummaryDto(TaiLieu taiLieu) {
        if (taiLieu == null) {
            throw new IllegalArgumentException("Tài liệu không hợp lệ");
        }
        return toDto(taiLieu);
    }

    private DocumentResponse toDto(TaiLieu taiLieu) {
        DocumentResponse response = new DocumentResponse();
        applyDocumentBasics(taiLieu, response);
        return response;
    }

    private void applyDocumentBasics(TaiLieu taiLieu, DocumentResponse response) {
        response.setId(taiLieu.getId());
        String tenTaiLieu = taiLieu.getTenTaiLieu();
        response.setTitle(tenTaiLieu == null || tenTaiLieu.isBlank() ? taiLieu.getFileName() : tenTaiLieu);
        response.setFilename(taiLieu.getFileName());
        FileMetadata metadata = resolveFileMetadata(taiLieu);
        response.setContentType(metadata.contentType());
        response.setSize(metadata.size());
        response.setCreatedAt(taiLieu.getThoiGianDang() == null ? LocalDateTime.now() : taiLieu.getThoiGianDang());
        response.setDownloadCount(taiLieu.getSoLuongNguoiTai() == null ? 0 : taiLieu.getSoLuongNguoiTai());
        if (taiLieu.getLoaiTaiLieu() != null) {
            response.setLoaiTaiLieu(taiLieu.getLoaiTaiLieu().getTenLoaiTaiLieu());
        }
        if (taiLieu.getMonHoc() != null) {
            response.setMonHocId(taiLieu.getMonHoc().getId());
            response.setMonHocTen(taiLieu.getMonHoc().getTenMonHoc());
        }
        response.setPendingSubject(taiLieu.isDangXetChonMon());
        String reviewStatus = taiLieu.getTrangThaiKiemDuyet();
        if (reviewStatus == null || reviewStatus.isBlank()) {
            reviewStatus = REVIEW_APPROVED;
        }
        response.setReviewStatus(reviewStatus);
        response.setReviewReason(taiLieu.getLyDoKiemDuyet());
        if (taiLieu.getUser() != null) {
            response.setUploaderEmail(taiLieu.getUser().getEmail());
            response.setUploaderName(taiLieu.getUser().getTenUser());
            if (taiLieu.getUser().getPhanQuyen() != null) {
                response.setUploaderRole(taiLieu.getUser().getPhanQuyen().getTenLoaiNguoiDung());
            }
        }
    }

    private DocumentDetailResponse toDetailDto(TaiLieu taiLieu, User currentUser) {
        DocumentDetailResponse detail = new DocumentDetailResponse();
        applyDocumentBasics(taiLieu, detail);
        detail.setDescription(taiLieu.getMoTa());
        detail.setRating(buildRatingSummary(taiLieu.getId(), currentUser));
        detail.setComments(buildComments(taiLieu.getId(), currentUser));
        detail.setViewerIsUploader(isDocumentOwner(taiLieu, currentUser));
        long reportCount = taiLieuReportRepository.countByDocument_Id(taiLieu.getId());
        detail.setReportCount(reportCount);
        boolean viewerReported = false;
        if (currentUser != null && currentUser.getIdUser() != null) {
            viewerReported = taiLieuReportRepository.existsByDocument_IdAndReporter_IdUser(
                    taiLieu.getId(),
                    currentUser.getIdUser()
            );
        }
        detail.setReportedByViewer(viewerReported);
        return detail;
    }

    private FileMetadata resolveFileMetadata(TaiLieu taiLieu) {
        if (taiLieu.getFileName() == null || taiLieu.getFileName().isBlank()) {
            return new FileMetadata(0L, "application/octet-stream");
        }
        Path path = getStorageRoot().resolve(taiLieu.getFileName());
        long size = 0L;
        String contentType = null;
        if (Files.exists(path)) {
            try {
                size = Files.size(path);
            } catch (IOException e) {
                LOGGER.debug("Cannot determine file size for {}: {}", taiLieu.getFileName(), e.getMessage());
            }
            try {
                contentType = Files.probeContentType(path);
            } catch (IOException e) {
                LOGGER.debug("Cannot detect content type for {}: {}", taiLieu.getFileName(), e.getMessage());
            }
        }
        if (contentType == null) {
            contentType = guessContentTypeFromName(taiLieu.getFileName());
        }
        return new FileMetadata(size, contentType == null ? "application/octet-stream" : contentType);
    }

    private String guessContentTypeFromName(String filename) {
        if (filename == null || !filename.contains(".")) {
            return null;
        }
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        switch (ext) {
            case "pdf":
                return "application/pdf";
            case "doc":
                return "application/msword";
            case "docx":
                return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "ppt":
                return "application/vnd.ms-powerpoint";
            case "pptx":
                return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case "xls":
                return "application/vnd.ms-excel";
            case "xlsx":
                return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "zip":
                return "application/zip";
            case "rar":
                return "application/vnd.rar";
            case "7z":
                return "application/x-7z-compressed";
            default:
                return null;
        }
    }

    private record FileMetadata(long size, String contentType) {}

    private java.util.Optional<LoaiTaiLieu> resolveLoaiTaiLieu(MultipartFile file) {
        String categoryKey = detectCategoryKey(file);
        if (categoryKey == null) return java.util.Optional.empty();
        return loaiTaiLieuRepository.findByTenLoaiTaiLieuIgnoreCase(categoryKey);
    }

    private String detectCategoryKey(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType != null) {
            String key = mapContentType(contentType.toLowerCase());
            if (key != null) return key;
        }
        String originalName = file.getOriginalFilename();
        if (originalName != null && originalName.contains(".")) {
            String ext = originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase();
            return mapExtension(ext);
        }
        return null;
    }

    private String mapContentType(String contentType) {
        if (contentType.contains("pdf")) return "PDF";
        if (contentType.contains("word") || contentType.contains("msword")) return "Word";
        if (contentType.contains("presentation")) return "PowerPoint";
        if (contentType.contains("excel") || contentType.contains("spreadsheet")) return "Excel";
        if (contentType.contains("rar")) return "RAR";
        if (contentType.contains("7z")) return "7Z";
        if (contentType.contains("zip") || contentType.contains("compressed")) return "ZIP";
        return null;
    }

    private String mapExtension(String ext) {
        switch (ext) {
            case "pdf":
                return "PDF";
            case "doc":
            case "docx":
                return "Word";
            case "ppt":
            case "pptx":
                return "PowerPoint";
            case "xls":
            case "xlsx":
                return "Excel";
            case "zip":
                return "ZIP";
            case "rar":
                return "RAR";
            case "7z":
                return "7Z";
            default:
                return null;
        }
    }

    private boolean isPdf(String contentType, String extension) {
        if (contentType != null && contentType.contains("pdf")) {
            return true;
        }
        return "pdf".equals(extension);
    }

    private String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }

    private byte[] renderPdfPreview(byte[] pdfBytes) throws IOException {
        try (PDDocument document = PDDocument.load(new ByteArrayInputStream(pdfBytes))) {
            var renderer = new PDFRenderer(document);
            BufferedImage image = renderer.renderImageWithDPI(0, 170, ImageType.RGB);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "png", output);
            return output.toByteArray();
        }
    }

    private byte[] renderDocxPreview(byte[] docxBytes) throws IOException {
        try (ByteArrayInputStream input = new ByteArrayInputStream(docxBytes)) {
            WordprocessingMLPackage wordMLPackage = WordprocessingMLPackage.load(input);
            ByteArrayOutputStream pdfOutput = new ByteArrayOutputStream();
            Docx4J.toPDF(wordMLPackage, pdfOutput);
            return renderPdfPreview(pdfOutput.toByteArray());
        } catch (Docx4JException e) {
            throw new IOException("Failed to render DOCX preview", e);
        }
    }

    private byte[] convertDocxToPdf(byte[] docxBytes) throws IOException {
        try (ByteArrayInputStream input = new ByteArrayInputStream(docxBytes)) {
            WordprocessingMLPackage wordMLPackage = WordprocessingMLPackage.load(input);
            ByteArrayOutputStream pdfOutput = new ByteArrayOutputStream();
            Docx4J.toPDF(wordMLPackage, pdfOutput);
            return pdfOutput.toByteArray();
        } catch (Docx4JException e) {
            throw new IOException("Failed to convert DOCX", e);
        }
    }

    private byte[] renderDocPreview(byte[] docBytes) throws IOException {
        try (ByteArrayInputStream input = new ByteArrayInputStream(docBytes);
             HWPFDocument document = new HWPFDocument(input)) {
            org.w3c.dom.Document foDocument = createSecureDocumentBuilder().newDocument();
            WordToFoConverter converter = new WordToFoConverter(foDocument);
            PicturesManager picturesManager = (content, pictureType, suggestedName, widthInches, heightInches) -> suggestedName;
            converter.setPicturesManager(picturesManager);
            converter.processDocument(document);

            ByteArrayOutputStream foBuffer = new ByteArrayOutputStream();
            Transformer serializer = TransformerFactory.newInstance().newTransformer();
            serializer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "no");
            serializer.transform(new DOMSource(converter.getDocument()), new StreamResult(foBuffer));

            ByteArrayOutputStream pdfOutput = new ByteArrayOutputStream();
            FOUserAgent foUserAgent = FOP_FACTORY.newFOUserAgent();
            Fop fop = FOP_FACTORY.newFop(MimeConstants.MIME_PDF, foUserAgent, pdfOutput);
            Transformer foTransformer = TransformerFactory.newInstance().newTransformer();
            StreamSource foSource = new StreamSource(new ByteArrayInputStream(foBuffer.toByteArray()));
            foTransformer.transform(foSource, new SAXResult(fop.getDefaultHandler()));

            return renderPdfPreview(pdfOutput.toByteArray());
        } catch (ParserConfigurationException | TransformerException | FOPException e) {
            throw new IOException("Failed to render DOC preview", e);
        }
    }

    private byte[] convertDocToPdf(byte[] docBytes) throws IOException {
        try (ByteArrayInputStream input = new ByteArrayInputStream(docBytes);
             HWPFDocument document = new HWPFDocument(input)) {
            org.w3c.dom.Document foDocument = createSecureDocumentBuilder().newDocument();
            WordToFoConverter converter = new WordToFoConverter(foDocument);
            PicturesManager picturesManager = (content, pictureType, suggestedName, widthInches, heightInches) -> suggestedName;
            converter.setPicturesManager(picturesManager);
            converter.processDocument(document);

            ByteArrayOutputStream foBuffer = new ByteArrayOutputStream();
            Transformer serializer = TransformerFactory.newInstance().newTransformer();
            serializer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "no");
            serializer.transform(new DOMSource(converter.getDocument()), new StreamResult(foBuffer));

            ByteArrayOutputStream pdfOutput = new ByteArrayOutputStream();
            FOUserAgent foUserAgent = FOP_FACTORY.newFOUserAgent();
            Fop fop = FOP_FACTORY.newFop(MimeConstants.MIME_PDF, foUserAgent, pdfOutput);
            Transformer foTransformer = TransformerFactory.newInstance().newTransformer();
            StreamSource foSource = new StreamSource(new ByteArrayInputStream(foBuffer.toByteArray()));
            foTransformer.transform(foSource, new SAXResult(fop.getDefaultHandler()));

            return pdfOutput.toByteArray();
        } catch (ParserConfigurationException | TransformerException | FOPException e) {
            throw new IOException("Failed to convert DOC", e);
        }
    }

    private byte[] convertPptxToPdf(byte[] pptxBytes) throws IOException {
        try (ByteArrayInputStream input = new ByteArrayInputStream(pptxBytes);
             XMLSlideShow slideShow = new XMLSlideShow(input);
             PDDocument pdf = new PDDocument()) {
            List<XSLFSlide> slides = slideShow.getSlides();
            if (slides.isEmpty()) {
                throw new IOException("PowerPoint file does not contain slides");
            }

            Dimension size = slideShow.getPageSize();
            if (size == null || size.width <= 0 || size.height <= 0) {
                size = new Dimension(1600, 900);
            }

            for (XSLFSlide slide : slides) {
                BufferedImage image = new BufferedImage(size.width, size.height, BufferedImage.TYPE_INT_RGB);
                Graphics2D graphics = image.createGraphics();
                try {
                    graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                    graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                    graphics.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
                    graphics.setColor(Color.WHITE);
                    graphics.fillRect(0, 0, size.width, size.height);
                    slide.draw(graphics);
                } finally {
                    graphics.dispose();
                }

                PDPage page = new PDPage(new PDRectangle(size.width, size.height));
                pdf.addPage(page);
                PDImageXObject pdImage = LosslessFactory.createFromImage(pdf, image);
                try (PDPageContentStream contentStream = new PDPageContentStream(pdf, page)) {
                    contentStream.drawImage(pdImage, 0, 0, size.width, size.height);
                }
            }

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            pdf.save(output);
            return output.toByteArray();
        }
    }

    private byte[] convertPptToPdf(byte[] pptBytes) throws IOException {
        try (ByteArrayInputStream input = new ByteArrayInputStream(pptBytes);
             HSLFSlideShow slideShow = new HSLFSlideShow(input);
             PDDocument pdf = new PDDocument()) {
            List<HSLFSlide> slides = slideShow.getSlides();
            if (slides.isEmpty()) {
                throw new IOException("PowerPoint file does not contain slides");
            }

            Dimension size = slideShow.getPageSize();
            if (size == null || size.width <= 0 || size.height <= 0) {
                size = new Dimension(1600, 900);
            }

            for (HSLFSlide slide : slides) {
                BufferedImage image = new BufferedImage(size.width, size.height, BufferedImage.TYPE_INT_RGB);
                Graphics2D graphics = image.createGraphics();
                try {
                    graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                    graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                    graphics.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
                    graphics.setColor(Color.WHITE);
                    graphics.fillRect(0, 0, size.width, size.height);
                    slide.draw(graphics);
                } finally {
                    graphics.dispose();
                }

                PDPage page = new PDPage(new PDRectangle(size.width, size.height));
                pdf.addPage(page);
                PDImageXObject pdImage = LosslessFactory.createFromImage(pdf, image);
                try (PDPageContentStream contentStream = new PDPageContentStream(pdf, page)) {
                    contentStream.drawImage(pdImage, 0, 0, size.width, size.height);
                }
            }

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            pdf.save(output);
            return output.toByteArray();
        }
    }

    private byte[] renderPptxPreview(byte[] pptxBytes) throws IOException {
        try (ByteArrayInputStream input = new ByteArrayInputStream(pptxBytes);
             XMLSlideShow slideShow = new XMLSlideShow(input)) {
            if (slideShow.getSlides().isEmpty()) {
                throw new IOException("PowerPoint file does not contain slides");
            }
            Dimension size = slideShow.getPageSize();
            if (size == null || size.width <= 0 || size.height <= 0) {
                size = new Dimension(1600, 900);
            }
            BufferedImage image = new BufferedImage(size.width, size.height, BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = image.createGraphics();
            try {
                graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                graphics.setColor(Color.WHITE);
                graphics.fillRect(0, 0, size.width, size.height);
                XSLFSlide slide = slideShow.getSlides().get(0);
                slide.draw(graphics);
            } finally {
                graphics.dispose();
            }
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "png", output);
            return output.toByteArray();
        }
    }

    private byte[] renderPptPreview(byte[] pptBytes) throws IOException {
        try (ByteArrayInputStream input = new ByteArrayInputStream(pptBytes);
             HSLFSlideShow slideShow = new HSLFSlideShow(input)) {
            if (slideShow.getSlides().isEmpty()) {
                throw new IOException("PowerPoint file does not contain slides");
            }
            Dimension size = slideShow.getPageSize();
            if (size == null || size.width <= 0 || size.height <= 0) {
                size = new Dimension(1600, 900);
            }
            BufferedImage image = new BufferedImage(size.width, size.height, BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = image.createGraphics();
            try {
                graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                graphics.setColor(Color.WHITE);
                graphics.fillRect(0, 0, size.width, size.height);
                HSLFSlide slide = slideShow.getSlides().get(0);
                slide.draw(graphics);
            } finally {
                graphics.dispose();
            }
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "png", output);
            return output.toByteArray();
        }
    }

    private DocumentBuilder createSecureDocumentBuilder() throws ParserConfigurationException {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        return factory.newDocumentBuilder();
    }

    private byte[] renderWordPlaceholder(String filename, String subtitle) throws IOException {
        int width = 1200;
        int height = 675;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            GradientPaint bg = new GradientPaint(0, 0, new Color(232, 240, 255), width, height, new Color(246, 249, 255));
            g.setPaint(bg);
            g.fillRect(0, 0, width, height);

            g.setColor(Color.WHITE);
            g.fillRoundRect(60, 60, width - 120, height - 120, 32, 32);

            g.setColor(new Color(26, 115, 232));
            g.fillRoundRect(60, 120, width - 120, 110, 24, 24);

            g.setColor(Color.WHITE);
            g.setFont(new Font("SansSerif", Font.BOLD, 48));
            g.drawString("WORD", 90, 190);

            g.setColor(new Color(16, 17, 37));
            g.setFont(new Font("SansSerif", Font.BOLD, 52));
            g.drawString(shorten(filename, 28), 90, 320);

            g.setColor(new Color(61, 63, 82));
            g.setFont(new Font("SansSerif", Font.PLAIN, 28));
            g.drawString(shorten(subtitle, 38), 90, 370);

            g.setColor(new Color(93, 96, 122));
            g.setFont(new Font("SansSerif", Font.PLAIN, 22));
            g.drawString("Preview tam thoi cho tep Word", 90, 420);
        } finally {
            g.dispose();
        }

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }

    private byte[] renderPowerPointPlaceholder(String filename, String subtitle) throws IOException {
        int width = 1400;
        int height = 788;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            GradientPaint bg = new GradientPaint(0, 0, new Color(248, 250, 255), width, height, new Color(228, 236, 255));
            g.setPaint(bg);
            g.fillRect(0, 0, width, height);

            g.setColor(Color.WHITE);
            g.fillRoundRect(50, 50, width - 100, height - 100, 48, 48);

            g.setColor(new Color(245, 119, 66));
            g.fillRoundRect(50, 120, width - 100, 120, 36, 36);

            g.setColor(Color.WHITE);
            g.setFont(new Font("SansSerif", Font.BOLD, 52));
            g.drawString("POWERPOINT", 80, 190);

            g.setColor(new Color(26, 30, 55));
            g.setFont(new Font("SansSerif", Font.BOLD, 60));
            g.drawString(shorten(filename, 32), 80, 360);

            g.setColor(new Color(71, 76, 108));
            g.setFont(new Font("SansSerif", Font.PLAIN, 30));
            g.drawString(shorten(subtitle, 40), 80, 410);

            g.setColor(new Color(115, 120, 150));
            g.setFont(new Font("SansSerif", Font.PLAIN, 24));
            g.drawString("Preview slide đầu tiên", 80, 460);
        } finally {
            g.dispose();
        }

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }

    public byte[] generatePreviewSafe(MultipartFile file) throws IOException {
        try {
            return generatePreview(file);
        } catch (Exception e) {
            return renderGenericPlaceholder(file.getOriginalFilename(), "Preview fallback");
        }
    }

    private byte[] generatePreviewFromBytes(byte[] data, String filename, String contentType) throws IOException {
        if (data == null || data.length == 0) {
            throw new IllegalArgumentException("Empty file");
        }
        String normalizedContentType = contentType != null ? contentType.toLowerCase(Locale.ROOT) : "";
        String extension = extractExtension(filename);

        if (isPdf(normalizedContentType, extension)) {
            return renderPdfPreview(data);
        }
        if ("docx".equals(extension)) {
            try {
                return renderDocxPreview(data);
            } catch (Exception e) {
                return renderWordPlaceholder(filename, "DOCX preview fallback");
            }
        }
        if ("doc".equals(extension)) {
            try {
                return renderDocPreview(data);
            } catch (Exception e) {
                return renderWordPlaceholder(filename, "DOC preview fallback");
            }
        }
        if ("pptx".equals(extension)) {
            try {
                return renderPptxPreview(data);
            } catch (Exception e) {
                return renderPowerPointPlaceholder(filename, "PPTX preview fallback");
            }
        }
        if ("ppt".equals(extension)) {
            try {
                return renderPptPreview(data);
            } catch (Exception e) {
                return renderPowerPointPlaceholder(filename, "PPT preview fallback");
            }
        }
        throw new IllegalArgumentException("Preview not supported for this format");
    }

    private byte[] generateStoredPreviewFor(TaiLieu taiLieu) throws IOException {
        Path path = getPath(taiLieu);
        if (!Files.exists(path)) {
            throw new IllegalArgumentException("File không tồn tại trên hệ thống");
        }
        long size = Files.size(path);
        if (size > MAX_PREVIEW_SIZE) {
            throw new IllegalArgumentException("File quá lớn để dựng ảnh bìa");
        }
        byte[] data = Files.readAllBytes(path);
        String contentType = Files.probeContentType(path);
        if (contentType == null) {
            contentType = guessContentTypeFromName(taiLieu.getFileName());
        }
        return generatePreviewFromBytes(data, taiLieu.getFileName(), contentType);
    }

    private String resolveDocumentDisplayName(TaiLieu taiLieu) {
        if (taiLieu.getTenTaiLieu() != null && !taiLieu.getTenTaiLieu().isBlank()) {
            return taiLieu.getTenTaiLieu();
        }
        return taiLieu.getFileName() != null ? taiLieu.getFileName() : "document";
    }

    private byte[] renderGenericPlaceholder(String filename, String subtitle) throws IOException {
        int width = 1200;
        int height = 675;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            GradientPaint bg = new GradientPaint(0, 0, new Color(237, 242, 255), width, height, new Color(253, 251, 255));
            g.setPaint(bg);
            g.fillRect(0, 0, width, height);

            g.setColor(Color.WHITE);
            g.fillRoundRect(60, 60, width - 120, height - 120, 32, 32);

            g.setColor(new Color(17, 28, 78));
            g.fillRoundRect(60, 120, width - 120, 110, 24, 24);

            g.setColor(Color.WHITE);
            g.setFont(new Font("SansSerif", Font.BOLD, 48));
            g.drawString("PREVIEW", 90, 190);

            g.setColor(new Color(16, 17, 37));
            g.setFont(new Font("SansSerif", Font.BOLD, 52));
            g.drawString(shorten(filename, 28), 90, 320);

            g.setColor(new Color(61, 63, 82));
            g.setFont(new Font("SansSerif", Font.PLAIN, 28));
            g.drawString(shorten(subtitle, 38), 90, 370);

            g.setColor(new Color(93, 96, 122));
            g.setFont(new Font("SansSerif", Font.PLAIN, 22));
            g.drawString("Preview tam thoi (fallback)", 90, 420);
        } finally {
            g.dispose();
        }

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }

    private String shorten(String value, int max) {
        if (value == null) return "";
        String trimmed = value.trim();
        if (trimmed.length() <= max) return trimmed;
        if (max < 3) return trimmed.substring(0, Math.max(0, max));
        return trimmed.substring(0, max - 3) + "...";
    }
}

