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
7. ALWAYS translate any English content to Portuguese

Your task is surgical: make precise changes only where requested while preserving everything else exactly as is.

Your response must follow this format EXACTLY:

## script results start ##
[COMPLETE content with only the specified section modified, in Portuguese]
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
- Do not use any English terms`;

    const userPrompt = `Original prompt: ${originalPrompt}
Platform: ${platform}
Current content: ${currentContent}
Refinement request: ${refinementPrompt}

IMPORTANT: 
1. You must preserve the exact structure and content of the script
2. Only modify the specific section mentioned in the refinement request
3. Translate ALL content to Portuguese, including section titles
4. Keep the section markers but translate their content
5. Return the COMPLETE content with ONLY the requested changes
6. Do not summarize or remove any sections`;

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

    // Log the raw response for debugging
    console.log("Raw OpenAI response:", result);

    // Parse the result using the updated markers
    const contentMatch = result.match(
      /## script results start ##\s*([\s\S]*?)\s*## script results ends ##/i
    );
    const analysisMatch = result.match(
      /## content analyses start ##\s*([\s\S]*?)\s*## content analyses ends ##/i
    );
    const scoreMatch = result.match(
      /## viral score start ##\s*Pontuação Viral:\s*(\d+)\s*## viral score ends ##/i
    );

    // Log parsing results
    console.log("Content match found:", !!contentMatch);
    console.log("Analysis match found:", !!analysisMatch);
    console.log("Score match found:", !!scoreMatch);

    if (!contentMatch) {
      throw new Error("Could not parse content from OpenAI response");
    }

    const refinedContent = contentMatch[1].trim();
    let contentAnalysis: ContentAnalysisItem[] = [];
    const itemRegex = /-\s*([\wÀ-ÿ\s/-]+)\s*\((?:Score|Pontuação):\s*(\d+)\/10\):\s*([^\n]+)/g;

    if (analysisMatch) {
      const analysisContent = analysisMatch[1].trim();
      console.log("Analysis content to parse:", analysisContent);
      
      let match;

      while ((match = itemRegex.exec(analysisContent))) {
        const [fullMatch, title, score, description] = match;
        console.log("Matched analysis item:", { fullMatch, title, score, description });
        contentAnalysis.push({
          title: title.trim(),
          description: description.trim(),
          score: parseInt(score, 10)
        });
      }

      // Log parsed content analysis
      console.log("Parsed content analysis items:", contentAnalysis.length);
      console.log("Content analysis:", contentAnalysis);
    } else {
      console.log("No analysis content found in the response");
    }

    const viralScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

    // Validate the response with more detailed errors
    if (contentAnalysis.length === 0) {
      console.error("Content analysis parsing failed:");
      console.error("- Analysis match exists:", !!analysisMatch);
      console.error("- Analysis regex pattern:", itemRegex);
      throw new Error("Failed to parse content analysis - no valid items found");
    }

    if (viralScore === 0) {
      throw new Error("Failed to parse viral score");
    }

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
