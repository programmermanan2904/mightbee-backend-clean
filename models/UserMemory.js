// models/UserMemory.js
import mongoose from "mongoose";

const UserMemorySchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Profile",          // keyed to profile, not user
      required: true,
      unique:   true,
      index:    true,
    },

    // Personality traits Livvy has detected
    traits:      { type: [String], default: [] },
    // e.g. ["procrastinates", "night_owl", "overthinker"]

    preferences: { type: [String], default: [] },
    // e.g. ["prefers direct answers", "hates small talk"]

    patterns:    { type: [String], default: [] },
    // e.g. ["asks about motivation often"]

    // Behavior scores — incremented over time
    scores: {
      procrastination: { type: Number, default: 0 },
      discipline:      { type: Number, default: 0 },
      consistency:     { type: Number, default: 0 },
      emotionalLoad:   { type: Number, default: 0 },
    },

    // Detected user personality type
    userType: {
      type: String,
      enum: ["funny_user", "serious_user", "emotional_user", "practical_user", null],
      default: null,
    },

    // Session tracking
    interactionCount: { type: Number, default: 0 },
    firstSeen:        { type: Date,   default: Date.now },
    lastSeen:         { type: Date,   default: null },

    // Streak
    currentStreak:  { type: Number, default: 0 },
    longestStreak:  { type: Number, default: 0 },
    lastStreakDate: { type: Date,   default: null },

    // Topic frequency map — { motivation: 3, career: 1 }
    topicFrequency: {
      type:    Map,
      of:      Number,
      default: {},
    },

    // Pending things Livvy might follow up on
    pendingCallbacks: {
      type: [{
        topic:   String,
        addedAt: { type: Date, default: Date.now },
      }],
      default: [],
    },

    // Weekly insight
    lastWeeklyInsight:     { type: String, default: null },
    lastWeeklyInsightDate: { type: Date,   default: null },

    // Last 10 tones the user has used
    toneHistory: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("UserMemory", UserMemorySchema);