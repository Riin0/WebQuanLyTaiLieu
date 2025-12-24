package com.webquanly.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class RegisterRequest {
    @NotBlank(message = "Email là bắt buộc")
    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Mật khẩu là bắt buộc")
    private String password;

    @NotBlank(message = "Xác nhận mật khẩu là bắt buộc")
    private String confirmPassword;

    private String name;
    private String role; // "USER" hoặc "ADMIN"
    private String adminSecret; // mã bảo mật khi tạo admin
    private Long roleId; // id phân quyền

    // Getters/Setters
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getConfirmPassword() { return confirmPassword; }
    public void setConfirmPassword(String confirmPassword) { this.confirmPassword = confirmPassword; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getAdminSecret() { return adminSecret; }
    public void setAdminSecret(String adminSecret) { this.adminSecret = adminSecret; }

    public Long getRoleId() { return roleId; }
    public void setRoleId(Long roleId) { this.roleId = roleId; }
}
