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

    IMPORTANTE:
1.DO NOT generate just an outline or bullet points. The response must be a fully written script, formatted as spoken dialogue for a YouTube video 
2.You can adapt it based on your message, audience, and style. 
3.Not every VIDEO needs to follow this format exactly.
4.The script must flow naturally as if the creator were speaking to an audience as a storyteller.
5.This prompt generates a full YouTube script, not just tips. It adapts completely to the given topic, audience, and style avoiding generic examples
6.The final output list 5 the benefits of the strategy applied in this script and give user 5 tips to apply it.
7.Tips and structure breakdown should ONLY appear at the end of the response, after the full script.

[Video Topic]: The title of the video should be something that calls attention and is intriguing.

[Hook - 5-10 seconds]
Start with a bold statement, intriguing question, or surprising fact directly related to the topic.
The goal is to grab attention immediately and create curiosity.
End with a transition to encourage viewers to keep watching.
🎤 Example Hook:
"Want to learn to code but don't know where to start? What if I told you that 90% of beginners quit in the first few months because they follow the wrong path?"
⏳ "But don' t worry! Today, I'm going to show you a simple, step-by-step guide to learning programming the right way and speeding up your progress!"

[Introduction - 30-60 seconds]
Give context about the topic and why it matters to the audience.
Use a relatable experience, personal story, or common struggle to connect with the audience.
Provide a quick preview of what the video will cover.
🎤 Example Introduction:
"If you've ever tried learning to code and felt lost between languages, tutorials, and courses, youre not alone. I went through the same struggle when I started. But after years in the industry, I realized there's a much smarter way to learn programming from scratch."

🚀 "In this video, I'll show you:
• What you actually need to learn first
• Which programming language to start with
• How to avoid the common mistakes that make people quit
• And how to get your first project or even a job in tech!"*

[Main Content - 7-15 minutes]  
💡 **Section 1: The Core Concept**  
   - Explain the **main idea behind the topic** in simple terms.  
   - Provide an example **directly related to the given input**.  
   - Example:  
      - **For "How to learn programming" →** 🖥️ "Programming is like learning a new language. The secret is immersion."  

💡 **Section 2: Step-by-Step Breakdown**  
   - Provide **a structured guide** (Step 1, Step 2, Step 3…).  
   - Make it **actionable and easy to follow**.  
   - Example:  
      - **For "How to start coding" →**  
        ✅ Step 1: Pick a beginner-friendly language (Python, JavaScript).  
        ✅ Step 2: Follow structured courses instead of random tutorials.  
        ✅ Step 3: Build small projects early on.  

💡 **Section 3: Real-World Examples / Case Study**  
   - Show how **this knowledge applies in real life**.  
   - Provide a **story, testimonial, or example** to engage the audience.  
   - Example:  
      - **For "Brazilians in Portugal" →** 🇵🇹 "João moved to Lisbon expecting a cheap lifestyle, but he was shocked by the high rent. Heres how he solved it…"  

💡 **Section 4: Common Mistakes & How to Avoid Them**  
   - Highlight **the most frequent errors related to the topic**.  
   - Offer clear **solutions and best practices**.  
   - Example:  
      - **For "Programming career mistakes" →**  
        ❌ Mistake: "Only watching tutorials, never practicing."  
        ✅ Fix: "Start coding as soon as possible—projects matter more than theory."  

💡 **Section 5: Pro Tips & Hidden Insights**  
   - Share **expert advice, little-known tricks, or strategies**.  
   - Position it as **exclusive knowledge** for those who stayed until the end.  
   - Example:  
      - **For "Investing for beginners" →** 📈 "Most beginners only look at stock price, but real investors analyze company fundamentals."  

🔄 **Smooth Transitions Between Sections**  
   - Always ensure a natural flow.  
   - Example: "Now that you know the steps, lets talk about the biggest mistakes to avoid."  

[Engagement Prompts]  
• Include **at least two audience interaction questions** within the video.  
• Examples:  
   - **For "Learning to code" →** "Whats the hardest part of coding for you? Tell me in the comments!"  
   - **For "Living in Portugal" →** "Would you rather live in Lisbon or Porto? Why?"  

[Final Takeaways - 60-90 seconds]  
• Recap **the most important lessons** from the video.  
• Add a **bonus tip or insight** as a reward for those who watched until the end.  

