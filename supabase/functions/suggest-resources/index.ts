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

    const conceptList = Array.isArray(concepts)
      ? concepts.map((c: any) => `- ${c.name} (${c.status})`).join("\n")
      : "None provided";

    const confusionList = Array.isArray(confusionPatterns) && confusionPatterns.length > 0
      ? confusionPatterns.join(", ")
      : "None reported";

    const systemPrompt = `You are a learning resource curator. You suggest high-quality, FREE learning resources matched to a learner's specific needs. You MUST respond with ONLY a valid JSON object.`;

    const userPrompt = `Suggest 6-10 free learning resources for a learner studying: "${goalDescription}"

Current mastery level: ${masteryLevel || "beginner"}
Concepts in their learning tree:
${conceptList}

Areas of confusion: ${confusionList}

Return ONLY this JSON (no markdown, no fences):
{
  "resources": [
    {
      "title": "Resource Title",
      "url": "https://real-url.com",
      "type": "article",
      "description": "One-line description of why this helps",
      "relevance": "confusion" | "foundation" | "advancement" | "practice"
    }
  ]
}

Requirements:
- type must be one of: article, video, documentation, book, course, tool
- Use REAL URLs to free resources (MDN, freeCodeCamp, YouTube channels, official docs, Khan Academy, Coursera free courses, etc.)
- Prioritize resources that address the learner's confusion patterns
- Include a mix of types (articles, videos, docs, courses)
- Sort by relevance: confusion-targeted first, then foundational, then advancement`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
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

    // Parse JSON from response
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

    const resources = Array.isArray(parsed.resources) ? parsed.resources : [];

    return new Response(JSON.stringify({ resources }), {
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
