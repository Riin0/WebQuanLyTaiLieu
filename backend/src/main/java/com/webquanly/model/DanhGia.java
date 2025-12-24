package com.webquanly.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "danhgia")
public class DanhGia {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "iddanhgia")
    private Long id;

    @ManyToOne
    @JoinColumn(name = "idtailieu")
    private TaiLieu taiLieu;

    @ManyToOne
    @JoinColumn(name = "iduser")
    private User user;

    @Column(name = "sodiem")
    private Integer soDiem;

    @Column(name = "ghichu", columnDefinition = "text")
    private String ghiChu;

    @Column(name = "tgdanhgia")
    private LocalDateTime thoiGianDanhGia;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public TaiLieu getTaiLieu() { return taiLieu; }
    public void setTaiLieu(TaiLieu taiLieu) { this.taiLieu = taiLieu; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Integer getSoDiem() { return soDiem; }
    public void setSoDiem(Integer soDiem) { this.soDiem = soDiem; }

    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }

    public LocalDateTime getThoiGianDanhGia() { return thoiGianDanhGia; }
    public void setThoiGianDanhGia(LocalDateTime thoiGianDanhGia) { this.thoiGianDanhGia = thoiGianDanhGia; }
}