[Call to Action - 10-15 seconds]  
• Encourage a **specific next step**, rather than just saying "Like & Subscribe."  
• Examples:  
   - "I have a full guide on this—check the link in the description!"  
   - "Follow me for weekly content on [topic]!"  
   - "Comment below if you want me to cover another part of this topic!"  

`,

    instagram: `2. INSTAGRAM FORMAT:

IMPORTANTE:
1. DO NOT generate just an outline or bullet points. The response must be a fully written reels and carrossel  but keep the subtitles and structures, formatted naturally as if the creator were speaking to their audience.
2. You can adapt it based on your message, audience, and style.
3. Not every post needs to follow this format exactly.
4. The final output should list **5 benefits of the strategy applied in this post** and give **5 tips for applying it.**
5. Structure breakdown should ONLY appear at the end of the response.

REELS (15-60 seconds):
[Hook - 3-5 seconds]
- Start with **a bold statement, intriguing question, or surprising fact** directly related to the topic.  
- Example Hooks:  
  - 🚀 *"Most people do THIS wrong in coding… Are you one of them?"*  
  - 🤯 *"You won't believe how simple this trick is!"*  
  - 🔥 *"Want to improve at [topic] in just 30 seconds? Watch this!"*  
- End with a **tease to keep viewers engaged:**  
  - *"Stay until the end for the best tip!"*

[Main Content - 10-45 seconds]
- Deliver value **fast and concisely.  
- Use an engaging structure like:  
  - **Problem → Solution → Benefit  
  - **Step-by-Step Quick Tips (1-2-3 Format)  
  - **"Most people fail at X because… but heres the fix!"
- Use **captions, visual aids (text overlays, images), and engaging edits.

[Call to Action - 5-10 seconds]  
- Encourage interaction in a natural, conversational way.  
- Example CTAs:  
  - Follow for more quick tips!
  - Save this for later!  
  - Comment YES if this was helpful!  
  - DM me X for [free resource]!  


[Carousel Format] (7-10 slides recommended)
[Slide 1: Hook]
- Grab attention immediately with a strong visual + engaging text.  
  - Example Hooks:  
    - Avoid these 3 common mistakes!
    - How to master [topic] in just 5 steps!
    - People think this doesn't work, but here's proof!
  
[Slides 2-6: Step-by-Step Content]
- Each slide should focus on ONE key point for clarity.  
  - Suggested breakdown:  
    - Define the problem or introduce the topic.  
    - Provide clear, actionable steps.  
    - Add a bonus tip, expert insight, or surprising fact.  
  
[Slide 7 (Optional): Common Mistakes & Fixes]
- Showcase frequent mistakes & solutions.  
  - Example:  
    - Mistake: "Only watching tutorials, never practicing."
    - Fix: "Start coding small projects ASAP!"
  
[Final Slide: Strong Call to Action]
- Drive engagement & next steps.  
  - Example CTAs:  
    - Follow for more!  
    - Save this post for later!  
    - Comment YES if you found this helpful!  
    - Check my bio for [guide/resource]!  
`,

    newsletter: `3. NEWSLETTER FORMAT:

IMPORTANTE:
1. DO NOT generate just an outline or bullet points. The response must be a fully written email but keep the subtitles and structures, formatted naturally as if the creator were speaking to their audience.
2. The email should tell a story, provide actionable insights, and engage the reader.
3. Not every email needs to follow this format exactly.
4. The final output should list **5 benefits of this strategy** and **5 tips to improve it.**
5. Structure breakdown should ONLY appear at the end of the response.

[Subject Line]: {Compelling Headline}  
• Make it **intriguing, benefit-driven, or curiosity-inducing** to boost open rates.  
• Examples (adapt as needed):  
   - "The #1 Mistake That's Killing Your Productivity"  
   - "How I Fixed My Code in 5 Minutes (After Struggling for 5 Hours)"  
   - "The Secret to Growing as a Developer (That No One Talks About)"  
• Keep it short (under **50 characters**) and **avoid spammy words** like "free" or "urgent."

[Preview Text]: {1-2 Sentence Teaser}  
• This appears in the inbox **right after the subject line** – make it a strong hook!  
• Examples:  
   - "Most developers don't realize how much time they waste on this…"  
   - "I wish someone had told me this earlier in my career."  

