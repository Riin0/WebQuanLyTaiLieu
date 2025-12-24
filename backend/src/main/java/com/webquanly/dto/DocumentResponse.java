package com.webquanly.dto;

import java.time.LocalDateTime;

public class DocumentResponse {
    private Long id;
    private String title;
    private String filename;
    private String contentType;
    private Long size;
    private String uploaderEmail;
    private String uploaderName;
    private LocalDateTime createdAt;
    private String loaiTaiLieu;
    private Long monHocId;
    private String monHocTen;
    private Integer downloadCount;
    private String uploaderRole;
    private boolean pendingSubject;
    private String reviewStatus;
    private String reviewReason;
    
    public LocalDateTime getUploadDate() { return createdAt; }
    public void setUploadDate(LocalDateTime uploadDate) { this.createdAt = uploadDate; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public Long getSize() { return size; }
    public void setSize(Long size) { this.size = size; }
    public String getUploaderEmail() { return uploaderEmail; }
    public void setUploaderEmail(String uploaderEmail) { this.uploaderEmail = uploaderEmail; }
    public String getUploaderName() { return uploaderName; }
    public void setUploaderName(String uploaderName) { this.uploaderName = uploaderName; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getLoaiTaiLieu() { return loaiTaiLieu; }
    public void setLoaiTaiLieu(String loaiTaiLieu) { this.loaiTaiLieu = loaiTaiLieu; }
    public Long getMonHocId() { return monHocId; }
    public void setMonHocId(Long monHocId) { this.monHocId = monHocId; }
    public String getMonHocTen() { return monHocTen; }
    public void setMonHocTen(String monHocTen) { this.monHocTen = monHocTen; }
    public Integer getDownloadCount() { return downloadCount; }
    public void setDownloadCount(Integer downloadCount) { this.downloadCount = downloadCount; }
    public String getUploaderRole() { return uploaderRole; }
    public void setUploaderRole(String uploaderRole) { this.uploaderRole = uploaderRole; }
    public boolean isPendingSubject() { return pendingSubject; }
    public void setPendingSubject(boolean pendingSubject) { this.pendingSubject = pendingSubject; }

    public String getReviewStatus() { return reviewStatus; }
    public void setReviewStatus(String reviewStatus) { this.reviewStatus = reviewStatus; }

    public String getReviewReason() { return reviewReason; }
    public void setReviewReason(String reviewReason) { this.reviewReason = reviewReason; }
}
