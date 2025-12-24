package com.webquanly.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.webquanly.dto.MonHocRequest;
import com.webquanly.dto.MonHocResponse;
import com.webquanly.dto.TaiLieuResponse;
import com.webquanly.service.MonHocService;
import com.webquanly.service.TaiLieuService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/monhoc")
public class MonHocController {

    private final MonHocService monHocService;
    private final TaiLieuService taiLieuService;

    public MonHocController(MonHocService monHocService, TaiLieuService taiLieuService) {
        this.monHocService = monHocService;
        this.taiLieuService = taiLieuService;
    }

    @GetMapping
    public List<MonHocResponse> listSubjects() {
        return monHocService.getAllWithStats();
    }

    @GetMapping("/{monHocId}/documents")
    public List<TaiLieuResponse> listDocumentsBySubject(@PathVariable Long monHocId) {
        return taiLieuService.getByMonHoc(monHocId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MonHocResponse createSubject(@Valid @RequestBody MonHocRequest request) {
        return monHocService.createSubject(request);
    }

    @PutMapping("/{monHocId}")
    public MonHocResponse updateSubject(@PathVariable Long monHocId,
                                        @Valid @RequestBody MonHocRequest request) {
        return monHocService.updateSubject(monHocId, request);
    }

    @DeleteMapping("/{monHocId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSubject(@PathVariable Long monHocId) {
        monHocService.deleteSubject(monHocId);
    }
}
