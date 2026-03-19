import jwt from "jsonwebtoken";
import Profile from "../models/profile.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

const MAX_PROFILES = 6;

const signProfileToken = (profileId) =>
  jwt.sign(
    { type: "profile", profileId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.PROFILE_TOKEN_EXPIRES_IN || "7d" }
  );

// ── GET /api/profiles ────────────────────────────────────────────────────────
// Returns all profiles for the logged-in account
export const getProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find({ account: req.user._id })
      .select("_id name avatar profession preferredTone createdAt")
      .lean();
    res.json({ success: true, profiles });
  } catch (err) {
    console.error("getProfiles error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch profiles." });
  }
};

// ── POST /api/profiles ───────────────────────────────────────────────────────
// Creates a new profile under the logged-in account (max 6)
export const createProfile = async (req, res) => {
  try {
    const count = await Profile.countDocuments({ account: req.user._id });
    if (count >= MAX_PROFILES)
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_PROFILES} profiles allowed per account.`,
      });

    const { name, avatar, profession, preferredTone } = req.body;
    if (!name?.trim())
      return res.status(400).json({ success: false, message: "Profile name is required." });

    const profile = await Profile.create({
      account: req.user._id,
      name: name.trim(),
      avatar: avatar || "🐝",
      profession: profession || "other",
      preferredTone: preferredTone || "concise",
    });

    res.status(201).json({ success: true, profile });
  } catch (err) {
    console.error("createProfile error:", err);
    res.status(500).json({ success: false, message: "Failed to create profile." });
  }
};

// ── PATCH /api/profiles/:profileId ──────────────────────────────────────────
// Updates name, avatar, profession, or preferredTone
export const updateProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({
      _id: req.params.profileId,
      account: req.user._id,
    });
    if (!profile)
      return res.status(404).json({ success: false, message: "Profile not found." });

    const { name, avatar, profession, preferredTone } = req.body;
    if (name?.trim())    profile.name          = name.trim();
    if (avatar)          profile.avatar        = avatar;
    if (profession)      profile.profession    = profession;
    if (preferredTone)   profile.preferredTone = preferredTone;

    await profile.save();
    res.json({ success: true, profile });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ success: false, message: "Failed to update profile." });
  }
};

// ── DELETE /api/profiles/:profileId ─────────────────────────────────────────
// Deletes a profile and all its chat history
export const deleteProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({
      _id: req.params.profileId,
      account: req.user._id,
    });
    if (!profile)
      return res.status(404).json({ success: false, message: "Profile not found." });

    // Delete all chats and messages belonging to this profile
    const chats = await Chat.find({ profile: profile._id }).select("_id").lean();
    const chatIds = chats.map(c => c._id);
    await Message.deleteMany({ chat: { $in: chatIds } });
    await Chat.deleteMany({ profile: profile._id });
    await profile.deleteOne();

    res.json({ success: true, message: "Profile and all its history deleted." });
  } catch (err) {
    console.error("deleteProfile error:", err);
    res.status(500).json({ success: false, message: "Failed to delete profile." });
  }
};

// ── POST /api/profiles/:profileId/select ────────────────────────────────────
// "Switches" to a profile — returns a profileToken the frontend stores
// No password needed, just must belong to the account
export const selectProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({
      _id: req.params.profileId,
      account: req.user._id,
    });
    if (!profile)
      return res.status(404).json({ success: false, message: "Profile not found." });

    const profileToken = signProfileToken(profile._id);

    res.json({
      success: true,
      profileToken,
      profile: {
        _id:           profile._id,
        name:          profile.name,
        avatar:        profile.avatar,
        profession:    profile.profession,
        preferredTone: profile.preferredTone,
      },
    });
  } catch (err) {
    console.error("selectProfile error:", err);
    res.status(500).json({ success: false, message: "Failed to select profile." });
  }
};