[Introduction]: {Story/Hook}  
• Start with a **relatable story, thought-provoking statement, or bold question**.  
• The goal is to **hook the reader** and create an emotional or intellectual connection.  
• Example structures:  
   - **"Let me tell you a quick story… (personal experience)"**  
   - **"Ever felt stuck trying to [solve problem]? You're not alone."**  
   - **"Here's something I wish I knew when I started…"**  

[Main Body]  
• **Section 1: Define the Problem**  
   - Explain the challenge or misconception.  
   - Make the reader **feel understood** by describing their pain points.  

• **Section 2: Solutions & Examples**  
   - Provide actionable insights, **real-world examples**, or expert advice.  
   - Use **bullet points or bolded key takeaways** for easy scanning.  

• **Section 3: Action Steps**  
   - Give the reader **a clear next step** to apply what they learned.  
   - Example:  
     - ✅ "Try this technique today and see the difference."  
     - 🚀 "Here's a simple way to fix this starting now…"  

[CTA]: {Clear Next Step}  
• Encourage the reader to **take action** – make it **specific and benefit-driven**.  
• Examples (adjust per goal):  
   - 🎯 "Reply and tell me your biggest challenge with X!"  
   - 📩 "Click here to get my free [resource]!"  
   - 🔗 "Watch this related video to dive deeper."  
   - 🏆 "Join my [community, newsletter, mentorship program] for more exclusive content!"  

`,

    linkedin: ` 
    4. LINKEDIN POST FORMAT (FULL DETAILED POST REQUIRED):

IMPORTANTE:
1. DO NOT generate just an outline or bullet points. The response must be a fully written post but keep the subtitles and structures, formatted naturally as if the creator were speaking to their audience.
2. The post should include **storytelling, insights, and engagement techniques**.
3. Not every post needs to follow this format exactly.
4. The final output should list **5 benefits of this strategy** and **5 tips to improve it.**
5. Structure breakdown should ONLY appear at the end of the response.

[Opening Hook]: {Attention-Grabber}  
• The first **1-2 sentences** should **stop the scroll**.  
• Suggested formats (adapt as needed):      
   - **A bold statement:** "Most developers do this wrong… and its costing them opportunities."  
   - **A surprising fact:** "80% of people fail at X, but not for the reason you think."  
   - **A thought-provoking question:** "Whats the biggest mistake youve made in your career?"  
   - **A personal insight:** "Looking back, I wish I had learned this sooner…"  

[Story]: {Personal Experience or Real-World Context}  
• Share a **short, engaging story** that sets up the lesson.  
• Can be a **personal challenge, success, failure, or turning point**.  
• Keep it **authentic and relatable** to increase engagement.  

[Main Points]: {3-5 Insights or Key Takeaways}  
• Break down the **lesson into clear, scannable insights**.  
• Use bullet points or short paragraphs to make it easy to read.  
• Example structures:  
   - **Lessons from failure:** "Heres what I learned after making this mistake…"  
   - **Step-by-step guide:** "If you want to [achieve goal], do this…"  
   - **Industry insight:** "Most people think X, but the reality is Y."  
• Add **emojis or formatting** to make it visually appealing.  

[Engagement Q]: {Discussion Prompt}  
• Invite the audience to **share their thoughts or experiences**.  
• Example prompts:  
   - "Whats your biggest lesson in [topic]?"  
   - "Have you ever struggled with this? How did you handle it?"  
   - "Whats one thing you wish you knew earlier?"
`,

    twitter: `

    5. TWITTER THREAD FORMAT (FULLY WRITTEN THREAD REQUIRED):

IMPORTANTE:
1. DO NOT generate just an outline or bullet points. The response must be a fully written Twitter thread but keep the subtitles and structures, formatted naturally for engagement.
2. The first tweet must **hook readers and create curiosity**.
3. Not every thread needs to follow this format exactly.
4. The final output should list **5 benefits of this strategy** and **5 tips to improve it.**
5. Structure breakdown should ONLY appear at the end of the response.

