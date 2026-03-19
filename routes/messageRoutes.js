import { Router } from "express";
import { getMessages, sendMessage } from "../controllers/messageController.js";
import { protectProfile } from "../middleware/authMiddleware.js";

const router = Router({ mergeParams: true });

// Messages are profile-scoped — use protectProfile, not protect
router.use(protectProfile);

router.get("/",  getMessages);
router.post("/", sendMessage);

export default router;