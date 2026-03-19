import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes    from "./routes/authRoutes.js";
import userRoutes    from "./routes/userRoutes.js";
import chatRoutes    from "./routes/chatRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";

dotenv.config();

const app = express();

// ── CORS ──────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "https://mightbee-frontend-production.up.railway.app",
  "https://mightbee-frontend-production-03f7.up.railway.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.log("CORS blocked:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes — matches api.js (no /api prefix) ─────────────
app.use("/auth",     authRoutes);
app.use("/user",     userRoutes);
app.use("/chats",    chatRoutes);
app.use("/profiles", profileRoutes);

// ── Health check ──────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "ok", message: "MightBee backend running 🐝" }));

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found." }));

// ── Error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(err.status || 500).json({ success: false, message: err.message || "Internal Server Error" });
});

// ── MongoDB + Start ───────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB failed:", err.message);
    process.exit(1);
  });