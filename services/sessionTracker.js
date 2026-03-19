// ============================================================
// sessionTracker.js
// Handles streak tracking, return detection, time-of-day context
// ============================================================


// ── TIME OF DAY ───────────────────────────────────────────────
export function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}


// ── RETURN DETECTION ──────────────────────────────────────────
// Returns a string Livvy can use to open — or null if user is active
export function getReturnContext(memory) {
  if (!memory.lastSeen) return null;

  const now      = new Date();
  const lastSeen = new Date(memory.lastSeen);
  const diffMs   = now - lastSeen;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHrs  = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHrs < 1)   return null;                        // Same session, don't comment
  if (diffDays === 0) return null;                       // Same day return, no comment
  if (diffDays === 1) return "back_after_one_day";
  if (diffDays <= 3)  return "back_after_few_days";
  if (diffDays <= 7)  return "back_after_week";
  return "back_after_long";
}


// ── OPENING MESSAGE GENERATOR ─────────────────────────────────
// Livvy's first message when user opens the app
export function generateOpeningMessage(memory, tone) {
  const timeOfDay   = getTimeOfDay();
  const returnCtx   = getReturnContext(memory);
  const isFirstEver = memory.interactionCount === 0;
  const streak      = memory.currentStreak || 0;

  // First time ever
  if (isFirstEver) {
    return getFirstTimeOpener(timeOfDay);
  }

  // Returning after absence
  if (returnCtx) {
    return getReturnOpener(returnCtx, memory, timeOfDay);
  }

  // Active user — time-based opener
  return getTimeBasedOpener(timeOfDay, streak, memory);
}


function getFirstTimeOpener(timeOfDay) {
  const openers = {
    morning:   "morning. you found the Hive — good instinct. what's on your mind?",
    afternoon: "hey. you're here. the Hive's been waiting. what do you need?",
    evening:   "evening. good time to think. what's going on?",
    night:     "night owl. respect. what's keeping you up?",
  };
  return openers[timeOfDay];
}


function getReturnOpener(returnCtx, memory, timeOfDay) {
  const callbacks  = memory.pendingCallbacks || [];
  const topCallback = callbacks[callbacks.length - 1];

  const returnLines = {
    back_after_one_day: [
      "back. what happened yesterday?",
      "been a minute. pick up where we left off?",
    ],
    back_after_few_days: [
      "few days. hope things didn't spiral.",
      "been a bit. you good?",
    ],
    back_after_week: [
      "a week. that's either growth or avoidance. which one?",
      "week gone. what changed?",
    ],
    back_after_long: [
      "been a while. welcome back.",
      "you disappeared. I noticed.",
    ],
  };

  const lines = returnLines[returnCtx];
  let opener  = lines[Math.floor(Math.random() * lines.length)];

  // Attach callback if relevant
  if (topCallback && returnCtx !== "back_after_one_day") {
    opener += ` also — ${topCallback.topic} still pending?`;
  }

  return opener;
}


function getTimeBasedOpener(timeOfDay, streak, memory) {
  const topTopics = Object.entries(memory.topicFrequency || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)
    .map(([t]) => t);

  const topic = topTopics[0];

  const openers = {
    morning: [
      "morning. what are we doing today?",
      streak > 3 ? `day ${streak}. consistent. what's the plan?` : "morning. what's first?",
    ],
    afternoon: [
      "afternoon check-in. how's it going?",
      topic ? `still thinking about ${topic}?` : "afternoon. what do you need?",
    ],
    evening: [
      "evening. how'd the day go?",
      "winding down or still going?",
    ],
    night: [
      "late. can't sleep or just thinking?",
      "night mode. what's on your mind?",
    ],
  };

  const lines = openers[timeOfDay];
  return lines[Math.floor(Math.random() * lines.length)];
}


// ── STREAK DISPLAY DATA ───────────────────────────────────────
export function getStreakDisplay(memory) {
  const streak = memory.currentStreak || 0;
  const longest = memory.longestStreak || 0;

  if (streak === 0) return null;

  return {
    current: streak,
    longest,
    label: streak === 1
      ? "day 1 with Livvy"
      : `${streak} days with Livvy`,
    milestone: streak > 0 && streak % 7 === 0
      ? `${streak / 7} week${streak / 7 > 1 ? "s" : ""} straight`
      : null,
  };
}