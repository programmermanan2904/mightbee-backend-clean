import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = Router();

// GET /api/user/me — get current account info
router.get("/me", protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

// PATCH /api/user/profile — update name, email, profession, tone, avatar, password
router.patch("/profile", protect, async (req, res) => {
  try {
    const { name, email, profession, preferredTone, avatar, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    if (name?.trim()) user.name = name.trim();

    if (email?.trim() && email.trim().toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.trim().toLowerCase() });
      if (existing) return res.status(409).json({ success: false, message: "Email already in use." });
      user.email = email.trim().toLowerCase();
    }

    if (profession)           user.profession    = profession;
    if (preferredTone)        user.preferredTone = preferredTone;
    if (avatar !== undefined) user.avatar        = avatar;

    if (newPassword) {
      if (!currentPassword)
        return res.status(400).json({ success: false, message: "Current password required." });
      if (!(await user.comparePassword(currentPassword)))
        return res.status(401).json({ success: false, message: "Current password incorrect." });
      if (newPassword.length < 6)
        return res.status(400).json({ success: false, message: "Password must be 6+ characters." });
      user.password = newPassword;
    }

    await user.save();
    user.password = undefined;
    res.json({ success: true, message: "Profile updated.", user });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ success: false, message: "Failed to update profile." });
  }
});

export default router;