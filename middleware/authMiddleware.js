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

    // ✅ Accept normal Bearer token
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // ✅ Fallback to custom profile token
    else if (req.headers["x-profile-token"]) {
      token = req.headers["x-profile-token"];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Normal account token support
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    req.user = user;

    next();
  } catch (err) {
    const msg =
      err.name === "TokenExpiredError"
        ? "Token expired."
        : "Invalid token.";

    res.status(401).json({
      success: false,
      message: msg,
    });
  }
};
