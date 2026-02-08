import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { goalType, description, masteryLevel, timeAvailability, customHours } = await req.json();

    const hoursPerDay = timeAvailability === 'custom' 
      ? customHours 
      : timeAvailability === '1-2' ? 1.5 
      : timeAvailability === '3-5' ? 4 
      : 7;

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
- Progressive throughout the week
- Focused on active learning over passive consumption`;

    const userPrompt = `Create a 7-day study plan for someone learning:

Goal Type: ${goalType}
Description: ${description}
Target Mastery Level: ${masteryLevel}
Available Time: ${hoursPerDay} hours per day

Return a JSON array with 7 objects (one per day, Monday through Sunday). Each day should have:
- day: string (e.g., "Monday")
- blocks: array of study blocks with:
  - id: unique string
  - type: one of "input", "breakdown", "practice", "output", "review"
  - title: specific task title related to their goal
  - duration: minutes (total should roughly equal ${hoursPerDay * 60} minutes)
  - description: brief description of what to do

Make the plan specific to their goal: "${description}"
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
