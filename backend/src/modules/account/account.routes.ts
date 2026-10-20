// src/modules/account/account.routes.ts

import { Router } from "express";
import * as controller from "./account.controller";
import { authMiddleware } from "../../core/middlewares/auth.middleware";

const router = Router();

router.get("/me", authMiddleware, controller.getMeController);
router.patch("/profile", authMiddleware, controller.updateProfile);
router.patch("/password", authMiddleware, controller.changePasswordController);

export default router;