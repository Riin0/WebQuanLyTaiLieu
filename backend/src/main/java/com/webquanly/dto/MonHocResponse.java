package com.webquanly.dto;

public class MonHocResponse {
    private Long id;
    private String tenMonHoc;
    private long documentCount;

    public MonHocResponse() {}

    public MonHocResponse(Long id, String tenMonHoc, long documentCount) {
        this.id = id;
        this.tenMonHoc = tenMonHoc;
        this.documentCount = documentCount;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTenMonHoc() { return tenMonHoc; }
    public void setTenMonHoc(String tenMonHoc) { this.tenMonHoc = tenMonHoc; }

    public long getDocumentCount() { return documentCount; }
    public void setDocumentCount(long documentCount) { this.documentCount = documentCount; }
}
