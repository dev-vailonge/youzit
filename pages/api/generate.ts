import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

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
  email: string;
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
  console.error("API handler started");
  
  // Log environment variables (safely)
  console.error("Environment check:", {
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
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
      console.error("Missing or invalid authorization header");
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.split(" ")[1];
    console.error("Token received:", token ? "present" : "missing");

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
    });

    // Verify the token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    console.error("Auth check:", { 
      userId: user?.id, 
      hasError: !!authError,
      errorMessage: authError?.message 
    });

    if (authError || !user) {
      return res.status(401).json({ 
        error: "Invalid authorization token",
        details: authError?.message 
      });
    }

    // Parse and validate request body
    let body: GenerateRequest;
    try {
      body = JSON.parse(JSON.stringify(req.body));
      console.error("Request body:", {
        hasPrompt: !!body.prompt,
        promptLength: body.prompt?.length,
        platforms: body.platforms?.length,
        hasUserId: !!body.userId,
        hasEmail: !!body.email,
      });
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return res.status(400).json({ 
        error: "Invalid request body",
        details: e instanceof Error ? e.message : "Unknown error"
      });
    }

    // Validate required fields
    if (!body.prompt || !body.platforms || !body.userId || !body.email) {
      console.error("Missing required fields:", {
        hasPrompt: !!body.prompt,
        hasPlatforms: !!body.platforms,
        hasUserId: !!body.userId,
        hasEmail: !!body.email,
      });
      return res.status(400).json({
        error: "Missing required fields",
        details: "Please provide all required fields: prompt, platforms, userId, and email"
      });
    }

    // Verify user ID matches
    if (body.userId !== user.id) {
      console.error("User ID mismatch:", {
        requestUserId: body.userId,
        sessionUserId: user.id
      });
      return res.status(403).json({
        error: "Unauthorized",
        details: "User ID does not match authenticated user"
      });
    }

    const { prompt, platforms, userId, contextPrompt, email } = body;

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
      let completion;
      try {
        // Log the exact request we're about to make
        const messages: ChatCompletionMessageParam[] = [
          {
            role: "system",
            content: `You are an expert content creator. Generate content in Portuguese following this format:

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
[Content following platform structure]
## script results ends ##`,
          },
          {
            role: "user",
            content: `Create content about "${prompt}" for ${platforms.join(", ")}.
Platform format: ${platforms.map((platform) => getPlatformFormat(platform)).join("\n")}
Context: ${contextPrompt ? JSON.stringify(contextPrompt) : 'None'}`
          }
        ];

        console.error("OpenAI request details:", {
          model: "gpt-3.5-turbo",
          messageCount: messages.length,
          systemMessageLength: messages[0]?.content?.length ?? 0,
          userMessageLength: messages[1]?.content?.length ?? 0,
          temperature: 0.7,
          max_tokens: 2000,
        });

        try {
          // Verify OpenAI client is initialized
          if (!openai) {
            throw new Error("OpenAI client not initialized");
          }

          // Verify API key is present
          if (!process.env.OPENAI_API_KEY) {
            throw new Error("OpenAI API key is missing");
          }

          // Make the API call with timeout
          const timeoutMs = 25000; // 25 seconds
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('OpenAI request timed out')), timeoutMs);
          });

          console.error('Starting OpenAI API call...');
          completion = await Promise.race([
            openai.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages,
              temperature: 0.7,
              max_tokens: 2000,
            }),
            timeoutPromise
          ]) as OpenAI.Chat.Completions.ChatCompletion;
          console.error('OpenAI API call completed successfully');

        } catch (error: any) {
          // Log the raw error first
          console.error('Raw OpenAI error:', error);
          
          // Then log structured error information
          console.error('OpenAI API Error Details:', {
            name: error.name,
            message: error.message,
            type: error.type,
            status: error.status,
            stack: error.stack?.split('\n'),
            isTimeout: error.message === 'OpenAI request timed out',
            isAxiosError: error.isAxiosError,
            response: error.response ? {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data
            } : null
          });

          // Return a detailed error response
          return res.status(500).json({
            error: "Erro ao gerar conteúdo",
            details: error.message,
            type: error.type || 'unknown',
            isTimeout: error.message === 'OpenAI request timed out',
            status: error.status
          });
        }

        // Log successful completion details
        console.error('OpenAI completion details:', {
          model: completion.model,
          object: completion.object,
          created: completion.created,
          usage: completion.usage,
          choices: completion.choices?.map(c => ({
            finish_reason: c.finish_reason,
            hasContent: !!c.message?.content,
            contentLength: c.message?.content?.length
          }))
        });

      } catch (error: any) {
        console.error("Unexpected error during OpenAI request setup:", error);
        return res.status(500).json({
          error: "Erro ao configurar requisição",
          details: error.message
        });
      }

      if (!completion?.choices?.[0]?.message?.content) {
        console.error("No content in OpenAI response");
        return res.status(500).json({
          error: "No content generated",
          details: "The AI model did not return any content"
        });
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
