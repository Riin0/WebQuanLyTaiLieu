package com.webquanly.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.webquanly.model.PhanQuyen;

@Repository
public interface PhanQuyenRepository extends JpaRepository<PhanQuyen, Long> {
	Optional<PhanQuyen> findByTenLoaiNguoiDungIgnoreCase(String name);
}
