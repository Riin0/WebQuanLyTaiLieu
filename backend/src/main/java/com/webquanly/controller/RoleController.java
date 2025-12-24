package com.webquanly.controller;

import java.text.Normalizer;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.webquanly.model.PhanQuyen;
import com.webquanly.repository.PhanQuyenRepository;

@RestController
@RequestMapping("/api/roles")
@CrossOrigin(
    origins = {"http://localhost:5173", "http://127.0.0.1:5173"},
    allowCredentials = "true"
)
public class RoleController {

    @Autowired
    private PhanQuyenRepository phanQuyenRepository;

    private static final Set<String> ALLOWED_ROLE_SLUGS = Set.of("ADMIN", "GIANGVIEN", "SINHVIEN");

    @GetMapping
    public List<RoleResponse> listRoles() {
        return phanQuyenRepository.findAll().stream()
            .map(this::toResponse)
            .filter(Objects::nonNull)
            .toList();
    }

    private RoleResponse toResponse(PhanQuyen role) {
        String slug = normalizeRoleName(role.getTenLoaiNguoiDung());
        if (!ALLOWED_ROLE_SLUGS.contains(slug)) {
            return null;
        }
        return new RoleResponse(role.getId(), role.getTenLoaiNguoiDung(), slug, true);
    }

    private String normalizeRoleName(String raw) {
        if (raw == null) return "";
        String normalized = Normalizer.normalize(raw, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        return normalized.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
    }

    public record RoleResponse(Long id, String name, String slug, boolean selfAssignable) {}
}
