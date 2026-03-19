import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

// All chat controllers now use req.profile (set by protectProfile middleware)
// req.user (the account) is still available if needed

export const getChats = async (req, res) => {
  try {
    const chats = await Chat.find({ profile: req.profile._id, isArchived: false })
      .sort({ updatedAt: -1 })
      .select("_id title tone updatedAt")
      .lean();
    res.json({ success: true, chats });
  } catch (err) {
    console.error("getChats error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch chats." });
  }
};

export const createChat = async (req, res) => {
  try {
    const chat = await Chat.create({
      profile: req.profile._id,
      account: req.user._id,
      title:   req.body.title || "New Chat",
      tone:    req.body.tone  || req.profile.preferredTone || "concise",
    });
    res.status(201).json({ success: true, chat });
  } catch (err) {
    console.error("createChat error:", err);
    res.status(500).json({ success: false, message: "Failed to create chat." });
  }
};

export const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id:     req.params.id,
      profile: req.profile._id,
    }).lean();
    if (!chat)
      return res.status(404).json({ success: false, message: "Chat not found." });

    const messages = await Message.find({ chat: req.params.id })
      .sort({ createdAt: 1 })
      .lean();
    res.json({ success: true, chat, messages });
  } catch (err) {
    console.error("getChatById error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch chat." });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({
      _id:     req.params.id,
      profile: req.profile._id,
    });
    if (!chat)
      return res.status(404).json({ success: false, message: "Chat not found." });

    await Message.deleteMany({ chat: req.params.id });
    res.json({ success: true, message: "Chat deleted." });
  } catch (err) {
    console.error("deleteChat error:", err);
    res.status(500).json({ success: false, message: "Failed to delete chat." });
  }
};

export const renameChat = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title?.trim())
      return res.status(400).json({ success: false, message: "Title required." });

    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, profile: req.profile._id },
      { title: title.trim() },
      { new: true }
    );
    if (!chat)
      return res.status(404).json({ success: false, message: "Chat not found." });

    res.json({ success: true, chat });
  } catch (err) {
    console.error("renameChat error:", err);
    res.status(500).json({ success: false, message: "Failed to rename chat." });
  }
};