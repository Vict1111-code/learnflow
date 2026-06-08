import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_TYPES = new Set([
  "article", "video", "documentation", "book", "course", "tool",
  "podcast", "blog", "community", "github",
]);

async function checkUrl(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 5000);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 LearnFlowBot/1.0" },
    });
    // Some servers reject HEAD with 4xx/405 — retry with GET (range to limit bytes)
    if (!res.ok && (res.status === 405 || res.status === 403 || res.status === 400)) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 LearnFlowBot/1.0", "Range": "bytes=0-1024" },
      });
    }
    return res.ok || res.status === 206;
  } catch {
    return false;
  } finally {
    clearTimeout(to);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { goalDescription, masteryLevel, concepts, confusionPatterns } = body;

    if (!goalDescription || typeof goalDescription !== "string") {
      return new Response(JSON.stringify({ error: "goalDescription is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const completed: string[] = [];
    const available: string[] = [];
    const locked: string[] = [];
    const conceptIdByName = new Map<string, string>();
    if (Array.isArray(concepts)) {
      for (const c of concepts) {
        const name = (c as any).name;
        const status = (c as any).status;
        if (!name) continue;
        if ((c as any).id) conceptIdByName.set(name.toLowerCase(), (c as any).id);
        if (status === "completed") completed.push(name);
        else if (status === "available" || status === "in_progress") available.push(name);
        else locked.push(name);
      }
    }

    const total = completed.length + available.length + locked.length;
    const progressPct = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    const levelOrder = ["beginner", "intermediate", "advanced"];
    const baseIdx = Math.max(0, levelOrder.indexOf((masteryLevel || "beginner").toLowerCase()));
    const effectiveIdx = progressPct >= 60 ? Math.min(2, baseIdx + 1) : baseIdx;
    const effectiveLevel = levelOrder[effectiveIdx];

    const focusList = available.length > 0 ? available : (locked.slice(0, 3));
    const confusionList = Array.isArray(confusionPatterns) && confusionPatterns.length > 0
      ? confusionPatterns.join(", ") : "None reported";

    const systemPrompt = `You are an expert learning resource curator. You ONLY recommend FREE, currently-online, high-quality resources from well-known reputable sources. You MUST respond with ONLY a valid JSON object — no markdown, no commentary.`;

    const userPrompt = `Curate 12-16 FREE learning resources for a learner whose goal is: "${goalDescription}".

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
      "url": "https://canonical-long-lived-url",
      "type": "article" | "video" | "documentation" | "book" | "course" | "tool" | "podcast" | "blog" | "community" | "github",
      "source": "Publisher / channel / org name",
      "free": true,
      "description": "One short sentence on the resource itself",
      "relatedConcepts": ["Exact concept names from the learner's skill tree this resource directly helps with"],
      "rationale": "One short sentence: WHY this fits THIS learner right now given their current level and the listed concepts",
      "relevance": "confusion" | "foundation" | "current" | "advancement" | "practice" | "community"
    }
  ]
}

Strict requirements:
1. EVERY resource MUST be free, no paywall. Mark "free": true. NEVER include paid books or paid courses.
2. URLs MUST be REAL and to canonical, long-lived pages (publisher root pages, official docs, channel pages, repo roots, subreddit roots). NEVER invent URLs. NEVER deep-link to article slugs you are not certain still exist.
3. Match the EFFECTIVE level (${effectiveLevel}).
4. Cover a DIVERSE mix of formats. Aim for at least one of EACH where it makes sense: documentation, video, article/blog, free book, free course, podcast, community, tool, github repo.
5. "relatedConcepts" MUST be drawn verbatim from this list (use the exact strings): ${[...completed, ...available, ...locked].slice(0, 30).join(" | ") || "(no concepts provided)"}. If a resource is general, use the closest concept(s) instead of leaving the array empty.
6. Prioritise resources that directly address "Currently working on" concepts and any confusion areas; then foundation reinforcement, then 1-2 advancement resources.
7. Prefer well-known, maintained sources. Avoid dead links, content farms, course-mill sites.
8. Sort by relevance: confusion > current > foundation > practice > advancement > community.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) cleaned = cleaned.substring(start, end + 1);

    let parsed: any;
    try { parsed = JSON.parse(cleaned); }
    catch { parsed = JSON.parse(cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")); }

    const raw = (Array.isArray(parsed.resources) ? parsed.resources : [])
      .filter((r: any) => r && typeof r.url === "string" && /^https?:\/\//i.test(r.url))
      .map((r: any) => {
        const relatedNames: string[] = Array.isArray(r.relatedConcepts)
          ? r.relatedConcepts.filter((x: any) => typeof x === "string")
          : [];
        const relatedIds = relatedNames
          .map(n => conceptIdByName.get(n.toLowerCase()))
          .filter((x): x is string => !!x);
        return {
          title: String(r.title || "Resource"),
          url: r.url,
          type: ALLOWED_TYPES.has(r.type) ? r.type : "article",
          source: r.source ? String(r.source) : undefined,
          free: r.free !== false,
          description: String(r.description || ""),
          relatedConcepts: relatedNames,
          relatedConceptIds: relatedIds,
          rationale: r.rationale ? String(r.rationale) : undefined,
          relevance: r.relevance,
        };
      });

    // Background URL validation (parallel, capped) — drop unreachable links
    const checks = await Promise.all(raw.map((r: any) => checkUrl(r.url)));
    const resources = raw.filter((_: any, i: number) => checks[i]);
    const droppedCount = raw.length - resources.length;

    return new Response(
      JSON.stringify({ resources, effectiveLevel, progressPct, droppedCount, validated: raw.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error suggesting resources:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
