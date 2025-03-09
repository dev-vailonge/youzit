import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Validate environment variables
if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
}

// Initialize Supabase client with anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Initialize OpenAI with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add function to get model configuration
const getModelConfiguration = async () => {
  try {
    console.error('Fetching model configuration...');
    
    // Fetch the active model configuration
    const { data, error } = await supabase
      .from('models')
      .select('name, agent')
      .eq('active', true)
      .single();

    console.error('Model configuration query result:', {
      hasData: !!data,
      hasError: !!error,
      errorMessage: error?.message,
      modelData: data ? { name: data.name, agent: data.agent } : null
    });

    if (error) {
      throw new Error(`Failed to fetch model configuration: ${error.message}`);
    }

    if (!data || !data.agent) {
      throw new Error('No active model configuration found in database');
    }

    // Parse the agent string into a JSON object
    const agentConfig = typeof data.agent === 'string' ? JSON.parse(data.agent) : data.agent;

    if (!agentConfig.type || !agentConfig.settings) {
      throw new Error('Invalid model configuration format: missing required fields (type or settings)');
    }

    // Validate required settings
    const requiredSettings = ['temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty'];
    const missingSettings = requiredSettings.filter(setting => !agentConfig.settings[setting]);
    
    if (missingSettings.length > 0) {
      throw new Error(`Invalid model configuration: missing required settings: ${missingSettings.join(', ')}`);
    }

    // Combine the model type with settings
    const config = {
      model: agentConfig.type,
      ...agentConfig.settings
    };

    console.error('Using configuration:', config);
    return config;
  } catch (error) {
    console.error('Error in getModelConfiguration:', error);
    throw error;
  }
};

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
const getPlatformFormat = async (platform: string) => {
  try {
    const { data, error } = await supabase
      .from('model_prompts')
      .select('prompt')
      .eq('platform', platform.toLowerCase())
      .single();

    if (error) {
      console.error('Error fetching platform format:', error);
      return '';
    }

    return data?.prompt || '';
  } catch (error) {
    console.error('Error in getPlatformFormat:', error);
    return '';
  }
};

