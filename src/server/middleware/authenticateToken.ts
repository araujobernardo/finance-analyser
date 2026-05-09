import jwt, { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

export type AuthLocals = { user: { userId: string } };

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
    };
    (res.locals as AuthLocals).user = { userId: payload.sub };
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      res
        .status(401)
        .json({ error: "Token has expired", code: "TOKEN_EXPIRED" });
    } else if (err instanceof JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token", code: "TOKEN_INVALID" });
    } else {
      res.status(401).json({ error: "Invalid token", code: "TOKEN_INVALID" });
    }
  }
}
