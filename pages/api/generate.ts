import { NextRequest } from 'next/server';
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export const config = {
  runtime: 'edge',
  regions: ['cdg1'], // Specify the region(s) to deploy to
};

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

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
}

// Initialize OpenAI with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a function to get Supabase admin client
const getSupabaseAdmin = () => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase configuration');
    }

    // Create client with specific configuration for Edge runtime
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
  } catch (error: any) {
    console.error('Error in getSupabaseAdmin:', {
      message: error.message,
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
    throw new Error(`Failed to initialize Supabase client: ${error.message}`);
  }
};

// Add function to get model configuration
const getModelConfiguration = async () => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Fetch the active model configuration
    const { data, error } = await supabaseAdmin
      .from('models')
      .select('name, agent')
      .eq('active', true)
      .single();

    if (error) {
      throw error;
    }

    if (!data || !data.agent) {
      throw new Error('No active model configuration found');
    }

    // Parse the agent string into a JSON object
    const agentConfig = typeof data.agent === 'string' ? JSON.parse(data.agent) : data.agent;

    return {
      model: agentConfig.type,
      ...agentConfig.settings
    };
  } catch (error: any) {
    console.error('Error in getModelConfiguration:', error);
    throw new Error(`Failed to fetch model configuration: ${error.message}`);
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

// Add these interfaces at the top of the file with other interfaces
interface ContentAnalysisItem {
  title: string;
  score: number;
  description: string;
}

interface PlatformTemplate {
  template: string;
}

interface Prompt {
  text: string;
}

// Add function to get prompt
const getPrompt = async (): Promise<Prompt> => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('prompt')
      .select('text')
      .single();

    if (error) {
      console.error('Error fetching prompt:', error);
      throw error;
    }

    if (!data) {
      throw new Error(`No prompt found`);
    }

    return {
      text: data.text
    };
  } catch (error) {
    console.error('Error in getPrompt:', error);
    throw error;
  }
};

const buildMessages = (
  prompt: Prompt,
  userPrompt: string,
  platform: string,
): ChatCompletionMessageParam[] => {
  // Replace placeholders in the prompt template
  let promptText = prompt.text
    .replace('<<<INSER_USER_PROMPT>>>', userPrompt)
    .replace('<<<INSERT_PLATFORM>>>', platform);

  // Function to remove all platform templates except for the desired one
    const cleanPromptForPlatform = (text: string, desiredPlatform: string): string => {
    const platformUpper = desiredPlatform.toUpperCase();
    // This regex matches any platform block that does not belong to the desired platform.
    const regex = new RegExp(`<<<(?!${platformUpper}>>>)[^>]+>>>([\\s\\S]*?)<<<END_[^>]+>>>\\n?`, "gi");
    const cleanedText = text.replace(regex, "");
    console.log('cleanedText', cleanedText);
    return cleanedText;
  };

  // Clean the prompt text to only include the desired platform's block
  const cleanPromptWithPlatformSpecificFormat = cleanPromptForPlatform(promptText, platform);

  return [
    {
      role: "system",
      content:
        "You are an expert content creator skilled at creating viral content. Your responses must follow the exact format specified.",
    },
    {
      role: "user",
      content: cleanPromptWithPlatformSpecificFormat,
    },
  ];
};
const cleanupResponse = (response: string, platform: string): string => {
  try {
    // Extract content analysis
    const contentAnalysisMatch = response.match(/<<BEGIN_CONTENT_ANALYSIS>>([\s\S]*?)<<END_CONTENT_ANALYSIS>>/);
    const contentAnalysisText = contentAnalysisMatch ? contentAnalysisMatch[1].trim() : '';
    
    // Parse content analysis items
    const analysisItems = contentAnalysisText.split('\n').map(line => {
      const [title, score, description] = line.split('|').map(part => part.trim());
      if (title && score && description) {
        return {
          title,
          score: parseInt(score, 10),
          description
        };
      }
      return null;
    }).filter(item => item !== null);
    
    // Extract viral score
    const viralScoreMatch = response.match(/<<BEGIN_VIRAL_SCORE>>\s*(\d+)\s*<<END_VIRAL_SCORE>>/);
    const viralScore = viralScoreMatch ? parseInt(viralScoreMatch[1], 10) : 0;
    
    // Extract raw content: everything after the viral score block
    const endViralIndex = response.indexOf("<<END_VIRAL_SCORE>>");
    const rawContent = endViralIndex !== -1 ? response.slice(endViralIndex + "<<END_VIRAL_SCORE>>".length).trim() : '';
    
    // Clean the content by removing static markers
    let cleanedContent = rawContent
      .replace(/<<BEGIN_CONTENT>>/g, '')
      .replace(/<<END_CONTENT>>/g, '')
      .trim();
    
    // Dynamically remove platform-specific markers (e.g., <<<YOUTUBE>>>) based on the provided platform parameter.
    if (platform) {
      const platformUpper = platform.toUpperCase();
      const platformRegex = new RegExp(`<<<${platformUpper}>>>`, 'g');
      cleanedContent = cleanedContent.replace(platformRegex, '');
    }
    
    // Optionally remove markers for other known platforms if desired.
    // For example:
    // cleanedContent = cleanedContent.replace(/<<<LINKEDIN>>>/g, '').replace(/<<<INSTAGRAM>>>/g, '');
    
    // Compress any occurrence of three or more consecutive newlines into exactly two newlines.
    cleanedContent = cleanedContent.replace(/(\r?\n){3,}/g, "\n\n")
                                   .split("\n")
                                   .map(line => line.trim())
                                   .join("\n");
    
    // Structure the cleaned response as a JSON string
    return JSON.stringify({
      content: cleanedContent,
      content_analysis: analysisItems,
      viral_score: viralScore
    });
  } catch (error) {
    console.error('Error cleaning up response:', error);
    throw error;
  }
};


