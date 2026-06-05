import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPTS: Record<string, string> = {
  reflection: `You are LearnFlow's personal study coach. Analyze the learner's session reflection and return ONLY valid JSON.`,
  explain: `You are LearnFlow's concept explainer. Explain concepts clearly with examples. Use markdown formatting.`,
  quiz: `You are LearnFlow's quiz generator. Generate accurate, varied questions. Return ONLY valid JSON.`,
  flashcards: `You are LearnFlow's flashcard generator. Create concise, atomic Q/A pairs. Return ONLY valid JSON.`,
  resources: `You are LearnFlow's resource curator. Suggest high-quality FREE resources. Return ONLY valid JSON.`,
  chat: `You are LearnFlow's AI study assistant — a warm, sharp, encouraging coach who helps learners explain concepts, plan study time, review reflections, build quizzes/flashcards, and stay accountable. Use markdown freely: short paragraphs, **bold** key terms, lists, and \`\`\`code\`\`\` blocks where appropriate. Be concise but thorough. When given learner context (goals, streak, recent sessions), tailor advice to it. Never invent links or facts; if unsure, say so.`,
};

function buildPrompt(kind: string, payload: any): string {
  switch (kind) {
    case "reflection":
      return `Analyze this study session reflection and produce coaching insight.

Topic: ${payload.topic || "general"}
Duration: ${payload.minutes || "?"} min
Focus rating: ${payload.focus_rating || "?"}/5
Mood: ${payload.mood || "?"}
What they learned: ${payload.learned || "n/a"}
What challenged them: ${payload.challenged || "n/a"}
Want to revise: ${payload.revise || "n/a"}
Distractions: ${payload.distractions || "n/a"}

Return ONLY this JSON:
{
  "summary": "2-sentence supportive overview",
  "strengths": ["..."],
  "weak_areas": ["..."],
  "revision_topics": ["specific topic to revisit"],
  "next_steps": ["concrete action for next session"],
  "encouragement": "one motivational line"
}`;

    case "explain":
      return `Explain "${payload.concept}" at **${payload.level || "beginner"}** level.

Format using markdown:
- A short intro
- ## Core Idea
- ## How It Works (with example)
- ## Common Pitfalls
- ## Quick Recap (3 bullets)

Keep it focused. Use code blocks if technical.`;

    case "quiz": {
      const types = (payload.types || ["mcq"]).join(", ");
      return `Generate ${payload.count || 5} quiz questions on "${payload.topic}" at ${payload.difficulty || "medium"} difficulty.
Question types to mix: ${types}.

Return ONLY this JSON:
{
  "questions": [
    {
      "type": "mcq" | "true_false" | "short_answer",
      "question": "...",
      "options": ["A","B","C","D"],   // only for mcq
      "answer": "exact correct option text OR true/false OR short answer",
      "explanation": "1-2 sentence why"
    }
  ]
}`;
    }

    case "flashcards":
      return `Generate ${payload.count || 8} flashcards from this source.

Source type: ${payload.source || "notes"}
Topic: ${payload.topic || "general"}
Content:
"""
${payload.content}
"""

Return ONLY this JSON:
{
  "flashcards": [
    { "front": "question/term", "back": "concise answer", "difficulty": "easy|medium|hard" }
  ]
}`;

    case "resources":
      return `Suggest 6-8 FREE learning resources for "${payload.topic}" at ${payload.level || "beginner"} level.

Return ONLY this JSON:
{
  "resources": [
    {
      "title": "...",
      "url": "https://real-url",
      "type": "documentation" | "video" | "article" | "github" | "course",
      "description": "why this is useful (1 line)"
    }
  ]
}
Prioritize official docs, reputable YouTube channels, GitHub repos, and well-known free articles.`;
  }
  return "";
}

function extractJson(text: string): any {
  let s = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1) s = s.substring(start, end + 1);
  try { return JSON.parse(s); } catch {
    return JSON.parse(s.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]"));
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabase.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { kind, payload } = await req.json();
    if (!kind || !SYSTEM_PROMPTS[kind]) {
      return new Response(JSON.stringify({ error: "Invalid kind" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[kind] },
          { role: "user", content: buildPrompt(kind, payload || {}) },
        ],
        temperature: kind === "explain" ? 0.5 : 0.4,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";

    let output: any;
    if (kind === "explain") {
      output = { markdown: content };
    } else {
      try { output = extractJson(content); }
      catch (e) {
        console.error("JSON parse failed:", e, content);
        output = { error: "Failed to parse AI output", raw: content };
      }
    }

    // Save interaction history
    await supabase.from("ai_interactions").insert({
      user_id: userId,
      kind,
      input: payload || {},
      output,
      topic: payload?.topic || payload?.concept || null,
      goal_id: payload?.goal_id || null,
    });

    return new Response(JSON.stringify({ output }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-assistant error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
