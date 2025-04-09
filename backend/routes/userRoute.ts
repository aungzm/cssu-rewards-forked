import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";
import multer from "multer";
import { authenticateToken } from "../middlewares/authenticateToken.js";
import {
  requireCashierOrHigher,
  requireManagerOrHigher,
} from "../middlewares/authMiddleware.js";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  getCurrentUser,
  updateCurrentUser,
  updateCurrentUserPassword,
  getMyOrganizedEvents,
} from "../controllers/userController.js";
import {
  createTransferTransaction,
  createRedemptionTransaction,
  getUserTransactions,
} from "../controllers/transactionController.js";
import cors from "cors";
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
  (schema: any) =>
  (req: Request, res: Response, next: NextFunction): any => {
    try {
      const result = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      // Assign the parsed/coerced values back to the request
      req.body = result.body;
      req.query = result.query;
      req.params = result.params;
      next();
    } catch (error: any) {
      return res.status(400).json({
        error: error.errors.map((e: any) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }
  };

  
const checkImg = (file: File) => {
  if (!file) {
    return true;
  } else if (file.name) {
      const fileType = file.name.split(".").pop();
      if (fileType ==="png") return true;
  } 
  return false;
  
}
// Schemas

const userIdSchema = z.object({
  params: z.object({
    userId: z.coerce.number().int("Invalid user ID format"),
  }),
});

const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50).trim(),
    utorid: z
      .string()
      .length(8)
      .regex(/^[a-zA-Z0-9]+$/, "UTORid must be alphanumeric"),
    email: z
      .string()
      .email()
      .regex(
        /^[^@]+@mail\.utoronto\.ca$/,
        "Email must be a valid @mail.utoronto.ca address"
      ),
  }),
});

const updateUserSchema = z.object({
  params: z.object({
    userId: z.coerce.number().int("Invalid user ID format"),
  }),
  body: z
    .object({
      email: z
        .string()
        .email()
        .regex(
          /^[^@]+@mail\.utoronto\.ca$/,
          "Email must be a valid @mail.utoronto.ca address"
        )
        .nullable()
        .optional(),
      role: z
        .enum(["regular", "cashier", "manager", "superuser"])
        .nullable()
        .optional(),
      verified: z.boolean().nullable().optional(),
      suspicious: z.boolean().nullable().optional(),
    })
    .refine(
      (data) => {
        // Check that at least one of the fields is provided and not undefined.
        return Object.keys(data).length > 0;
      },
      {
        message: "At least one field must be provided",
      }
    ),
});

const updateCurrentUserSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(1, "Name cannot be blank")
        .max(50)
        .nullable()
        .optional(),
      email: z
        .string()
        .email()
        .regex(
          /^[^@]+@mail\.utoronto\.ca$/,
          "Email must be a valid @mail.utoronto.ca address"
        )
        .nullable()
        .optional(),
      birthday: z
        .string()
        .nullable()
        .optional()
        .refine(
          (val) => {
            if (!val) return true; // Skip validation if null or undefined

            // Parse the date parts
            const [year, month, day] = val.split("-").map(Number);

            // Check if the parsed date is valid
            const date = new Date(year, month - 1, day); // JS months are 0-based

            // Verify the parsed date matches the input
            return (
              date.getFullYear() === year &&
              date.getMonth() === month - 1 &&
              date.getDate() === day
            );
          },
          { message: "Invalid date. Please provide a valid calendar date." }
        )
        .transform((val) => (val ? new Date(val) : val)), // Transform to Date object if not null
      avatar: z
        .any()
        .optional()
        .nullable()
        .refine((file) => {
          if (!file) {
            return true;
          };
          return file.size < 5000000;
        }, "Max size is 5MB.")
        .refine((file) => checkImg(file), "Only .png format is supported."),
    })
    // .refine( TODO: i do not know why this is causing update to fail for updating avatars, but it is
    //   (data) => {
    //     // Check that at least one field is provided and not null
    //     return Object.entries(data).some(([_, value]) => value !== null);
    //   },
    //   {
    //     message:
    //       "At least one field must be provided with a non-null value",
    //   }
    // ),
});

const corsOptions = {
  origin: 'http://localhost:5173',  // Change to the correct frontend URL
  methods: ['PATCH', 'OPTIONS'],  // Only allow PATCH and OPTIONS methods
  allowedHeaders: ['Content-Type', 'Authorization'],  // Allow headers we need
  credentials: true,  // Allow credentials (cookies, tokens, etc.)
};