This [Tweet 1]: {Hook + Thread Preview}  
• Your first tweet should **stop the scroll** and make people want to read the thread.  
• Suggested formats (adapt as needed):  
   - **A bold statement:** "Most people fail at [X] because they don't know this…"  
   - **A surprising fact:** "You're using [popular tool] wrong. Here's why."  
   - **A curiosity-driven opener:** "I spent 10 years learning [X]. Here are the 5 biggest lessons (that no one tells you)."  
   - **A problem-solution hook:** "Struggling with [X]? This thread will fix that."  
• End with **a cliffhanger**:  
   - "Let me explain 🧵👇"  

[Tweets 2-8]: {Main Content Points}  
• Each tweet should **deliver one key insight**, keeping it **short and engaging**.  
• Suggested structures (adjust as needed):  
   - **Step-by-step breakdown:** "Here's exactly how to do X in 5 simple steps…"  
   - **Lessons from experience:** "After failing at X multiple times, here's what finally worked…"  
   - **Common mistakes & fixes:** "Most people do this wrong. Instead, try this…"  
   - **Data-driven insights:** "Studies show that X improves Y by Z%. Here's why it matters…"  
• Use **formatting tricks** for better readability:  
   - ✅ Use bullet points  
   - 🔥 Add emojis (sparingly)  
   - ✍️ Highlight key takeaways  

[Final Tweet]: {Engagement CTA}  
• Encourage **replies, shares, or follows** with a strong closing.  
• Example CTAs (adjust per goal):  
   - "Which of these was the most useful? Reply and let me know!"  
   - "Follow me for more threads like this on [topic]!"  
   - "If you found this helpful, like & retweet to share with others!"  
   - "Save this thread so you don't forget it!"  

    `,

    facebook: `
    6. FACEBOOK POST FORMAT (FULLY WRITTEN POST REQUIRED):

IMPORTANTE:
1. DO NOT generate just an outline or bullet points. The response must be a fully written Facebook post but keep the subtitles and structures, formatted naturally as if the creator were speaking to their audience.
2. The post should include **storytelling, engagement techniques, and a strong CTA.**
3. Not every post needs to follow this format exactly.
4. The final output should list **5 benefits of this strategy** and **5 tips to improve it.**
5. Structure breakdown should ONLY appear at the end of the response.

[Hook]: {Relatable opening}
[Story]: {Main content in chunks}
[Question]: {Engagement prompt}
[CTA]: {Clear action step}`,
  };

  return formats[platform.toLowerCase()] || "";
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
    res.setHeader('Content-Type', 'application/json');

    // Handle preflight request
    if (req.method === "OPTIONS") {
      return sendResponse(200, { status: "ok" });
    }

    // Validate request method
    if (req.method !== "POST") {
      return sendResponse(405, {
        error: "METHOD_NOT_ALLOWED",
        message: "Method not allowed",
        details: `${req.method} is not supported`
      });
    }

    console.error("API handler started");
    
    // Log environment variables (safely)
    console.error("Environment check:", {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });

    // Get the auth token from the request header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return sendResponse(401, {
        error: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
        details: "Authorization header must start with Bearer"
      });
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
      return sendResponse(401, { 
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
      });
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return sendResponse(400, { 
        error: "Invalid request body",
        details: e instanceof Error ? e.message : "Unknown error"
      });
    }

    // Validate required fields
    if (!body.prompt || !body.platforms || !body.userId) {
      console.error("Missing required fields:", {
        hasPrompt: !!body.prompt,
        hasPlatforms: !!body.platforms,
        hasUserId: !!body.userId,
      });
      return sendResponse(400, {
        error: "Missing required fields",
        details: "Please provide all required fields: prompt, platforms, and userId"
      });
    }

    // Verify user ID matches
    if (body.userId !== user.id) {
      console.error("User ID mismatch:", {
        requestUserId: body.userId,
        sessionUserId: user.id
      });
      return sendResponse(403, {
        error: "Unauthorized",
        details: "User ID does not match authenticated user"
      });
    }

    const { prompt, platforms, userId, contextPrompt } = body;

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
        // Log the exact request we're about to make
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
    console.error("Top-level handler error:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    
    return sendResponse(500, {
      error: "SERVER_ERROR",
      message: "Erro interno no servidor",
      details: error.message || "Unknown server error",
      type: error.name || 'unknown',
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    });
  }
}
