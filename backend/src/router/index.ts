import { Router, RequestHandler } from "express";
import authRoutes from "../modules/auth/auth.routes";
import accountRoutes from "../modules/account/account.routes";
import { resolveApp } from "../core/middlewares/resolve-app";
import { sendMailController } from "../modules/mailer/sendMail.controller";
import contactRoutes from "../modules/contact/contact.routes";
import invitationRoutes from "../modules/invitations/invitation.routes";
import SessionRoutes from "../modules/sessions/session.routes";

const router = Router();

router.use("/contact", contactRoutes);

router.use("/auth", authRoutes);

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/account", accountRoutes);

router.use("/sessions", SessionRoutes);

router.use("/invitations", invitationRoutes);

router.post(
  "/send",
  resolveApp as RequestHandler,
  sendMailController as RequestHandler
);

export default router;