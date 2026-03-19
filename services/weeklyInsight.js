// ============================================================
// weeklyInsight.js
// Backend route handler — call this from your Express router
// GET /api/weekly-insight/:userId
// ============================================================

import { getMemory, saveMemory } from "./memoryService.js";
import { generateWeeklyInsight } from "./livvyInitiator.js";


export async function getWeeklyInsight(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const memory = await getMemory(userId);

    // Check if it's end of week (Friday/Saturday/Sunday) OR force param
    const day   = new Date().getDay(); // 0=Sun, 5=Fri, 6=Sat
    const isEOW = [0, 5, 6].includes(day);
    const force = req.query.force === "true";

    if (!isEOW && !force) {
      return res.json({ insight: null, reason: "not end of week" });
    }

    // Already gave insight this week?
    if (memory.lastWeeklyInsightDate && !force) {
      const daysSince = Math.floor(
        (new Date() - new Date(memory.lastWeeklyInsightDate)) / (1000 * 60 * 60 * 24)
      );
      if (daysSince < 5) {
        return res.json({ insight: memory.lastWeeklyInsight, cached: true });
      }
    }

    const insight = generateWeeklyInsight(memory);
    if (!insight) return res.json({ insight: null });

    // Save it so we don't repeat it
    await saveMemory(userId, {
      lastWeeklyInsight:     insight,
      lastWeeklyInsightDate: new Date(),
    });

    return res.json({ insight });

  } catch (err) {
    console.error("weeklyInsight error:", err);
    return res.status(500).json({ error: "Failed to generate insight" });
  }
}


// ── OPENING MESSAGE ROUTE ─────────────────────────────────────
// GET /api/opening-message/:userId
// Call this when the user opens the app — returns Livvy's opener

import { generateOpeningMessage } from "./sessionTracker.js";
import { getStreakDisplay }        from "./sessionTracker.js";

export async function getOpeningMessage(req, res) {
  try {
    const { userId } = req.params;
    const tone       = req.query.tone || "concise";

    if (!userId) return res.status(400).json({ error: "userId required" });

    const memory  = await getMemory(userId);
    const message = generateOpeningMessage(memory, tone);
    const streak  = getStreakDisplay(memory);

    return res.json({ message, streak });

  } catch (err) {
    console.error("openingMessage error:", err);
    return res.status(500).json({ error: "Failed to generate opening" });
  }
}