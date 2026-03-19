import jwt from "jsonwebtoken";
import User from "../models/User.js";

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const sendToken = (user, status, res) => {
  const token = signToken(user._id);
  user.password = undefined;
  res.status(status).json({ success: true, token, user });
};

export const signup = async (req, res) => {
  try {
    const { name, email, password, profession } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "Name, email and password required." });

    if (await User.findOne({ email }))
      return res.status(409).json({ success: false, message: "Email already in use." });

    const user = await User.create({ name, email, password, profession });

    sendToken(user, 201, res);

  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required." });
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    sendToken(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, message: "Login failed." });
  }
};

export const getMe = (req, res) => res.status(200).json({ success: true, user: req.user });