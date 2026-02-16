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
  if (trimmedDescription.length < 10 || trimmedDescription.length > 500) {
    return { valid: false, error: 'description must be 10-500 characters' };
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

    const sanitizedDescription = description.replace(/[<>]/g, '').replace(/\n{3,}/g, '\n\n').substring(0, 500);
    const planEntries = Math.min(totalDays, 30);
    const dayInterval = totalDays > 30 ? Math.ceil(totalDays / 30) : 1;

    const systemPrompt = `You are an expert learning coach. You create structured study plans using the 4Es methodology and 5 learning blocks.

The 4Es methodology:
1. Explanation - Learn and understand concepts through reading, videos, lectures
2. Example - Study worked examples and case studies
3. Exercise - Practice with hands-on problems and drills
4. Explain-to-others - Teach, write about, or present what you learned

The 5 learning blocks map to these:
- input: Consume new information (maps to Explanation)
- breakdown: Analyze concepts with examples (maps to Example)
- practice: Hands-on exercises and drills (maps to Exercise)
- output: Create, teach, or explain to others (maps to Explain-to-others)
- review: Spaced repetition, reflection, self-assessment

You also identify concept dependencies — what concepts must be learned before others.`;

    const userPrompt = `Create a comprehensive study plan for learning over ${durationLabel}:

Goal Type: ${goalType}
Description: ${sanitizedDescription}
Target Mastery Level: ${masteryLevel}
Available Time: ${hoursPerDay} hours per day
Total Duration: ${durationLabel} (${totalDays} days)

Return a JSON object with TWO keys:

1. "concepts" - An array of concept nodes for a dependency graph. Each concept:
   - id: unique string (e.g., "c1", "c2")
   - name: short concept name
   - description: one-line description
   - prerequisites: array of concept ids that must be completed first (empty for foundational concepts)
   - status: "locked" (has unmet prerequisites) or "available" (no prerequisites or all met)
   - tier: number (0 for foundational, 1 for next level, etc.) — represents depth in the dependency tree
   - dayRange: string (e.g., "Day 1-3") — when this concept appears in the plan

Generate 8-15 concepts that form a meaningful prerequisite tree for "${sanitizedDescription}".

2. "studyPlan" - An array with ${planEntries} day objects. ${totalDays > 30 ? `Create entries for key milestone days (every ${dayInterval} days).` : `One entry per day.`} Each:
   - day: string (e.g., "Day 1", "Week 2")
   - conceptId: the concept id this day focuses on
   - blocks: array of study blocks with:
     - id: unique string
     - type: one of "input", "breakdown", "practice", "output", "review"
     - title: specific task title
     - duration: minutes (total ≈ ${hoursPerDay * 60} minutes)
     - description: what to do
     - methodology: which of the 4Es this maps to ("explanation", "example", "exercise", "explain-to-others", or "review")

3. "resources" - An array of 5-10 free learning resources. Each:
   - title: resource name
   - url: direct URL to the resource
   - type: "article" | "video" | "documentation" | "book" | "course" | "tool"
   - conceptId: which concept this resource is most relevant to
   - description: one-line description

Make the plan specific to: "${sanitizedDescription}"
Adapt difficulty for mastery level: ${masteryLevel}

Return ONLY valid JSON, no markdown or other text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    let parsed: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(content);
      }
    } catch (parseError) {
      // Fallback: try to find array (old format)
      try {
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          const studyPlan = JSON.parse(arrayMatch[0]);
          parsed = { studyPlan, concepts: [], resources: [] };
        } else {
          throw parseError;
        }
      } catch {
        console.error("Failed to parse AI response:", content);
        throw new Error("Failed to parse study plan");
      }
    }

    return new Response(
      JSON.stringify({
        studyPlan: parsed.studyPlan || parsed,
        concepts: parsed.concepts || [],
        resources: parsed.resources || [],
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
