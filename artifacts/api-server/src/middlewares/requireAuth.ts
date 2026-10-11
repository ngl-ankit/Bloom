import { getAuth } from "@clerk/express";
import type { RequestHandler, Response } from "express";

export const requireAuth: RequestHandler = (req, res, next) => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  res.locals.userId = userId;
  next();
};

export function authenticatedUserId(res: Response): string {
  const userId: unknown = res.locals.userId;
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("Authenticated user id was not set");
  }
  return userId;
}
