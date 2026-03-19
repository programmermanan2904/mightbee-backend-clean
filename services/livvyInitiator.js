// ============================================================
// livvyInitiator.js
// Livvy's proactive intelligence — callouts, callbacks, pattern recognition
// ============================================================


// ── PATTERN CALLOUT ENGINE ────────────────────────────────────
// Returns a callout string if Livvy should call out a pattern — or null
export function getPatternCallout(memory) {
  const { scores, topicFrequency, traits, interactionCount } = memory;

  // Only start calling out patterns after enough interactions
  if (interactionCount < 5) return null;

  // Don't callout every message — only occasionally (every ~8 messages)
  if (interactionCount % 8 !== 0) return null;

  const callouts = [];

  // Procrastination pattern
  if (scores.procrastination >= 3) {
    callouts.push(
      "real talk — this is the third time you've mentioned putting things off. what's actually blocking you?",
      "pattern recognized: you keep circling this. what would actually make you start?",
      "based on your pattern, you'll probably delay this too. prove me wrong."
    );
  }

  // Motivation topic repeating
  if ((topicFrequency.motivation || 0) >= 3) {
    callouts.push(
      `you've asked about motivation ${topicFrequency.motivation} times now. motivation isn't the problem — what is?`,
      "we keep coming back to motivation. that usually means something else is going on."
    );
  }

  // Decision avoidance
  if ((topicFrequency.decisions || 0) >= 3) {
    callouts.push(
      "you ask for decisions a lot but I think you already know what you want. what's making you doubt it?",
      `${topicFrequency.decisions} decision questions. you're not bad at deciding — you're scared of committing. different problem.`
    );
  }

  // High emotional load
  if (scores.emotionalLoad >= 4) {
    callouts.push(
      "you've been carrying a lot lately. how are you actually doing — not the surface answer.",
      "you keep showing up here when things get heavy. I notice that. what would make things lighter?"
    );
  }

  // Career repeating
  if ((topicFrequency.career || 0) >= 3) {
    callouts.push(
      `work keeps coming up. ${topicFrequency.career} times now. is this a job problem or a life problem?`
    );
  }

  if (callouts.length === 0) return null;

  // Pick one randomly
  return callouts[Math.floor(Math.random() * callouts.length)];
}


// ── CALLBACK ENGINE ───────────────────────────────────────────
// Returns one pending callback to surface — or null
export function getPendingCallback(memory) {
  const callbacks = memory.pendingCallbacks || [];
  if (callbacks.length === 0) return null;

  // Only surface a callback occasionally (not every message)
  if (memory.interactionCount % 10 !== 0) return null;

  // Get the oldest pending callback
  const callback = callbacks[0];
  const daysSince = Math.floor(
    (new Date() - new Date(callback.addedAt)) / (1000 * 60 * 60 * 24)
  );

  if (daysSince < 2) return null; // Too soon

  const callbackLines = {
    "gym plan": [
      `gym plan — still pending?`,
      `you mentioned starting the gym ${daysSince} days ago. happened yet?`,
    ],
    "job decision": [
      `still thinking about that job situation?`,
      `${daysSince} days since you mentioned the job thing. any movement?`,
    ],
  };

  const lines = callbackLines[callback.topic];
  if (!lines) return `still thinking about the ${callback.topic}?`;

  return lines[Math.floor(Math.random() * lines.length)];
}


// ── WEEKLY INSIGHT GENERATOR ──────────────────────────────────
// Generates one sharp insight about the user's week — for end-of-week display
export function generateWeeklyInsight(memory) {
  const { topicFrequency, scores, traits, interactionCount, toneHistory } = memory;

  if (interactionCount < 3) return null;

  // Check if we already gave insight this week
  if (memory.lastWeeklyInsightDate) {
    const daysSince = Math.floor(
      (new Date() - new Date(memory.lastWeeklyInsightDate)) / (1000 * 60 * 60 * 24)
    );
    if (daysSince < 7) return memory.lastWeeklyInsight;
  }

  const insights = [];

  // Topic-based insight
  const topTopic = Object.entries(topicFrequency || {})
    .sort((a, b) => b[1] - a[1])[0];

  if (topTopic) {
    const [topic, count] = topTopic;
    const topicInsights = {
      motivation: `this week you circled motivation ${count} times — you're not lazy, you're misaligned.`,
      decisions:  `${count} decision questions this week. you're in a crossroads phase.`,
      relationships: `relationships came up ${count} times. connection is clearly on your mind.`,
      career:     `work dominated your week — ${count} conversations about it. something needs to shift.`,
      health:     `you kept coming back to health. your body is trying to tell you something.`,
      money:      `money was on your mind ${count} times this week. that's worth addressing directly.`,
    };
    if (topicInsights[topic]) insights.push(topicInsights[topic]);
  }

  // Score-based insight
  if (scores.procrastination > scores.discipline + 1) {
    insights.push("this week you talked about starting more than you actually started. gap worth closing.");
  }
  if (scores.discipline > 2) {
    insights.push("you showed up this week. that's not nothing — consistency compounds.");
  }
  if (scores.emotionalLoad > 3) {
    insights.push("heavy week emotionally. you processed a lot. give yourself that.");
  }

  // Trait-based insight
  if (traits.includes("procrastinates") && scores.procrastination > 1) {
    insights.push("procrastination showed up again this week. it's a pattern now, not a one-off.");
  }

  // Tone-based insight
  if (toneHistory && toneHistory.length > 3) {
    const toneCount = toneHistory.reduce((acc, t) => {
      acc[t] = (acc[t] || 0) + 1; return acc;
    }, {});
    const topTone = Object.entries(toneCount).sort((a, b) => b[1] - a[1])[0];
    if (topTone && topTone[1] >= 3) {
      const toneInsights = {
        empathetic: "you leaned empathetic this week. you needed to be heard.",
        strict:     "you kept it strict this week — focused, no fluff. respect.",
        witty:      "you came here to laugh this week. good instinct.",
        spiritual:  "you were looking for meaning this week. that's the right question.",
        scientific: "you wanted to understand things deeply this week. keep that.",
      };
      if (toneInsights[topTone[0]]) insights.push(toneInsights[topTone[0]]);
    }
  }

  if (insights.length === 0) return null;

  const insight = insights[Math.floor(Math.random() * insights.length)];
  return insight;
}


// ── INJECT INTO PROMPT ────────────────────────────────────────
// Returns a subtle proactive line to append to system prompt if relevant
export function getProactivePromptAddition(memory) {
  const callout  = getPatternCallout(memory);
  const callback = getPendingCallback(memory);

  const lines = [];

  if (callback) {
    lines.push(`CALLBACK TO SURFACE (subtle, max 1): "${callback}"`);
  }

  if (callout) {
    lines.push(`PATTERN CALLOUT (use if natural): "${callout}"`);
  }

  if (lines.length === 0) return "";

  return `
PROACTIVE INTELLIGENCE:
${lines.join("\n")}
Use AT MOST ONE of these. Only if it fits naturally in the response. Never force it.
  `.trim();
}