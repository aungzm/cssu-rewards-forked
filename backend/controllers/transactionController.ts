import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /transactions
 * Creates a new purchase or adjustment transaction (Manager or higher)
 */
export async function createPurchaseTransaction(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Destructure common fields and the type from the payload.
    const { utorid, type } = req.body as { utorid: string; type: string };
    const operator = (req as any).user; // Authenticated user from middleware

    // Find the target user by utorid.
    const user = await prisma.user.findUnique({
      where: { utorid },
    });
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    // Handle promotions first (common for both purchase and adjustment)
    const { promotionIds } = req.body as { promotionIds?: any };
    let validPromotionIds: number[] = [];
    let promotions: any[] = [];

    if (
      promotionIds !== null &&
      promotionIds !== undefined &&
      promotionIds.length > 0
    ) {
      // Find active promotions.
      promotions = await prisma.promotion.findMany({
        where: {
          id: { in: promotionIds.map((id: any) => Number(id)) },
          startTime: { lte: new Date() },
          endTime: { gte: new Date() },
        },
      });

      // Check if all promotion IDs are valid
      if (promotions.length !== promotionIds.length) {
        res.status(400).json({
          error:
            "One or more promotion IDs are invalid, expired, or not yet active.",
        });
        return;
      }

      // Check if one-time promotions have been used
      for (const promo of promotions) {
        if (promo.type === "one-time") {
          const alreadyUsed = await prisma.userPromotion.findUnique({
            where: {
              userId_promotionId: {
                userId: user.id,
                promotionId: promo.id,
              },
            },
          });
          if (alreadyUsed) {
            res
              .status(400)
              .json({ error: `Promotion ${promo.id} has already been used.` });
            return;
          }
        }
        validPromotionIds.push(promo.id);
      }
    }

    if (type.toLowerCase() === "purchase") {
      // Extract purchase-specific fields.
      const { spent, remark = "" } = req.body as {
        spent: number;
        remark?: string;
      };

      // Validate that spent is a positive number.
      if (spent <= 0) {
        res
          .status(400)
          .json({ error: "The spent amount must be a positive number." });
        return;
      }

      // Calculate base earned points: 1 point per 25 cents spent.
      let pointsToAward = Math.round(spent / 0.25);
      console.log("Points to award before multiplier", pointsToAward);

      // Loop over each promotion to enforce criteria and apply effects.
      for (const promo of promotions) {
        // Enforce a minimum spending requirement if defined.
        if (promo.minSpending && spent < promo.minSpending) {
          res.status(400).json({
            error: `Promotion ${promo.id} requires a minimum spending of ${promo.minSpending}.`,
          });
          return;
        }

        // Apply promotion effects.
        if (promo.rate) {
          // Apply rate multiplier (using 1 + rate multiplier effect)
          pointsToAward = Math.round(pointsToAward + spent * 100 * promo.rate);
        }

        console.log("Points to award after multiplier", pointsToAward);

        if (promo.points) {
          // Add bonus points.
          pointsToAward += promo.points;
        }
      }

      // Check if operator is suspicious.
      const suspiciousUser = await prisma.user.findUnique({
        where: { id: operator.id },
        select: { suspicious: true },
      });

      // Store the original points for the database, but set response points to 0 if suspicious.
      const pointsForDatabase = pointsToAward;
      const isSuspicious = suspiciousUser?.suspicious === true;
      const pointsForResponse = isSuspicious ? 0 : pointsForDatabase;

      const transaction = await prisma.$transaction(async (tx) => {
        // Create the purchase transaction.
        const txRecord = await tx.transaction.create({
          data: {
            type: "PURCHASE",
            amount: spent, // dollars spent
            points: pointsForDatabase, // store original points calculation
            suspicious: isSuspicious, // mark as suspicious if operator is suspicious
            remarks: remark,
            user: { connect: { id: user.id } },
            operator: { connect: { id: operator.id } },
            promotionIds: { connect: validPromotionIds.map((id) => ({ id })) },
          },
          select: {
            id: true,
            amount: true,
            points: true,
            suspicious: true,
            createdAt: true,
            remarks: true,
            user: { select: { utorid: true } },
          },
        });

        // Only update user's points if operator is not suspicious.
        if (!isSuspicious) {
          await tx.user.update({
            where: { id: user.id },
            data: { points: user.points + pointsForDatabase },
          });
        }

        // Record usage for each one-time promotion.
        for (const promo of promotions) {
          if (promo.type === "one-time") {
            await tx.userPromotion.create({
              data: {
                user: { connect: { id: user.id } },
                promotion: { connect: { id: promo.id } },
              },
            });
          }
        }

        return txRecord;
      });

      res.status(201).json({
        id: transaction.id,
        utorid: utorid,
        type: "purchase",
        spent: transaction.amount,
        earned: pointsForResponse, // Use 0 if suspicious, otherwise calculated points.
        remark: transaction.remarks || "",
        promotionIds: validPromotionIds,
        createdBy: operator.utorid,
      });
      return;
    } else if (type.toLowerCase() === "adjustment") {
      // Only a Manager or Superuser can create an adjustment.
      if (!(operator.role === "MANAGER" || operator.role === "SUPERUSER")) {
        res.status(403).json({
          error: "Insufficient clearance to create an adjustment transaction.",
        });
        return;
      }

      // Extract adjustment-specific fields.
      const {
        amount: adjustmentAmount,
        relatedId,
        remark = "",
      } = req.body as {
        amount: number;
        relatedId: number;
        remark?: string;
      };

      // Validate that the related transaction exists.
      const relatedTx = await prisma.transaction.findUnique({
        where: { id: Number(relatedId) },
      });
      if (!relatedTx) {
        res.status(404).json({ error: "Related transaction not found." });
        return;
      }

      const transaction = await prisma.$transaction(async (tx) => {
        // Create the adjustment transaction.
        const txRecord = await tx.transaction.create({
          data: {
            type: "ADJUSTMENT",
            amount: adjustmentAmount,
            points: adjustmentAmount, // points are equal to the adjustment amount
            suspicious: false,
            remarks: remark,
            user: { connect: { id: user.id } },
            operator: { connect: { id: operator.id } },
            promotionIds: { connect: validPromotionIds.map((id) => ({ id })) },
            relatedTransaction: { connect: { id: Number(relatedId) } },
          },
          select: {
            id: true,
            amount: true,
            remarks: true,
            relatedId: true,
            user: { select: { utorid: true } },
          },
        });

        // Update the user's points balance with the adjustment.
        await tx.user.update({
          where: { id: user.id },
          data: { points: user.points + adjustmentAmount },
        });

        // Record usage for each one-time promotion.
        for (const promo of promotions) {
          if (promo.type === "one-time") {
            await tx.userPromotion.create({
              data: {
                user: { connect: { id: user.id } },
                promotion: { connect: { id: promo.id } },
              },
            });
          }
        }

        return txRecord;
      });

      res.status(201).json({
        id: transaction.id,
        utorid: utorid,
        amount: transaction.amount,
        type: "adjustment",
        relatedId,
        remark: transaction.remarks || "",
        promotionIds: validPromotionIds,
        createdBy: operator.utorid,
      });
      return;
    } else {
      res.status(400).json({ error: "Invalid transaction type." });
      return;
    }
  } catch (error) {
    console.error("Error creating transaction:", error);
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
        points: finalPoints,
        remarks,
        amount,
        user: { connect: { id: user.id } },
        operator: { connect: { id: operator.id } },
        relatedTransaction: { connect: { id: relatedId } },
      },
      select: {
        id: true,
        points: true,
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
      points: transaction.points,
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
        { user: { utorid: { contains: name, mode: "insensitive" } } },
        { user: { name: { contains: name, mode: "insensitive" } } },
      ];
    }

    // Filter by the creator of the transaction (the operator)
    if (createdBy) {
      filter.operator = {
        is: {
          OR: [
            { utorid: { contains: createdBy, mode: "insensitive" } },
            { name: { contains: createdBy, mode: "insensitive" } },
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
          filter.points = { gte: amountValue };
        } else if (operator === "lte") {
          filter.points = { lte: amountValue };
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
      };

      if (transaction.type === "PURCHASE") {
        return {
          ...baseResponse,
          spent: transaction.amount,
          amount: transaction.points,
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
        amount: true,
        points: true,
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
      spent: transaction.amount, // for purchase transactions
      amount: transaction.points,
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
      userPointsAdjustment = -currentTransaction.points;
    } else if (!suspicious && currentTransaction.suspicious) {
      // Add points to user's balance.
      userPointsAdjustment = currentTransaction.points;
    }
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id: Number(transactionId) },
        data: { suspicious },
        select: {
          id: true,
          type: true,
          amount: true,
          points: true,
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
      spent: updatedTransaction.amount,
      amount: updatedTransaction.points,
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
            points: -amount,
            remarks: remark || "",
            user: { connect: { id: senderUser.id } },
            sender: { connect: { id: senderUser.id } },
            receiver: { connect: { id: recipientId } },
          },
        }),
        prisma.transaction.create({
          data: {
            type: "TRANSFER",
            points: amount,
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
        amount: validRedemptionAmount,
        points: -validRedemptionAmount,
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
      amount: redemptionAmount,
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
          filter.points = { gte: amountValue };
        } else if (operator === "lte") {
          filter.points = { lte: amountValue };
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

    res.status(200).json({
      id: updatedTransaction.id,
      utorid: updatedTransaction.user?.utorid,
      type: "redemption",
      processedBy: operator.utorid,
      redeemed: updatedTransaction.amount,
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
