package com.webquanly.model;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "tailieu")
public class TaiLieu {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idtailieu")
    private Long id;

    @Column(name = "tentailieu")
    private String tenTaiLieu;

    @ManyToOne
    @JoinColumn(name = "idloaitailieu")
    private LoaiTaiLieu loaiTaiLieu;

    @Column(name = "mota", columnDefinition = "text")
    private String moTa;

    @ManyToOne
    @JoinColumn(name = "iduser")
    private User user;

    @Column(name = "tgdanglen")
    private LocalDateTime thoiGianDang;

    @Column(name = "danhgia")
    private Double danhGia;

    @ManyToOne
    @JoinColumn(name = "idmonhoc")
    private MonHoc monHoc;

    @Column(name = "slnguoitai")
    private Integer soLuongNguoiTai;

    @OneToMany(mappedBy = "taiLieu")
    private List<BinhLuan> binhLuan;

    @Column(name = "file")
    private String fileName;

    @Column(name = "dangxetchonmon")
    private boolean dangXetChonMon;

    @Column(name = "trangthaikiemduyet", length = 30)
    private String trangThaiKiemDuyet;

    @Column(name = "lydokiemduyet", columnDefinition = "text")
    private String lyDoKiemDuyet;

    @Column(name = "tgkiemduyet")
    private LocalDateTime thoiGianKiemDuyet;

    @Column(name = "nguoikiemduyet")
    private String nguoiKiemDuyet;

    public TaiLieu() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTenTaiLieu() { return tenTaiLieu; }
    public void setTenTaiLieu(String tenTaiLieu) { this.tenTaiLieu = tenTaiLieu; }

    public LoaiTaiLieu getLoaiTaiLieu() { return loaiTaiLieu; }
    public void setLoaiTaiLieu(LoaiTaiLieu loaiTaiLieu) { this.loaiTaiLieu = loaiTaiLieu; }

    public String getMoTa() { return moTa; }
    public void setMoTa(String moTa) { this.moTa = moTa; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public LocalDateTime getThoiGianDang() { return thoiGianDang; }
    public void setThoiGianDang(LocalDateTime thoiGianDang) { this.thoiGianDang = thoiGianDang; }

    public Double getDanhGia() { return danhGia; }
    public void setDanhGia(Double danhGia) { this.danhGia = danhGia; }

    public MonHoc getMonHoc() { return monHoc; }
    public void setMonHoc(MonHoc monHoc) { this.monHoc = monHoc; }

    public Integer getSoLuongNguoiTai() { return soLuongNguoiTai; }
    public void setSoLuongNguoiTai(Integer soLuongNguoiTai) { this.soLuongNguoiTai = soLuongNguoiTai; }

    public List<BinhLuan> getBinhLuan() { return binhLuan; }
    public void setBinhLuan(List<BinhLuan> binhLuan) { this.binhLuan = binhLuan; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public boolean isDangXetChonMon() { return dangXetChonMon; }
    public void setDangXetChonMon(boolean dangXetChonMon) { this.dangXetChonMon = dangXetChonMon; }

    public String getTrangThaiKiemDuyet() { return trangThaiKiemDuyet; }
    public void setTrangThaiKiemDuyet(String trangThaiKiemDuyet) { this.trangThaiKiemDuyet = trangThaiKiemDuyet; }

    public String getLyDoKiemDuyet() { return lyDoKiemDuyet; }
    public void setLyDoKiemDuyet(String lyDoKiemDuyet) { this.lyDoKiemDuyet = lyDoKiemDuyet; }

    public LocalDateTime getThoiGianKiemDuyet() { return thoiGianKiemDuyet; }
    public void setThoiGianKiemDuyet(LocalDateTime thoiGianKiemDuyet) { this.thoiGianKiemDuyet = thoiGianKiemDuyet; }

    public String getNguoiKiemDuyet() { return nguoiKiemDuyet; }
    public void setNguoiKiemDuyet(String nguoiKiemDuyet) { this.nguoiKiemDuyet = nguoiKiemDuyet; }
}
