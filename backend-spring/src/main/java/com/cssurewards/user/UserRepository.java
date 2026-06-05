package com.cssurewards.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

public interface UserRepository extends JpaRepository<User, Integer>, JpaSpecificationExecutor<User> {
    Optional<User> findByUtorid(String utorid);
    boolean existsByEmail(String email);

    @Modifying
    @Query("UPDATE User u SET u.points = u.points - :amount WHERE u.id = :id AND u.points >= :amount")
    int debitIfEnough(@Param("id") Integer id, @Param("amount") int amount);

    @Modifying
    @Query("UPDATE User u SET u.points = u.points + :amount WHERE u.id = :id")
    int credit(@Param("id") Integer id, @Param("amount") int amount);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Integer id);
}
