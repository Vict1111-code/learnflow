import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { goalDescription, masteryLevel, concepts, confusionPatterns } = body;

    if (!goalDescription || typeof goalDescription !== "string") {
      return new Response(JSON.stringify({ error: "goalDescription is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Bucket concepts by status to anchor the AI on the learner's CURRENT level
    const completed: string[] = [];
    const available: string[] = [];
    const locked: string[] = [];
    if (Array.isArray(concepts)) {
      for (const c of concepts) {
        const name = (c as any).name;
        const status = (c as any).status;
        if (!name) continue;
        if (status === "completed") completed.push(name);
        else if (status === "available" || status === "in_progress") available.push(name);
        else locked.push(name);
      }
    }

    const total = completed.length + available.length + locked.length;
    const progressPct = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    // Effective level: lean one step up if the learner is well past the halfway mark
    const levelOrder = ["beginner", "intermediate", "advanced"];
    const baseIdx = Math.max(0, levelOrder.indexOf((masteryLevel || "beginner").toLowerCase()));
    const effectiveIdx = progressPct >= 60 ? Math.min(2, baseIdx + 1) : baseIdx;
    const effectiveLevel = levelOrder[effectiveIdx];

    const focusList = available.length > 0 ? available : (locked.slice(0, 3));
    const confusionList = Array.isArray(confusionPatterns) && confusionPatterns.length > 0
      ? confusionPatterns.join(", ")
      : "None reported";

    const systemPrompt = `You are an expert learning resource curator. You ONLY recommend FREE, currently-online, high-quality resources from well-known reputable sources. You MUST respond with ONLY a valid JSON object — no markdown, no commentary.`;

    const userPrompt = `Curate 10-14 FREE learning resources for a learner whose goal is: "${goalDescription}".

Learner state:
- Stated mastery level: ${masteryLevel || "beginner"}
- Skill-tree progress: ${completed.length}/${total} concepts completed (${progressPct}%)
- Effective level to target: ${effectiveLevel}
- Already mastered: ${completed.join(", ") || "(none yet)"}
- Currently working on / next up: ${focusList.join(", ") || "(foundations of the topic)"}
- Locked / future concepts: ${locked.slice(0, 8).join(", ") || "(none listed)"}
- Areas of confusion: ${confusionList}

Return ONLY this JSON shape:
{
  "resources": [
    {
      "title": "Exact resource title",
      "url": "https://real-and-currently-working-url",
      "type": "article" | "video" | "documentation" | "book" | "course" | "tool" | "podcast" | "blog" | "community" | "github",
      "source": "Publisher / channel / org name (e.g. MDN, freeCodeCamp, Coursera, Real Python, 3Blue1Brown, The Changelog, r/learnprogramming, Project Gutenberg)",
      "free": true,
      "description": "One short sentence on why this helps THIS learner right now",
      "relevance": "confusion" | "foundation" | "current" | "advancement" | "practice" | "community"
    }
  ]
}

Strict requirements:
1. EVERY resource MUST be free to access without a paywall (free MOOCs, official docs, YouTube, freeCodeCamp, MDN, Khan Academy, Coursera audit, edX audit, MIT OCW, Harvard CS50, Stanford Online, Project Gutenberg, LibriVox, arXiv, GitHub, official blogs, Substack free tier, podcasts on public feeds, Discord/Reddit/Stack Exchange communities, etc.). Mark "free": true. NEVER include paid books or paid courses.
2. URLs MUST be REAL and to canonical, long-lived pages (publisher homepage, official docs, channel page, repo). NEVER invent URLs. NEVER use random blog spam.
3. Match the EFFECTIVE level (${effectiveLevel}). Do NOT recommend beginner intros if the learner is already past foundations; do NOT recommend advanced material if foundations aren't done.
4. Cover a DIVERSE mix of formats. Aim for at least one of EACH where it makes sense: documentation, video, article/blog, book (free/open), course (free), podcast or audio, community (Discord/Reddit/Slack/forum), tool, github repo.
5. Prioritise resources that directly address the "Currently working on" concepts and any confusion areas; then add foundation reinforcement, then 1-2 advancement resources to pull the learner forward.
6. Prefer well-known, maintained sources. Avoid dead links, course-mill sites, and content farms.
7. Sort by relevance: confusion > current > foundation > practice > advancement > community.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const fixed = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      parsed = JSON.parse(fixed);
    }

    const allowedTypes = new Set([
      "article", "video", "documentation", "book", "course", "tool",
      "podcast", "blog", "community", "github",
    ]);

    const resources = (Array.isArray(parsed.resources) ? parsed.resources : [])
      .filter((r: any) => r && typeof r.url === "string" && /^https?:\/\//i.test(r.url))
      .map((r: any) => ({
        title: String(r.title || "Resource"),
        url: r.url,
        type: allowedTypes.has(r.type) ? r.type : "article",
        source: r.source ? String(r.source) : undefined,
        free: r.free !== false,
        description: String(r.description || ""),
        relevance: r.relevance,
      }));

    return new Response(JSON.stringify({ resources, effectiveLevel, progressPct }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error suggesting resources:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