const cleanScriptResult = (result: string): string => {
  // Make the start marker optional and capture the content up to the end marker
  const fullContent = result.match(/(?:##\s*script results start\s*##\s*)?([\s\S]*?)\s*##\s*script results ends\s*##/i);
  
  if (!fullContent || !fullContent[1]) {
    return ''; // Return empty string if valid content isn't found
  }

  let content = fullContent[1].trim();
  // Remove all asterisks from the content
  content = content.replace(/\*/g, '');
  
  return content;
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
  // Ensure we haven't already sent a response
  let hasResponded = false;
  const sendResponse = (statusCode: number, data: any) => {
    if (!hasResponded) {
      hasResponded = true;
      try {
        // Ensure the response is properly formatted as JSON
        const jsonResponse = {
          ...data,
          timestamp: new Date().toISOString(),
          environment: process.env.VERCEL_ENV || 'development'
        };

        // Set proper content type header
        res.setHeader('Content-Type', 'application/json');
        
        // Send the response
        res.status(statusCode).json(jsonResponse);
      } catch (error) {
        // If JSON serialization fails, send a fallback error response
        console.error('Error sending response:', error);
        res.status(500).json({
          error: 'RESPONSE_ERROR',
          message: 'Erro ao processar resposta',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  try {
    // Add CORS headers first
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
      return sendResponse(200, { status: "ok" });
    }

    // Validate request method
    if (req.method !== "POST") {
      return sendResponse(405, {
        error: "METHOD_NOT_ALLOWED",
        message: "Método não permitido",
        details: `${req.method} não é suportado`
      });
    }

    // Get the auth token from the request header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return sendResponse(401, {
        error: "UNAUTHORIZED",
        message: "Autenticação necessária",
        details: "Token de autenticação ausente ou inválido"
      });
    }

    const token = authHeader.split(" ")[1];

    // Create a new Supabase client with the token
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Verify the token
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return sendResponse(401, {
        error: "UNAUTHORIZED",
        message: "Token inválido",
        details: authError?.message || "Erro de autenticação"
      });
    }

    // Parse and validate request body
    const { prompt, platforms, userId, contextPrompt } = req.body as GenerateRequest;
    
    if (!prompt || !platforms || !userId) {
      return sendResponse(400, {
        error: "INVALID_REQUEST",
        message: "Requisição inválida",
        details: "Prompt, plataformas e ID do usuário são obrigatórios"
      });
    }

    // Verify user ID matches
    if (userId !== user.id) {
      return sendResponse(403, {
        error: "FORBIDDEN",
        message: "Acesso negado",
        details: "ID do usuário não corresponde ao token"
      });
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
            return sendResponse(200, {
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
        // Get platform formats before creating messages
        const platformFormats = await Promise.all(
          platforms.map(async (platform) => await getPlatformFormat(platform))
        );

        const messages: ChatCompletionMessageParam[] = [
          {
            role: "system",
            content: `You are an expert content creator specializing in Portuguese content creation.

CRITICAL INSTRUCTIONS:
1. ALL content MUST be in Portuguese, including section titles, analysis, and scores
2. NEVER use English words or terms
3. Always translate any English content to Portuguese
4. Follow the exact format specified below
5. Every post must include:
   - A strong **Hook** to grab attention  
   - An engaging **Introduction** to build context  
   - A well-structured **Main Content** section with actionable insights  
   - A powerful **Engagement Prompt** to increase interaction  
   - A **Final Takeaway** summarizing key points  
   - A **Call to Action (CTA)** to drive specific audience actions  
6. At the end of the response, provide:  
   - **5 Benefits** of using this structure  
   - **5 Tips** to improve engagement and reach 

Your response must follow this format EXACTLY:

## script results start ##
[Content following platform structure - ALL IN PORTUGUESE]
## script results ends ##

## content analyses start ##
- Potencial de Engajamento (Pontuação: 8/10): Uma explicação detalhada do por que esse conteúdo tem alto potencial de engajamento
- Apelo ao Público-Alvo (Pontuação: 7/10): Uma análise do quanto o conteúdo ressoa com o público pretendido
- Eficácia do Gancho (Pontuação: 9/10): Avaliação da força do gancho inicial e sua capacidade de capturar atenção
- Força da Chamada para Ação (Pontuação: 8/10): Análise da eficácia da CTA em motivar a ação do usuário
- SEO/Descoberta (Pontuação: 7/10): Avaliação da otimização para descoberta e alcance orgânico
- Impacto Emocional (Pontuação: 8/10): Análise da capacidade do conteúdo de gerar conexão emocional
- Fatores de Compartilhamento (Pontuação: 9/10): Avaliação do potencial viral e compartilhável do conteúdo
## content analyses ends ##

## viral score start ##
Pontuação Viral: 85
## viral score ends ##

IMPORTANT: 
- Replace all example scores above with YOUR actual analysis scores (1-10)
- Replace all example descriptions with YOUR actual analysis in Portuguese
- The viral score must be a number between 1 and 100
- DO NOT use placeholders like 'X/10' or '[Explicação]'
- Each analysis item MUST follow the exact format: "- Title (Pontuação: N/10): Detailed description"
- ALL text MUST be in Portuguese
- Do not use any English terms`,
          },
          {
            role: "user",
            content: `Create content about "${prompt}" for ${platforms.join(", ")}.
Platform format: ${platformFormats.join("\n")}
Context: ${contextPrompt ? JSON.stringify(contextPrompt) : 'None'}`
          }
        ];

        // Get model configuration
        const modelConfig = await getModelConfiguration();
        
        console.error("OpenAI request details:", {
          ...modelConfig,
          messageCount: messages.length,
          systemMessageLength: messages[0]?.content?.length ?? 0,
          userMessageLength: messages[1]?.content?.length ?? 0,
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
          const timeoutMs = 60000; // 60 seconds
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('OpenAI request timed out')), timeoutMs);
          });

          console.log('Starting OpenAI API call...');
          console.log('Using model configuration:', modelConfig);
          
          completion = await Promise.race([
            openai.chat.completions.create({
              ...modelConfig,
              messages,
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

          // Return a properly formatted error response
          return sendResponse(500, {
            error: "OPENAI_ERROR",
            message: "Erro ao gerar conteúdo",
            details: error.message || "Unknown OpenAI error",
            type: error.type || 'unknown',
            isTimeout: error.message === 'OpenAI request timed out',
            status: error.status || 500,
            errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
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
        return sendResponse(500, {
          error: "REQUEST_SETUP_ERROR",
          message: "Erro ao configurar requisição",
          details: error.message || "Unknown setup error",
          type: error.name || 'unknown'
        });
      }

      if (!completion?.choices?.[0]?.message?.content) {
        console.error("No content in OpenAI response");
        return sendResponse(500, {
          error: "NO_CONTENT_ERROR",
          message: "Nenhum conteúdo foi gerado",
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
          const scriptRegex = /## script results start ##\s*([\s\S]*?)\s*## script results ends ##/i;
          const scriptMatch = result.match(scriptRegex);
          
          if (scriptMatch && scriptMatch[1]) {
            mainContent = scriptMatch[1].trim();
            // Remove any remaining analysis or score sections that might be inside
            mainContent = mainContent
              .replace(/## content analyses start ##[\s\S]*?## content analyses ends ##/gi, '')
              .replace(/## viral score start ##[\s\S]*?## viral score ends ##/gi, '')
              .trim();
          } else {
            console.error('No script content found between markers');
            mainContent = '';
          }
        } catch (error) {
          console.error(`Error extracting main content: ${error}`);
          mainContent = '';
        }

        console.log(`Cleaned content for ${platform}:`, mainContent); // Debug log

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
                script_result: cleanScriptResult(mainContent),
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
        return sendResponse(200, {
          success: true,
          id: firstPromptId,
          script_result: cleanScriptResult(result),
          content_analysis: contentAnalysis,
          viral_score: averageViralScore,
        });
      } catch (dbError: any) {
        console.error("Database operation failed:", dbError);
        return sendResponse(500, {
          error: "DATABASE_ERROR",
          message: "Erro ao salvar no banco de dados",
          details: dbError.message || "Unknown database error",
          type: dbError.name || 'unknown',
          errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
        });
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
      return sendResponse(500, {
        error: "UNEXPECTED_ERROR",
        message: "Ocorreu um erro inesperado",
        details: error.message || "Unknown error",
        type: error.name || 'unknown',
        errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
      });
    }
  } catch (error: any) {
    console.error("Error in API handler:", error);
    return sendResponse(500, {
      error: "SERVER_ERROR",
      message: "Erro ao processar requisição",
      details: error.message || "Erro desconhecido"
    });
  }
}
