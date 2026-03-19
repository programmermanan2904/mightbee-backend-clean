import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  // profile replaces user — history is now isolated per profile
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
    required: true,
  },
  // account is stored too so you can query all chats across profiles if needed
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    default: "New Chat",
  },
  tone: {
    type: String,
    enum: ["concise", "witty", "scientific", "strict", "creative", "spiritual", "empathetic"],
    default: "concise",
  },
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Chat", chatSchema);