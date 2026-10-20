import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";
import { db } from "../../core/db";
import { userSessions } from "../../core/db/schema";
import type {
  CreateSessionDTO,
  Session,
  SessionWithRefreshToken,
} from "./session.types";

type SessionRow = typeof userSessions.$inferSelect;

class SessionRepository {
  async create(data: CreateSessionDTO): Promise<{ sessionId: string }> {
    const [session] = await db
      .insert(userSessions)
      .values({
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        device: data.device,
        ip: data.ip,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
      })
      .returning({
        sessionId: userSessions.sessionId,
      });

    if (!session) {
      throw new Error("Failed to create session");
    }

    return session;
  }

  async findById(sessionId: string): Promise<Session | null> {
    const session = await db.query.userSessions.findFirst({
      where: eq(userSessions.sessionId, sessionId),
    });

    return session ? this.toSession(session) : null;
  }

  async findByRefreshTokenHash(
    hash: string,
  ): Promise<SessionWithRefreshToken | null> {
    const session = await db.query.userSessions.findFirst({
      where: eq(userSessions.refreshTokenHash, hash),
    });

    if (!session) {
      return null;
    }

    return {
      ...this.toSession(session),
      refreshTokenHash: session.refreshTokenHash,
    };
  }

  async findActiveByUserId(
    userId: number,
    now = new Date(),
  ): Promise<Session[]> {
    const sessions = await db.query.userSessions.findMany({
      where: and(
        eq(userSessions.userId, userId),
        isNull(userSessions.revokedAt),
        gt(userSessions.expiresAt, now),
      ),
      orderBy: [desc(userSessions.createdAt)],
    });

    return sessions.map((session) => this.toSession(session));
  }

  async rotateRefreshToken(
    sessionId: string,
    newHash: string,
    expiresAt: Date,
  ): Promise<boolean> {
    const result = await db
      .update(userSessions)
      .set({
        refreshTokenHash: newHash,
        lastSeenAt: new Date(),
        expiresAt,
      })
      .where(
        and(
          eq(userSessions.sessionId, sessionId),
          isNull(userSessions.revokedAt),
        ),
      )
      .returning({ sessionId: userSessions.sessionId });

    return result.length > 0;
  }

  async revoke(sessionId: string, userId: number): Promise<boolean> {
    const revoked = await db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(userSessions.sessionId, sessionId),
          eq(userSessions.userId, userId),
          isNull(userSessions.revokedAt),
        ),
      )
      .returning({ sessionId: userSessions.sessionId });

    return revoked.length > 0;
  }

  async revokeAll(userId: number): Promise<number> {
    const now = new Date();

    const revoked = await db
      .update(userSessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(userSessions.userId, userId),
          isNull(userSessions.revokedAt),
          gt(userSessions.expiresAt, now),
        ),
      )
      .returning({ sessionId: userSessions.sessionId });

    return revoked.length;
  }

  async deleteExpired(): Promise<number> {
    const deleted = await db
      .delete(userSessions)
      .where(lt(userSessions.expiresAt, new Date()))
      .returning({ sessionId: userSessions.sessionId });

    return deleted.length;
  }

  private toSession(session: SessionRow): Session {
    return {
      sessionId: session.sessionId,
      userId: session.userId,
      device: session.device,
      ip: session.ip,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
    };
  }
}

export default new SessionRepository();