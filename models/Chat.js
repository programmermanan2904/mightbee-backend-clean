import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    // Optional now
    profile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: false,
    },

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
      enum: [
        "concise",
        "witty",
        "scientific",
        "strict",
        "creative",
        "spiritual",
        "empathetic",
      ],
      default: "concise",
    },

    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],

    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Chat", chatSchema);
