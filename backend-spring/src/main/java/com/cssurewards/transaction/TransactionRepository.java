package com.cssurewards.transaction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Modifying;

public interface TransactionRepository extends JpaRepository<Transaction, Integer> {
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.userId = :userId "
        + "AND t.type = com.cssurewards.transaction.TransactionType.REDEMPTION AND t.operatorId IS NULL")
    long sumPendingRedemptions(@Param("userId") Integer userId);

    @Modifying
    @Query("UPDATE Transaction t SET t.operatorId = :operatorId WHERE t.id = :id "
        + "AND t.type = com.cssurewards.transaction.TransactionType.REDEMPTION AND t.operatorId IS NULL")
    int claimRedemption(@Param("id") Integer id, @Param("operatorId") Integer operatorId);
}
