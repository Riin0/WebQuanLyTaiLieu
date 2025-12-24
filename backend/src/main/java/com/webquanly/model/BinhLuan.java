package com.webquanly.model;

import java.time.LocalDateTime;

import java.util.ArrayList;
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
@Table(name = "binhluan")
public class BinhLuan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idbinhluan")
    private Long id;

    @Column(name = "ndbinhluan", columnDefinition = "text")
    private String noiDung;

    @ManyToOne
    @JoinColumn(name = "iduser")
    private User user;

    @Column(name = "tgbinhluan")
    private LocalDateTime thoiGian;

    @ManyToOne
    @JoinColumn(name = "idtailieu")
    private TaiLieu taiLieu;

    @ManyToOne
    @JoinColumn(name = "idbinhluancha")
    private BinhLuan parent;

    @OneToMany(mappedBy = "parent")
    private List<BinhLuan> replies = new ArrayList<>();

    @OneToMany(mappedBy = "comment")
    private List<BinhLuanReport> reports = new ArrayList<>();

    public BinhLuan() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNoiDung() { return noiDung; }
    public void setNoiDung(String noiDung) { this.noiDung = noiDung; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public LocalDateTime getThoiGian() { return thoiGian; }
    public void setThoiGian(LocalDateTime thoiGian) { this.thoiGian = thoiGian; }

    public TaiLieu getTaiLieu() { return taiLieu; }
    public void setTaiLieu(TaiLieu taiLieu) { this.taiLieu = taiLieu; }

    public BinhLuan getParent() { return parent; }
    public void setParent(BinhLuan parent) { this.parent = parent; }

    public List<BinhLuan> getReplies() { return replies; }
    public void setReplies(List<BinhLuan> replies) { this.replies = replies; }

    public List<BinhLuanReport> getReports() { return reports; }
    public void setReports(List<BinhLuanReport> reports) { this.reports = reports; }
}
