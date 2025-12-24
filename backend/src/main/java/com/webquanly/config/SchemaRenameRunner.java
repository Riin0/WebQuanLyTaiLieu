package com.webquanly.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

/**
 * Temporary helper to align legacy table/index names with the new Vietnamese naming convention
 * without requiring manual SQL execution in each environment.
 */
@Component
public class SchemaRenameRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(SchemaRenameRunner.class);

    private final JdbcTemplate jdbcTemplate;

    public SchemaRenameRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void ensureRenamedSchemaObjects() {
        try {
            renameTable("notifications", "ThongBao");
            renameTable("thongbao", "ThongBao");
            renameTable("thong_bao", "ThongBao");

            renameIndex("idx_notifications_user", "idx_ThongBao_user");
            renameIndex("idx_thongbao_user", "idx_ThongBao_user");
            renameIndex("idx_thong_bao_user", "idx_ThongBao_user");

            renameTable("comment_reports", "BaoCao");
            renameTable("bao_cao", "BaoCao");
            renameConstraint("BaoCao", "uq_comment_report", "uq_BaoCao");
            renameConstraint("BaoCao", "uq_baocao", "uq_BaoCao");

            ensureBaoCaoTable();

            ensureDocumentReviewColumns();
            ensureAccountLockColumns();
            ensureSubjectColumnNullable();
        } catch (Exception ex) {
            LOGGER.warn("Could not rename legacy tables automatically: {}", ex.getMessage());
        }
    }

    /**
     * Add moderation columns to `tailieu` table if missing.
     *
     * We default existing rows to APPROVED to avoid hiding legacy documents.
     */
    private void ensureDocumentReviewColumns() {
        if (!tableExists("tailieu")) {
            return;
        }

        ensureColumn("tailieu", "trangthaikiemduyet",
                "ALTER TABLE tailieu ADD COLUMN trangthaikiemduyet varchar(30) DEFAULT 'APPROVED' NOT NULL");
        ensureColumn("tailieu", "lydokiemduyet",
                "ALTER TABLE tailieu ADD COLUMN lydokiemduyet text");
        ensureColumn("tailieu", "tgkiemduyet",
                "ALTER TABLE tailieu ADD COLUMN tgkiemduyet timestamp");
        ensureColumn("tailieu", "nguoikiemduyet",
                "ALTER TABLE tailieu ADD COLUMN nguoikiemduyet varchar(255)");

        try {
            jdbcTemplate.execute("UPDATE tailieu SET trangthaikiemduyet = 'APPROVED' WHERE trangthaikiemduyet IS NULL");
        } catch (Exception ex) {
            LOGGER.debug("Could not backfill trangthaikiemduyet: {}", ex.getMessage());
        }
    }

    private void ensureAccountLockColumns() {
        if (!tableExists("users")) {
            return;
        }

        ensureColumn("users", "account_locked",
            "ALTER TABLE users ADD COLUMN account_locked boolean DEFAULT false NOT NULL");
        ensureColumn("users", "lock_reason",
                "ALTER TABLE users ADD COLUMN lock_reason text");
    }

    private void ensureSubjectColumnNullable() {
        if (!tableExists("tailieu") || !columnExists("tailieu", "idmonhoc")) {
            return;
        }
        if (isColumnNullable("tailieu", "idmonhoc")) {
            return;
        }
        try {
            jdbcTemplate.execute("ALTER TABLE tailieu ALTER COLUMN idmonhoc DROP NOT NULL");
            LOGGER.info("Relaxed NOT NULL constraint on tailieu.idmonhoc to allow subject removal");
        } catch (Exception ex) {
            LOGGER.warn("Could not drop NOT NULL on tailieu.idmonhoc: {}", ex.getMessage());
        }
    }

    private void ensureColumn(String tableName, String columnName, String addColumnSql) {
        if (columnExists(tableName, columnName)) {
            return;
        }
        jdbcTemplate.execute(addColumnSql);
        LOGGER.info("Added column {}.{}", tableName, columnName);
    }

    /**
     * Create BaoCao table if missing to avoid runtime errors when counting reports.
     * This mirrors the JPA mapping in BinhLuanReport (comment_id + reporter_id unique).
     */
    private void ensureBaoCaoTable() {
        if (tableExists("BaoCao")) {
            return;
        }
        String sql = """
            CREATE TABLE "BaoCao" (
                id bigserial PRIMARY KEY,
                comment_id bigint NOT NULL,
                reporter_id bigint NOT NULL,
                reason text,
                created_at timestamp,
                CONSTRAINT fk_baocao_comment FOREIGN KEY (comment_id) REFERENCES binhluan(idbinhluan) ON DELETE CASCADE,
                CONSTRAINT fk_baocao_user FOREIGN KEY (reporter_id) REFERENCES users(iduser) ON DELETE CASCADE,
                CONSTRAINT uq_BaoCao UNIQUE (comment_id, reporter_id)
            );
            """;
        jdbcTemplate.execute(sql);
        LOGGER.info("Created table BaoCao (comment reports) because it was missing");
    }

    private void renameTable(String oldName, String newName) {
        if (!tableExists(oldName) || tableExists(newName)) {
            return;
        }
        jdbcTemplate.execute("ALTER TABLE " + quoteIdentifier(oldName) + " RENAME TO " + quoteIdentifier(newName));
        LOGGER.info("Renamed table {} to {}", oldName, newName);
    }

    private void renameIndex(String oldName, String newName) {
        if (!indexExists(oldName) || indexExists(newName)) {
            return;
        }
        jdbcTemplate.execute("ALTER INDEX " + quoteIdentifier(oldName) + " RENAME TO " + quoteIdentifier(newName));
        LOGGER.info("Renamed index {} to {}", oldName, newName);
    }

    private void renameConstraint(String tableName, String oldConstraint, String newConstraint) {
        if (!tableExists(tableName) || !constraintExists(tableName, oldConstraint) || constraintExists(tableName, newConstraint)) {
            return;
        }
        jdbcTemplate.execute(
                "ALTER TABLE " + quoteIdentifier(tableName) +
                        " RENAME CONSTRAINT " + quoteIdentifier(oldConstraint) +
                        " TO " + quoteIdentifier(newConstraint)
        );
        LOGGER.info("Renamed constraint {} on {} to {}", oldConstraint, tableName, newConstraint);
    }

    private String quoteIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException("Identifier must not be blank");
        }
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ?",
                Integer.class,
                tableName
        );
        return count != null && count > 0;
    }

    private boolean columnExists(String tableName, String columnName) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?",
                    Integer.class,
                    tableName,
                    columnName
            );
            return count != null && count > 0;
        } catch (Exception ex) {
            return false;
        }
    }

    private boolean isColumnNullable(String tableName, String columnName) {
        try {
            String result = jdbcTemplate.queryForObject(
                    "SELECT is_nullable FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?",
                    String.class,
                    tableName,
                    columnName
            );
            return result != null && result.equalsIgnoreCase("YES");
        } catch (Exception ex) {
            return true;
        }
    }

    private boolean indexExists(String indexName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = current_schema() AND indexname = ?",
                Integer.class,
                indexName
        );
        return count != null && count > 0;
    }

    private boolean constraintExists(String tableName, String constraintName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = current_schema() AND table_name = ? AND constraint_name = ?",
                Integer.class,
                tableName,
                constraintName
        );
        return count != null && count > 0;
    }
}
