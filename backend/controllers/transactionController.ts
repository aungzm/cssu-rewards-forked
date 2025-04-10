import { Request, Response } from "express";
import { PrismaClient, RoleType, TransactionType } from "@prisma/client";
import { create } from "domain";

const prisma = new PrismaClient();
/**
 * POST /transactions
 * Creates a new purchase or adjustment transaction (Manager or higher for adjustment)
 */
export async function createPurchaseTransaction(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Consider using a validation library like Zod here for better type safety and validation.
    const { utorid, type } = req.body as { utorid: string; type: string };
    const operator = (req as any).user; // Authenticated user from middleware (ensure this type is safe)

    // Find the target user by utorid.
    const user = await prisma.user.findUnique({
      where: { utorid },
      select: { id: true, points: true }, // Select only needed fields
    });
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    // --- Promotion Handling (Common Logic) ---
    const { promotionIds } = req.body as { promotionIds?: number[] }; // Assume IDs are numbers
    let validPromotionIds: number[] = [];
    let promotions: any[] = []; // Consider defining a stricter type for Promotion

    if (promotionIds && promotionIds.length > 0) {
      // Ensure promotionIds are numbers if they come as strings from JSON
      const numericPromotionIds = promotionIds.map(Number).filter(Number.isFinite);

      if (numericPromotionIds.length !== promotionIds.length) {
         res.status(400).json({ error: "Invalid format for promotion IDs." });
         return;
      }

      promotions = await prisma.promotion.findMany({
        where: {
          id: { in: numericPromotionIds },
          startTime: { lte: new Date() },
          endTime: { gte: new Date() },
        },
      });

      // Check if all requested promotions were found and are active
      if (promotions.length !== numericPromotionIds.length) {
        res.status(400).json({
          error:
            "One or more promotion IDs are invalid, expired, or not yet active.",
        });
        return;
      }

      // Check if one-time promotions have already been used by this user
      const oneTimePromos = promotions.filter((p) => p.type === "one-time");
      if (oneTimePromos.length > 0) {
        const usedPromos = await prisma.userPromotion.findMany({
          where: {
            userId: user.id,
            promotionId: { in: oneTimePromos.map((p) => p.id) },
          },
          select: { promotionId: true },
        });

        if (usedPromos.length > 0) {
          const usedPromoId = usedPromos[0].promotionId;
          res.status(400).json({
            error: `Promotion ${usedPromoId} has already been used by this user.`,
          });
          return;
        }
      }
      validPromotionIds = promotions.map((p) => p.id);
    }

    // Transaction Type Logic ---
    if (type.toLowerCase() === "purchase") {
      const { spent, remark = "" } = req.body as {
        spent: number;
        remark?: string;
      };

      if (typeof spent !== "number" || spent <= 0) {
        res
          .status(400)
          .json({ error: "The spent amount must be a positive number." });
        return;
      }

      // Calculate base points
      let pointsToAward = Math.round(spent / 0.25);

      // Apply promotion effects
      for (const promo of promotions) {
        if (promo.minSpending && spent < promo.minSpending) {
          res.status(400).json({
            error: `Promotion ${promo.id} requires a minimum spending of ${promo.minSpending}.`,
          });
          return;
        }
        if (promo.rate) {
           pointsToAward += Math.round(spent * 100 * promo.rate); // Clarify this logic if needed
        }
        if (promo.points) {
          pointsToAward += promo.points; // Add fixed bonus points
        }
      }

      // Check if operator is suspicious
      const operatorInfo = await prisma.user.findUnique({
        where: { id: operator.id },
        select: { suspicious: true },
      });
      const isSuspicious = operatorInfo?.suspicious ?? false; // Default to false if not found

      const pointsForDatabase = pointsToAward;
      const pointsForResponse = isSuspicious ? 0 : pointsForDatabase;

      // *** Use Transaction for Atomic Operations ***
      const transactionResult = await prisma.$transaction(async (tx) => {
        const createdTx = await tx.transaction.create({
          data: {
            type: TransactionType.PURCHASE, // Use Enum
            spent: spent, // Use 'spent' field from schema
            amount: pointsForDatabase,
            suspicious: isSuspicious,
            remarks: remark,
            user: { connect: { id: user.id } },
            operator: { connect: { id: operator.id } },
            // Connect valid promotions
            promotionIds: {
              connect: validPromotionIds.map((id) => ({ id })),
            },
          },
          select: {
            id: true,
            spent: true, // Select 'spent'
            amount: true,
            suspicious: true,
            createdAt: true,
            remarks: true,
            user: { select: { utorid: true } },
          },
        });

        // Only update user points if operator is not suspicious
        if (!isSuspicious) {
          await tx.user.update({
            where: { id: user.id },
            data: { points: { increment: pointsForDatabase } }, // Use increment for safety
          });
        }

        // Record usage for one-time promotions
        const oneTimePromoIdsToRecord = promotions
          .filter((p) => p.type === "one-time")
          .map((p) => p.id);

        if (oneTimePromoIdsToRecord.length > 0) {
          await tx.userPromotion.createMany({
            data: oneTimePromoIdsToRecord.map((promoId) => ({
              userId: user.id,
              promotionId: promoId,
            }))
          });
        }

        return createdTx;
      });

      res.status(201).json({
        id: transactionResult.id,
        utorid: utorid,
        type: "purchase",
        spent: transactionResult.spent, // Use 'spent' from result
        earned: pointsForResponse,
        remark: transactionResult.remarks || "",
        promotionIds: validPromotionIds,
        createdBy: operator.utorid,
      });
      // No return needed here as res.json() sends the response
    } else if (type.toLowerCase() === "adjustment") {
      // Check permissions
      if (!(operator.role === RoleType.MANAGER || operator.role === RoleType.SUPERUSER)) { // Use Enum
        res.status(403).json({
          error: "Insufficient clearance to create an adjustment transaction.",
        });
        return;
      }

      const {
        amount: adjustmentAmount, // Renamed to avoid conflict
        relatedId,
        remark = "",
      } = req.body as {
        amount: number;
        relatedId: number; // Should be number
        remark?: string;
      };

       if (typeof adjustmentAmount !== 'number') {
         res.status(400).json({ error: "Adjustment amount must be a number." });
         return;
       }
       if (typeof relatedId !== 'number') {
         res.status(400).json({ error: "Related transaction ID must be a number." });
         return;
       }


      // Validate related transaction
      const relatedTx = await prisma.transaction.findUnique({
        where: { id: relatedId },
        select: { id: true }, // Just need to know if it exists
      });
      if (!relatedTx) {
        res.status(404).json({ error: "Related transaction not found." });
        return;
      }

      // *** Use Transaction for Atomic Operations ***
      const transactionResult = await prisma.$transaction(async (tx) => {
        const createdTx = await tx.transaction.create({
          data: {
            type: TransactionType.ADJUSTMENT, // Use Enum
            // 'amount' is not a direct field in Transaction schema based on provided schema
            // Adjustments modify points directly. Let's store the adjustment value in 'points'.
            amount: adjustmentAmount,
            suspicious: false, // Adjustments are likely not suspicious by default
            remarks: remark,
            user: { connect: { id: user.id } },
            operator: { connect: { id: operator.id } },
            relatedTransaction: { connect: { id: relatedId } },
            // Connect valid promotions (if applicable to adjustments)
            promotionIds: {
              connect: validPromotionIds.map((id) => ({ id })),
            },
          },
          select: {
            id: true,
            amount: true, // Select points (representing the adjustment amount)
            remarks: true,
            relatedId: true,
            user: { select: { utorid: true } },
          },
        });

        // Update user points
        await tx.user.update({
          where: { id: user.id },
          data: { points: { increment: adjustmentAmount } }, // Use increment/decrement
        });

        // Record usage for one-time promotions (if applicable)
        const oneTimePromoIdsToRecord = promotions
          .filter((p) => p.type === "one-time")
          .map((p) => p.id);

        if (oneTimePromoIdsToRecord.length > 0) {
          await tx.userPromotion.createMany({
            data: oneTimePromoIdsToRecord.map((promoId) => ({
              userId: user.id,
              promotionId: promoId,
            })),
          });
        }

        return createdTx;
      });

      res.status(201).json({
        id: transactionResult.id,
        utorid: utorid,
        amount: transactionResult.amount, 
        type: "adjustment",
        relatedId: transactionResult.relatedId,
        remark: transactionResult.remarks || "",
        promotionIds: validPromotionIds,
        createdBy: operator.utorid,
      });
    } else {
      res.status(400).json({ error: "Invalid transaction type specified." });
    }
  } catch (error) {
    console.error("Error creating transaction:", error);
    // Avoid sending detailed error info to client in production
    res.status(500).json({ error: "Internal server error." });
  }
}


