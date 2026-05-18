import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

import { generateAIResponse } from "../services/aiService.js";
import { getMemory, saveMemory } from "../services/memoryService.js";

import {
  generateOpeningMessage,
  getStreakDisplay,
} from "../services/sessionTracker.js";

import { generateWeeklyInsight } from "../services/livvyInitiator.js";

// ================= GET MESSAGES =================

export const getMessages = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      account: req.user._id,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found.",
      });
    }

    const messages = await Message.find({
      chat: req.params.chatId,
    })
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      success: true,
      messages,
    });
  } catch (err) {
    console.error("getMessages error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch messages.",
    });
  }
};

// ================= SEND MESSAGE =================

export const sendMessage = async (req, res) => {
  try {
    const { content, tone } = req.body;

    // ✅ Validate input
    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Content required.",
      });
    }

    // ✅ Find chat
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      account: req.user._id,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found.",
      });
    }

    // ✅ Determine tone
    const activeTone = tone || chat.tone || "concise";

    // ✅ Save user message
    const userMessage = await Message.create({
      chat: chat._id,
      role: "user",
      content: content.trim(),
      tone: activeTone,
    });

    // ✅ Fetch history
    const history = await Message.find({
      chat: chat._id,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const contextMessages = history.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // ✅ Generate AI response
    const userId = req.user._id;

    const aiResult = await generateAIResponse(
      contextMessages,
      activeTone,
      userId
    );

    // ✅ Safety check
    if (!aiResult || !aiResult.content) {
      throw new Error("AI response failed");
    }

    // ✅ Save assistant message
    const assistantMessage = await Message.create({
      chat: chat._id,
      role: "assistant",
      content: aiResult.content,
      tone: activeTone,
    });

    // ✅ Update chat
    const update = {
      $push: {
        messages: {
          $each: [userMessage._id, assistantMessage._id],
        },
      },
      tone: activeTone,
    };

    // ✅ Auto title
    if (chat.title === "New Chat" && chat.messages.length === 0) {
      update.title =
        content.trim().slice(0, 40) +
        (content.length > 40 ? "…" : "");
    }

    await Chat.findByIdAndUpdate(chat._id, update);

    // ✅ Response
    res.json({
      success: true,
      userMessage,
      assistantMessage,
      streak: aiResult.memory
        ? getStreakDisplay(aiResult.memory)
        : null,
      distressMode: aiResult.distressMode,
    });
  } catch (err) {
    console.error("🔥 SEND MESSAGE ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Failed to send message.",
    });
  }
};

// ================= OPENING MESSAGE =================

export const getOpeningMessage = async (req, res) => {
  try {
    const userId = req.user._id;

    const tone = req.query.tone || "concise";

    const memory = await getMemory(userId);

    const message = generateOpeningMessage(
      memory,
      tone
    );

    const streak = getStreakDisplay(memory);

    res.json({
      success: true,
      message,
      streak,
    });
  } catch (err) {
    console.error("getOpeningMessage error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to get opening message.",
    });
  }
};

// ================= WEEKLY INSIGHT =================

export const getWeeklyInsight = async (req, res) => {
  try {
    const userId = req.user._id;

    const force = req.query.force === "true";

    const memory = await getMemory(userId);

    // ✅ End of week check
    const day = new Date().getDay();

    const isEOW = [0, 5, 6].includes(day);

    if (!isEOW && !force) {
      return res.json({
        success: true,
        insight: null,
        reason: "not end of week",
      });
    }

    // ✅ Already generated recently
    if (memory.lastWeeklyInsightDate && !force) {
      const daysSince = Math.floor(
        (new Date() -
          new Date(memory.lastWeeklyInsightDate)) /
          (1000 * 60 * 60 * 24)
      );

      if (daysSince < 5) {
        return res.json({
          success: true,
          insight: memory.lastWeeklyInsight,
          cached: true,
        });
      }
    }

    // ✅ Generate insight
    const insight = generateWeeklyInsight(memory);

    if (!insight) {
      return res.json({
        success: true,
        insight: null,
      });
    }

    // ✅ Save memory
    await saveMemory(userId, {
      lastWeeklyInsight: insight,
      lastWeeklyInsightDate: new Date(),
    });

    res.json({
      success: true,
      insight,
    });
  } catch (err) {
    console.error("getWeeklyInsight error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to generate insight.",
    });
  }
};
