package com.cssurewards.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResetTokenRepository extends JpaRepository<ResetToken, Integer> {
    Optional<ResetToken> findByUserId(Integer userId);
    Optional<ResetToken> findByToken(String token);
}
