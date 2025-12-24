package com.webquanly.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.webquanly.dto.MonHocRequest;
import com.webquanly.dto.MonHocResponse;
import com.webquanly.exception.ResourceNotFoundException;
import com.webquanly.model.MonHoc;
import com.webquanly.model.TaiLieu;
import com.webquanly.repository.MonHocRepository;
import com.webquanly.repository.TaiLieuRepository;

@Service
public class MonHocService {

    private final MonHocRepository monHocRepository;
    private final TaiLieuRepository taiLieuRepository;
    private final NotificationService notificationService;

    public MonHocService(MonHocRepository monHocRepository,
                         TaiLieuRepository taiLieuRepository,
                         NotificationService notificationService) {
        this.monHocRepository = monHocRepository;
        this.taiLieuRepository = taiLieuRepository;
        this.notificationService = notificationService;
    }

    public List<MonHocResponse> getAllWithStats() {
        Map<Long, Long> counts = new HashMap<>();

        taiLieuRepository.countDocumentsByMonHoc(DocumentService.REVIEW_APPROVED).forEach(row ->
            counts.merge(row.getMonHocId(), row.getTotal(), Long::sum)
        );

        return monHocRepository.findAll().stream()
            .map(monHoc -> new MonHocResponse(
                monHoc.getId(),
                monHoc.getTenMonHoc(),
                counts.getOrDefault(monHoc.getId(), 0L)
            ))
            .collect(Collectors.toList());
    }

    public MonHocResponse createSubject(MonHocRequest request) {
        String tenMonHoc = sanitizeName(request != null ? request.getTenMonHoc() : null);
        validateName(tenMonHoc);
        if (monHocRepository.existsByTenMonHocIgnoreCase(tenMonHoc)) {
            throw new IllegalArgumentException("Môn học đã tồn tại trong hệ thống");
        }

        MonHoc monHoc = new MonHoc();
        monHoc.setTenMonHoc(tenMonHoc);
        MonHoc saved = monHocRepository.save(monHoc);

        return new MonHocResponse(saved.getId(), saved.getTenMonHoc(), 0L);
    }

    @Transactional
    public MonHocResponse updateSubject(Long id, MonHocRequest request) {
        MonHoc existing = monHocRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy môn học"));

        String tenMonHoc = sanitizeName(request != null ? request.getTenMonHoc() : null);
        validateName(tenMonHoc);
        boolean nameChanged = !existing.getTenMonHoc().equalsIgnoreCase(tenMonHoc);
        if (nameChanged && monHocRepository.existsByTenMonHocIgnoreCase(tenMonHoc)) {
            throw new IllegalArgumentException("Tên môn học đã được sử dụng");
        }

        existing.setTenMonHoc(tenMonHoc);
        MonHoc saved = monHocRepository.save(existing);
        long documentCount = taiLieuRepository.countApprovedOrUnsetByMonHoc(
            saved.getId(), DocumentService.REVIEW_APPROVED
        );

        return new MonHocResponse(saved.getId(), saved.getTenMonHoc(), documentCount);
    }

    @Transactional
    public void deleteSubject(Long id) {
        MonHoc existing = monHocRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy môn học"));
        List<TaiLieu> documents = taiLieuRepository.findByMonHocIdOrderByThoiGianDangDesc(id);
        if (!documents.isEmpty()) {
            documents.forEach(doc -> {
                doc.setMonHoc(null);
                doc.setDangXetChonMon(true);
                notificationService.notifyPendingSubjectSelection(doc, existing.getTenMonHoc());
            });
            taiLieuRepository.saveAll(documents);
        }
        monHocRepository.delete(existing);
    }

    private void validateName(String tenMonHoc) {
        if (tenMonHoc == null || tenMonHoc.isBlank()) {
            throw new IllegalArgumentException("Tên môn học không được để trống");
        }
        if (tenMonHoc.length() > 150) {
            throw new IllegalArgumentException("Tên môn học không được vượt quá 150 ký tự");
        }
    }

    private String sanitizeName(String raw) {
        if (raw == null) {
            return null;
        }
        return raw.trim().replaceAll("\\s+", " ");
    }
}
