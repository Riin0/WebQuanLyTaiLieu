package com.webquanly.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "phanquyen")
public class PhanQuyen {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idloainguoidung")
    private Long id;

    @Column(name = "tenloainguoidung")
    private String tenLoaiNguoiDung;

    public PhanQuyen() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTenLoaiNguoiDung() { return tenLoaiNguoiDung; }
    public void setTenLoaiNguoiDung(String tenLoaiNguoiDung) { this.tenLoaiNguoiDung = tenLoaiNguoiDung; }
}
