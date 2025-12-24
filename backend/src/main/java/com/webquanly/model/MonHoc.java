package com.webquanly.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "monhoc")
public class MonHoc {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idmonhoc")
    private Long id;

    @Column(name = "tenmonhoc")
    private String tenMonHoc;

    public MonHoc() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTenMonHoc() { return tenMonHoc; }
    public void setTenMonHoc(String tenMonHoc) { this.tenMonHoc = tenMonHoc; }
}
