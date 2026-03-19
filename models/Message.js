import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  chat:    { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  role:    { type: String, enum: ["user","assistant"], required: true },
  content: { type: String, required: true, trim: true },
tone: { 
  type: String, 
  enum: ["concise", "witty", "scientific", "strict", "creative", "spiritual", "empathetic"],
  default: "concise"
},
  tokens:  { prompt: { type: Number, default: 0 }, completion: { type: Number, default: 0 } },
}, { timestamps: true });

export default mongoose.model("Message", messageSchema);