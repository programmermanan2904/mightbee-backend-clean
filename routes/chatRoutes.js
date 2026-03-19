import express from "express";
import { protectProfile } from "../middleware/authMiddleware.js";
import {
  getChats,
  createChat,
  getChatById,
  deleteChat,
  renameChat,
} from "../controllers/chatController.js";
import {
  getOpeningMessage,
  getWeeklyInsight,
} from "../controllers/messageController.js";
import messageRouter from "./messageRoutes.js";

const router = express.Router();

router.use(protectProfile);

// ── Static routes FIRST — before /:id ────────────────────────
router.get("/opening",        getOpeningMessage);
router.get("/weekly-insight", getWeeklyInsight);

// ── Collection routes ─────────────────────────────────────────
router.get("/",    getChats);
router.post("/",   createChat);

// ── Dynamic :id routes LAST ───────────────────────────────────
router.get("/:id",    getChatById);
router.delete("/:id", deleteChat);
router.patch("/:id",  renameChat);

router.use("/:chatId/messages", messageRouter);

export default router;