import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  requestPasswordReset,
  finalizePasswordReset,
  generateJWTToken,
} from "../controllers/authController.js";

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

// Schemas
const finalizeResetSchema = z.object({
  params: z.object({
    resetToken: z.string({
      required_error: "Reset token is required",
      invalid_type_error: "Reset token must be a string",
    }),
  }),
  body: z.object({
    utorid: z
      .string({
        required_error: "UTORid is required",
        invalid_type_error: "UTORid must be a string",
      })
      .length(8, "UTORid must be 8 characters"),
    password: z
      .string({
        required_error: "Password is required",
        invalid_type_error: "Password must be a string",
      })
      .min(8, "Password must be at least 8 characters")
      .max(20, "Password cannot exceed 20 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  }),
});

const requestResetSchema = z.object({
  body: z.object({
    utorid: z
      .string({
        required_error: "UTORid is required",
        invalid_type_error: "UTORid must be a string",
      })
      .regex(/^[a-zA-Z0-9]+$/, "UTORid must be alphanumeric")
      .length(8, "UTORid must be 8 characters"),
  }),
});

const loginSchema = z.object({
  body: z.object({
    utorid: z
      .string({
        required_error: "UTORid is required",
        invalid_type_error: "UTORid must be a string",
      })
      .regex(/^[a-zA-Z0-9]+$/, "UTORid must be alphanumeric")
      .length(8, "UTORid must be 8 characters"),
    password: z.string({
      required_error: "Password is required",
      invalid_type_error: "Password must be a string",
    }),
  }),
});

// Route to generate a JWT token (login)
router.post(
  "/tokens",
  validate(loginSchema),
  generateJWTToken
);

/**
 * @route   POST /auth/resets/:resetToken
 * @desc    Finalize the password reset (public)
 *          Takes in "password" in the body
 */
router.post(
  "/resets/:resetToken",
  validate(finalizeResetSchema),
  finalizePasswordReset
);

/**
 * @route   POST /auth/resets
 * @desc    Request a password reset (public)
 *          Takes in "utorid" in the body
 */
router.post(
  "/resets",
  validate(requestResetSchema),
  requestPasswordReset
);

export default router;
