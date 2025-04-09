import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";

import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  awardPoints,
  addOrganizer,
  removeOrganizer,
  addGuest,
  removeGuest,
  addSelfAsGuest,
  removeSelfAsGuest,
} from "../controllers/eventController.js";
import { authenticateToken } from "../middlewares/authenticateToken.js";
import { requireManagerOrHigher } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ISO8601 date regex pattern
const isoDateRegex =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

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

const eventIdSchema = z.object({
  params: z.object({
    eventId: z
      .coerce
      .number()
      .int("eventId must be an integer")
      .positive("eventId must be a positive integer"),
  }),
});

const createEventSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    location: z.string().min(1, "Location is required"),
    startTime: z.string().regex(isoDateRegex, {
      message: "startTime must be valid ISO8601 date",
    }),
    endTime: z.string().regex(isoDateRegex, {
      message: "endTime must be valid ISO8601 date",
    }),
    capacity: z
      .number({ invalid_type_error: "capacity must be a number" })
      .int("capacity must be an integer")
      .nonnegative("capacity must be a non-negative integer")
      .optional()
      .nullable(),
    points: z
      .number({ invalid_type_error: "points must be a number" })
      .int("points must be an integer")
      .positive("points must be a positive integer"),
  }),
});

const updateEventSchema = z.object({
  params: z.object({
    eventId: z
      .coerce
      .number()
      .int("eventId must be an integer")
      .positive("eventId must be a positive integer"),
  }),
  body: z
    .object({
      name: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
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
      capacity: z
        .number({ invalid_type_error: "capacity must be a number" })
        .int("capacity must be an integer")
        .nonnegative("capacity must be a non-negative integer")
        .nullable()
        .optional(),
      points: z
        .number({ invalid_type_error: "points must be a number" })
        .int("points must be an integer")
        .positive("points must be a positive integer")
        .nullable()
        .optional(),
      published: z.boolean().nullable().optional(),
    })
    .refine(
      (data) => Object.keys(data).length > 0,
      { message: "Request body cannot be empty. At least one field must be provided." }
    )
    .refine(
      (data) => Object.values(data).some((value) => value !== null),
      {
        message:
          "Request body cannot have all fields set to null. At least one field must have a value.",
      }
    ),
});

const getEventsSchema = z.object({
  query: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    started: z.coerce.boolean().optional(),
    ended: z.coerce.boolean().optional(),
    showAll: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    published: z.preprocess(parseBoolean, z.boolean()).optional(), // Manager+ only
  }),
});

const createOrganizerSchema = z.object({
  params: z.object({
    eventId: z
      .coerce
      .number()
      .int("eventId must be an integer")
      .positive("eventId must be a positive integer"),
  }),
  body: z.object({
    utorid: z
      .string({
        required_error: "UTORid is required",
        invalid_type_error: "UTORid must be a string",
      })
      .length(8, "UTORid must be 8 characters"),
  }),
});

const removeOrganizerSchema = z.object({
  params: z.object({
    eventId: z
      .coerce
      .number()
      .int("eventId must be an integer")
      .positive("eventId must be a positive integer"),
    userId: z
      .coerce
      .number()
      .int("userId must be an integer")
      .positive("userId must be a positive integer"),
  }),
});

const createGuestSchema = z.object({
  params: z.object({
    eventId: z
      .coerce
      .number()
      .int("eventId must be an integer")
      .positive("eventId must be a positive integer"),
  }),
  body: z.object({
    utorid: z
      .string({
        required_error: "UTORid is required",
        invalid_type_error: "UTORid must be a string",
      })
      .length(8, "UTORid must be 8 characters"),
  }),
});

const deleteGuestSchema = z.object({
  params: z.object({
    eventId: z
      .coerce
      .number()
      .int("eventId must be an integer")
      .positive("eventId must be a positive integer"),
    userId: z
      .coerce
      .number()
      .int("userId must be an integer")
      .positive("userId must be a positive integer"),
  }),
});

