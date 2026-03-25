import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "./authMiddleware.js";
import { getJwtSecret } from "../lib/jwtSecret.js";
import { prisma } from "../lib/prisma.js";

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      res.status(401).json({ error: "No authorization header provided." });
      return;
    }

    // Expecting header value "Bearer <token>"
    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({ error: "No token provided." });
      return;
    }

    let payload: any;
    try {
      payload = jwt.verify(token, getJwtSecret());
    } catch {
      res.status(401).json({ error: "Invalid or expired token." });
      return;
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.id !== "number"
    ) {
      res.status(401).json({ error: "Invalid or expired token." });
      return;
    }

    // Refresh identity from the database so role changes (and deleted
    // accounts) take effect immediately instead of when the token expires.
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, utorid: true, role: true },
    });
    if (!currentUser) {
      res.status(401).json({ error: "Invalid or expired token." });
      return;
    }

    req.user = {
      ...payload,
      id: currentUser.id,
      utorid: currentUser.utorid,
      role: currentUser.role,
    };
    next();
  } catch (error) {
    console.error("authenticateToken error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}
