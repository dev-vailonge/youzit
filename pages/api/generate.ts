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

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
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

const buildMessages = (
  prompt: string,
  platform: string,
  format: string,
  contextPrompt?: any
): ChatCompletionMessageParam[] => {
  return [
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
   - A **Call to Action (CTA)** to drive specific audience actions`
    },
    {
      role: "user",
      content: `Create content about "${prompt}" for ${platform}.
Platform format: ${format}
Context: ${contextPrompt ? JSON.stringify(contextPrompt) : 'None'}`
    }
  ];
};

const extractContentAnalysis = (result: string) => {
  try {
    const analysisRegex = /## content analyses start ##([\s\S]*?)## content analyses ends ##/i;
    const analysisMatch = result.match(analysisRegex);

    if (!analysisMatch) return [];

    const analysisContent = analysisMatch[1].trim();
    const itemRegex = /-\s*([\wÀ-ÿ\s/-]+)\s*\((?:Score|Pontuação):\s*(\d+)\/10\):\s*([^\n]+)/g;
    const analyses = [];
    let match;

    while ((match = itemRegex.exec(analysisContent))) {
      const [, title, score, description] = match;
      analyses.push({
        title: title.trim(),
        score: parseInt(score, 10),
        description: description.trim(),
      });
    }

    return analyses;
  } catch (error) {
    console.error('Error extracting content analysis:', error);
    return [];
  }
};

const calculateViralScore = (result: string): number => {
  try {
    const viralScoreRegex = /## viral score start ##\s*Pontuação Viral:\s*(\d+)\s*## viral score ends ##/i;
    const match = result.match(viralScoreRegex);
    return match ? parseInt(match[1], 10) : 0;
  } catch (error) {
    console.error('Error calculating viral score:', error);
    return 0;
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

    // Get model configuration
    const modelConfig = await getModelConfiguration();
    
    // Generate content for each platform
    const results = await Promise.all(
      requestData.platforms.map(async (platform: string) => {
        const format = await getPlatformFormat(platform);
        const messages = buildMessages(requestData.prompt, platform, format, requestData.contextPrompt);
        
        const completion = await openai.chat.completions.create({
          ...modelConfig,
          messages,
        });

        return {
          platform,
          result: completion.choices[0]?.message?.content || '',
        };
      })
    );

    // Process results and save to database
    const processedResults = results.map(({ platform, result }) => ({
      platform,
      script_result: cleanScriptResult(result),
      content_analysis: extractContentAnalysis(result),
      viral_score: calculateViralScore(result),
    }));

    // Save to database
    const { data, error } = await supabase
      .from('prompts')
      .insert({
        user_id: requestData.userId,
        prompt_text: requestData.prompt,
        script_result: processedResults[0].script_result,
        viral_score: processedResults[0].viral_score,
        content_analysis: processedResults[0].content_analysis,
        platform: requestData.platforms[0],
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        id: data.id,
        script_result: processedResults[0].script_result,
        viral_score: processedResults[0].viral_score,
        content_analysis: processedResults[0].content_analysis,
      }),
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
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
