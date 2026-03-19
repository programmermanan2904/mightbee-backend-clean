import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  avatar: {
    type: String,
    default: "🐝",
  },
  profession: {
    type: String,
    enum: ["student", "developer", "researcher", "teacher", "creator", "business", "other"],
    default: "other",
  },
  preferredTone: {
    type: String,
    enum: ["concise", "witty", "scientific", "strict", "creative", "spiritual", "empathetic"],
    default: "concise",
  },
}, { timestamps: true });

export default mongoose.model("Profile", profileSchema);