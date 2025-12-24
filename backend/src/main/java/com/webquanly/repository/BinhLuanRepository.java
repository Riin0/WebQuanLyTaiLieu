package com.webquanly.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.webquanly.model.BinhLuan;

public interface BinhLuanRepository extends JpaRepository<BinhLuan, Long> {
    List<BinhLuan> findByTaiLieuIdOrderByThoiGianDesc(Long documentId);

    List<BinhLuan> findTop50ByOrderByThoiGianDesc();

    @Modifying
    @Query("DELETE FROM BinhLuan b WHERE b.taiLieu.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);
}
