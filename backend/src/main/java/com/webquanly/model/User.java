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
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "iduser")
    private Long idUser;

    @Column(name = "tenuser", nullable = false, length = 100)
    private String tenUser;

    @Column(name = "idloainguoidung", nullable = false)
    private Long idLoaiNguoiDung;

    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "verification_code", length = 255)
    private String verificationCode;

    @Column(name = "verification_expiry")
    private LocalDateTime verificationExpiry;

    @Column(name = "verified")
    private boolean verified;

    @Column(name = "account_locked")
    private boolean accountLocked;

    @Column(name = "lock_reason", columnDefinition = "text")
    private String lockReason;

    @Column(name = "lichsudang")
    private LocalDateTime lichSuDang;

    @Column(name = "avatar_path", length = 255)
    private String avatarPath;

    @ManyToOne
    @JoinColumn(name = "idloainguoidung", insertable = false, updatable = false)
    private PhanQuyen phanQuyen;

    // ======= Getters & Setters =======

    public Long getIdUser() {
        return idUser;
    }

    public void setIdUser(Long idUser) {
        this.idUser = idUser;
    }

    public String getTenUser() {
        return tenUser;
    }

    public void setTenUser(String tenUser) {
        this.tenUser = tenUser;
    }

    public Long getIdLoaiNguoiDung() {
        return idLoaiNguoiDung;
    }

    public void setIdLoaiNguoiDung(Long idLoaiNguoiDung) {
        this.idLoaiNguoiDung = idLoaiNguoiDung;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getVerificationCode() {
        return verificationCode;
    }

    public void setVerificationCode(String verificationCode) {
        this.verificationCode = verificationCode;
    }

    public LocalDateTime getVerificationExpiry() {
        return verificationExpiry;
    }

    public void setVerificationExpiry(LocalDateTime verificationExpiry) {
        this.verificationExpiry = verificationExpiry;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public boolean isAccountLocked() {
        return accountLocked;
    }

    public void setAccountLocked(boolean accountLocked) {
        this.accountLocked = accountLocked;
    }

    public String getLockReason() {
        return lockReason;
    }

    public void setLockReason(String lockReason) {
        this.lockReason = lockReason;
    }

    public LocalDateTime getLichSuDang() {
        return lichSuDang;
    }

    public void setLichSuDang(LocalDateTime lichSuDang) {
        this.lichSuDang = lichSuDang;
    }

    public String getAvatarPath() {
        return avatarPath;
    }

    public void setAvatarPath(String avatarPath) {
        this.avatarPath = avatarPath;
    }

    public PhanQuyen getPhanQuyen() {
        return phanQuyen;
    }

    public void setPhanQuyen(PhanQuyen phanQuyen) {
        this.phanQuyen = phanQuyen;
    }
}
