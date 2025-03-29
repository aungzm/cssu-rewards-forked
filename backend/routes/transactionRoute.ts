import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  createPurchaseTransaction,
  getTransactions,
  getTransactionById,
  toggleTransactionSuspicious,
  markRedemptionAsProcessed,
} from "../controllers/transactionController";
import { authenticateToken } from "../middlewares/authenticateToken";
import {
  requireCashierOrHigher,
  requireManagerOrHigher,
} from "../middlewares/authMiddleware";

const router = express.Router();

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

// Custom parser to convert strings to boolean correctly
const parseBoolean = (val: unknown): unknown => {
  if (typeof val === "string") {
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;
  }
  return val;
};

const markProcessedSchema = z.object({
  params: z.object({
    transactionId: z.coerce.number().int("Valid transaction ID is required"),
  }),
  body: z.object({
    processed: z.literal(true, { message: "Processed must be true" }),
  }),
});

const toggleSuspiciousSchema = z.object({
  params: z.object({
    transactionId: z.coerce.number().int("Valid transaction ID is required"),
  }),
  body: z.object({
    suspicious: z.boolean({ message: "Suspicious must be a boolean value" }),
  }),
});

const purchaseSchema = z.object({
  utorid: z.string().min(1, "User ID is required"),
  type: z.literal("purchase"),
  spent: z
    .number({ message: "Spend amount must be a number" })
    .positive({ message: "Spent amount must be positive" }),
  promotionIds: z.array(z.coerce.number().int()).nullable().optional(),
  remark: z.string().nullable().optional(),
});

const adjustmentSchema = z.object({
  utorid: z.string().min(1, "User ID is required"),
  type: z.literal("adjustment"),
  amount: z.number({ message: "Amount must be a number" }),
  relatedId: z.number({ message: "Related ID must be a number" }),
  promotionIds: z.array(z.coerce.number().int()).nullable().optional(),
  remark: z.string().nullable().optional(),
});

const transactionSchema = z.discriminatedUnion("type", [
  purchaseSchema,
  adjustmentSchema,
]);

const wrappedTransactionSchema = z.object({
  body: transactionSchema,
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const getTransactionsSchema = z.object({
  query: z.object({
    name: z.string().optional(),
    createdBy: z.string().optional(),
    suspicious: z.preprocess(parseBoolean, z.boolean()).optional(),
    promotionId: z.coerce.number().optional(),
    type: z.string().optional(),
    relatedId: z.string().optional(),
    amount: z.coerce.number().optional(),
    operator: z.enum(["gte", "lte"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

const getTransactionByIdSchema = z.object({
  params: z.object({
    transactionId: z.coerce.number().int("Valid transaction ID is required"),
  }),
});

// Routes ordered from most specific to least specific

/**
 * PATCH /api/transactions/:transactionId/suspicious
 * Toggle the suspicious status of a transaction (Manager or higher)
 */
router.patch(
  "/:transactionId/suspicious",
  authenticateToken,
  requireManagerOrHigher,
  validate(toggleSuspiciousSchema),
  toggleTransactionSuspicious
);

/**
 * PATCH /api/transactions/:transactionId/processed
 * Mark a redemption transaction as processed (Cashier or higher)
 */
router.patch(
  "/:transactionId/processed",
  authenticateToken,
  requireCashierOrHigher,
  validate(markProcessedSchema),
  markRedemptionAsProcessed
);

/**
 * GET /api/transactions/:transactionId
 * Retrieve a single transaction by ID (Manager or higher)
 */
router.get(
  "/:transactionId",
  authenticateToken,
  requireManagerOrHigher,
  validate(getTransactionByIdSchema),
  getTransactionById
);

/**
 * POST /api/transactions
 * Create a new purchase transaction (Cashier or higher)
 */
router.post(
  "/",
  authenticateToken,
  requireCashierOrHigher,
  validate(wrappedTransactionSchema),
  createPurchaseTransaction
);

/**
 * GET /api/transactions
 * Retrieve a list of transactions with filtering options (Manager or higher)
 */
router.get(
  "/",
  authenticateToken,
  requireManagerOrHigher,
  validate(getTransactionsSchema),
  getTransactions
);

export default router;
