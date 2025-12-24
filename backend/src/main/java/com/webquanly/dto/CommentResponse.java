package com.webquanly.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class CommentResponse {
    private Long id;
    private String content;
    private String authorName;
    private String authorEmail;
    private String authorRole;
    private String authorAvatarUrl;
    private LocalDateTime createdAt;
    private Integer ratingScore;
    private boolean ratingOnly;
    private boolean authorIsUploader;
    private Long parentId;
    private List<CommentResponse> replies = new ArrayList<>();
    private long reportCount;
    private boolean reportedByViewer;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public String getAuthorEmail() { return authorEmail; }
    public void setAuthorEmail(String authorEmail) { this.authorEmail = authorEmail; }

    public String getAuthorRole() { return authorRole; }
    public void setAuthorRole(String authorRole) { this.authorRole = authorRole; }

    public String getAuthorAvatarUrl() { return authorAvatarUrl; }
    public void setAuthorAvatarUrl(String authorAvatarUrl) { this.authorAvatarUrl = authorAvatarUrl; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Integer getRatingScore() { return ratingScore; }
    public void setRatingScore(Integer ratingScore) { this.ratingScore = ratingScore; }

    public boolean isRatingOnly() { return ratingOnly; }
    public void setRatingOnly(boolean ratingOnly) { this.ratingOnly = ratingOnly; }

    public boolean isAuthorIsUploader() { return authorIsUploader; }
    public void setAuthorIsUploader(boolean authorIsUploader) { this.authorIsUploader = authorIsUploader; }

    public Long getParentId() { return parentId; }
    public void setParentId(Long parentId) { this.parentId = parentId; }

    public List<CommentResponse> getReplies() { return replies; }
    public void setReplies(List<CommentResponse> replies) { this.replies = replies; }

    public long getReportCount() { return reportCount; }
    public void setReportCount(long reportCount) { this.reportCount = reportCount; }

    public boolean isReportedByViewer() { return reportedByViewer; }
    public void setReportedByViewer(boolean reportedByViewer) { this.reportedByViewer = reportedByViewer; }
}
