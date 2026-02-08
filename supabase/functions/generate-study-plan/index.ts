import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valid enum values for input validation
const VALID_GOAL_TYPES = ['skill', 'concept', 'topic', 'subject', 'habit'] as const;
const VALID_MASTERY_LEVELS = ['awareness', 'understanding', 'application', 'mastery'] as const;
const VALID_TIME_AVAILABILITY = ['1-2', '3-5', '6-8', 'custom'] as const;
const VALID_DURATION_UNITS = ['day', 'week', 'month', 'year'] as const;

interface StudyBlock {
  id: string;
  type: string;
  title: string;
  duration: number;
  description: string;
}

interface StudyPlan {
  day: string;
  blocks: StudyBlock[];
}

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

// Input validation function
function validateInput(body: unknown): { valid: true; data: StudyPlanRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { goalType, description, masteryLevel, timeAvailability, customHours, duration } = body as Record<string, unknown>;

  // Validate goalType
  if (!goalType || typeof goalType !== 'string') {
    return { valid: false, error: 'goalType is required and must be a string' };
  }
  if (!VALID_GOAL_TYPES.includes(goalType as typeof VALID_GOAL_TYPES[number])) {
    return { valid: false, error: `goalType must be one of: ${VALID_GOAL_TYPES.join(', ')}` };
  }

  // Validate description
  if (!description || typeof description !== 'string') {
    return { valid: false, error: 'description is required and must be a string' };
  }
  const trimmedDescription = description.trim();
  if (trimmedDescription.length < 10) {
    return { valid: false, error: 'description must be at least 10 characters' };
  }
  if (trimmedDescription.length > 500) {
    return { valid: false, error: 'description must be at most 500 characters' };
  }

  // Validate masteryLevel
  if (!masteryLevel || typeof masteryLevel !== 'string') {
    return { valid: false, error: 'masteryLevel is required and must be a string' };
  }
  if (!VALID_MASTERY_LEVELS.includes(masteryLevel as typeof VALID_MASTERY_LEVELS[number])) {
    return { valid: false, error: `masteryLevel must be one of: ${VALID_MASTERY_LEVELS.join(', ')}` };
  }

  // Validate timeAvailability
  if (!timeAvailability || typeof timeAvailability !== 'string') {
    return { valid: false, error: 'timeAvailability is required and must be a string' };
  }
  if (!VALID_TIME_AVAILABILITY.includes(timeAvailability as typeof VALID_TIME_AVAILABILITY[number])) {
    return { valid: false, error: `timeAvailability must be one of: ${VALID_TIME_AVAILABILITY.join(', ')}` };
  }

  // Validate customHours when timeAvailability is 'custom'
  if (timeAvailability === 'custom') {
    if (customHours === undefined || customHours === null) {
      return { valid: false, error: 'customHours is required when timeAvailability is custom' };
    }
    if (typeof customHours !== 'number' || !Number.isInteger(customHours)) {
      return { valid: false, error: 'customHours must be an integer' };
    }
    if (customHours < 1 || customHours > 24) {
      return { valid: false, error: 'customHours must be between 1 and 24' };
    }
  }

  // Validate duration (optional, defaults to 1 week)
  let validatedDuration: PlanDuration = { value: 1, unit: 'week' };
  if (duration !== undefined && duration !== null) {
    if (typeof duration !== 'object') {
      return { valid: false, error: 'duration must be an object with value and unit' };
    }
    const { value: durationValue, unit: durationUnit } = duration as Record<string, unknown>;
    if (typeof durationValue !== 'number' || durationValue < 1 || durationValue > 365) {
      return { valid: false, error: 'duration.value must be a number between 1 and 365' };
    }
    if (!durationUnit || typeof durationUnit !== 'string' || !VALID_DURATION_UNITS.includes(durationUnit as typeof VALID_DURATION_UNITS[number])) {
      return { valid: false, error: `duration.unit must be one of: ${VALID_DURATION_UNITS.join(', ')}` };
    }
    validatedDuration = { value: durationValue, unit: durationUnit as PlanDuration['unit'] };
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
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - no user ID in token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validationResult = validateInput(body);
    if (!validationResult.valid) {
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { goalType, description, masteryLevel, timeAvailability, customHours, duration } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const hoursPerDay = timeAvailability === 'custom' 
      ? customHours! 
      : timeAvailability === '1-2' ? 1.5 
      : timeAvailability === '3-5' ? 4 
      : 7;

    // Calculate total days based on duration
    const durationToDays = (d: PlanDuration): number => {
      switch (d.unit) {
        case 'day': return d.value;
        case 'week': return d.value * 7;
        case 'month': return d.value * 30;
        case 'year': return d.value * 365;
        default: return 7;
      }
    };
    
    const totalDays = Math.min(durationToDays(duration!), 365); // Cap at 1 year
    const durationLabel = `${duration!.value} ${duration!.unit}${duration!.value > 1 ? 's' : ''}`;

    const systemPrompt = `You are an expert learning coach that creates personalized study plans. 
You follow the 4Es principle (Engage, Explore, Explain, Execute) and use 5 learning blocks:
- input: Consume new information (videos, reading, lectures)
- breakdown: Break down and analyze concepts
- practice: Hands-on exercises and drills
- output: Create something (write, build, teach)
- review: Spaced repetition and reflection

Create study plans that are:
- Balanced across all 5 blocks
- Time-blocked appropriately
- Progressive throughout the plan duration
- Focused on active learning over passive consumption
- Adapted to the specified duration (${durationLabel})`;

    // Sanitize description for prompt injection prevention
    const sanitizedDescription = description
      .replace(/[<>]/g, '') // Remove potential HTML/XML tags
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
      .substring(0, 500); // Ensure max length

    // Determine number of plan entries based on duration
    const planEntries = Math.min(totalDays, 30); // Max 30 entries for longer plans
    const dayInterval = totalDays > 30 ? Math.ceil(totalDays / 30) : 1;
    
    const userPrompt = `Create a study plan for someone learning over ${durationLabel}:

Goal Type: ${goalType}
Description: ${sanitizedDescription}
Target Mastery Level: ${masteryLevel}
Available Time: ${hoursPerDay} hours per day
Total Duration: ${durationLabel} (${totalDays} days)

Return a JSON array with ${planEntries} objects. ${totalDays > 30 
  ? `Since this is a long-term plan, create entries for key milestone days (every ${dayInterval} days approximately).`
  : `Create one entry for each day.`
} Each entry should have:
- day: string (e.g., "Day 1", "Day 7", "Week 2", etc.)
- blocks: array of study blocks with:
  - id: unique string
  - type: one of "input", "breakdown", "practice", "output", "review"
  - title: specific task title related to their goal
  - duration: minutes (total should roughly equal ${hoursPerDay * 60} minutes)
  - description: brief description of what to do

Make the plan specific to their goal: "${sanitizedDescription}"
Adapt difficulty based on mastery level: ${masteryLevel}

Return ONLY the JSON array, no other text.`;

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
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    let studyPlan: StudyPlan[];
    try {
      // Try to extract JSON from the response (handles markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        studyPlan = JSON.parse(jsonMatch[0]);
      } else {
        studyPlan = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse study plan from AI response");
    }

    return new Response(
      JSON.stringify({ studyPlan }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating study plan:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
