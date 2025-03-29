import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "./authMiddleware.js";

// You might store your secret in an environment variable
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "1d1fa6874e3855ff363b620b5e44ec5774976308423484dfe85dc92c0bf0b078";

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
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

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Send a 401 error when token verification fails
      res.status(401).json({ error: "Invalid or expired token." });
      return;
    }
    // Ensure user has a role property so that we can later check clearance
    if (typeof user === "object" && user !== null && "role" in user) {
      req.user = user as { [key: string]: any; role: string };
      next();
    } else {
      res.status(401).json({ error: "Invalid or expired token." });
    }
  });
}
