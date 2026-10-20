import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../../core/db";
import { ENV } from "../../core/config/env";
import { createEmailVerification } from "../email-verification/email-verification.service";
import { mailerService } from "../mailer/mailer.service";

import { users, apps, userApps, userSettings } from "../../core/db/schema";
import { and, eq } from "drizzle-orm";
import { SessionService } from "../sessions/session.service";
import type { LoginDTO } from "./auth.types";

const sessionService = new SessionService();
import { getAppById, buildAppUrl, AppRoute } from "../../helpers/app-url.helper";
export const registerUser = async (
  name: string,
  email: string,
  password: string,
  appId: number
) => {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const app = await getAppById(appId);

  const hashed = await bcrypt.hash(password, 10);

  const result = await db
    .insert(users)
    .values({
      email,
      password: hashed,
      name,
      emailVerified: false,
    })
    .returning();

  const user = result[0];

  await db.insert(userSettings).values({
    userId: user.id,
  });

  await db.insert(userApps).values({
    userId: user.id,
    appId,
    role: "user",
  });

  const verification = await createEmailVerification(user.id);

  const verifyUrl = buildAppUrl(
    app,
    AppRoute.VERIFY_EMAIL,
    {
      token: verification.token,
    }
  );

  await mailerService.create({
    appId,
    to: user.email,
    subject: "Verify your email",
    body: `
      Click the following link to verify your account:<br><br>
      <a href="${verifyUrl}">${verifyUrl}</a>
    `,
  });

  return {
    id: user.id,
    email: user.email,
  };
};

export const loginUser = async (
  dto: LoginDTO
) => {

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, dto.email))
    .limit(1);

  const user = result[0];

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const valid = await bcrypt.compare(
    dto.password,
    user.password
  );

  if (!valid) {
    throw new Error("Invalid credentials");
  }

  // Email verification
  if (!user.emailVerified) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  // Ensure user has access to the app
  const access = await db
    .select()
    .from(userApps)
    .where(
      and(
        eq(userApps.userId, user.id),
        eq(userApps.appId, dto.appId)
      )
    )
    .limit(1);

  if (access.length === 0) {
    await db.insert(userApps).values({
      userId: user.id,
      appId: dto.appId,
      role: "user",
    });
  }

  // Create session
  const sessionData = await sessionService.createSession({
    userId: user.id,
    device: dto.device,
    ip: dto.ip,
    userAgent: dto.userAgent,
    expiresAt: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 30 // 30 days
    ),
  });

  // Generate JWT (incluyendo el sessionId para correlacionar con la BD)
  const token = jwt.sign(
    {
      userId: user.id,
      appId: dto.appId,
      email: user.email,
      name: user.name,
      sessionId: sessionData.sessionId,
    },
    ENV.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );

  return { 
    token, 
    refreshToken: sessionData.refreshToken, // Entregar para guardar en cookie segura en el controlador
    user: { id: user.id, email: user.email, name: user.name } 
  };
};