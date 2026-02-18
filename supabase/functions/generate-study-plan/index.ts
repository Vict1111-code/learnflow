import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_GOAL_TYPES = ['skill', 'concept', 'topic', 'subject', 'habit'] as const;
const VALID_MASTERY_LEVELS = ['awareness', 'understanding', 'application', 'mastery'] as const;
const VALID_TIME_AVAILABILITY = ['1-2', '3-5', '6-8', 'custom'] as const;
const VALID_DURATION_UNITS = ['day', 'week', 'month', 'year'] as const;

interface PlanDuration {
  value: number;
  unit: 'day' | 'week' | 'month' | 'year';
}

interface StudyPlanRequest {
  goalType: string;
  description: string;
  masteryLevel: string;
  timeAvailability: string;
  customHours?: number;
  duration?: PlanDuration;
}

function validateInput(body: unknown): { valid: true; data: StudyPlanRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { goalType, description, masteryLevel, timeAvailability, customHours, duration } = body as Record<string, unknown>;

  if (!goalType || typeof goalType !== 'string' || !VALID_GOAL_TYPES.includes(goalType as any)) {
    return { valid: false, error: `goalType must be one of: ${VALID_GOAL_TYPES.join(', ')}` };
  }
  if (!description || typeof description !== 'string') {
    return { valid: false, error: 'description is required' };
  }
  const trimmedDescription = description.trim();
  if (trimmedDescription.length < 3 || trimmedDescription.length > 500) {
    return { valid: false, error: 'description must be 3-500 characters' };
  }
  if (!masteryLevel || typeof masteryLevel !== 'string' || !VALID_MASTERY_LEVELS.includes(masteryLevel as any)) {
    return { valid: false, error: `masteryLevel must be one of: ${VALID_MASTERY_LEVELS.join(', ')}` };
  }
  if (!timeAvailability || typeof timeAvailability !== 'string' || !VALID_TIME_AVAILABILITY.includes(timeAvailability as any)) {
    return { valid: false, error: `timeAvailability must be one of: ${VALID_TIME_AVAILABILITY.join(', ')}` };
  }
  if (timeAvailability === 'custom') {
    if (typeof customHours !== 'number' || customHours < 1 || customHours > 24) {
      return { valid: false, error: 'customHours must be 1-24 when timeAvailability is custom' };
    }
  }

  let validatedDuration: PlanDuration = { value: 1, unit: 'week' };
  if (duration && typeof duration === 'object') {
    const { value: dv, unit: du } = duration as Record<string, unknown>;
    if (typeof dv === 'number' && dv >= 1 && dv <= 365 && typeof du === 'string' && VALID_DURATION_UNITS.includes(du as any)) {
      validatedDuration = { value: dv, unit: du as PlanDuration['unit'] };
    }
  }

  return {
    valid: true,
    data: {
      goalType,
      description: trimmedDescription,
      masteryLevel,
      timeAvailability,
      customHours: typeof customHours === 'number' ? customHours : undefined,
      duration: validatedDuration,
    },
  };
}

/** Robustly extract JSON from an LLM response that may have markdown fences or extra text */
function extractJson(raw: string): unknown {
  // Strip markdown code fences
  let cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Find outermost JSON object
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fix common issues: trailing commas, control characters
    const fixed = cleaned
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    return JSON.parse(fixed);
  }
}

