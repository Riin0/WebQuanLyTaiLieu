package com.webquanly.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.webquanly.model.DanhGia;

public interface DanhGiaRepository extends JpaRepository<DanhGia, Long> {

    @Query("SELECT AVG(r.soDiem) FROM DanhGia r WHERE r.taiLieu.id = :documentId")
    Double calculateAverageScore(@Param("documentId") Long documentId);

    long countByTaiLieuId(Long documentId);

    @Query("SELECT r.soDiem FROM DanhGia r WHERE r.taiLieu.id = :documentId AND r.user.idUser = :userId")
    Integer findUserScore(@Param("documentId") Long documentId, @Param("userId") Long userId);

    @Query("SELECT r FROM DanhGia r WHERE r.taiLieu.id = :documentId AND r.user.idUser = :userId")
    Optional<DanhGia> findByDocumentAndUser(@Param("documentId") Long documentId, @Param("userId") Long userId);

    List<DanhGia> findByTaiLieuIdOrderByThoiGianDanhGiaDesc(Long documentId);

    @Modifying
    @Query("DELETE FROM DanhGia r WHERE r.taiLieu.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);
}
