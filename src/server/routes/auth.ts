import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { users } from "../../db/schema.ts";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRawToken,
  hashToken,
  verificationExpiresAt,
  resetExpiresAt,
} from "../services/authService.ts";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/emailService.ts";

const router = Router();

// POST /api/auth/register
router.post(
  "/api/auth/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, displayName } = req.body as {
        email?: string;
        password?: string;
        displayName?: string;
      };

      if (!email || !password || !displayName) {
        res
          .status(400)
          .json({ error: "email, password, and displayName are required" });
        return;
      }
      if (password.length < 8) {
        res
          .status(400)
          .json({ error: "password must be at least 8 characters" });
        return;
      }

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        res
          .status(409)
          .json({ error: "An account with that email already exists" });
        return;
      }

      const hashedPassword = await hashPassword(password);
      const rawToken = generateRawToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = verificationExpiresAt();

      await db.insert(users).values({
        email: email.toLowerCase(),
        hashedPassword,
        displayName,
        emailVerified: false,
        verificationToken: tokenHash,
        verificationTokenExpiresAt: expiresAt,
      });

      await sendVerificationEmail(email.toLowerCase(), rawToken);

      res.status(201).json({
        message: "Account created. Check your email to verify your address.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/login
router.post(
  "/api/auth/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as {
        email?: string;
        password?: string;
      };

      if (!email || !password) {
        res.status(400).json({ error: "email and password are required" });
        return;
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      const credentialsError = { error: "Invalid email or password" };

      if (!user) {
        res.status(401).json(credentialsError);
        return;
      }

      const valid = await verifyPassword(password, user.hashedPassword);
      if (!valid) {
        res.status(401).json(credentialsError);
        return;
      }

      if (!user.emailVerified) {
        res.status(403).json({
          error: "Please verify your email address before signing in.",
        });
        return;
      }

      const token = generateAccessToken(user.id);
      res.json({
        token,
        user: { id: user.id, email: user.email, displayName: user.displayName },
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/verify-email
router.post(
  "/api/auth/verify-email",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body as { token?: string };
      if (!token) {
        res.status(400).json({ error: "token is required" });
        return;
      }

      const tokenHash = hashToken(token);
      const now = new Date();

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.verificationToken, tokenHash))
        .limit(1);

      if (
        !user ||
        !user.verificationTokenExpiresAt ||
        user.verificationTokenExpiresAt < now
      ) {
        res
          .status(400)
          .json({ error: "Invalid or expired verification link." });
        return;
      }

      await db
        .update(users)
        .set({
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiresAt: null,
        })
        .where(eq(users.id, user.id));

      res.json({ message: "Email verified. You can now sign in." });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/resend-verification
router.post(
  "/api/auth/resend-verification",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as { email?: string };
      if (!email) {
        res.status(400).json({ error: "email is required" });
        return;
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      // Always return 200 to avoid exposing whether the email exists
      if (!user || user.emailVerified) {
        res.json({
          message:
            "If that email is registered and unverified, a new link has been sent.",
        });
        return;
      }

      const rawToken = generateRawToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = verificationExpiresAt();

      await db
        .update(users)
        .set({
          verificationToken: tokenHash,
          verificationTokenExpiresAt: expiresAt,
        })
        .where(eq(users.id, user.id));

      await sendVerificationEmail(email.toLowerCase(), rawToken);

      res.json({
        message:
          "If that email is registered and unverified, a new link has been sent.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/forgot-password
router.post(
  "/api/auth/forgot-password",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as { email?: string };
      if (!email) {
        res.status(400).json({ error: "email is required" });
        return;
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      // Always 200 — never reveal whether email exists
      if (user) {
        const rawToken = generateRawToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = resetExpiresAt();

        await db
          .update(users)
          .set({ resetToken: tokenHash, resetTokenExpiresAt: expiresAt })
          .where(eq(users.id, user.id));

        await sendPasswordResetEmail(email.toLowerCase(), rawToken);
      }

      res.json({
        message:
          "If that email is registered, a password reset link has been sent.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/reset-password
router.post(
  "/api/auth/reset-password",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body as {
        token?: string;
        password?: string;
      };

      if (!token || !password) {
        res.status(400).json({ error: "token and password are required" });
        return;
      }
      if (password.length < 8) {
        res
          .status(400)
          .json({ error: "password must be at least 8 characters" });
        return;
      }

      const tokenHash = hashToken(token);
      const now = new Date();

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.resetToken, tokenHash))
        .limit(1);

      if (
        !user ||
        !user.resetTokenExpiresAt ||
        user.resetTokenExpiresAt < now
      ) {
        res.status(400).json({ error: "Invalid or expired reset link." });
        return;
      }

      const hashedPassword = await hashPassword(password);

      await db
        .update(users)
        .set({
          hashedPassword,
          resetToken: null,
          resetTokenExpiresAt: null,
        })
        .where(eq(users.id, user.id));

      res.json({
        message: "Password reset successfully. You can now sign in.",
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
