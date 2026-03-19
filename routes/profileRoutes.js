import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  selectProfile,
} from "../controllers/profileController.js";

const router = Router();

// All profile routes require account-level auth
router.use(protect);

router.get("/",                          getProfiles);    // GET    /api/profiles
router.post("/",                         createProfile);  // POST   /api/profiles
router.patch("/:profileId",              updateProfile);  // PATCH  /api/profiles/:profileId
router.delete("/:profileId",             deleteProfile);  // DELETE /api/profiles/:profileId
router.post("/:profileId/select",        selectProfile);  // POST   /api/profiles/:profileId/select

export default router;