/** Detect if the LLM output was truncated (unbalanced braces/brackets) */
function isTruncated(text: string): boolean {
  const opens = (text.match(/\{/g) || []).length;
  const closes = (text.match(/\}/g) || []).length;
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/\]/g) || []).length;
  return opens !== closes || openBrackets !== closeBrackets;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let body: unknown;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const validationResult = validateInput(body);
    if (!validationResult.valid) {
      return new Response(JSON.stringify({ error: validationResult.error }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { goalType, description, masteryLevel, timeAvailability, customHours, duration } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const hoursPerDay = timeAvailability === 'custom' ? customHours! : timeAvailability === '1-2' ? 1.5 : timeAvailability === '3-5' ? 4 : 7;
    const minutesPerDay = Math.round(hoursPerDay * 60);

    const durationToDays = (d: PlanDuration): number => {
      switch (d.unit) {
        case 'day': return d.value;
        case 'week': return d.value * 7;
        case 'month': return d.value * 30;
        case 'year': return d.value * 365;
        default: return 7;
      }
    };

    const totalDays = Math.min(durationToDays(duration!), 365);
    const durationLabel = `${duration!.value} ${duration!.unit}${duration!.value > 1 ? 's' : ''}`;

    // Cap plan entries to keep response manageable — max 14 days shown
    const planEntries = Math.min(totalDays, 14);
    const isLongPlan = totalDays > 14;
    const dayInterval = isLongPlan ? Math.ceil(totalDays / 14) : 1;

    const sanitizedDescription = description.replace(/[<>]/g, '').replace(/\n{3,}/g, '\n\n').substring(0, 500);

    const systemPrompt = `You are an expert learning coach who creates structured study plans. You MUST respond with ONLY a valid JSON object — no markdown, no explanation, no code fences.

The 4Es methodology:
- Explanation: Learn concepts via reading/videos
- Example: Study worked examples  
- Exercise: Practice with hands-on problems
- Explain-to-others: Teach or write about what you learned

The 5 learning block types:
- input → Explanation (consume new information)
- breakdown → Example (analyze with examples)
- practice → Exercise (hands-on drills)
- output → Explain-to-others (create/teach)
- review → Spaced repetition and reflection`;

    const userPrompt = `Create a study plan for: "${sanitizedDescription}"

Parameters:
- Goal type: ${goalType}
- Target mastery: ${masteryLevel}
- Time available: ${minutesPerDay} minutes per day
- Total duration: ${durationLabel} (${totalDays} days total)

Return ONLY this exact JSON structure (no markdown, no extra text):

{
  "concepts": [
    {
      "id": "c1",
      "name": "Concept Name",
      "description": "One-line description of this concept",
      "prerequisites": [],
      "status": "available",
      "tier": 0,
      "dayRange": "Day 1-3"
    }
  ],
  "studyPlan": [
    {
      "day": "Day 1",
      "conceptId": "c1",
      "blocks": [
        {
          "id": "b1",
          "type": "input",
          "title": "Specific task title",
          "duration": 45,
          "description": "Detailed description of what to do",
          "methodology": "explanation"
        }
      ]
    }
  ],
  "resources": [
    {
      "title": "Resource Name",
      "url": "https://example.com",
      "type": "article",
      "conceptId": "c1",
      "description": "One-line description"
    }
  ]
}

Requirements:
- "concepts": 6-12 nodes forming a prerequisite tree. Tier 0 = foundational (no prerequisites). Higher tiers depend on lower ones. Set status "locked" for concepts with unmet prerequisites, "available" for those with no prerequisites.
- "studyPlan": Exactly ${planEntries} day entries${isLongPlan ? ` (milestone days, every ~${dayInterval} days)` : ', one per day'}. Each day MUST have 3-5 blocks. Block durations should sum to roughly ${minutesPerDay} minutes. Block ids must be unique (use day+block index e.g. "d1b1").
- "resources": 5-8 real, free resources (articles, videos, docs, books). Use real URLs.
- Block type must be one of: input, breakdown, practice, output, review
- methodology must be one of: explanation, example, exercise, explain-to-others, review
- All concept ids referenced in studyPlan and resources must exist in concepts array

IMPORTANT: Return ONLY the JSON object. No markdown fences. No explanation text.`;

    console.log(`Generating plan for: ${sanitizedDescription}, ${planEntries} days, ${minutesPerDay} min/day`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 16000,
        temperature: 0.4,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    console.log(`AI response length: ${content.length} chars`);

    if (isTruncated(content)) {
      console.warn("AI response appears truncated. Attempting partial parse...");
    }

    let parsed: any;
    try {
      parsed = extractJson(content);
    } catch (parseError) {
      console.error("Failed to parse AI response. Raw content (first 2000 chars):", content.substring(0, 2000));
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'unknown parse error'}`);
    }

    const studyPlan = parsed.studyPlan;
    const concepts = parsed.concepts || [];
    const resources = parsed.resources || [];

    if (!Array.isArray(studyPlan) || studyPlan.length === 0) {
      console.error("studyPlan missing or empty in parsed response:", JSON.stringify(parsed).substring(0, 1000));
      throw new Error("AI did not return a valid studyPlan array");
    }

    // Validate and sanitize each day's blocks
    const sanitizedPlan = studyPlan.map((day: any, dayIdx: number) => {
      const dayBlocks = Array.isArray(day.blocks) ? day.blocks : [];
      return {
        day: day.day || `Day ${dayIdx + 1}`,
        conceptId: day.conceptId || null,
        blocks: dayBlocks.map((block: any, blockIdx: number) => ({
          id: block.id || `d${dayIdx + 1}b${blockIdx + 1}`,
          type: ['input', 'breakdown', 'practice', 'output', 'review'].includes(block.type) ? block.type : 'input',
          title: block.title || 'Study Block',
          duration: typeof block.duration === 'number' ? block.duration : 30,
          description: block.description || '',
          methodology: block.methodology || 'explanation',
          completed: false,
          conceptId: block.conceptId || day.conceptId || null,
        })),
      };
    });

    console.log(`Successfully generated: ${concepts.length} concepts, ${sanitizedPlan.length} days, ${resources.length} resources`);

    return new Response(
      JSON.stringify({
        studyPlan: sanitizedPlan,
        concepts,
        resources,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating study plan:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
