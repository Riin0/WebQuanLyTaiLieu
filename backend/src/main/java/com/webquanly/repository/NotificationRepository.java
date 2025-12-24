package com.webquanly.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.webquanly.model.Notification;
import com.webquanly.model.TaiLieu;
import com.webquanly.model.User;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findTop50ByUserOrderByCreatedAtDesc(User user);

    Optional<Notification> findByIdAndUser(Long id, User user);

    long countByUserAndReadIsFalse(User user);

    void deleteByDocument(TaiLieu document);

    List<Notification> findByUserAndReadIsFalse(User user);
}
