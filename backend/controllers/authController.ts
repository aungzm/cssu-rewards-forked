import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

/**
 * Simple in-memory map for tracking requests by IP to throttle repeated reset requests.
 * Key: IP address, Value: last request timestamp in ms
 */
const lastResetRequestMap = new Map<string, number>();
const RESET_REQUEST_COOLDOWN = 60 * 1000; // 60 seconds

export async function generateJWTToken(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { utorid, password } = req.body as {
      utorid: string;
      password: string;
    };

    // Find user by utorid
    const user = await prisma.user.findUnique({
      where: { utorid },
    });

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    if (user.password === null) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    // Generate JWT token using environment variable if available
    const secret =
      process.env.JWT_SECRET ||
      "1d1fa6874e3855ff363b620b5e44ec5774976308423484dfe85dc92c0bf0b078";
    const token = jwt.sign(
      {
        id: user.id,
        utorid: user.utorid,
        role: user.role,
      },
      secret,
      { expiresIn: "1h" }
    );

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiration in ISO format

    // Activate user if not already activated
    if (user.activated === false) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          activated: true,
          lastLogin: new Date(),
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
        },
      });
    }

    res.status(200).json({ token, expiresAt });
  } catch (error) {
    console.error("Error in generateJWTToken:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

export async function requestPasswordReset(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Rate limiting check first
    const userIp =
      (req.ip as string) ||
      (req.headers["x-forwarded-for"] as string) ||
      (req.connection && req.connection.remoteAddress) ||
      "";
    const lastRequestTime = lastResetRequestMap.get(userIp);
    const now = Date.now();

    if (lastRequestTime && now - lastRequestTime < RESET_REQUEST_COOLDOWN) {
      res.status(429).json({
        error:
          "Too many requests. Please wait before requesting another reset.",
      });
      return;
    }

    // Extract utorid from request body
    const { utorid } = req.body as { utorid: string };
    if (!utorid) {
      res.status(400).json({ error: "UTORid is required." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { utorid },
    });

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    // Update the map with current time
    lastResetRequestMap.set(userIp, now);

    // Generate a reset token with 1 hour expiry
    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

    // Upsert the reset token (create if doesn't exist, update if it does)
    await prisma.resetToken.upsert({
      where: { userId: user.id },
      update: {
        token: resetToken,
        expiresAt,
      },
      create: {
        token: resetToken,
        expiresAt,
        user: { connect: { id: user.id } },
      },
    });

    res.status(202).json({
      message:
        "Use the provided token to reset your password within 15 minutes.",
      resetToken,
      expiresAt,
    });
  } catch (error) {
    console.error("Error in requestPasswordReset:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

export async function finalizePasswordReset(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { resetToken } = req.params as { resetToken: string };
    const { utorid, password } = req.body as {
      utorid: string;
      password: string;
    };

    if (!resetToken || !utorid || !password) {
      res.status(400).json({
        error: "Reset token, UTORid, and password are required.",
      });
      return;
    }

    // Find the token record
    const tokenRecord = await prisma.resetToken.findFirst({
      where: { token: resetToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      res.status(404).json({ error: "Invalid reset token." });
      return;
    }

    // Check if token belongs to the user
    if (tokenRecord.user.utorid !== utorid) {
      res.status(401).json({ error: "Token does not match the user." });
      return;
    }

    // Check if the token has expired
    const expiryDate = new Date(tokenRecord.expiresAt);
    const currentDate = new Date();
    if (expiryDate < currentDate) {
      res.status(410).json({ error: "Expired reset token." });
      return;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password
    await prisma.user.update({
      where: { id: tokenRecord.user.id },
      data: { password: hashedPassword },
    });

    // Delete the reset token after successful reset
    await prisma.resetToken.delete({
      where: { id: tokenRecord.id },
    });

    res.status(200).json({
      message:
        "Password reset successful. You may now log in with your new password.",
    });
  } catch (error) {
    console.error("Error in finalizePasswordReset:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}
