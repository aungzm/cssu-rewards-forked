import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";

import {
  createPromotion,
  getPromotions,
  getPromotionById,
  updatePromotion,
  deletePromotion,
} from "../controllers/promotionController.js";
import { authenticateToken } from "../middlewares/authenticateToken.js";
import { requireManagerOrHigher } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ISO8601 date regex pattern
const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

// Custom parser to convert strings to boolean correctly
const parseBoolean = (val: unknown): unknown => {
  if (typeof val === "string") {
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;
  }
  return val;
};

// Zod validation middleware
const validate =
  (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      // Assign the parsed/coerced values back to the request:
      req.body = result.body;
      req.query = result.query;
      req.params = result.params;
      next();
    } catch (error: any) {
      res.status(400).json({
        error: error.errors.map((e: any) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
      return;
    }
};

// Schemas
const promotionIdSchema = z.object({
  params: z.object({
    promotionId: z
      .coerce
      .number()
      .int("promotionId must be an integer")
      .positive("promotionId must be a positive integer"),
  }),
});

const createPromotionSchema = z.object({
  body: z.object({
    name: z.string().min(1, "name is required"),
    description: z.string().min(1, "description is required"),
    startTime: z.string().regex(isoDateRegex, {
      message: "startTime must be valid ISO8601 date",
    }),
    endTime: z.string().regex(isoDateRegex, {
      message: "endTime must be valid ISO8601 date",
    }),
    rate: z
      .number({ invalid_type_error: "rate must be a number" })
      .nonnegative("rate must be a positive number")
      .nullable()
      .optional(),
    minSpending: z
      .number({ invalid_type_error: "minSpending must be a number" })
      .nonnegative("minSpending must be a positive number")
      .nullable()
      .optional(),
    points: z
      .number({ invalid_type_error: "points must be a number" })
      .int("points must be an integer")
      .nonnegative("points must be a positive integer")
      .nullable()
      .optional(),
    type: z.enum(["automatic", "one-time"]),
  }),
});

const updatePromotionSchema = z.object({
  params: z.object({
    promotionId: z
      .coerce
      .number()
      .int("promotionId must be an integer")
      .positive("promotionId must be a positive integer"),
  }),
  body: z.object({
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    startTime: z
      .string()
      .regex(isoDateRegex, {
        message: "startTime must be valid ISO8601 date",
      })
      .nullable()
      .optional(),
    endTime: z
      .string()
      .regex(isoDateRegex, {
        message: "endTime must be valid ISO8601 date",
      })
      .nullable()
      .optional(),
    rate: z
      .number({ invalid_type_error: "rate must be a number" })
      .nonnegative("rate must be a positive number")
      .nullable()
      .optional(),
    minSpending: z
      .number({ invalid_type_error: "minSpending must be a number" })
      .nonnegative("minSpending must be a positive number")
      .nullable()
      .optional(),
    points: z
      .number({ invalid_type_error: "points must be a number" })
      .int("points must be an integer")
      .nonnegative("points must be a positive integer")
      .nullable()
      .optional(),
    type: z.enum(["automatic", "one-time"]).nullable().optional(),
  }).refine(data => Object.keys(data).length > 0, { // Ensure at least one field is provided
    message: "At least one field must be provided for update",
    path: ["body"], 
}),
});

const getPromotionsSchema = z.object({
  query: z.object({
    name: z.string().optional(),
    started: z.preprocess(parseBoolean, z.boolean()).optional(),
    type: z.enum(["automatic", "one-time"]).optional(),
    ended: z.preprocess(parseBoolean, z.boolean()).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

// Create a new promotion (Manager or higher)
router.post(
  "/",
  authenticateToken,
  requireManagerOrHigher,
  validate(createPromotionSchema),
  createPromotion
);

// Retrieve a list of promotions (Regular or higher)
router.get(
  "/",
  authenticateToken,
  validate(getPromotionsSchema),
  getPromotions
);

// Retrieve a single promotion by ID (Regular or higher)
// This dynamic route is placed after the more specific static routes.
router.get(
  "/:promotionId",
  authenticateToken,
  validate(promotionIdSchema),
  getPromotionById
);

// Update an existing promotion (Manager or higher)
router.patch(
  "/:promotionId",
  authenticateToken,
  requireManagerOrHigher,
  validate(updatePromotionSchema),
  updatePromotion
);

// Remove the specified promotion (Manager or higher)
router.delete(
  "/:promotionId",
  authenticateToken,
  requireManagerOrHigher,
  validate(promotionIdSchema),
  deletePromotion
);

export default router;
