import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

// Validate environment variables
if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize OpenAI with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add contextPrompt to the request type
interface GenerateRequest {
  prompt: string;
  platforms: string[];
  userId: string;
  contextPrompt?: {
    title: string;
    content: string;
    viralScore: number;
  };
}

// Add a helper function to get platform format
const getPlatformFormat = (platform: string) => {
  const formats: { [key: string]: string } = {
    youtube: `1. YOUTUBE SCRIPT FORMAT (FULL DETAILED SCRIPT REQUIRED):
[Hook - 5-10 seconds]
• Must include attention-grabbing statement/question
• Example: "Did you know..."

[Introduction - 15-30 seconds]
• Topic introduction
• Why it matters
• Content overview

[Main Content - 3-7 minutes]
Session 1: {Key concept + example}
Session 2: {Step-by-step breakdown}
Session 3: {Real-world application}

[Engagement Prompt]
• Direct audience interaction question

[Final Takeaways - 30-60 seconds]
• Key points recap
• Bonus tip

[Call to Action - 10 seconds]
• Like, subscribe, related content`,

    instagram: `2. INSTAGRAM FORMAT:
REELS (15-60 seconds):
[Hook - 3 seconds]
[Main Content - 10-40 seconds]
[CTA - 5-10 seconds]

CAROUSEL:
Slide 1: {Hook}
Slides 2-6: {Step-by-step content}
Final Slide: {Strong CTA}`,

    newsletter: `3. NEWSLETTER FORMAT:
[Subject Line]: {Compelling headline}
[Preview Text]: {1-2 sentence teaser}
[Introduction]: {Story/hook}
[Main Body]:
• Section 1: {Problem definition}
• Section 2: {Solutions/examples}
• Section 3: {Action steps}
[CTA]: {Clear next step}`,

    linkedin: `4. LINKEDIN FORMAT:
[Opening Hook]: {Attention-grabber}
[Story]: {Personal experience}
[Main Points]: {3-5 insights}
[Engagement Q]: {Discussion prompt}
[CTA]: {Clear action step}`,

    twitter: `5. TWITTER THREAD:
[Tweet 1]: {Hook + thread preview}
Tweets 2-8: {Main content points}
Final Tweet: {Engagement CTA}`,

    facebook: `6. FACEBOOK POST:
[Hook]: {Relatable opening}
[Story]: {Main content in chunks}
[Question]: {Engagement prompt}
[CTA]: {Clear action step}`,
  };

  return formats[platform.toLowerCase()] || "";
};

