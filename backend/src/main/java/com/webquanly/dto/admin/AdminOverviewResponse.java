package com.webquanly.dto.admin;

public class AdminOverviewResponse {
    private long totalUsers;
    private long verifiedUsers;
    private long totalDocuments;
    private long totalDownloads;
    private long documentsToday;
    private long totalComments;

    public long getTotalUsers() {
        return totalUsers;
    }

    public void setTotalUsers(long totalUsers) {
        this.totalUsers = totalUsers;
    }

    public long getVerifiedUsers() {
        return verifiedUsers;
    }

    public void setVerifiedUsers(long verifiedUsers) {
        this.verifiedUsers = verifiedUsers;
    }

    public long getTotalDocuments() {
        return totalDocuments;
    }

    public void setTotalDocuments(long totalDocuments) {
        this.totalDocuments = totalDocuments;
    }

    public long getTotalDownloads() {
        return totalDownloads;
    }

    public void setTotalDownloads(long totalDownloads) {
        this.totalDownloads = totalDownloads;
    }

    public long getDocumentsToday() {
        return documentsToday;
    }

    public void setDocumentsToday(long documentsToday) {
        this.documentsToday = documentsToday;
    }

    public long getTotalComments() {
        return totalComments;
    }

    public void setTotalComments(long totalComments) {
        this.totalComments = totalComments;
    }
}
