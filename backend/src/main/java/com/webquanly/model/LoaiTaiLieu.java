package com.webquanly.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "loaitailieu")
public class LoaiTaiLieu {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idloaitailieu")
    private Long id;

    @Column(name = "tenloaitailieu")
    private String tenLoaiTaiLieu;

    public LoaiTaiLieu() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTenLoaiTaiLieu() { return tenLoaiTaiLieu; }
    public void setTenLoaiTaiLieu(String tenLoaiTaiLieu) { this.tenLoaiTaiLieu = tenLoaiTaiLieu; }
}