const updatePasswordSchema = z.object({
  body: z.object({
    old: z.string().min(8).max(20),
    new: z
      .string()
      .min(8)
      .max(20)
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character"
      ),
  }),
});

const getMyOrganizedEventsSchema = z.object({
  query: z.object({
    past: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
  })
});

const getUsersSchema = z.object({
  query: z.object({
    name: z.string().optional(),
    role: z.enum(["regular", "cashier", "manager", "superuser"]).optional(),
    // Instead of using z.coerce.boolean(), we use z.preprocess to ensure that
    // the string "false" is converted to false.
    verified: z.preprocess(parseBoolean, z.boolean()).optional(),
    activated: z.preprocess(parseBoolean, z.boolean()).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
  }),
});

const transferTransactionSchema = z.object({
  params: z.object({
    userId: z.coerce.number().int("Invalid user ID format"),
  }),
  body: z.object({
    type: z.enum(["transfer"], { message: "Type must be 'transfer'" }),
    amount: z
      .number()
      .int()
      .positive("Amount must be a positive integer value"),
    remark: z.string().nullable().optional(),
  }),
});

const redemptionTransactionSchema = z.object({
  body: z.object({
    type: z.literal("redemption", {
      message: "Type must be 'redemption'",
    }),
    amount: z
      .number()
      .int()
      .positive("Amount must be a positive integer value")
      .optional(),
    remark: z.string().optional(),
  }),
});

const getUserTransactionsSchema = z.object({
  query: z.object({
    type: z.string().optional(),
    relatedId: z.string().optional(),
    promotionId: z.coerce.number().int().optional(),
    amount: z.coerce.number().optional(),
    operator: z.enum(["gte", "lte"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

// Routes ordered from most specific to least specific

/**
 * @route   PATCH /users/me/password
 * @desc    Update the current logged-in user's password
 */
router.patch(
  "/me/password",
  authenticateToken,
  validate(updatePasswordSchema),
  updateCurrentUserPassword
);

/**
 * @route   GET /users/me
 * @desc    Retrieve the current logged-in user's information
 */
router.get("/me", authenticateToken, getCurrentUser);

/**
 * @route   PATCH /users/me
 * @desc    Update the current logged-in user's info (e.g. name, email)
 */


router.patch(
  "/me",
  cors(corsOptions),
  authenticateToken,
  upload.single("avatar"),
  validate(updateCurrentUserSchema),
  updateCurrentUser
);

/**
 * @route   POST /users/me/transactions
 * @desc    Create a new redemption transaction for the current user
 * @access  Regular user or higher
 */
router.post(
  "/me/transactions",
  authenticateToken,
  validate(redemptionTransactionSchema),
  createRedemptionTransaction
);

/**
 * @route   GET /users/me/events
 * @desc    Retrieve a list of events that the user organized
 * @access  Regular user or higher
 */
router.get(
  "/me/events",
  authenticateToken,
  validate(getMyOrganizedEventsSchema),
  getMyOrganizedEvents
);

/**
 * @route   GET /users/me/transactions
 * @desc    Retrieve a list of transactions owned by the currently logged-in user
 * @access  Regular user or higher
 */
router.get(
  "/me/transactions",
  authenticateToken,
  validate(getUserTransactionsSchema),
  getUserTransactions
);

/**
 * @route   POST /users/:userId/transactions
 * @desc    Create a new transfer transaction between current user and specified recipient
 * @access  Regular user or higher
 */
router.post(
  "/:userId/transactions",
  authenticateToken,
  validate(transferTransactionSchema),
  createTransferTransaction
);

/**
 * @route   GET /users/:userId
 * @desc    Retrieve a specific user (Cashier or higher)
 */
router.get(
  "/:userId",
  authenticateToken,
  requireCashierOrHigher,
  validate(userIdSchema),
  getUserById
);

/**
 * @route   PATCH /users/:userId
 * @desc    Update a user's info (Manager or higher)
 */
router.patch(
  "/:userId",
  authenticateToken,
  requireManagerOrHigher,
  validate(updateUserSchema),
  updateUser
);

/**
 * @route   POST /users
 * @desc    Create a new user (Cashier or higher can create regular user accounts)
 */
router.post(
  "/",
  authenticateToken,
  requireCashierOrHigher,
  validate(createUserSchema),
  createUser
);

/**
 * @route   GET /users
 * @desc    Retrieve list of users (Manager or higher)
 * Query params: name, role, verified, activated, page, limit
 */
router.get(
  "/",
  authenticateToken,
  requireCashierOrHigher,
  validate(getUsersSchema),
  getUsers
);
router.options('*', cors());

export default router;