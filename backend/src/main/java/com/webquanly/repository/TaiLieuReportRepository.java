package com.webquanly.repository;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.webquanly.model.TaiLieuReport;

public interface TaiLieuReportRepository extends JpaRepository<TaiLieuReport, Long> {

    boolean existsByDocument_IdAndReporter_IdUser(Long documentId, Long reporterId);

    long countByDocument_Id(Long documentId);

    List<TaiLieuReport> findByDocument_IdOrderByCreatedAtDesc(Long documentId);

    void deleteByDocument_Id(Long documentId);

    @Query("SELECT r.document.id AS documentId, COUNT(r) AS total FROM TaiLieuReport r " +
        "WHERE r.document.id IN :documentIds GROUP BY r.document.id")
    List<DocumentReportAggregate> countByDocumentIds(@Param("documentIds") List<Long> documentIds);

    @Query("SELECT r.document.id FROM TaiLieuReport r WHERE r.document.id IN :documentIds " +
        "AND r.reporter.idUser = :userId")
    List<Long> findDocumentIdsReportedByUser(@Param("documentIds") List<Long> documentIds,
                                             @Param("userId") Long userId);

    interface DocumentReportAggregate {
        Long getDocumentId();
        Long getTotal();
    }

    default Map<Long, Long> mapCounts(List<Long> documentIds) {
        if (documentIds == null || documentIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return countByDocumentIds(documentIds).stream()
                .collect(Collectors.toMap(DocumentReportAggregate::getDocumentId,
                                          DocumentReportAggregate::getTotal));
    }
}
