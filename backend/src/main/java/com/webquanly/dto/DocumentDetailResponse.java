package com.webquanly.dto;

import java.util.Collections;
import java.util.List;

public class DocumentDetailResponse extends DocumentResponse {
    private String description;
    private RatingSummaryResponse rating;
    private List<CommentResponse> comments = Collections.emptyList();
    private boolean viewerIsUploader;
    private long reportCount;
    private boolean reportedByViewer;

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public RatingSummaryResponse getRating() { return rating; }
    public void setRating(RatingSummaryResponse rating) { this.rating = rating; }

    public List<CommentResponse> getComments() { return comments; }
    public void setComments(List<CommentResponse> comments) { this.comments = comments; }

    public boolean isViewerIsUploader() { return viewerIsUploader; }
    public void setViewerIsUploader(boolean viewerIsUploader) { this.viewerIsUploader = viewerIsUploader; }

    public long getReportCount() { return reportCount; }
    public void setReportCount(long reportCount) { this.reportCount = reportCount; }

    public boolean isReportedByViewer() { return reportedByViewer; }
    public void setReportedByViewer(boolean reportedByViewer) { this.reportedByViewer = reportedByViewer; }
}
