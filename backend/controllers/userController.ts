import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";

const prisma = new PrismaClient();

/**
 * POST /users
 * Create a new user
 * Accessible by: cashier, manager, superuser
 */
export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, utorid } = req.body;

    // Check if a user with this email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(409).json({ error: "A user with this email already exists." });
      return;
    }

    // Check if a user with this utorid already exists
    const existingUtorid = await prisma.user.findUnique({ where: { utorid } });
    if (existingUtorid) {
      res.status(409).json({ error: "A user with this utorid already exists." });
      return;
    }

    // Generate a random activation token and its expiration (1 hour from now)
    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

    // Create user with default role of 'REGULAR'
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        utorid,
        role: "REGULAR", // default to regular user
        activated: false, // not activated until user verifies
        verified: false,  // manager can verify student status later
      },
    });

    // Create activation token for the new user
    await prisma.resetToken.create({
      data: {
        user: { connect: { id: newUser.id } },
        token: resetToken,
        expiresAt: expiresAt,
      },
    });

    res.status(201).json({
      id: newUser.id,
      utorid: newUser.utorid,
      name: newUser.name,
      email: newUser.email,
      verified: newUser.verified,
      resetToken: resetToken,
      expiresAt: expiresAt,
      message: "User created successfully. Activation token included in response.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * GET /users
 * Retrieve list of users with optional filters
 * Accessible by: manager, superuser
 */
export async function getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Destructure and convert query values as needed
    const { name, role, verified, activated, page = "1", limit = "10" } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    // Build 'where' conditions
    const whereClause: any = {};
    if (name) {
      whereClause.name = { contains: name as string };
    }
    if (role) {
      whereClause.role = (role as string).toUpperCase();
    }
    if (verified !== undefined) {
      // Assuming verified is already boolean (due to prior preprocessing)
      whereClause.verified = verified;
    }
    if (activated !== undefined) {
      whereClause.activated = activated;
    }

    const requestingUser =  req.user;

    if (requestingUser?.role === undefined){
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Count total matching users
    const count = await prisma.user.count({ where: whereClause });
    let users;
    
    // Retrieve paginated results
    if (requestingUser.role === "CASHIER") {
      users = await prisma.user.findMany({
        where: whereClause,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          utorid: true,
          avatarUrl: true,
          verified: true,
        },
      });
    } else {
      users = await prisma.user.findMany({
        where: whereClause,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          utorid: true,
          birthday: true,
          points: true,
          avatarUrl: true,
          activated: true,
          createdAt: true,
          verified: true,
          lastLogin: true,
        },
      });
    }
    

    res.status(200).json({
      count,
      results: users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * GET /users/:userId
 * Retrieve a specific user
 * Accessible by: cashier or higher
 * - Cashier sees limited fields
 * - Manager+ sees full fields
 */
export async function getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.userId, 10);
    const requestingUser = req.user; // Provided by authenticateToken

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const currentDate = new Date();

    const automaticPromotions = await prisma.promotion.findMany({
      where: {
        type: "automatic",
        startTime: { lte: currentDate },
        endTime: { gte: currentDate },
      },
      select: { id: true, name: true, points: true, minSpending: true },
    });

    // Retrieve one-time promotions currently active
    const oneTimePromotions = await prisma.promotion.findMany({
      where: {
        type: "one-time",
        startTime: { lte: currentDate },
        endTime: { gte: currentDate },
      },
      select: { id: true, name: true, points: true, minSpending: true },
    });

    const usedOneTimePromotions = await prisma.userPromotion.findMany({
      where: { userId: userId },
      select: { promotionId: true },
    });

    const availableOneTimePromotions = oneTimePromotions.filter(
      (promotion) =>
        !usedOneTimePromotions.some((used) => used.promotionId === promotion.id)
    );

    const allPromotions = automaticPromotions.concat(availableOneTimePromotions);

    // Return data based on requesting user role
    if (requestingUser && ["CASHIER", "MANAGER", "SUPERUSER"].includes(requestingUser.role)) {
      if (requestingUser.role === "CASHIER") {
        // For cashiers return limited data
        res.status(200).json({
          id: user.id,
          utorid: user.utorid,
          name: user.name,
          verified: user.verified,
          points: user.points,
          promotions: allPromotions,
        });
      } else {
        // Manager or Superuser return full user object with promotions
        res.status(200).json({ ...user, promotions: allPromotions });
      }
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * PATCH /users/:userId
 * Update a user’s info
 * Accessible by: manager or higher
 */
export async function updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const requestingUser = req.user;
    const userId = parseInt(req.params.userId, 10);
    const { email, name, role, suspicious, verified } = req.body;

    // Fetch the existing user from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const updateData: { [key: string]: any } = {};
    if (email !== undefined && email !== null) {
      updateData.email = email;
    }
    if (name !== undefined && name !== null) {
      updateData.name = name;
    }
    if (verified !== undefined && verified !== null) {
      // Only allow verified to be set to true
      if (verified !== true) {
        res.status(400).json({ error: "Invalid verified value." });
        return;
      }
      updateData.verified = verified;
    }
    if (suspicious !== undefined && suspicious !== null) {
      updateData.suspicious = suspicious;
    }

    if (role !== undefined && role !== null) {
      const upperCaseRole = (role as string).toUpperCase();
      // A manager cannot promote a user to Manager or Superuser
      if (
        requestingUser &&
        requestingUser.role === "MANAGER" &&
        (upperCaseRole === "MANAGER" || upperCaseRole === "SUPERUSER")
      ) {
        res.status(403).json({
          error: "Forbidden. Managers cannot promote users to Manager or Superuser.",
        });
        return;
      }
      updateData.role = upperCaseRole;
      // When promoting a user to CASHIER, ensure suspicious is set to false.
      if (upperCaseRole === "CASHIER") {
        updateData.suspicious = false;
      }
    }

    // Update the user in the database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Build the response object including only the updated fields
    const responseObj: { [key: string]: any } = {
      id: updatedUser.id,
      utorid: updatedUser.utorid,
      name: updatedUser.name,
    };
    if ("email" in updateData) {
      responseObj.email = updatedUser.email;
    }
    if ("role" in updateData) {
      responseObj.role = updatedUser.role;
    }
    if ("verified" in updateData) {
      responseObj.verified = updatedUser.verified;
    }
    if ("suspicious" in updateData) {
      responseObj.suspicious = updatedUser.suspicious;
    }
    res.status(200).json(responseObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * GET /users/me
 * Retrieve the current logged-in user’s info
 * Accessible by: any authenticated user
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    // req.user is populated by authentication middleware
    const currentUserId = (req as any).user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        utorid: true,
        email: true,
        name: true,
        birthday: true,
        avatarUrl: true,
        avatar: true,
        role: true,
        lastLogin: true,
        verified: true,
        points: true,
        createdAt: true,
      },
    });
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const currentDate = new Date();

    const automaticPromotions = await prisma.promotion.findMany({
      where: {
        type: "automatic",
        startTime: { lte: currentDate },
        endTime: { gte: currentDate },
      },
      select: { id: true, name: true, points: true, minSpending: true },
    });

    const oneTimePromotions = await prisma.promotion.findMany({
      where: {
        type: "one-time",
        startTime: { lte: currentDate },
        endTime: { gte: currentDate },
      },
      select: { id: true, name: true, points: true, minSpending: true },
    });

    const usedOneTimePromotions = await prisma.userPromotion.findMany({
      where: { userId: currentUserId },
      select: { promotionId: true },
    });

    const availableOneTimePromotions = oneTimePromotions.filter(
      (promotion) =>
        !usedOneTimePromotions.some((used) => used.promotionId === promotion.id)
    );

    const allPromotions = automaticPromotions.concat(availableOneTimePromotions);

    // Append promotions to the user object
    const userWithPromotions = { ...user, promotions: allPromotions };

    res.status(200).json(userWithPromotions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * PATCH /users/me
 * Update the current logged-in user's info (e.g., name, email)
 */
export async function updateCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = (req as any).user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const { name, email, birthday, avatar } = req.body;
    const updateData: { [key: string]: any } = {};
    if (name !== undefined && name !== null) {
      updateData.name = name;
    }
    if (email !== undefined && email !== null) {
      updateData.email = email;
    }
    if (birthday !== undefined && birthday !== null) {
      // Accept either Date or string, converting string to Date
      updateData.birthday = birthday instanceof Date ? birthday : new Date(birthday);
      if (updateData.birthday> new Date()) {
        res.status(400).json("birthday cannot be set in the future");
        return;
      }
    }
    // For file upload, assume req.file is populated via multer.
    if (req.file) {
      try {
        const extension = path.extname(req.file.originalname);
        // const newFilename = `${currentUserId}${extension}`;
        // const newPath = path.join(`../frontend/public/${req.file.destination}`, newFilename);
        // fs.renameSync(req.file.path, newPath);
        updateData.avatarUrl = `/uploads/avatars/${currentUserId}${extension}`;
        updateData.avatar = req.file.buffer.toString('base64');
        console.log(updateData.avatar)
      } catch (error) {
        console.error("Error renaming avatar file:", error);
      }
    } else if (avatar) {
      updateData.avatarUrl = `/uploads/avatars/${currentUserId}`;
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: updateData,
      select: {
        id: true,
        utorid: true,
        name: true,
        email: true,
        birthday: true,
        role: true,
        points: true,
        createdAt: true,
        lastLogin: true,
        verified: true,
        avatarUrl: true,
        avatar:true,
      },
    });

    // Format birthday as YYYY-MM-DD if available
    const formattedBirthday = updatedUser.birthday
      ? updatedUser.birthday.toISOString().split("T")[0]
      : null;
    const responseUser = {
      ...updatedUser,
      birthday: formattedBirthday,
    };

    res.status(200).json(responseUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * PATCH /users/me/password
 * Update the current logged-in user's password
 */
export async function updateCurrentUserPassword(req: Request, res: Response): Promise<void> {
  try {
    const currentUserId = (req as any).user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const { old, new: newPassword } = req.body;

    // Find user by ID
    const user = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    // Compare old password using bcrypt; ensure that user.password is not null
    if (!user.password) {
      res.status(500).json({ error: "User password is missing." });
      return;
    }
    const isMatch = await bcrypt.compare(old, user.password);
    if (!isMatch) {
      res.status(403).json({ error: "Old password is incorrect." });
      return;
    }
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    // Update password in the database
    await prisma.user.update({
      where: { id: currentUserId },
      data: { password: hashedNewPassword },
    });
    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
}


/**
 * GET /my-organized-events
 * Retrieve a list of events organized by the current user.
 * Supports filtering by start/end time and whether the event is full.
 */
export async function getMyOrganizedEvents(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const currentUserId = (req as any).user?.id;
    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const {
      past = "false",
      page = "1",
      limit = "10",
      started,
      ended,
      showFull,
    } = req.query as { [key: string]: string | undefined };

    const pageNum = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * pageSize;

    // Build base where clause for events that the current user is organizing.
    const where: any = {
      organizers: {
        some: {
          organizerId: currentUserId,
        },
      },
    };

    // Disallow specifying both started and ended simultaneously.
    if (started !== undefined && ended !== undefined) {
      res.status(400).json({
        error: 'Cannot specify both "started" and "ended" simultaneously.',
      });
      return;
    }

    // Filter by startTime if provided.
    if (started !== undefined) {
      where.startTime =
        started === "true" ? { lte: new Date() } : { gt: new Date() };
    }

    // Filter by endTime if provided.
    if (ended !== undefined) {
      where.endTime =
        ended === "true" ? { lte: new Date() } : { gt: new Date() };
    }

    // If the past filter is false (or not "true") and no ended filter is provided,
    // restrict to upcoming events.
    if (ended === undefined && past !== "true") {
      where.endTime = { gt: new Date() };
    }

    // Execute both the count and the paginated query.
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
          startTime: true,
          endTime: true,
          location: true,
          capacity: true,
          published: true,
          _count: { select: { guests: true } },
          organizers: {
            select: {
              organizerId: true,
            },
          },
        },
      }),
    ]);

    // If showFull parameter is provided, filter accordingly in-memory.
    // (Remember that filtering in-memory may cause count changes on a per-page basis.)
    if (showFull !== undefined) {
      // Convince typescript that this is a boolean 
      const showFullBool = Boolean(showFull);
      if (showFullBool === true) {
        const fullEvents = events.filter(
          (event) =>
            event.capacity !== null &&
            event._count.guests === event.capacity
        );
        const results = fullEvents.map((event) => ({
          id: event.id,
          name: event.name,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          capacity: event.capacity,
          published: event.published,
          numGuests: event._count.guests,
          isOrganizer: event.organizers.some(
            (org) => org.organizerId === currentUserId
          ),
          isGuest: !event.organizers.some(
            (org) => org.organizerId === currentUserId
          ),
        }));
        res.status(200).json({
          count: fullEvents.length,
          results,
        });
        return;
      } else if (showFullBool === false) {
        const nonFullEvents = events.filter(
          (event) =>
            event.capacity === null || event._count.guests < event.capacity
        );
        const results = nonFullEvents.map((event) => ({
          id: event.id,
          name: event.name,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          capacity: event.capacity,
          published: event.published,
          numGuests: event._count.guests,
          isOrganizer: event.organizers.some(
            (org) => org.organizerId === currentUserId
          ),
          isGuest: !event.organizers.some(
            (org) => org.organizerId === currentUserId
          ),
        }));
        res.status(200).json({
          count: nonFullEvents.length,
          results,
        });
        return;
      }
    }

    // Default case: return the paginated results without extra post-filtering.
    const results = events.map((event) => ({
      id: event.id,
      name: event.name,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      capacity: event.capacity,
      published: event.published,
      numGuests: event._count.guests,
      isOrganizer: event.organizers.some(
        (org) => org.organizerId === currentUserId
      ),
      isGuest: !event.organizers.some(
        (org) => org.organizerId === currentUserId
      ),
    }));

    res.status(200).json({
      count: totalCount,
      results,
    });
  } catch (error) {
    console.error("getMyOrganizedEvents error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

export async function getMyGuestEvents(req :Request, res: Response): Promise<void> {
  try {
    const currentUserId = (req as any).user?.id;
    const {past = false, page = "1", limit = "10" } = req.query; // include past events or not (users probably would not want to filter out their currently organized events)
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    if (!currentUserId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    const events = await prisma.rsvp.findMany({
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      where: {
        userId: currentUserId,
      },
      select: {
        eventId: true,
      }
    });
    res.status(200).json({results: events})
  } catch(error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." }); 
  }
}