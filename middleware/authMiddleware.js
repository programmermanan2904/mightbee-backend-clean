import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Profile from "../models/profile.js";

// ── Account-level auth ───────────────────────────────────────────────────────
// Verifies the account JWT (from login). Attaches req.user (the account).
export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer "))
      token = req.headers.authorization.split(" ")[1];
    if (!token)
      return res.status(401).json({ success: false, message: "No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user)
      return res.status(401).json({ success: false, message: "User no longer exists." });

    req.user = user;
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError" ? "Token expired." : "Invalid token.";
    res.status(401).json({ success: false, message: msg });
  }
};

// ── Profile-level auth ───────────────────────────────────────────────────────
// Verifies the profile JWT (from selecting a profile). Attaches req.profile.
// Also attaches req.user (account) so you have both available in controllers.
export const protectProfile = async (req, res, next) => {
  try {
    let token;

    // ✅ Read profile token from header
    if (req.headers["x-profile-token"]) {
      token = req.headers["x-profile-token"];
    } 
    else if (req.headers.authorization?.startsWith("Profile ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No profile token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "profile") {
      return res.status(401).json({
        success: false,
        message: "Invalid profile token.",
      });
    }

    const profile = await Profile.findById(decoded.profileId);
    if (!profile) {
      return res.status(401).json({
        success: false,
        message: "Profile no longer exists.",
      });
    }

    const account = await User.findById(profile.account);
    if (!account) {
      return res.status(401).json({
        success: false,
        message: "Account no longer exists.",
      });
    }

    req.profile = profile;
    req.user = account;

    next();
  } catch (err) {
    const msg =
      err.name === "TokenExpiredError"
        ? "Profile token expired."
        : "Invalid profile token.";

    res.status(401).json({ success: false, message: msg });
  }
};