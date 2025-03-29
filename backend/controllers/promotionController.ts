import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /promotions
 * Create a new promotion (Manager or higher).
 * Required fields (example):
 *  - name: string (required)
 *  - description: string (optional)
 *  - startTime: ISO8601, must not be in the past
 *  - endTime: ISO8601, must be after startTime
 *  - points (if you added it in your schema): positive integer
 */
export async function createPromotion(req: Request, res: Response): Promise<void> {
  try {
    const {
      name,
      description,
      startTime,
      endTime,
      rate,
      minSpending,
      points,
      type,
    } = req.body as {
      name: string;
      description?: string;
      startTime: string;
      endTime: string;
      rate?: number | null;
      minSpending?: number | null;
      points: number;
      type: string;
    };

    // Check clearance: Manager or higher required
    if (!["MANAGER", "SUPERUSER"].includes((req as any).user.role)) {
      res.status(403).json({
        error: "Insufficient clearance to create a promotion.",
      });
      return;
    }

    // Validate that startTime is not in the past (with a small buffer)
    const now = new Date();
    if (new Date(startTime) < now) {
      res.status(400).json({ error: "startTime must not be in the past" });
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      res.status(400).json({ error: "endTime must be after startTime" });
      return;
    }

    const promotion = await prisma.promotion.create({
      data: {
        name,
        description: description || "",
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        rate: rate ?? null,
        minSpending: minSpending ?? null,
        points,
        type,
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        startTime: true,
        endTime: true,
        minSpending: true,
        rate: true,
        points: true,
      },
    });

    res.status(201).json(promotion);
  } catch (error) {
    console.error("createPromotion error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /promotions
 * Retrieve a list of promotions (Regular or higher).
 * Query params (example):
 *  - name: optional string (case-insensitive "contains")
 *  - started: optional boolean => true => promotions that have started, false => not started
 *  - ended: optional boolean => true => promotions that have ended, false => not ended
 *  - page, limit: for pagination
 *  - If started & ended are both specified => 400
 */
export async function getPromotions(req: Request, res: Response): Promise<void> {
  try {
    const { name, started, ended, page = "1", limit = "10" } = req.query;
    
    // If both started and ended are specified, return 400
    if (started && ended) {
      res.status(400).json({
        error: 'Cannot specify both "started" and "ended" simultaneously.',
      });
      return;
    }
    
    const now = new Date();
    const where: any = {};

    // Filter by name
    if (name) {
      where.name = {
        contains: name as string,
        mode: "insensitive",
      };
    }

    // Determine user role; assuming req.user is injected by auth middleware
    const userRole: string = ((req as any).user?.role) || "REGULAR";

    // Filter promotions for regular/Cashier users
    if (userRole === "REGULAR" || userRole === "CASHIER") {
      // Only promotions that have started (startTime <= now)
      where.startTime = { lte: now };
    } else {
      if (started === "true") {
        where.startTime = { lte: now };
      } else if (started === "false") {
        where.startTime = { gt: now };
      }
    }

    // Filter by ended
    if (ended === "true") {
      where.endTime = { lte: now };
    } else if (ended === "false") {
      where.endTime = { gt: now };
    }

    // Pagination
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSize = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * pageSize;

    const [count, promotions] = await Promise.all([
      prisma.promotion.count({ where }),
      prisma.promotion.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startTime: "asc" },
      }),
    ]);

    res.status(200).json({
      count,
      results: promotions,
    });
  } catch (error) {
    console.error("getPromotions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /promotions/:promotionId
 * Retrieve a single promotion (Regular or higher).
 * If not found => 404.
 * If ended => possibly 404 for a regular user (per your spec) or still show it to manager.
 */
export async function getPromotionById(req: Request, res: Response): Promise<void> {
  try {
    const promotionId = parseInt(req.params.promotionId, 10);
    if (isNaN(promotionId)) {
      res.status(400).json({ error: "Invalid promotionId" });
      return;
    }

    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
    });
    if (!promotion) {
      res.status(404).json({ error: "Promotion not found" });
      return;
    }

    const userRole: string = ((req as any).user?.role) || "REGULAR";
    const now = new Date();
    const hasEnded = now > promotion.endTime;
    const hasStarted = now >= promotion.startTime;

    if (userRole === "REGULAR" || userRole === "CASHIER") {
      if (hasEnded || !hasStarted) {
        res.status(404).json({ error: "Promotion not found" });
        return;
      }
    }

    res.status(200).json(promotion);
  } catch (error) {
    console.error("getPromotionById error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * PATCH /promotions/:promotionId
 * Update an existing promotion (Manager or higher).
 * - Allow updates to promotions that have already started.
 * - Reject updates if the new startTime is before the current time.
 * - Reject updates if the new endTime is before the new startTime.
 * - Don't update fields when null values are provided.
 */
export async function updatePromotion(req: Request, res: Response): Promise<void> {
  try {
    const promotionId = parseInt(req.params.promotionId, 10);
    if (isNaN(promotionId)) {
      res.status(400).json({ error: "Invalid promotionId" });
      return;
    }

    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
    });
    if (!promotion) {
      res.status(404).json({ error: "Promotion not found" });
      return;
    }

    const {
      name,
      description,
      startTime,
      endTime,
      rate,
      minSpending,
      points,
      type,
    } = req.body as {
      name?: string | null;
      description?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      rate?: number;
      minSpending?: number;
      points?: number;
      type?: string | null;
    };

    const updateData: any = {};
    const responseFields: any = { id: promotionId };

    if (name !== undefined && name !== null) {
      updateData.name = name;
      responseFields.name = name;
    }
    if (description !== undefined && description !== null) {
      updateData.description = description;
      responseFields.description = description;
    }

    let newStartTime = promotion.startTime;
    if (startTime !== undefined && startTime !== null) {
      newStartTime = new Date(startTime);
      const now = new Date();
      if (newStartTime < now) {
        res.status(400).json({ error: "Cannot set a start time in the past" });
        return;
      }
      updateData.startTime = newStartTime;
      responseFields.startTime = startTime;
    }

    if (endTime !== undefined && endTime !== null) {
      const newEndTime = new Date(endTime);
      if (newEndTime < newStartTime) {
        res.status(400).json({ error: "End time must be after start time" });
        return;
      }
      updateData.endTime = newEndTime;
      responseFields.endTime = endTime;
    }

    if (rate !== undefined) {
      updateData.rate = rate;
      responseFields.rate = rate;
    }
    if (minSpending !== undefined) {
      updateData.minSpending = minSpending;
      responseFields.minSpending = minSpending;
    }
    if (points !== undefined) {
      updateData.points = points;
      responseFields.points = points;
    }
    if (type !== undefined && type !== null) {
      updateData.type = type;
      responseFields.type = type;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    await prisma.promotion.update({
      where: { id: promotionId },
      data: updateData,
    });

    // Ensure response contains existing values if not updated
    responseFields.name = responseFields.name || promotion.name;
    responseFields.type = responseFields.type || promotion.type;
    responseFields.startTime = responseFields.startTime || promotion.startTime;
    responseFields.endTime = responseFields.endTime || promotion.endTime;

    res.status(200).json(responseFields);
  } catch (error) {
    console.error("updatePromotion error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * DELETE /promotions/:promotionId
 * Remove the specified promotion (Manager or higher).
 * - 400 if the promotion has started or ended (per your spec).
 */
export async function deletePromotion(req: Request, res: Response): Promise<void> {
  try {
    const promotionId = parseInt(req.params.promotionId, 10);
    if (isNaN(promotionId)) {
      res.status(400).json({ error: "Invalid promotionId" });
      return;
    }

    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
    });
    if (!promotion) {
      res.status(404).json({ error: "Promotion not found" });
      return;
    }

    const now = new Date();
    if (now >= promotion.startTime) {
      res.status(403).json({ error: "Cannot delete a promotion that has started" });
      return;
    }
    if (now > promotion.endTime) {
      res.status(403).json({ error: "Cannot delete a promotion that has ended" });
      return;
    }

    await prisma.promotion.delete({
      where: { id: promotionId },
    });

    res.status(204).send();
  } catch (error) {
    console.error("deletePromotion error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
