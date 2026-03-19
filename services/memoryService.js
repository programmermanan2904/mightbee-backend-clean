// services/memoryService.js
import UserMemory from "../models/UserMemory.js";

// ── DEFAULT MEMORY (mirrors model defaults) ───────────────────
function defaultMemory(userId) {
  return {
    userId,
    traits:           [],
    preferences:      [],
    patterns:         [],
    scores:           { procrastination: 0, discipline: 0, consistency: 0, emotionalLoad: 0 },
    userType:         null,
    interactionCount: 0,
    firstSeen:        new Date(),
    lastSeen:         null,
    currentStreak:    0,
    longestStreak:    0,
    lastStreakDate:   null,
    topicFrequency:   {},
    pendingCallbacks: [],
    lastWeeklyInsight:     null,
    lastWeeklyInsightDate: null,
    toneHistory:      [],
  };
}

// ── READ ──────────────────────────────────────────────────────
export async function getMemory(userId) {
  const mem = await UserMemory.findOne({ userId }).lean();
  if (!mem) return defaultMemory(userId);
  if (mem.topicFrequency instanceof Map) {
    mem.topicFrequency = Object.fromEntries(mem.topicFrequency);
  } else if (mem.topicFrequency && typeof mem.topicFrequency === "object") {
    mem.topicFrequency = Object.fromEntries(Object.entries(mem.topicFrequency));
  }
  return mem;
}

// ── WRITE ─────────────────────────────────────────────────────
export async function saveMemory(userId, updates) {
  await UserMemory.findOneAndUpdate(
    { userId },
    { $set: { ...updates, userId } },
    { upsert: true, returnDocument: 'after' }
  );
}

// ── UPDATE AFTER EACH MESSAGE ─────────────────────────────────
export async function updateMemoryFromMessage(userId, message, tone) {
  const mem  = await getMemory(userId);
  const msg  = message.toLowerCase();
  const now  = new Date();

  const traitMap = {
    procrastinates: /procrastinat|always delay|keep putting off|never start/,
    overthinker:    /overthink|can't stop thinking|my mind won't|spiral/,
    night_owl:      /night owl|can't sleep|up late|awake at \d+am/,
    anxious:        /anxious|anxiety|nervous|worried all the time/,
    ambitious:      /goals|want to achieve|working toward|hustle/,
    indecisive:     /can't decide|don't know what to|keep changing my mind/,
  };

  const newTraits = [...(mem.traits || [])];
  for (const [trait, regex] of Object.entries(traitMap)) {
    if (regex.test(msg) && !newTraits.includes(trait)) newTraits.push(trait);
  }

  const scores = { ...(mem.scores || {}) };
  if (/procrastinat|delay|putting off/.test(msg))         scores.procrastination = (scores.procrastination || 0) + 1;
  if (/discipline|routine|consistent|every day/.test(msg)) scores.discipline     = (scores.discipline     || 0) + 1;
  if (/again|still|keep doing|same thing/.test(msg))      scores.consistency     = (scores.consistency    || 0) + 1;
  if (/sad|stress|overwhelmed|crying|can't cope/.test(msg)) scores.emotionalLoad = (scores.emotionalLoad  || 0) + 1;

  const topicMap = {
    motivation:    /motivat|lazy|can't start|no energy/,
    relationships: /friend|partner|ex|family|relationship/,
    career:        /job|work|career|boss|quit|salary/,
    health:        /gym|diet|sleep|exercise|eat/,
    decisions:     /should i|what do i do|help me decide/,
    money:         /money|broke|finance|invest|savings/,
  };

  const topicFrequency = { ...(mem.topicFrequency || {}) };
  for (const [topic, regex] of Object.entries(topicMap)) {
    if (regex.test(msg)) topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
  }

  const pendingCallbacks = [...(mem.pendingCallbacks || [])];
  if (/gym plan|workout plan|start gym/.test(msg) && !pendingCallbacks.find(c => c.topic === "gym plan")) {
    pendingCallbacks.push({ topic: "gym plan", addedAt: now });
  }
  if (/quit.*job|leave.*job/.test(msg) && !pendingCallbacks.find(c => c.topic === "job decision")) {
    pendingCallbacks.push({ topic: "job decision", addedAt: now });
  }
  if (pendingCallbacks.length > 5) pendingCallbacks.shift();

  let userType = mem.userType;
  const count  = mem.interactionCount || 0;
  if (!userType || count % 20 === 0) {
    if (/haha|lol|bro|roast|joke|funny/.test(msg))       userType = "funny_user";
    else if (/feel|sad|overwhelmed|emotional/.test(msg)) userType = "emotional_user";
    else if (/explain|how does|science|why/.test(msg))   userType = "serious_user";
    else if (/just tell me|quick|short|steps/.test(msg)) userType = "practical_user";
  }

  let { currentStreak = 0, longestStreak = 0, lastStreakDate } = mem;
  const todayStr = now.toDateString();
  const lastStr  = lastStreakDate ? new Date(lastStreakDate).toDateString() : null;
  if (lastStr !== todayStr) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    currentStreak  = lastStr === yesterday.toDateString() ? currentStreak + 1 : 1;
    longestStreak  = Math.max(longestStreak, currentStreak);
    lastStreakDate = now;
  }

  const toneHistory = [...(mem.toneHistory || []), tone].slice(-10);

  await saveMemory(userId, {
    traits: newTraits, scores, topicFrequency, pendingCallbacks,
    userType, currentStreak, longestStreak, lastStreakDate, toneHistory,
    interactionCount: count + 1,
    lastSeen:   now,
    firstSeen:  mem.firstSeen || now,
    preferences: mem.preferences || [],
    patterns:    mem.patterns    || [],
    lastWeeklyInsight:     mem.lastWeeklyInsight     || null,
    lastWeeklyInsightDate: mem.lastWeeklyInsightDate || null,
  });

  return await getMemory(userId);
}

// ── BUILD MEMORY CONTEXT (injected into system prompt) ────────
export function buildMemoryContext(mem) {
  if (!mem || mem.interactionCount === 0) return "";
  const lines = [];
  if (mem.traits?.length)       lines.push(`Known traits: ${mem.traits.join(", ")}`);
  if (mem.preferences?.length)  lines.push(`User preferences: ${mem.preferences.join(", ")}`);
  if (mem.userType)             lines.push(`User type: ${mem.userType}`);
  const topTopics = Object.entries(mem.topicFrequency || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
  if (topTopics.length)         lines.push(`Frequently asks about: ${topTopics.join(", ")}`);
  if ((mem.scores?.procrastination || 0) > 2) lines.push(`Pattern: tends to procrastinate`);
  if ((mem.scores?.emotionalLoad   || 0) > 3) lines.push(`Pattern: carries emotional weight often`);
  if ((mem.currentStreak           || 0) > 2) lines.push(`Has been talking to Livvy for ${mem.currentStreak} days straight`);
  if (lines.length === 0) return "";
  return `
WHAT LIVVY KNOWS ABOUT THIS USER:
${lines.join("\n")}
Use this naturally — don't announce it. Let it subtly shape how you respond.
Reference it only when genuinely relevant. Never recite it back robotically.
  `.trim();
}