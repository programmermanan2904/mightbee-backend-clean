import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";

dotenv.config();

const app = express();

// ✅ FIXED CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/chats", chatRoutes);
app.use("/profiles", profileRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "MightBee backend running 🐝" });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// DB + Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB failed:", err.message);
    process.exit(1);
  });