import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    role: string;
    // Add other properties from your decoded token as needed
    [key: string]: any;
  };
  // Use Express.Multer.File for file uploads
  file?: Express.Multer.File;
}

export function requireCashierOrHigher(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Check that req.user is set—if not, the user is not authenticated
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { role } = req.user;
  if (["CASHIER", "MANAGER", "SUPERUSER"].includes(role)) {
    next();
    return;
  }
  res.status(403).json({ error: "Forbidden. Requires cashier or higher." });
}

/**
 * Same clearance check as requireCashierOrHigher, but with the message used by
 * the listing endpoints. Kept separate because clients rely on both wordings.
 */
export function requireCashierOrHigherClearance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { role } = req.user;
  if (["CASHIER", "MANAGER", "SUPERUSER"].includes(role)) {
    next();
    return;
  }
  res.status(403).json({ error: "Insufficient clearance" });
}

export function requireManagerOrHigher(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Check that req.user is set—if not, the user is not authenticated
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { role } = req.user;
  if (role !== "MANAGER" && role !== "SUPERUSER") {
    res.status(403).json({ error: "Insufficient clearance" });
    return;
  }
  next();
}
