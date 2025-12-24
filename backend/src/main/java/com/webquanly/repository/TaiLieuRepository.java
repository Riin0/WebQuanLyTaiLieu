package com.webquanly.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.webquanly.model.TaiLieu;

public interface TaiLieuRepository extends JpaRepository<TaiLieu, Long> {

            @Query("SELECT t.monHoc.id AS monHocId, COUNT(t) AS total FROM TaiLieu t " +
                "WHERE t.monHoc IS NOT NULL " +
                "AND (:status IS NULL OR t.trangThaiKiemDuyet IS NULL OR upper(t.trangThaiKiemDuyet) = upper(:status)) " +
                "GROUP BY t.monHoc.id")
            List<MonHocCount> countDocumentsByMonHoc(@Param("status") String status);

    List<TaiLieu> findByMonHocIdOrderByThoiGianDangDesc(Long monHocId);

        List<TaiLieu> findByMonHocIdAndTrangThaiKiemDuyetIgnoreCaseOrderByThoiGianDangDesc(Long monHocId, String trangThaiKiemDuyet);

        @Query("SELECT t FROM TaiLieu t WHERE t.monHoc.id = :monHocId " +
            "AND (t.trangThaiKiemDuyet IS NULL OR upper(t.trangThaiKiemDuyet) = upper(:status)) " +
            "ORDER BY t.thoiGianDang DESC")
        List<TaiLieu> findApprovedOrUnsetByMonHoc(@Param("monHocId") Long monHocId,
                                @Param("status") String status);

    List<TaiLieu> findByTrangThaiKiemDuyetIgnoreCaseOrderByThoiGianDangDesc(String trangThaiKiemDuyet);

    List<TaiLieu> findByUserIdUserOrderByThoiGianDangDesc(Long userId);

    TaiLieu findTop1ByUserIdUserOrderByThoiGianDangDesc(Long userId);

    long countByUserIdUser(Long userId);

    long countByThoiGianDangBetween(LocalDateTime start, LocalDateTime end);

    List<TaiLieu> findTop20ByOrderByThoiGianDangDesc();

    List<TaiLieu> findTop20ByTrangThaiKiemDuyetIgnoreCaseOrderByThoiGianDangDesc(String trangThaiKiemDuyet);

    @Query("SELECT COALESCE(SUM(t.soLuongNguoiTai), 0) FROM TaiLieu t")
    Long sumDownloadCount();

    @Query("SELECT COALESCE(SUM(t.soLuongNguoiTai), 0) FROM TaiLieu t WHERE t.user.idUser = :userId")
    Long sumDownloadCountByUser(@Param("userId") Long userId);

        long countByMonHocId(Long monHocId);

    long countByTrangThaiKiemDuyetIgnoreCase(String trangThaiKiemDuyet);

        @Query("SELECT COUNT(t) FROM TaiLieu t WHERE t.monHoc.id = :monHocId " +
            "AND (t.trangThaiKiemDuyet IS NULL OR upper(t.trangThaiKiemDuyet) = upper(:status))")
        long countApprovedOrUnsetByMonHoc(@Param("monHocId") Long monHocId,
                           @Param("status") String status);


    interface MonHocCount {
        Long getMonHocId();
        Long getTotal();
    }
}
