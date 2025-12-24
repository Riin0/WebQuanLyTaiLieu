package com.webquanly.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.webquanly.model.User;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    // case-insensitive lookup to be more robust when existing DB rows may have different case
    Optional<User> findByEmailIgnoreCase(String email);

    // stronger normalized lookup: trims and lower-cases on the DB side to avoid whitespace/case mismatches
    @Query("SELECT u FROM User u WHERE lower(trim(u.email)) = lower(trim(:email))")
    Optional<User> findByEmailNormalized(@Param("email") String email);
    
    // normalized lookup for TenUser (username) column
    @Query("SELECT u FROM User u WHERE lower(trim(u.tenUser)) = lower(trim(:tenUser))")
    Optional<User> findByTenUserNormalized(@Param("tenUser") String tenUser);

    long countByVerifiedTrue();

    List<User> findAllByOrderByCreatedAtDesc();
}
