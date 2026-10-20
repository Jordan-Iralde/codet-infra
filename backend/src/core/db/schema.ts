import {
  bigint,
  index,
  integer,
  inet,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  boolean,
  jsonb,
  serial,

} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";
/* =========================
   USERS
========================= */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  name: text("name").notNull(),

  email: text("email").notNull().unique(),

  password: text("password").notNull(),

  emailVerified: boolean("email_verified").default(false).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const emailVerifications = pgTable("email_verifications", {
  id: serial("id").primaryKey(),

  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  tokenHash: text("token_hash").notNull().unique(),

  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

  verifiedAt: timestamp("verified_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
/* =========================
   APPS / TENANTS
========================= */

export const apps = pgTable("apps", {
  id: serial("id").primaryKey(),

  name: text("name").notNull(),

  slug: text("slug").notNull().unique(),

  frontendUrl: text("frontend_url").notNull(),

  apiUrl: text("api_url").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* =========================
   USER <-> APP RELATION
========================= */

export const userApps = pgTable("user_apps", {
  id: serial("id").primaryKey(),

  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  appId: integer("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),

  role: text("role").default("user"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* =========================
   USER SETTINGS
========================= */

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),

  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  theme: text("theme").default("light"),
  language: text("language").default("es"),

  twoFactorEnabled: boolean("two_factor_enabled").default(false),

  timezone: text("timezone").default("America/Argentina/Cordoba"),

  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  marketingEmails: boolean("marketing_emails").default(false),

  accessibility: jsonb("accessibility").default({}),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});



/* =========================
   USER SESSIONS
========================= */

export const userSessions = pgTable(
  "user_sessions",
  {
    id: bigint("id", { mode: "number" })
    .primaryKey().generatedAlwaysAsIdentity(),

    sessionId: uuid("session_id")
      .notNull()
      .defaultRandom()
      .unique(),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    refreshTokenHash: varchar("refresh_token_hash", {
      length: 64,
    })
      .notNull()
      .unique(),

    device: text("device"),

    ip: inet("ip"),

    userAgent: text("user_agent"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    lastSeenAt: timestamp("last_seen_at", {
      withTimezone: true,
    }),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),

    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
    }),
  },
  (table) => ({
    activeUserIdx: index("idx_user_sessions_active")
      .on(table.userId, table.createdAt)
      .where(sql`${table.revokedAt} IS NULL`),
  })
);



/* =========================
   API KEYS
========================= */

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),

  appId: integer("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),

  keyHash: text("key_hash").notNull().unique(),

  name: text("name").notNull(),

  active: boolean("active").default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* =========================
   EMAILS
========================= */

export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),

  appId: integer("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),

  to: text("to").notNull(),

  subject: text("subject").notNull(),

  body: text("body").notNull(),

  status: text("status").default("pending"),

  error: text("error"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* =========================
   INVITATIONS
========================= */

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, {
        onDelete: "cascade",
      }),

    invitedBy: integer("invited_by")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    email: text("email").notNull(),

    resourceType: text("resource_type").notNull(),

    resourceId: text("resource_id").notNull(),

    resourceAction: text("resource_action")
      .notNull()
      .default("join"),

    role: text("role").notNull(),

    tokenHash: text("token_hash")
      .notNull()
      .unique(),

    status: text("status")
      .notNull()
      .default("pending"),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),

    acceptedAt: timestamp("accepted_at", {
      withTimezone: true,
    }),

    acceptedBy: integer("accepted_by")
      .references(() => users.id, {
        onDelete: "set null",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => ({
    appResourceIdx: index(
      "idx_invitations_app_resource"
    ).on(
      table.appId,
      table.resourceType,
      table.resourceId
    ),

    emailStatusIdx: index(
      "idx_invitations_email_status"
    ).on(
      table.email,
      table.status
    ),

    tokenHashIdx: index(
      "idx_invitations_token_hash"
    ).on(table.tokenHash),
  })
);