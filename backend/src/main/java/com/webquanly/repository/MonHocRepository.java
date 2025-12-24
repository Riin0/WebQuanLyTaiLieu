package com.webquanly.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.webquanly.model.MonHoc;

@Repository
public interface MonHocRepository extends JpaRepository<MonHoc, Long> {
	boolean existsByTenMonHocIgnoreCase(String tenMonHoc);
}
