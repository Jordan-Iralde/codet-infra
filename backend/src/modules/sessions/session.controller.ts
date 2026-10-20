import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import sessionService from "./session.service";
import { ENV } from "../../core/config/env";

export class SessionController {
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ error: "REFRESH_TOKEN_MISSING" });
        return;
      }

      const result = await sessionService.refreshSession(refreshToken);

      const token = jwt.sign(
        {
          userId: result.userId,
          sessionId: result.sessionId,
        },
        ENV.JWT_SECRET,
        { expiresIn: "1h" },
      );

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });

      res.json({ token });
    } catch (error: any) {
      res.status(401).json({ error: error.message || "INVALID_SESSION" });
    }
  }

  async listActive(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.context?.userId;
      const currentSessionId = req.context?.sessionId;

      if (userId == null) {
        res.status(401).json({ error: "UNAUTHORIZED" });
        return;
      }

      const sessions = await sessionService.getActiveSessions(userId);

      const sessionsWithCurrentFlag = sessions.map((session) => ({
        ...session,
        isCurrent: session.sessionId === currentSessionId,
      }));

      res.json(sessionsWithCurrentFlag);
    } catch (error) {
      res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
    }
  }

  async revoke(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.context?.userId;
    const rawSessionId = req.params.sessionId;
    const sessionId = Array.isArray(rawSessionId)
      ? rawSessionId[0]
      : rawSessionId;

    if (userId == null || !sessionId) {
      res.status(400).json({ error: "BAD_REQUEST" });
      return;
    }

    const success = await sessionService.revokeSession(
      sessionId,
      userId
    );

    if (!success) {
      res.status(404).json({ error: "SESSION_NOT_FOUND" });
      return;
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

  async revokeAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: "UNAUTHORIZED" });
        return;
      }

      const count = await sessionService.revokeAllUserSessions(userId);
      res.json({ revokedCount: count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new SessionController();
