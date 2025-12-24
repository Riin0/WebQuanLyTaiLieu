package com.webquanly.dto;

import java.time.LocalDateTime;

public class TaiLieuResponse {
    private Long id;
    private String tenTaiLieu;
    private String moTa;
    private String loaiTaiLieu;
    private Long monHocId;
    private String monHoc;
    private String nguoiDang;
    private Double danhGia;
    private Integer soLuongNguoiTai;
    private LocalDateTime thoiGianDang;
    private String fileName;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTenTaiLieu() { return tenTaiLieu; }
    public void setTenTaiLieu(String tenTaiLieu) { this.tenTaiLieu = tenTaiLieu; }

    public String getMoTa() { return moTa; }
    public void setMoTa(String moTa) { this.moTa = moTa; }

    public String getLoaiTaiLieu() { return loaiTaiLieu; }
    public void setLoaiTaiLieu(String loaiTaiLieu) { this.loaiTaiLieu = loaiTaiLieu; }

    public Long getMonHocId() { return monHocId; }
    public void setMonHocId(Long monHocId) { this.monHocId = monHocId; }

    public String getMonHoc() { return monHoc; }
    public void setMonHoc(String monHoc) { this.monHoc = monHoc; }

    public String getNguoiDang() { return nguoiDang; }
    public void setNguoiDang(String nguoiDang) { this.nguoiDang = nguoiDang; }

    public Double getDanhGia() { return danhGia; }
    public void setDanhGia(Double danhGia) { this.danhGia = danhGia; }

    public Integer getSoLuongNguoiTai() { return soLuongNguoiTai; }
    public void setSoLuongNguoiTai(Integer soLuongNguoiTai) { this.soLuongNguoiTai = soLuongNguoiTai; }

    public LocalDateTime getThoiGianDang() { return thoiGianDang; }
    public void setThoiGianDang(LocalDateTime thoiGianDang) { this.thoiGianDang = thoiGianDang; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
}
