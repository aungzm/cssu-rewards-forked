package com.cssurewards.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByUtorid(String utorid);
    boolean existsByEmail(String email);
}
