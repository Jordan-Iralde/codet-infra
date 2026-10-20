import { Router } from "express";
import sessionController from "./session.controller";
import { authMiddleware } from "../../core/middlewares/auth.middleware";

const router = Router();

router.post("/refresh", sessionController.refresh);

// Rutas protegidas

router.get("/", authMiddleware, sessionController.listActive);
router.delete("/:sessionId", authMiddleware, sessionController.revoke);
router.delete("/", authMiddleware, sessionController.revokeAll);

export default router;