import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ================= TOKEN =================

const signToken = (id) => {
  if (!process.env.JWT_SECRET) {
    console.error("❌ JWT_SECRET missing in env");
    throw new Error("JWT configuration error");
  }

  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

const sendToken = (user, status, res) => {
  const token = signToken(user._id);

  // remove sensitive fields
  user.password = undefined;

  res.status(status).json({
    success: true,
    token,
    user,
  });
};

// ================= SIGNUP =================

export const signup = async (req, res) => {
  try {
    const { name, email, password, profession } = req.body;

    // validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password required.",
      });
    }

    // check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already in use.",
      });
    }

    // create user
    const user = await User.create({
      name,
      email,
      password,
      profession,
    });

    console.log("✅ USER CREATED:", user.email);

    // send token (AUTO LOGIN)
    sendToken(user, 201, res);

  } catch (err) {
    console.error("❌ SIGNUP ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Signup failed. Please try again.",
    });
  }
};

// ================= LOGIN =================

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required.",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    console.log("✅ LOGIN SUCCESS:", user.email);

    sendToken(user, 200, res);

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
};

// ================= GET ME =================

export const getMe = (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};