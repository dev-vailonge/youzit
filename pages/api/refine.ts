import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Add interface for content analysis
interface ContentAnalysisItem {
  title: string;
  description: string;
  score: number;
}

// Add type for the database row
interface PromptRow {
  id: string;
  script_result: string;
  content_analysis: ContentAnalysisItem[];
  viral_score: number;
  updated_at: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      originalPrompt,
      platform,
      currentContent,
      refinementPrompt,
      contentId,
    } = req.body;

    // Construct the prompt for OpenAI
    const systemPrompt = `You are a content optimization expert specializing in precise, targeted refinements.

CRITICAL INSTRUCTIONS:
1. You will receive content with specific sections marked by brackets (e.g., [Hook], [Introduction])
2. You must return the COMPLETE content with ALL sections
3. ONLY modify the section specified in the refinement request
4. Copy-paste all other sections EXACTLY as they are
5. Maintain ALL formatting, section markers, and structure
6. ALL content MUST be in Portuguese, including section titles, analysis, and scores

Your task is surgical: make precise changes only where requested while preserving everything else exactly as is.

Your response must follow this format:

Content:
[COMPLETE content with only the specified section modified]

Análise de Conteúdo:
- Potencial de Engajamento (Pontuação: X/10): [Explicação em português]
- Apelo ao Público-Alvo (Pontuação: X/10): [Explicação em português]
- Eficácia do Gancho (Pontuação: X/10): [Explicação em português]
- Força da Chamada para Ação (Pontuação: X/10): [Explicação em português]
- SEO/Descoberta (Pontuação: X/10): [Explicação em português]
- Impacto Emocional (Pontuação: X/10): [Explicação em português]
- Fatores de Compartilhamento (Pontuação: X/10): [Explicação em português]

Pontuação Viral: [número entre 1-100]

IMPORTANT: 
- Each analysis item MUST follow the exact format above with (Pontuação: X/10) included
- ALL text MUST be in Portuguese
- Do not use any English terms`;

    const userPrompt = `Original prompt: ${originalPrompt}
    Platform: ${platform}
    Current content: ${currentContent}
    Refinement request: ${refinementPrompt}
    
    IMPORTANT: You must preserve the exact structure and content of the script. Only modify the specific section mentioned in the refinement request.

    For example, if the refinement request is about the hook:
    1. Keep the [Hook] marker
    2. Only change the content within that section
    3. Leave ALL other sections ([Introduction], [Main Content], etc.) exactly as they are

    Return the COMPLETE content with ONLY the requested changes. Do not summarize or remove any sections.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const result = completion.choices[0].message.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }

    // Parse the result
    const contentMatch = result.match(
      /Content:?\s*\n([\s\S]*?)(?:\n\s*Análise de Conteúdo:|\n\s*$)/i
    );
    const analysisMatch = result.match(
      /Análise de Conteúdo:?\s*\n([\s\S]*?)(?:\n\s*Pontuação Viral:|\n\s*$)/i
    );
    const scoreMatch = result.match(/Pontuação Viral:?\s*(\d+)/i);

    if (!contentMatch) {
      throw new Error("Could not parse content from OpenAI response");
    }

    const refinedContent = contentMatch[1].trim();
    let contentAnalysis: ContentAnalysisItem[] = [];

    if (analysisMatch) {
      contentAnalysis = analysisMatch[1]
        .split(/\n\s*-\s*/)
        .filter(Boolean)
        .map((line) => {
          // Extract title, score, and description using the exact format from the prompt
          const match = line.match(/(.*?)\s*\(Pontuação:\s*(\d+)\/10\):\s*(.*)/i);
          
          if (match) {
            const [_, title, score, description] = match;
            return {
              title: title.trim(),
              description: description.trim(),
              score: parseInt(score, 10)
            };
          }
          
          // Fallback parsing if format doesn't match exactly
          const parts = line.split(/:\s*/);
          const title = parts[0].trim();
          const description = parts.slice(1).join(":").trim();
          
          // Extract score from description if present
          const scoreMatch = description.match(/\(Pontuação:\s*(\d+)\/10\)/i);
          const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 8;
          const cleanDescription = description.replace(/\(Pontuação:\s*\d+\/10\)/i, "").trim();
          
          return {
            title,
            description: cleanDescription,
            score
          };
        })
        .filter(item => item.title && item.description);
    }

    const viralScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

    // Return the refined content with properly structured content analysis
    res.status(200).json({
      content: refinedContent,
      contentAnalysis: contentAnalysis,
      viralScore: viralScore
    });
  } catch (error) {
    console.error("Refinement Error:", error);
    res.status(500).json({ message: "Failed to refine content" });
  }
}
