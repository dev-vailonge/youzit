export interface ContentDetails {
  id: string;
  title: string;
  platform: {
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
}
