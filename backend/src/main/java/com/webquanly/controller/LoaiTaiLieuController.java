package com.webquanly.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.webquanly.model.LoaiTaiLieu;
import com.webquanly.repository.LoaiTaiLieuRepository;

@RestController
@RequestMapping("/api/loaitailieu")
public class LoaiTaiLieuController {

    @Autowired
    private LoaiTaiLieuRepository loaiTaiLieuRepository;

    @GetMapping
    public List<LoaiTaiLieu> list() {
        return loaiTaiLieuRepository.findAll(Sort.by(Sort.Direction.ASC, "tenLoaiTaiLieu"));
    }
}
