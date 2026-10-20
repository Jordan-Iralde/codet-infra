import crypto from "crypto";
import sessionRepository from "./session.repository";
import type { Session } from "./session.types";

export class SessionService {
  async createSession(data: {
    userId: number;
    device: string | null;
    ip: string | null;
    userAgent: string | null;
    expiresAt: Date;
  }): Promise<{ sessionId: string; refreshToken: string }> {
    const refreshToken = crypto.randomBytes(32).toString("hex");
    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const created = await sessionRepository.create({
      userId: data.userId,
      refreshTokenHash,
      device: data.device,
      ip: data.ip,
      userAgent: data.userAgent,
      expiresAt: data.expiresAt,
    });

    return {
      sessionId: created.sessionId,
      refreshToken,
    };
  }

  async validateRefreshToken(refreshToken: string): Promise<Session | null> {
    const hash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const sessionWithHash = await sessionRepository.findByRefreshTokenHash(hash);

    if (!sessionWithHash || sessionWithHash.revokedAt || sessionWithHash.expiresAt < new Date()) {
      return null;
    }

    const { refreshTokenHash, ...session } = sessionWithHash;
    return session;
  }

  // Método requerido por auth.middleware.ts
  async validateSession(sessionId: string): Promise<Session | null> {
    const session = await sessionRepository.findById(sessionId);
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return null;
    }
    return session;
  }

  // Alias requerido por account.service.ts
  async getUserSessions(userId: number): Promise<Session[]> {
    return await this.getActiveSessions(userId);
  }

  // Alias requerido por account.service.ts
  async getSession(sessionId: string): Promise<Session | null> {
    return await sessionRepository.findById(sessionId);
  }

  async refreshSession(incomingRefreshToken: string): Promise<{ sessionId: string; userId: number; refreshToken: string }> {
    const session = await this.validateRefreshToken(incomingRefreshToken);
    if (!session) {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    const newRefreshToken = crypto.randomBytes(32).toString("hex");
    const newHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
    const newExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 días

    const rotated = await sessionRepository.rotateRefreshToken(
      session.sessionId,
      newHash,
      newExpiresAt
    );

    if (!rotated) {
      throw new Error("SESSION_ROTATION_FAILED");
    }

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      refreshToken: newRefreshToken,
    };
  }

  // Soporta llamada con 1 o 2 argumentos para compatibilidad con account.service.ts
  async revokeSession(sessionId: string, userId?: number): Promise<boolean> {
    if (userId !== undefined) {
      return await sessionRepository.revoke(sessionId, userId);
    }
    const session = await sessionRepository.findById(sessionId);
    if (!session) return false;
    return await sessionRepository.revoke(sessionId, session.userId);
  }

  async revokeAllUserSessions(userId: number): Promise<number> {
    return await sessionRepository.revokeAll(userId);
  }

  // Alias requerido por account.service.ts
  async revokeAllSessions(userId: number): Promise<number> {
    return await this.revokeAllUserSessions(userId);
  }

  async getActiveSessions(userId: number): Promise<Session[]> {
    return await sessionRepository.findActiveByUserId(userId);
  }

  
}

export default new SessionService();