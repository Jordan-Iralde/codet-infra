
import "express";

declare global {
  namespace Express {
    interface Request {
      context?: {
        userId?: number;
        appId?: number;
        email?: string;
        name?: string;
        role?: string;
        sessionId?: string;
      };
    }
  }
}

export {};
