package com.cssurewards.transaction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TransactionRepository extends JpaRepository<Transaction, Integer> {
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.userId = :userId "
        + "AND t.type = com.cssurewards.transaction.TransactionType.REDEMPTION AND t.operatorId IS NULL")
    long sumPendingRedemptions(@Param("userId") Integer userId);
}
