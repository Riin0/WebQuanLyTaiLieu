package com.webquanly.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.webquanly.model.LoaiTaiLieu;

public interface LoaiTaiLieuRepository extends JpaRepository<LoaiTaiLieu, Long> {
    Optional<LoaiTaiLieu> findByTenLoaiTaiLieuIgnoreCase(String tenLoaiTaiLieu);
}
