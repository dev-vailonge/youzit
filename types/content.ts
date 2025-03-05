export interface ContentDetails {
  id: string;
  title: string;
  platform: string | {
    id: string;
    name: string;
  };
  content: string;
  viralScore: number;
  readabilityLevel: string;
  metrics: {
    sentiment: string;
    tone: string;
    wordCount: number;
    estimatedReadTime: string;
  };
  status?: "draft" | "to-do" | "in-progress" | "done";
  user_id?: string;
  created_at?: string;
  prompt_id: string;
  prompt?: {
    id: string;
    prompt_text: string;
    script_result: string;
    viral_score: number;
    content_analysis: any[];
    platform: any;
  };
}
