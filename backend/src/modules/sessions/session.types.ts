export interface CreateSessionDTO {
  userId: number;
  refreshTokenHash: string;
  device: string | null;
  ip: string | null;
  userAgent: string | null;
  expiresAt: Date;
}

export interface Session {
  sessionId: string;
  userId: number;
  device: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface SessionWithRefreshToken extends Session {
  refreshTokenHash: string;
}