/**
 * POST /transactions/adjustment
 * Creates a new adjustment transaction (Manager or higher)
 */
export async function createAdjustmentTransaction(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { utorid, points, promotionIds, remarks, relatedId, amount } =
      req.body;
    const operator = (req as any).user; // Manager or Superuser

    // Find the user (using email as identifier since original code uses email)
    const user = await prisma.user.findUnique({
      where: { email: utorid },
    });
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    let finalPoints = points;

    if (promotionIds && promotionIds.length > 0) {
      const promotions = await prisma.promotion.findMany({
        where: {
          id: { in: promotionIds },
          startTime: { lte: new Date() },
          endTime: { gte: new Date() },
        },
      });

      if (promotions.length !== promotionIds.length) {
        res.status(400).json({
          error:
            "One or more promotion IDs are invalid, expired, or not yet active.",
        });
        return;
      }
      for (const promo of promotions) {
        if (promo.rate) {
          finalPoints = Math.floor(finalPoints * promo.rate);
        }
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        type: "ADJUSTMENT",
        amount: finalPoints,
        remarks,
        user: { connect: { id: user.id } },
        operator: { connect: { id: operator.id } },
        relatedTransaction: { connect: { id: relatedId } },
      },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        remarks: true,
        relatedId: true,
        user: {
          select: {
            utorid: true,
          },
        },
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { points: user.points + finalPoints },
    });

    res.status(201).json({
      id: transaction.id,
      utorid: utorid,
      amount: transaction.amount,
      createdAt: transaction.createdAt,
      remark: transaction.remarks,
      relatedId: transaction.relatedId,
    });
  } catch (error) {
    console.error("Error creating adjustment transaction:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * GET /transactions
 * Retrieves a list of transactions with various filtering options (Manager or higher)
 */
export async function getTransactions(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      name,
      createdBy,
      suspicious,
      promotionId,
      type,
      relatedId,
      amount,
      operator,
      page = "1",
      limit = "10",
    } = req.query;

    const filter: any = {};

    // Filter by name — search in user's utorid or name.
    if (name) {
      filter.OR = [
        { user: { utorid: { contains: name } } },
        { user: { name: { contains: name } } },
      ];
    }

    // Filter by the creator of the transaction (the operator)
    if (createdBy) {
      filter.operator = {
        is: {
          OR: [
            { utorid: { contains: createdBy } },
            { name: { contains: createdBy } },
          ],
        },
      };
    }

    if (suspicious !== undefined) {
      filter.suspicious = suspicious;
    }

    if (type) {
      filter.type = (type as string).toUpperCase();
    }

    if (relatedId && type) {
      const typeUpperCase = (type as string).toUpperCase();
      switch (typeUpperCase) {
        case "ADJUSTMENT":
          filter.relatedId = Number(relatedId);
          break;
        case "TRANSFER":
          filter.OR = [
            { senderId: Number(relatedId) },
            { receiverId: Number(relatedId) },
          ];
          break;
        case "REDEMPTION":
          filter.operatorId = Number(relatedId);
          break;
        case "EVENT":
          filter.relatedEventId = Number(relatedId);
          break;
        default:
          break;
      }
    }

    if (promotionId) {
      filter.promotionIds = { some: { id: Number(promotionId) } };
    }

    if (amount !== undefined && operator) {
      const amountValue = parseFloat(amount as string);
      if (!isNaN(amountValue)) {
        if (operator === "gte") {
          filter.amount = { gte: amountValue };
        } else if (operator === "lte") {
          filter.amount = { lte: amountValue };
        }
      }
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await prisma.transaction.count({ where: filter });
    const transactions = await prisma.transaction.findMany({
      where: filter,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { utorid: true, name: true } },
        operator: { select: { utorid: true, name: true } },
        sender: { select: { utorid: true, name: true } },
        receiver: { select: { utorid: true, name: true } },
        promotionIds: { select: { id: true } },
      },
    });

    const results = transactions.map((transaction) => {
      const promoIds = transaction.promotionIds
        ? transaction.promotionIds.map((promo: any) => promo.id)
        : [];
      const baseResponse = {
        id: transaction.id,
        utorid: transaction.user?.utorid,
        type: (transaction.type as string).toLowerCase(),
        promotionIds: promoIds,
        suspicious: transaction.suspicious,
        remark: transaction.remarks || "",
        createdBy: transaction.operator?.utorid || null,
        createdAt: transaction.createdAt,
      };

      if (transaction.type === "PURCHASE") {
        return {
          ...baseResponse,
          spent: transaction.amount,
          amount: transaction.amount,
        };
      } else if (transaction.type === "REDEMPTION") {
        return {
          ...baseResponse,
          amount: transaction.amount,
          redeemed: Math.abs(transaction.amount as number),
          relatedId: transaction.operatorId,
        };
      } else if (transaction.type === "ADJUSTMENT") {
        return {
          ...baseResponse,
          amount: transaction.amount,
          relatedId: transaction.relatedId || null,
        };
      } else if (transaction.type === "TRANSFER") {
        const relId =
          transaction.senderId === transaction.userId
            ? transaction.receiverId
            : transaction.senderId;
        return {
          ...baseResponse,
          amount: transaction.amount,
          relatedId: relId,
        };
      } else if (transaction.type === "EVENT") {
        return {
          ...baseResponse,
          amount: transaction.amount,
          relatedId: transaction.relatedEventId || null,
        };
      } else {
        return baseResponse;
      }
    });

    res.status(200).json({
      count: totalCount,
      results,
    });
  } catch (error) {
    console.error("Error retrieving transactions:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * GET /transactions/:transactionId
 * Retrieves a single transaction by ID (Manager or higher)
 */
export async function getTransactionById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { transactionId } = req.params;
    const id = parseInt(transactionId, 10);
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        spent: true,
        amount: true,
        suspicious: true,
        remarks: true,
        createdAt: true,
        relatedId: true,
        user: { select: { utorid: true } },
        operator: { select: { utorid: true } },
      },
    });
    if (!transaction) {
      res.status(404).json({ error: "Transaction not found." });
      return;
    }
    const response = {
      id: transaction.id,
      utorid: transaction.user?.utorid,
      type: (transaction.type as string).toLowerCase(),
      spent: transaction.spent, // for purchase transactions
      amount: transaction.amount,
      promotionIds: [],
      suspicious: transaction.suspicious,
      relatedId: transaction.relatedId || null,
      remark: transaction.remarks || "",
      createdBy: transaction.operator?.utorid || null,
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Error retrieving transaction:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * PATCH /transactions/:transactionId/suspicious
 * Set or unset a transaction as suspicious (Manager or higher)
 */
export async function toggleTransactionSuspicious(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { transactionId } = req.params;
    const { suspicious } = req.body;
    if (typeof suspicious !== "boolean") {
      res
        .status(400)
        .json({ error: "Suspicious flag must be a boolean value." });
      return;
    }
    // Get the current transaction to check existing state.
    const currentTransaction = await prisma.transaction.findUnique({
      where: { id: Number(transactionId) },
      include: { user: true },
    });
    if (!currentTransaction) {
      res.status(404).json({ error: "Transaction not found." });
      return;
    }
    let userPointsAdjustment = 0;
    if (suspicious && !currentTransaction.suspicious) {
      // Deduct points from user's balance.
      userPointsAdjustment = -(currentTransaction.amount ?? 0);
    } else if (!suspicious && currentTransaction.suspicious) {
      userPointsAdjustment = currentTransaction.amount ?? 0;
    }
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id: Number(transactionId) },
        data: { suspicious },
        select: {
          id: true,
          type: true,
          spent: true,
          amount: true,
          suspicious: true,
          remarks: true,
          createdAt: true,
          user: {
            select: { id: true, email: true, points: true, utorid: true },
          },
          operator: { select: { email: true } },
        },
      });
      if (userPointsAdjustment !== 0 && updated.user) {
        await tx.user.update({
          where: { id: updated.user.id },
          data: { points: { increment: userPointsAdjustment } },
        });
      }
      return updated;
    });
    const response = {
      id: updatedTransaction.id,
      utorid: updatedTransaction.user?.utorid,
      type: (updatedTransaction.type as string).toLowerCase(),
      spent: updatedTransaction.spent,
      amount: updatedTransaction.amount,
      promotionIds: [],
      suspicious: updatedTransaction.suspicious,
      remark: updatedTransaction.remarks || "",
      createdBy: updatedTransaction.operator?.email,
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Error updating transaction suspicious status:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * POST /users/:userId/transactions
 * Creates a new transfer transaction between the current logged-in user (sender)
 * and the user specified by userId (recipient)
 */
export async function createTransferTransaction(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const recipientId = parseInt(req.params.userId, 10);
    const { amount, remark } = req.body;
    const senderUser = (req as any).user;
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, utorid: true, points: true },
    });
    if (!recipient) {
      res.status(404).json({ error: "Recipient user not found." });
      return;
    }
    if (senderUser.id === recipientId) {
      res.status(400).json({ error: "Cannot transfer points to yourself." });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: senderUser.id },
      select: { points: true },
    });

    if (user === null) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    if (user.points < amount) {
      res.status(400).json({ error: "Insufficient points for transfer." });
      return;
    }
    const [senderTransaction, recipientTransaction] = await prisma.$transaction(
      [
        prisma.transaction.create({
          data: {
            type: "TRANSFER",
            amount: -amount,
            remarks: remark || "",
            user: { connect: { id: senderUser.id } },
            sender: { connect: { id: senderUser.id } },
            receiver: { connect: { id: recipientId } },
          },
        }),
        prisma.transaction.create({
          data: {
            type: "TRANSFER",
            amount: amount,
            remarks: remark || "",
            user: { connect: { id: recipientId } },
            sender: { connect: { id: senderUser.id } },
            receiver: { connect: { id: recipientId } },
          },
        }),
        prisma.user.update({
          where: { id: senderUser.id },
          data: { points: { decrement: amount } },
        }),
        prisma.user.update({
          where: { id: recipientId },
          data: { points: { increment: amount } },
        }),
      ]
    );
    res.status(201).json({
      id: senderTransaction.id,
      sender: senderUser.utorid,
      recipient: recipient.utorid,
      type: "transfer",
      sent: amount,
      remark: remark || "",
      createdBy: senderUser.utorid,
    });
  } catch (error) {
    console.error("Error creating transfer transaction:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * POST /users/me/transactions
 * Creates a new redemption transaction for the logged-in user
 */
export async function createRedemptionTransaction(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      type,
      amount,
      remark = "",
    } = req.body as {
      type: string;
      amount?: number;
      remark?: string;
    };
    const currentUser = (req as any).user;
    if (type.toLowerCase() !== "redemption") {
      res.status(400).json({ error: "Transaction type must be 'redemption'." });
      return;
    }
    let redemptionAmount = amount;
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { points: true },
    });

    if (user === null) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    if (redemptionAmount === undefined) {
      redemptionAmount = currentUser.points || 0;
    } else {
      if (!Number.isInteger(redemptionAmount) || redemptionAmount <= 0) {
        res.status(400).json({ error: "Amount must be a positive integer." });
        return;
      }
      if (user.points < redemptionAmount) {
        res.status(400).json({ error: "Insufficient points for redemption." });
        return;
      }
    }
    const validRedemptionAmount = redemptionAmount ?? 0;
    const transaction = await prisma.transaction.create({
      data: {
        type: "REDEMPTION",
        amount: -validRedemptionAmount,
        remarks: remark,
        user: { connect: { id: currentUser.id } },
      },
      select: {
        id: true,
        amount: true,
        remarks: true,
        user: { select: { utorid: true } },
      },
    });
    res.status(201).json({
      id: transaction.id,
      utorid: currentUser.utorid,
      type: "redemption",
      processedBy: null,
      amount: validRedemptionAmount,
      remark: remark,
      createdBy: currentUser.utorid,
    });
  } catch (error) {
    console.error("Error creating redemption transaction:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * GET /users/me/transactions
 * Retrieves a list of transactions owned by the currently logged-in user
 */
export async function getUserTransactions(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const currentUser = (req as any).user;
    const {
      type,
      relatedId,
      promotionId,
      amount,
      operator,
      page = "1",
      limit = "10",
    } = req.query;

    const filter: any = {
      userId: currentUser.id,
    };

    if (type) {
      filter.type = (type as string).toUpperCase();
    }

    if (relatedId && type) {
      const typeUpperCase = (type as string).toUpperCase();
      switch (typeUpperCase) {
        case "TRANSFER":
          filter.OR = [
            { senderId: Number(relatedId) },
            { receiverId: Number(relatedId) },
          ];
          break;
        case "REDEMPTION":
          filter.operatorId = Number(relatedId);
          break;
        // Add other cases if needed
        case "EVENT":
          filter.relatedEventId = Number(relatedId);
          break;
        case "ADJUSTMENT":
          filter.relatedId = Number(relatedId);
          break;
        default:
          break;
      }
    }

    if (promotionId) {
      filter.promotionId = parseInt(promotionId as string, 10);
    }

    if (amount !== undefined && operator) {
      const amountValue = parseFloat(amount as string);
      if (!isNaN(amountValue)) {
        if (operator === "gte") {
          filter.amount = { gte: amountValue };
        } else if (operator === "lte") {
          filter.amount = { lte: amountValue };
        }
      }
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const count = await prisma.transaction.count({
      where: filter,
    });

    const transactions = await prisma.transaction.findMany({
      where: filter,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true } },
        operator: { select: { email: true, name: true } },
        sender: { select: { email: true, name: true } },
        receiver: { select: { email: true, name: true } },
      },
    });

    const results = transactions.map((transaction) => ({
      id: transaction.id,
      amount: transaction.amount || 0,
      type: (transaction.type as string).toLowerCase(),
      relatedId: getRelatedIdForTransaction(transaction),
      promotionIds: [], // Add logic for promotion IDs if needed.
      remark: transaction.remarks || "",
      createdBy:
        transaction.operatorId || transaction.senderId || transaction.userId,
      createdAt: transaction.createdAt, // Added for Dashboard Transaction List entry
      suspicious: transaction.suspicious,
      operatorId: transaction.operatorId
    }));

    res.status(200).json({
      count,
      results,
    });
  } catch (error) {
    console.error("Error retrieving user transactions:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * PATCH /transactions/:transactionId/processed
 * Set a redemption transaction as being completed
 */
export async function markRedemptionAsProcessed(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const transactionId = parseInt(req.params.transactionId, 10);
    if (isNaN(transactionId)) {
      res.status(400).json({ error: "Invalid transaction ID" });
      return;
    }
    const { processed } = req.body as { processed: boolean };
    const operator = (req as any).user;
    if (processed !== true) {
      res.status(400).json({ error: "Processed value must be true." });
      return;
    }
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { user: { select: { id: true, utorid: true, points: true } } },
    });
    if (!transaction) {
      res.status(404).json({ error: "Transaction not found." });
      return;
    }
    if (transaction.type !== "REDEMPTION") {
      res
        .status(400)
        .json({ error: "Transaction is not of type 'redemption'." });
      return;
    }
    if (transaction.operatorId) {
      res
        .status(400)
        .json({ error: "Transaction has already been processed." });
      return;
    }

    const updatedTransaction = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id: transactionId },
        data: { operator: { connect: { id: operator.id } } },
        include: {
          user: { select: { utorid: true } },
        },
      });
      await tx.user.update({
        where: { id: transaction.userId ?? undefined },
        data: { points: { decrement: transaction.amount ?? 0 } },
      });
      return updated;
    });

    const positiveRedeemedAmount = Math.abs(updatedTransaction.amount ?? 0);
    res.status(200).json({
      id: updatedTransaction.id,
      utorid: updatedTransaction.user?.utorid,
      type: "redemption",
      processedBy: operator.utorid,
      redeemed: positiveRedeemedAmount,
      remark: updatedTransaction.remarks || "",
      createdBy: transaction.user?.utorid || "",
    });
  } catch (error) {
    console.error("Error marking redemption as processed:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * Helper function to get the appropriate relatedId based on transaction type
 */
const getRelatedIdForTransaction = (transaction: any): number | null => {
  switch (transaction.type) {
    case "ADJUSTMENT":
      return null;
    case "TRANSFER":
      return transaction.senderId === transaction.userId
        ? transaction.receiverId
        : transaction.senderId;
    case "REDEMPTION":
      return transaction.operatorId;
    case "EVENT":
      return transaction.relatedEventId || null;
    default:
      return null;
  }
};
