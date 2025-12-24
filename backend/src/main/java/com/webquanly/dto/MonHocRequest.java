package com.webquanly.dto;

import jakarta.validation.constraints.NotBlank;

public class MonHocRequest {

    @NotBlank(message = "Tên môn học không được để trống")
    private String tenMonHoc;

    public String getTenMonHoc() {
        return tenMonHoc;
    }

    public void setTenMonHoc(String tenMonHoc) {
        this.tenMonHoc = tenMonHoc;
    }
}