const generatePrompt = (
  prompt: string,
  platform: string
) => `Create engaging content for ${platform} about: ${prompt}

Please structure your response in the following format:

For ${platform}:

Content Analysis:
- Engagement Potential (Score: X/10): [Description of engagement potential]
- Target Audience Appeal (Score: X/10): [Description of target audience appeal]
- Hook Effectiveness (Score: X/10): [Description of hook effectiveness]
- Call-to-Action Strength (Score: X/10): [Description of call-to-action strength]
- SEO/Discoverability (Score: X/10): [Description of SEO potential]
- Emotional Impact (Score: X/10): [Description of emotional impact]
- Shareability Factors (Score: X/10): [Description of shareability]

Viral Score: [Calculate average of all scores multiplied by 10]

[Hook- 5-10 seconds]
[Attention-grabbing opening]

[Introduction - 15-30 seconds]
[Brief overview and context]

[Main Content - 3-7 minutes]
[Detailed content broken into sections]

[Engagement Prompt]
[Question or call to action to encourage engagement]

[Final Takeaways - 30-60 seconds]
[Summary and key points]

[Call to Action - 10 seconds]
[Clear call to action for viewers]`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("API handler started");
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Validate request method
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get the auth token from the request header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.split(" ")[1];

    // Create a new Supabase client with the token
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      db: {
        schema: "public",
      },
    });

    // Add error logging for database connection
    try {
      const { error } = await supabase.from("prompts").select("id").limit(1);
      if (error) {
        console.error("Database connection test failed:", error);
      }
    } catch (error) {
      console.error("Failed to connect to database:", error);
    }

    // Verify the token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    console.log("Auth check:", { userId: user?.id, error: authError });

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid authorization token" });
    }

    // Parse and validate request body
    let body: GenerateRequest;
    try {
      body = JSON.parse(JSON.stringify(req.body));
    } catch (e) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const { prompt, platforms, userId, contextPrompt } = body;

    // Validate required fields
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (!Array.isArray(platforms) || platforms.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one platform is required" });
    }

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Check user authentication
    if (user.id !== userId) {
      return res.status(403).json({ error: "User ID mismatch" });
    }

    // Normalize the prompt by trimming and converting to lowercase
    const normalizedPrompt = prompt.trim().toLowerCase();

    // Check for existing prompts with same content for each platform
    try {
      // Check each platform separately
      for (const platform of platforms) {
        try {
          const { data: existingPrompts, error: searchError } = await supabase
            .from("prompts")
            .select("*")
            .eq("user_id", userId)
            .eq("hidden", false)
            .eq("platform",platform)
            .eq("prompt_text", normalizedPrompt);

          if (!searchError && existingPrompts && existingPrompts.length > 0) {
            const existingPrompt = existingPrompts[0];
            return res.status(200).json({
              result: existingPrompt.script_result,
              contentAnalysis: existingPrompt.content_analysis,
              isExisting: true,
            });
          }
        } catch (searchError) {
          // Log error but continue with OpenAI generation
          console.warn("Error checking existing prompts:", searchError);
        }
      }

      // Continue with OpenAI generation regardless of search errors
      console.log("Starting OpenAI completion");
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert content creator who MUST follow exact formatting requirements. Generate detailed, platform-specific content following these strict structures:

===== PLATFORM FORMATS =====

${platforms
  .map((platform) => getPlatformFormat(platform))
  .filter(Boolean)
  .join("\n\n")}

===== RESPONSE FORMAT =====

For [Platform Name]:

## viral score start ##
Pontuação Viral: [0-100]
## viral score ends ##

## content analyses start ##
- Potencial de Engajamento (Pontuação: X/10): [Explicação]
- Apelo ao Público-Alvo (Pontuação: X/10): [Explicação]
- Eficácia do Gancho (Pontuação: X/10): [Explicação]
- Força da Chamada para Ação (Pontuação: X/10): [Explicação]
- SEO/Descoberta (Pontuação: X/10): [Explicação]
- Impacto Emocional (Pontuação: X/10): [Explicação]
- Fatores de Compartilhamento (Pontuação: X/10): [Explicação]
## content analyses ends ##

## script results start ##
[DETAILED content following exact platform structure above]
## script results ends ##

IMPORTANT:
- MUST include numeric scores (X/10) for each analysis point
- DO NOT summarize or shorten content
- MUST follow complete structure for each platform
- Include all sections as outlined
- Maintain platform-specific tone and style
- ALL content MUST be in Portuguese, including section titles and scores
- MUST use the exact section markers (##) as shown above
- DO NOT use English terms, translate everything to Portuguese

Example of the EXACT format to follow:

## viral score start ##
Pontuação Viral: 85
## viral score ends ##

## content analyses start ##
- Potencial de Engajamento (Pontuação: 8/10): [Explicação em português]
...
## content analyses ends ##

${
  contextPrompt
    ? `
Consider this previous content as context:
Title: ${contextPrompt.title}
Content: ${contextPrompt.content}
Viral Score: ${contextPrompt.viralScore}

The title of the previous content is: ${contextPrompt.title}, use this this in your generated output as well, maintaining the same tone and style.
`
    : ""
}`,
          },
          {
            role: "user",
            content: `Generate detailed content about "${prompt}" for these platforms: ${platforms.join(
              ", "
            )}.

REQUIREMENTS:
1. Follow EXACT format for each platform
2. Write FULL scripts (no summaries)
3. Include ALL sections with their markers
4. Make content IMMEDIATELY usable
5. Ensure viral potential
6. Keep the tone and style consistent with the original
7. Ensure the new content naturally builds upon the provided context
8. MUST use the section markers (##) exactly as shown

The content should be ready to use without additional editing.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      if (!completion.choices[0]?.message?.content) {
        throw new Error("No content generated");
      }

      const result = completion.choices[0].message.content;
      console.log("OpenAI response received, length:", result.length);

      // Parse content analysis and viral scores for each platform
      const contentAnalysis: Record<string, any> = {};
      const viralScores: Record<string, number> = {};

      platforms.forEach((platform) => {
        // Extract viral score using markers - prioritize Portuguese format
        const viralScoreRegex = new RegExp(
          `## viral score start ##\\s*Pontuação Viral:\\s*(\\d+)\\s*## viral score ends ##`,
          "i"
        );
        const viralScoreMatch = result.match(viralScoreRegex);
        viralScores[platform] = viralScoreMatch
          ? parseInt(viralScoreMatch[1], 10)
          : 0;

        try {
          // Extract content analysis using markers
          const analysisRegex = /## content analyses start ##([\s\S]*?)## content analyses ends ##/i;
          const analysisMatch = result.match(analysisRegex);

          if (analysisMatch) {
            const analysisContent = analysisMatch[1].trim();
            // Updated regex to handle both English and Portuguese formats
            const itemRegex =
              /-\s*([\wÀ-ÿ\s/-]+)\s*\((?:Score|Pontuação):\s*(\d+)\/10\):\s*([^\n]+)/g;

            contentAnalysis[platform.toLowerCase()] = [];
            let match;

            console.log("Analysis content to parse:", analysisContent);

            while ((match = itemRegex.exec(analysisContent))) {
              const [fullMatch, title, score, description] = match;
              console.log("Matched analysis item:", { fullMatch, title, score, description });
              contentAnalysis[platform.toLowerCase()].push({
                title: title.trim(),
                score: parseInt(score, 10),
                description: description.trim(),
              });
            }
          }
        } catch (error) {
          console.error(
            `Error parsing content analysis for ${platform}:`,
            error
          );
          contentAnalysis[platform.toLowerCase()] = [];
        }

        // Extract main content using markers
        let mainContent = '';
        try {
          const scriptRegex = /## script results start ##([\s\S]*?)## script results ends ##/i;
          const scriptMatch = result.match(scriptRegex);
          if (scriptMatch) {
            mainContent = scriptMatch[1].trim();
          }
        } catch (error) {
          console.error(`Error extracting main content: ${error}`);
        }

        console.log(`\nPlatform ${platform}:`);
        console.log("Viral Score:", viralScores[platform]);
        console.log(
          "Content Analysis:",
          JSON.stringify(contentAnalysis[platform.toLowerCase()], null, 2)
        );
      });

      // Calculate average viral score
      const averageViralScore = Math.round(
        Object.values(viralScores).reduce((sum, score) => sum + score, 0) /
          Object.values(viralScores).length
      );

      console.log("\nFinal parsed data:");
      console.log("Viral Scores:", viralScores);
      console.log("Average Viral Score:", averageViralScore);
      console.log(
        "Content Analysis:",
        JSON.stringify(contentAnalysis, null, 2)
      );

      // Store in Supabase with properly formatted content_analysis
      try {
        let firstPromptId: string | null = null;
        let insertedCount = 0;

        // For each platform, store a separate entry
        for (const platform of platforms) {
          console.log(`\nProcessing ${platform}`);

          try {
            // Find content between platform header and next platform or end
            const platformRegex = new RegExp(
              `Para ${platform}:([\\s\\S]*?)(?=Para [A-Za-z]+:|$)`,
              "i"
            );
            const platformMatch = result.match(platformRegex);
            let mainContent = platformMatch ? platformMatch[1].trim() : null;

            if (!mainContent) {
              console.error(
                `No content found for ${platform}, using full response`
              );
              mainContent = result; // Use full response if we can't extract platform-specific content
            }

            // Try to clean up the content, but keep original if cleaning fails
            try {
              // First find the actual script content - it comes after all the metadata
              const scriptMatch = mainContent.match(
                /\[(?:Hook.*?|Subject Line|Tweet \d+|Opening Hook)]([\s\S]*)$/i
              );
              // [Subject Line], [Tweet 1], [Opening Hook]

              if (scriptMatch) {
                mainContent = scriptMatch[0]
                  .trim()
                  // Remove any empty lines at the end
                  .replace(/\n+$/, "");
              }

              console.log(`Cleaned content for ${platform}:`, mainContent); // Debug log
            } catch (cleanError) {
              console.warn(
                `Error cleaning content for ${platform}, using raw content:`,
                cleanError
              );
            }

            // Insert into Supabase and get the ID back
            const { data: insertedPrompt, error: insertError } = await supabase
              .from("prompts")
              .insert({
                user_id: userId,
                platform: platform,
                prompt_text: normalizedPrompt,
                script_result: mainContent,
                content_analysis: contentAnalysis[platform.toLowerCase()] || [],
                viral_score: viralScores[platform] || 0,
                hidden: false,
              })
              .select("id")
              .single();

            if (insertError) {
              console.error(`Insert error for ${platform}:`, insertError);
              continue; // Skip this platform but continue with others
            }

            if (!insertedPrompt?.id) {
              console.error(`No ID returned for ${platform}`);
              continue;
            }

            // Store the ID of the first platform's prompt to return
            if (!firstPromptId) {
              firstPromptId = insertedPrompt.id;
            }
            insertedCount++;
          } catch (error) {
            console.error(`Error processing ${platform}:`, error);
            throw error;
          }
        }

        // Verify we have at least one successful insert
        if (insertedCount === 0 || !firstPromptId) {
          throw new Error("No prompts were successfully created");
        }

        // After the loop, return the first prompt's ID
        return res.status(200).json({
          id: firstPromptId,
          script_result: result,
          content_analysis: contentAnalysis,
          viral_score: averageViralScore,
        });
      } catch (dbError: any) {
        console.error("Database operation failed:", dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
      return res.status(500).json({
        error: "An unexpected error occurred",
        details: error.message,
      });
    }
  } catch (error: any) {
    console.error("Handler error:", error);
    return res.status(500).json({
      error: "An unexpected error occurred",
      details: error.message,
    });
  }
}