const awardPointsSchema = z.object({
  params: z.object({
    eventId: z
      .coerce
      .number()
      .int("eventId must be an integer")
      .positive("eventId must be a positive integer"),
  }),
  body: z.object({
    amount: z
      .number({ invalid_type_error: "amount must be a number" })
      .int("amount must be an integer")
      .positive("amount must be a positive integer"),
    utorid: z
      .string()
      .length(8, "UTORid must be 8 characters")
      .nullable()
      .optional(),
    type: z.enum(["event"]),
  }),
});

const createGuestMeSchema = z.object({
  params: z.object({
    eventId: z
      .coerce
      .number()
      .int("eventId must be an integer")
      .positive("eventId must be a positive integer"),
  }),
});

const deleteGuestMeSchema = z.object({
  params: z.object({
    eventId: z
      .coerce
      .number()
      .int("eventId must be an integer")
      .positive("eventId must be a positive integer"),
  }),
});

// Routes ordered from most specific to least specific

/**
 * POST /events/:eventId/transactions
 * Create a transaction for an event
 * Clearance: Manager or higher
 */
router.post(
  "/:eventId/transactions",
  authenticateToken,
  requireManagerOrHigher,
  validate(awardPointsSchema),
  awardPoints
);

/**
 * POST /events/:eventId/organizers
 * Add an organizer to an event
 * Clearance: Manager or higher
 */
router.post(
  "/:eventId/organizers",
  authenticateToken,
  requireManagerOrHigher,
  validate(createOrganizerSchema),
  addOrganizer
);

/**
 * DELETE /events/:eventId/organizers/:userId
 * Remove an organizer from an event
 * Clearance: Manager or higher
 */
router.delete(
  "/:eventId/organizers/:userId",
  authenticateToken,
  requireManagerOrHigher,
  validate(removeOrganizerSchema),
  removeOrganizer
);

/**
 * POST /events/:eventId/guests/me
 * Add yourself as a guest to an event.
 */
router.post(
  "/:eventId/guests/me",
  authenticateToken,
  validate(createGuestMeSchema),
  addSelfAsGuest
);

/**
 * DELETE /events/:eventId/guests/me
 * Remove yourself as a guest from an event.
 */
router.delete(
  "/:eventId/guests/me",
  authenticateToken,
  validate(deleteGuestMeSchema),
  removeSelfAsGuest
);

/**
 * POST /events/:eventId/guests
 * Add a guest to an event.
 */
router.post(
  "/:eventId/guests",
  authenticateToken,
  validate(createGuestSchema),
  addGuest
);

/**
 * DELETE /events/:eventId/guests/:userId
 * Remove a guest from an event (Manager or higher clearance).
 */
router.delete(
  "/:eventId/guests/:userId",
  authenticateToken,
  requireManagerOrHigher,
  validate(deleteGuestSchema),
  removeGuest
);

/**
 * GET /events/:eventId
 * Retrieve a single event.
 * Clearance: Cashier or higher
 */
router.get(
  "/:eventId",
  authenticateToken,
  validate(eventIdSchema),
  getEventById
);

/**
 * PATCH /events/:eventId
 * Update an existing event.
 * Clearance: Manager or higher
 */
router.patch(
  "/:eventId",
  authenticateToken,
  requireManagerOrHigher,
  validate(updateEventSchema),
  updateEvent
);

/**
 * DELETE /events/:eventId
 * Remove the specified event.
 * Clearance: Manager or higher
 */
router.delete(
  "/:eventId",
  authenticateToken,
  requireManagerOrHigher,
  validate(eventIdSchema),
  deleteEvent
);

/**
 * POST /events
 * Create a new event (Manager or higher clearance).
 */
router.post(
  "/",
  authenticateToken,
  requireManagerOrHigher,
  validate(createEventSchema),
  createEvent
);

/**
 * GET /events
 * Retrieve a list of events.
 * - Regular clearance: can only see published events
 * - Manager or higher: can see all events, optionally filter by `published`
 */
router.get(
  "/",
  authenticateToken,
  validate(getEventsSchema),
  getEvents
);

export default router;