export default async function handler(
  req: NextRequest
) {
  try {
    // Handle preflight request
    if (req.method === "OPTIONS") {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
        },
      });
    }

    // Validate request method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "METHOD_NOT_ALLOWED",
          message: "Method not allowed",
          details: `${req.method} is not supported`
        }),
        { 
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const requestData = await req.json();
    
    // Validate request data
    if (!requestData.prompt || !requestData.platforms || !requestData.userId) {
      return new Response(
        JSON.stringify({
          error: "BAD_REQUEST",
          message: "Missing required fields",
          details: "prompt, platforms, and userId are required"
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const modelConfig = await getModelConfiguration();
    
    // Generate content for each platform
    const results = await Promise.all(
      requestData.platforms.map(async (platform: string) => {
        const prompt = await getPrompt();
        
        const messages =  buildMessages(prompt, requestData.prompt, platform);
        
        console.error('Sending request to OpenAI for platform:', platform);
        const completion = await openai.chat.completions.create({
          ...modelConfig,
          messages,
          temperature: 0.7,
        });

        console.error('Raw OpenAI response:', {
          platform,
          model: completion.model,
          content: completion.choices[0]?.message?.content,
          finishReason: completion.choices[0]?.finish_reason,
          usage: completion.usage,
        });

        return {
          platform,
          result: completion.choices[0]?.message?.content || '',
        };
      })
    );

    // Process results and save to database
    const processedResults = await Promise.all(results.map(async ({ platform, result }) => {
      console.error(`\nProcessing results for platform: ${platform}`);
      
      try {
        const cleanedResponse = cleanupResponse(result, platform);
        const parsedResponse = JSON.parse(cleanedResponse);
  
        console.log('parsedResponse', parsedResponse)

        // Save to user_prompts table
        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin
          .from('user_prompts')
              .insert({
            user_id: requestData.userId,
            prompt_text: requestData.prompt,
            platform,
            script_result: parsedResponse.content,
            viral_score: parsedResponse.viral_score,
            content_analysis: parsedResponse.content_analysis,
          })
          .select()
              .single();

        if (error) throw error;

        return {
          id: data.id,
          platform,
          result: parsedResponse.content,
          content_analysis: parsedResponse.content_analysis,
          viral_score: parsedResponse.viral_score,
        };
          } catch (error) {
        console.error('Error processing result:', error);
            throw error;
          }
    }));

    // Return the first result's ID for navigation
    return new Response(
      JSON.stringify(processedResults[0]),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in generate API:', error);
    return new Response(
      JSON.stringify({
        error: "INTERNAL_SERVER_ERROR",
        message: error.message || "An error occurred while generating content",
        details: error.stack
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
