import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "middlewares/authMiddleware.js";

const prisma = new PrismaClient();

/**
 * POST /events
 * Create a new event (Manager or higher clearance).
 */
export async function createEvent(req: Request, res: Response): Promise<void> {
  try {
    const {
      name,
      description,
      location,
      startTime,
      endTime,
      capacity,
      points,
    } = req.body as {
      name: string;
      description?: string;
      location: string;
      startTime: string;
      endTime: string;
      capacity?: number;
      points: number;
    };

    // Ensure endTime is after startTime
    if (new Date(endTime) <= new Date(startTime)) {
      res.status(400).json({
        error: "endTime must be after startTime",
      });
      return;
    }

    const event = await prisma.event.create({
      data: {
        name,
        description: description ?? "",
        location,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        capacity: capacity, // if not provided, remains undefined
        pointsRemain: points, // use the validated points value
        pointsAwarded: 0,
        published: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        startTime: true,
        endTime: true,
        capacity: true,
        pointsRemain: true,
        pointsAwarded: true,
        published: true,
        organizers: true,
        guests: true,
      },
    });

    res.status(201).json(event);
  } catch (error) {
    console.error("createEvent error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /events
 * Retrieve a list of events.
 * - Regular clearance: can only see published events.
 * - Manager or higher: can see all events, optionally filter by `published`.
 */
export async function getEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      name,
      location,
      started,
      ended,
      showFull,
      page = "1",
      limit = "10",
      published,
    } = req.query as { [key: string]: string | undefined };

    if (started !== undefined && ended !== undefined) {
      res.status(400).json({
        error: 'Cannot specify both "started" and "ended" simultaneously.',
      });
      return;
    }

    const where: any = {};

    if (name) {
      where.name = {
        contains: name,
      };
    }

    if (location) {
      where.location = {
        contains: location,
        mode: "insensitive",
      };
    }

    // Filter events by startTime based on query
    if (started !== undefined) {
      if (started) {
        where.startTime = { lte: new Date() };
      } else {
        where.startTime = { gt: new Date() };
      }
    }

    // Filter by ended status
    if (ended !== undefined) {
      if (ended) {
        where.endTime = { lte: new Date() };
      } else {
        where.endTime = { gt: new Date() };
      }
    }

    // Role-based filtering for published events.
    const userRole: string =  req.user?.role || "REGULAR";
    if (userRole === "REGULAR" || userRole === "CASHIER") {
      where.published = true;
    } else if (published !== undefined) {
      where.published = published; // Note published is validated as a boolean
    }

    const pageNum = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * pageSize;

    const currentUserId = (req as any).user?.id;
    const [totalCount, events] = await Promise.all([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        orderBy: { startTime: "asc" },
        skip, 
        take: pageSize, 
        select: {
          id: true,
          name: true,
          description: true,
          location: true,
          startTime: true,
          endTime: true,
          capacity: true,
          pointsAwarded:
            userRole === "MANAGER" || userRole === "SUPERUSER" ? true : false,
          pointsRemain:
            userRole === "MANAGER" || userRole === "SUPERUSER" ? true : false,
          published:
            userRole === "MANAGER" || userRole === "SUPERUSER" ? true : false,
          organizers: {
            select: { organizerId: true },
          },
          guests: {
            select: { userId: true },
          },
          _count: {
            select: { guests: true },
          },
        },
      }),
    ]);

    const booleanShowFull = Boolean(showFull)
    if (showFull !== undefined && booleanShowFull){
      console.log("showFull is true");
      const fullEvents = events.filter((event) => event.capacity !== null && event.guests.length === event.capacity);
      const results = fullEvents.map((event) => ({
        id: event.id,
        name: event.name,
        description: event.description,
        location: event.location,
        startTime: event.startTime,
        endTime: event.endTime,
        capacity: event.capacity,
        pointsAwarded: event.pointsAwarded,
        pointsRemain: event.pointsRemain,
        numGuests: event._count.guests,
        published: event.published,
        isOrganizer: event.organizers.some(
          (org) => org.organizerId === currentUserId
        ),
        isGuest: event.guests.some((g) => g.userId === currentUserId),
      }));
      res.status(200).json({
        count: fullEvents.length,
        results,
      });
      return;
    } else if (showFull !== undefined && booleanShowFull === false) {
      const nonFullEvents = events.filter((event) => event.capacity === null || event.guests.length < event.capacity);
      const results = nonFullEvents.map((event) => ({
        id: event.id,
        name: event.name,
        description: event.description,
        location: event.location,
        startTime: event.startTime,
        endTime: event.endTime,
        capacity: event.capacity,
        pointsAwarded: event.pointsAwarded,
        pointsRemain: event.pointsRemain,
        numGuests: event._count.guests,
        published: event.published,
        isOrganizer: event.organizers.some(
          (org) => org.organizerId === currentUserId
        ),
        isGuest: event.guests.some((g) => g.userId === currentUserId),
      }));
      res.status(200).json({
        count: nonFullEvents.length,
        results,
      });
      return;
    }

    // Default case: return all events regardless of capacity
    const results = events.map((event) => ({
      id: event.id,
      name: event.name,
      description: event.description,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
      capacity: event.capacity,
      pointsAwarded: event.pointsAwarded,
      pointsRemain: event.pointsRemain,
      numGuests: event._count.guests,
      published: event.published,
      isOrganizer: event.organizers.some(
        (org) => org.organizerId === currentUserId
      ),
      isGuest: event.guests.some((g) => g.userId === currentUserId),
    }));

    res.status(200).json({
      count: totalCount,
      results,
    });
  } catch (error) {
    console.error("getEvents error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /events/:eventId
 * Retrieve a single event.
 * - Clearance: Regular or higher.
 *   - Regular users see only published events (and limited fields).
 *   - MANAGER or SUPERUSER (or the event’s organizer) sees full details.
 */
export async function getEventById(req: Request, res: Response): Promise<void> {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) {
      res.status(400).json({ error: "Invalid event ID" });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizers: {
          select: {
            organizer: { select: { id: true, utorid: true, name: true } },
          },
        },
        guests: {
          include: {
            user: { select: { id: true, utorid: true, name: true } },
          },
        },
      },
    });
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const userRole: string = (req as any).user?.role || "REGULAR";
    const userId = (req as any).user?.id;
    const isOrganizer = event.organizers.some(
      (org) => org.organizer.id === userId
    );

    const isManagerOrHigher =
      userRole === "MANAGER" || userRole === "SUPERUSER";
    const canSeeAll = isManagerOrHigher || isOrganizer;

    if (!canSeeAll && !event.published) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    if (!canSeeAll) {
      res.status(200).json({
        id: event.id,
        name: event.name,
        description: event.description,
        location: event.location,
        startTime: event.startTime,
        endTime: event.endTime,
        capacity: event.capacity,
        organizers: event.organizers.map((org) => org.organizer),
        numGuests: event.guests.length,
      });
      return;
    }

    const guests = event.guests.map((rsvp) => rsvp.user);
    res.status(200).json({
      id: event.id,
      name: event.name,
      description: event.description,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
      capacity: event.capacity,
      pointsRemain: event.pointsRemain,
      pointsAwarded: event.pointsAwarded,
      published: event.published,
      organizers: event.organizers.map((org) => org.organizer),
      guests: guests,
    });
  } catch (error) {
    console.error("getEventById error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * PATCH /events/:eventId
 * Update an existing event.
 * - Clearance: MANAGER or SUPERUSER, OR an organizer of this event.
 * - Only managers can update `points` or `published`.
 * - If the event is already published, a non-manager organizer cannot change restricted fields.
 */
export async function updateEvent(req: Request, res: Response): Promise<void> {
  try {
    
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) {
      res.status(400).json({ error: "Invalid event ID" });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        startTime: true,
        endTime: true,
        name: true,
        pointsAwarded: true,
        pointsRemain: true,
        guests: true,
        organizers: {
          select: { organizerId: true },
        },
      },
    });

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const userRole: string = (req as any).user?.role || "REGULAR";
    const userId = (req as any).user?.id;
    const isOrganizer = event.organizers.some((o) => o.organizerId === userId);
    const isManagerOrHigher =
      userRole === "MANAGER" || userRole === "SUPERUSER";

    if (!isManagerOrHigher && !isOrganizer) {
      res.status(403).json({ error: "Not authorized to update this event" });
      return;
    }

    const {
      name,
      description,
      location,
      startTime,
      endTime,
      capacity,
      points,
      published,
    } = req.body;

    const updateData: any = {};
    const updatedFields: any = { id: eventId };

    if (name !== undefined && name !== null) {
      if (new Date() > new Date(event.startTime)) {
        res.status(400).json({
          error: "Cannot update name after the event has started.",
        });
        return;
      }
      updateData.name = name;
      updatedFields.name = name;
    }

    if (description !== undefined && description !== null) {
      if (new Date() > new Date(event.startTime)) {
        res.status(400).json({
          error: "Cannot update description after the event has started.",
        });
        return;
      }
      updateData.description = description;
      updatedFields.description = description;
    }

    if (location !== undefined && location !== null) {
      if (new Date() > new Date(event.startTime)) {
        res.status(400).json({
          error: "Cannot update location after the event has started.",
        });
        return;
      }
      updateData.location = location;
      updatedFields.location = location;
    }

    let newStartTime = event.startTime;
    if (startTime !== undefined && startTime !== null) {
      newStartTime = new Date(startTime);
      const now = new Date();
      if (newStartTime < now) {
        res.status(400).json({ error: "Cannot set a start time in the past" });
        return;
      }
      updateData.startTime = newStartTime;
      updatedFields.startTime = startTime;
    }
    if (endTime !== undefined && endTime !== null) {
      const newEndTime = new Date(endTime);
      const effectiveStartTime = updateData.startTime || event.startTime;
      if (newEndTime <= new Date(effectiveStartTime)) {
        res.status(400).json({ error: "endTime must be after startTime" });
        return;
      }
      if (newEndTime < new Date()) {
        res.status(400).json({ error: "Cannot set endTime to a past date" });
        return;
      }
      updateData.endTime = newEndTime;
      updatedFields.endTime = endTime;
    }

    if (capacity !== undefined && capacity !== null) {
      if (new Date() > new Date(event.startTime)) {
        res.status(400).json({
          error: "Cannot update capacity after the event has started.",
        });
        return;
      }
      if (isNaN(capacity) || capacity < event.guests.length) {
        res.status(400).json({
          error:
            "Cannot reduce capacity below the number of guests already attending.",
        });
        return;
      }
      updateData.capacity = capacity;
      updatedFields.capacity = capacity;
    }
    if (points !== undefined && points !== null && points!== event.pointsAwarded+event.pointsRemain) {
      if (!isManagerOrHigher) {
        res.status(403).json({ error: "Not authorized to update points." });
        return;
      }
      const pointsAwarded = event.pointsAwarded || 0;
      if (isNaN(points) || points < pointsAwarded) {
        res.status(400).json({
          error:
            "Total points cannot be reduced below the points already awarded.",
        });
        return;
      }
      updateData.pointsRemain = points - pointsAwarded;
      updatedFields.pointsRemain = points - pointsAwarded;
    }
    if (published !== undefined && published !== null) {
      if (!isManagerOrHigher) {
        res.status(403).json({ error: "Not authorized to set published." });
        return;
      }
      if (published !== true) {
        res.status(400).json({ error: "Published can only be set to true." });
        return;
      }
      updateData.published = true;
      updatedFields.published = true;
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });

    // Fallback for non-updated fields.
    updatedFields.name = updatedFields.name ?? event.name;
    updatedFields.startTime = updatedFields.startTime ?? event.startTime;
    updatedFields.endTime = updatedFields.endTime ?? event.endTime;

    res.status(200).json({
      id: updatedEvent.id,
      name: updatedEvent.name,
      location: updatedEvent.location,
      ...updatedFields,
    });
  } catch (error) {
    console.error("updateEvent error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * DELETE /events/:eventId
 * Remove the specified event.
 * - Clearance: Manager or higher
 * - 400 if the event is published.
 */
export async function deleteEvent(req: Request, res: Response): Promise<void> {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) {
      res.status(400).json({ error: "Invalid event ID" });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    if (event.published) {
      res.status(400).json({ error: "Cannot delete a published event" });
      return;
    }

    await prisma.event.delete({
      where: { id: eventId },
    });

    res.status(204).send();
  } catch (error) {
    console.error("deleteEvent error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /events/:eventId/organizers
 * Add an organizer to the event.
 * Clearance: Manager or higher.
 */
export async function addOrganizer(req: Request, res: Response): Promise<void> {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    const { utorid } = req.body as { utorid: string };

    if (isNaN(eventId) || !utorid) {
      res.status(400).json({ error: "Invalid eventId or missing utorid" });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        guests: { select: { userId: true } },
      },
    });
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { utorid },
      select: { id: true, utorid: true, name: true },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (new Date() > event.endTime) {
      res.status(410).json({ error: "Event has ended" });
      return;
    }

    const existingRsvp = await prisma.rsvp.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
    });
    if (existingRsvp) {
      res.status(400).json({
        error:
          "User is currently a guest; remove them as a guest first before adding as an organizer",
      });
      return;
    }

    const existingOrganizer = await prisma.organizerEvent.findUnique({
      where: { eventId_organizerId: { eventId, organizerId: user.id } },
    });
    if (existingOrganizer) {
      res.status(409).json({ error: "User is already an organizer" });
      return;
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        organizers: {
          create: {
            organizer: { connect: { id: user.id } },
          },
        },
      },
      include: {
        organizers: {
          select: {
            organizer: { select: { id: true, utorid: true, name: true } },
          },
        },
      },
    });

    res.status(201).json({
      id: updatedEvent.id,
      name: updatedEvent.name,
      location: updatedEvent.location,
      organizers: updatedEvent.organizers.map((o) => o.organizer),
    });
  } catch (error) {
    console.error("addOrganizer error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * DELETE /events/:eventId/organizers/:userId
 * Remove an organizer from the event.
 * Clearance: Manager or higher.
 */
export async function removeOrganizer(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(eventId) || isNaN(userId)) {
      res.status(400).json({ error: "Invalid eventId or userId" });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { organizers: true, guests: true },
    });
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const isOrganizer = event.organizers.some((o) => o.organizerId === userId);
    if (!isOrganizer) {
      res.status(404).json({ error: "User is not an organizer of this event" });
      return;
    }

    const isGuest = event.guests.some((g) => g.userId === userId);
    if (isGuest) {
      res.status(400).json({
        error:
          "User is currently a guest; remove them as a guest first before removing as an organizer",
      });
      return;
    }

    await prisma.organizerEvent.delete({
      where: {
        eventId_organizerId: { eventId, organizerId: userId },
      },
    });

    res.status(204).send();
  } catch (error) {
    console.error("removeOrganizer error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /events/:eventId/guests
 * Add a guest to the event.
 * Clearance: Manager or higher, or an organizer for this event.
 */
export async function addGuest(req: Request, res: Response): Promise<void> {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    const { utorid } = req.body as { utorid: string };
    const userRole: string = ((req as any).user?.role || "").toUpperCase();

    if (userRole !== "SUPERUSER" && userRole !== "MANAGER") {
      const organizer = await prisma.organizerEvent.findUnique({
        where: {
          eventId_organizerId: { eventId, organizerId: (req as any).user?.id },
        },
      });
      if (!organizer) {
        res
          .status(403)
          .json({ error: "Insufficient clearance to add a guest" });
        return;
      }
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { utorid },
      select: { id: true, utorid: true, name: true },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (new Date() > event.endTime) {
      res.status(410).json({ error: "Event has ended" });
      return;
    }

    const existingOrganizer = await prisma.organizerEvent.findUnique({
      where: { eventId_organizerId: { eventId, organizerId: user.id } },
    });
    if (existingOrganizer) {
      res.status(400).json({
        error: "User is currently an organizer; remove them as organizer first",
      });
      return;
    }

    const existingRsvp = await prisma.rsvp.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
    });
    if (existingRsvp) {
      res.status(409).json({ error: "User is already a guest" });
      return;
    }

    const currentGuestCount = await prisma.rsvp.count({
      where: { eventId },
    });
    if (event.capacity !== null && currentGuestCount >= event.capacity) {
      res.status(410).json({ error: "Event is full" });
      return;
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        guests: {
          create: { user: { connect: { id: user.id } } },
        },
      },
      include: {
        guests: {
          include: { user: { select: { id: true, utorid: true, name: true } } },
        },
      },
    });

    res.status(201).json({
      id: updatedEvent.id,
      name: updatedEvent.name,
      location: updatedEvent.location,
      guestAdded: user,
      numGuests: updatedEvent.guests.length,
    });
  } catch (error) {
    console.error("addGuest error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * DELETE /events/:eventId/guests/:userId
 * Remove a guest from the event.
 * Clearance: Manager or higher (organizers cannot remove guests).
 */
export async function removeGuest(req: Request, res: Response): Promise<void> {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(eventId) || isNaN(userId)) {
      res.status(400).json({ error: "Invalid eventId or userId" });
      return;
    }

    const requester = (req as any).user;
    if (
      !(
        requester &&
        (requester.role === "MANAGER" || requester.role === "SUPERUSER")
      )
    ) {
      res
        .status(403)
        .json({ error: "Insufficient clearance to remove a guest" });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { organizers: true, guests: true },
    });
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    if (event.organizers.some((o) => o.organizerId === requester.id)) {
      res
        .status(403)
        .json({ error: "Organizers are not allowed to remove guests." });
      return;
    }

    const isGuest = event.guests.some((g) => g.userId === userId);
    if (!isGuest) {
      res.status(404).json({ error: "User is not a guest of this event" });
      return;
    }

    await prisma.rsvp.delete({
      where: { eventId_userId: { eventId, userId } },
    });

    res.status(204).send();
  } catch (error) {
    console.error("removeGuest error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /events/:eventId/guests/me
 * Add the logged-in user to the event as a guest.
 * Clearance: Regular or higher.
 */
export async function addSelfAsGuest(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) {
      res.status(400).json({ error: "Invalid eventId" });
      return;
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { organizers: true, guests: true },
    });
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    if (new Date() > event.endTime) {
      res.status(410).json({ error: "Event has ended" });
      return;
    }

    const isOrganizer = event.organizers.some(
      (org) => org.organizerId === userId
    );
    if (isOrganizer) {
      res.status(400).json({
        error:
          "You are currently an organizer; remove yourself as organizer first",
      });
      return;
    }

    const isAlreadyGuest = event.guests.some((rsvp) => rsvp.userId === userId);
    if (isAlreadyGuest) {
      res.status(409).json({ error: "You are already on the guest list" });
      return;
    }

    if (event.capacity !== null && event.guests.length >= event.capacity) {
      res.status(410).json({ error: "Event is full" });
      return;
    }

    await prisma.event.update({
      where: { id: eventId },
      data: {
        guests: {
          create: { user: { connect: { id: userId } } },
        },
      },
    });

    const numGuests = await prisma.rsvp.count({
      where: { eventId },
    });

    const guestAdded = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, utorid: true, name: true },
    });

    res.status(201).json({
      id: event.id,
      name: event.name,
      location: event.location,
      guestAdded,
      numGuests,
    });
  } catch (error) {
    console.error("addSelfAsGuest error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * DELETE /events/:eventId/guests/me
 * Remove the logged-in user from the event.
 * Clearance: Regular or higher.
 */
export async function removeSelfAsGuest(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) {
      res.status(400).json({ error: "Invalid eventId" });
      return;
    }

    const userId = (req as any).user?.id;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { guests: true },
    });
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    if (new Date() > event.endTime) {
      res.status(410).json({ error: "Event has ended" });
      return;
    }

    const isGuest = event.guests.some((rsvp) => rsvp.userId === userId);
    if (!isGuest) {
      res.status(404).json({ error: "You did not RSVP to this event" });
      return;
    }

    await prisma.rsvp.delete({
      where: { eventId_userId: { eventId, userId } },
    });

    res.status(204).send();
  } catch (error) {
    console.error("removeSelfAsGuest error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /events/:eventId/transactions
 * Award points for an event.
 */
export async function awardPoints(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const eventId = req.params.eventId; // assume Zod has coerced this to a number if using middleware
    const { type, utorid, amount, remark } = req.body as {
      type: string;
      utorid?: string;
      amount: number;
      remark?: string;
    };

    if (type !== "event") {
      res.status(400).json({ error: "Invalid type. Must be 'event'" });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: Number(eventId) },
      include: {
        guests: { include: { user: true } },
        organizers: true,
      },
    });
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const operatorId = req.user?.id;
    if (!operatorId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const isOrganizer = event.organizers.some(
      (org) => org.organizerId === operatorId
    );

    const isManagerOrHigher =
      req.user?.role === "MANAGER" ||  req.user?.role === "SUPERUSER"; 

    const isOrganizerOrManagerOrHigher = isManagerOrHigher || isOrganizer;
    if (!isOrganizerOrManagerOrHigher) {
      res.status(403).json({
        error: "Not authorized to award points for this event",
      });
      return;
    }

    if (utorid) {
      // Award to a specific guest.
      const targetUser = await prisma.user.findUnique({
        where: { utorid },
      });
      if (!targetUser) {
        res.status(404).json({ error: "Specified user not found" });
        return;
      }

      const isGuest = event.guests.some(
        (rsvp) => rsvp.userId === targetUser.id
      );
      if (!isGuest) {
        res.status(400).json({
          error: "The specified user is not a guest of this event",
        });
        return;
      }

      if (event.pointsRemain < amount) {
        res.status(400).json({
          error: "Not enough remaining points for this award",
        });
        return;
      }

      const [transactionResult] = await prisma.$transaction([
        prisma.transaction.create({
          data: {
            type: "EVENT",
            amount,
            user: { connect: { id: targetUser.id } },
            operator: { connect: { id: operatorId } },
            remarks: remark || "",
            relatedEvent: { connect: { id: event.id } } 
          },
        }),
        prisma.event.update({
          where: { id: event.id },
          data: {
            pointsRemain: event.pointsRemain - amount,
            pointsAwarded: event.pointsAwarded + amount,
          },
        }),
        prisma.user.update({
          where: { id: targetUser.id },
          data: { points: { increment: amount } },
        }),
      ]);

      const responseTransaction = {
        id: transactionResult.id,
        recipient: targetUser.utorid,
        awarded: amount,
        type: "event",
        relatedId: operatorId,
        remark: remark || "",
        createdBy: (req as any).user?.utorid || "",
      };

      res.status(201).json(responseTransaction);
      return;
    }

    // Award points to all guests if utorid not provided.
    if (event.guests.length === 0) {
      res.status(201).json({
        message: "No guests to award points to.",
        transactions: [],
      });
      return;
    }

    const totalRequired = amount * event.guests.length;
    if (event.pointsRemain < totalRequired) {
      res.status(400).json({
        error: "Not enough remaining points to award all guests",
      });
      return;
    }

    const transactionsToCreate = event.guests.map((rsvp) =>
      prisma.transaction.create({
        data: {
          type: "EVENT",
          amount,
          user: { connect: { id: rsvp.userId } },
          operator: { connect: { id: operatorId } },
          relatedEvent: { connect: { id: event.id } },
          remarks: remark || "",
        },
      })
    );

    const createdTransactions = await prisma.$transaction(transactionsToCreate);

    await prisma.event.update({
      where: { id: event.id },
      data: {
        pointsRemain: event.pointsRemain - totalRequired,
        pointsAwarded: event.pointsAwarded + totalRequired,
      },
    });

    const guestUpdates = event.guests.map((rsvp) =>
      prisma.user.update({
        where: { id: rsvp.userId },
        data: { points: { increment: amount } },
      })
    );
    await prisma.$transaction(guestUpdates);

    const responseTransactions = createdTransactions.map((tran) => {
      // Find the recipient's utorid from the event.guests (if available)
      const guestRecord = event.guests.find((g) => g.userId === tran.userId);
      return {
        id: tran.id,
        recipient:
          guestRecord && (guestRecord as any).user.utorid
            ? (guestRecord as any).user.utorid
            : "",
        awarded: amount,
        type: "event",
        relatedId: event.id,
        remark: remark || "",
        createdBy: (req as any).user?.utorid || "",
      };
    });

    res.status(201).json(responseTransactions);
  } catch (error) {
    console.error("awardPoints error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}


/**
 * GET /events/:eventId/transactions
 * Get transactions related to an event.
 * Clearance: Manager or higher or Organizer of the event
 */

export async function getEventTransactions(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const  eventId = req.params.eventId;
    const userId = req.user?.id;
    const event = await prisma.event.findUnique({
      where: { id: Number(eventId) },
      include: {
        organizers: true,
      },
    });

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    const isManagerOrHigher = req.user?.role === "MANAGER" || req.user?.role === "SUPERUSER";
    const isOrganizer = event?.organizers.some(
      (org) => org.organizerId === userId
    );
    if (!isManagerOrHigher && !isOrganizer) {
      res.status(403).json({ error: "Not authorized to view transactions" });
      return;
    }

    const transactions = await prisma.transaction.findMany({
      where: { relatedEventId: Number(eventId) },
      include: {
        operator: { select: { id: true, utorid: true, name: true } },
        user: { select: { id: true, utorid: true, name: true } },
      },
    });
    const formattedTransactions = transactions.map((transaction) => ({
      id: transaction.id,
      recipient: transaction.user?.utorid || "",
      awarded: transaction.amount || 0,
      type: transaction.type.toLowerCase(),
      relatedId: transaction.relatedEventId || null,
      remark: transaction.remarks || "",
      createdBy: transaction.operator?.utorid || ""
    }));
    
    res.status(200).json(formattedTransactions);
  } catch (error) {
    console.error("getEventTransactions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
