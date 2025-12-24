package com.webquanly.service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.webquanly.dto.TaiLieuResponse;
import com.webquanly.model.TaiLieu;
import com.webquanly.repository.TaiLieuRepository;

@Service
public class TaiLieuService {

    private final TaiLieuRepository taiLieuRepository;

    public TaiLieuService(TaiLieuRepository taiLieuRepository) {
        this.taiLieuRepository = taiLieuRepository;
    }

    public List<TaiLieuResponse> getByMonHoc(Long monHocId) {
        if (monHocId == null) {
            return Collections.emptyList();
        }

        return taiLieuRepository.findApprovedOrUnsetByMonHoc(monHocId, DocumentService.REVIEW_APPROVED)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private TaiLieuResponse toResponse(TaiLieu entity) {
        TaiLieuResponse response = new TaiLieuResponse();
        response.setId(entity.getId());
        response.setTenTaiLieu(entity.getTenTaiLieu());
        response.setMoTa(entity.getMoTa());

        if (entity.getLoaiTaiLieu() != null) {
            response.setLoaiTaiLieu(entity.getLoaiTaiLieu().getTenLoaiTaiLieu());
        }

        if (entity.getMonHoc() != null) {
            response.setMonHocId(entity.getMonHoc().getId());
            response.setMonHoc(entity.getMonHoc().getTenMonHoc());
        }

        if (entity.getUser() != null) {
            response.setNguoiDang(entity.getUser().getTenUser());
        }

        response.setDanhGia(entity.getDanhGia());
        response.setSoLuongNguoiTai(entity.getSoLuongNguoiTai());
        response.setThoiGianDang(entity.getThoiGianDang());
        response.setFileName(entity.getFileName());
        return response;
    }
}
