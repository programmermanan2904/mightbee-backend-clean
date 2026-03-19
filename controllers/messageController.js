import Chat    from "../models/Chat.js";
import Message  from "../models/Message.js";
import { generateAIResponse }        from "../services/aiService.js";
import { getMemory, saveMemory }     from "../services/memoryService.js";
import { generateOpeningMessage,
         getStreakDisplay }           from "../services/sessionTracker.js";
import { generateWeeklyInsight }     from "../services/livvyInitiator.js";

// ── EXISTING: getMessages (unchanged) ────────────────────────
export const getMessages = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, profile: req.profile._id });
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found." });

    const messages = await Message.find({ chat: req.params.chatId })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ success: true, messages });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch messages." });
  }
};


// ── UPDATED: sendMessage (memory wired in) ────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { content, tone } = req.body;
    if (!content?.trim())
      return res.status(400).json({ success: false, message: "Content required." });

    const chat = await Chat.findOne({ _id: req.params.chatId, profile: req.profile._id });
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found." });

    const activeTone = tone || chat.tone || req.profile.preferredTone || "concise";

    // Save user message
    const userMessage = await Message.create({
      chat:    chat._id,
      role:    "user",
      content: content.trim(),
      tone:    activeTone,
    });

    // Fetch last 20 messages for context
    const history = await Message.find({ chat: chat._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const contextMessages = history.reverse().map((m) => ({
      role:    m.role,
      content: m.content,
    }));

    // ── MEMORY: pass profileId as userId ─────────────────────
    const profileId = req.profile._id;
    const aiResult  = await generateAIResponse(contextMessages, activeTone, profileId);

    // Save assistant response
    const assistantMessage = await Message.create({
      chat:    chat._id,
      role:    "assistant",
      content: aiResult.content,
      tone:    activeTone,
      tokens:  {
        prompt:     aiResult.promptTokens,
        completion: aiResult.completionTokens,
      },
    });

    // Update chat
    const update = {
      $push: { messages: { $each: [userMessage._id, assistantMessage._id] } },
      tone: activeTone,
    };
    if (chat.title === "New Chat" && chat.messages.length === 0) {
      update.title = content.trim().slice(0, 40) + (content.length > 40 ? "…" : "");
    }
    await Chat.findByIdAndUpdate(chat._id, update);

    res.json({
      success: true,
      userMessage,
      assistantMessage,
      // Optional extras your frontend can use if needed
      streak:      aiResult.memory ? getStreakDisplay(aiResult.memory) : null,
      distressMode:aiResult.distressMode,
    });

  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ success: false, message: "Failed to send message." });
  }
};


// ── NEW: getOpeningMessage ────────────────────────────────────
// GET /chats/opening?tone=concise
// Call this when the user opens the app — Livvy greets them
export const getOpeningMessage = async (req, res) => {
  try {
    const profileId = req.profile._id;
    const tone      = req.query.tone || req.profile.preferredTone || "concise";

    const memory  = await getMemory(profileId);
    const message = generateOpeningMessage(memory, tone);
    const streak  = getStreakDisplay(memory);

    res.json({ success: true, message, streak });
  } catch (err) {
    console.error("getOpeningMessage error:", err);
    res.status(500).json({ success: false, message: "Failed to get opening message." });
  }
};


// ── NEW: getWeeklyInsight ─────────────────────────────────────
// GET /chats/weekly-insight
// Returns one sharp insight about the user's week — show on Fri/Sat/Sun
export const getWeeklyInsight = async (req, res) => {
  try {
    const profileId = req.profile._id;
    const force     = req.query.force === "true";

    const memory = await getMemory(profileId);

    // Only on end of week unless forced
    const day   = new Date().getDay(); // 0=Sun, 5=Fri, 6=Sat
    const isEOW = [0, 5, 6].includes(day);
    if (!isEOW && !force) {
      return res.json({ success: true, insight: null, reason: "not end of week" });
    }

    // Already gave insight this week?
    if (memory.lastWeeklyInsightDate && !force) {
      const daysSince = Math.floor(
        (new Date() - new Date(memory.lastWeeklyInsightDate)) / (1000 * 60 * 60 * 24)
      );
      if (daysSince < 5) {
        return res.json({ success: true, insight: memory.lastWeeklyInsight, cached: true });
      }
    }

    const insight = generateWeeklyInsight(memory);
    if (!insight) return res.json({ success: true, insight: null });

    await saveMemory(profileId, {
      lastWeeklyInsight:     insight,
      lastWeeklyInsightDate: new Date(),
    });

    res.json({ success: true, insight });
  } catch (err) {
    console.error("getWeeklyInsight error:", err);
    res.status(500).json({ success: false, message: "Failed to generate insight." });
  }
};