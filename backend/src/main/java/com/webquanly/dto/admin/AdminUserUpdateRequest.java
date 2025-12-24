package com.webquanly.dto.admin;

public class AdminUserUpdateRequest {
    private Long roleId;
    private String roleSlug;
    private Boolean verified;
    private Boolean accountLocked;
    private String lockReason;

    public Long getRoleId() {
        return roleId;
    }

    public void setRoleId(Long roleId) {
        this.roleId = roleId;
    }

    public String getRoleSlug() {
        return roleSlug;
    }

    public void setRoleSlug(String roleSlug) {
        this.roleSlug = roleSlug;
    }

    public Boolean getVerified() {
        return verified;
    }

    public void setVerified(Boolean verified) {
        this.verified = verified;
    }

    public Boolean getAccountLocked() {
        return accountLocked;
    }

    public void setAccountLocked(Boolean accountLocked) {
        this.accountLocked = accountLocked;
    }

    public String getLockReason() {
        return lockReason;
    }

    public void setLockReason(String lockReason) {
        this.lockReason = lockReason;
    }
}
