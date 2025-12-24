package com.webquanly.repository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.webquanly.model.BinhLuanReport;

public interface BinhLuanReportRepository extends JpaRepository<BinhLuanReport, Long> {

    long countByCommentId(Long commentId);

    boolean existsByCommentIdAndUserIdUser(Long commentId, Long userId);

    @Query("SELECT r.comment.id AS commentId, COUNT(r) AS total FROM BinhLuanReport r WHERE r.comment.id IN :commentIds GROUP BY r.comment.id")
    List<CommentReportAggregate> countByCommentIds(@Param("commentIds") List<Long> commentIds);

    @Query("SELECT r.comment.id FROM BinhLuanReport r WHERE r.comment.id IN :commentIds AND r.user.idUser = :userId")
    List<Long> findCommentIdsReportedByUser(@Param("commentIds") List<Long> commentIds, @Param("userId") Long userId);

    interface CommentReportAggregate {
        Long getCommentId();
        Long getTotal();
    }

    default Map<Long, Long> mapCounts(List<Long> commentIds) {
        if (commentIds == null || commentIds.isEmpty()) {
            return java.util.Collections.emptyMap();
        }
        return countByCommentIds(commentIds).stream()
                .collect(Collectors.toMap(CommentReportAggregate::getCommentId, CommentReportAggregate::getTotal));
    }
}
