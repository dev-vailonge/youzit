import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Head from "next/head";
import { useRouter } from "next/router";
import Image from "next/image";
import Header from "@/components/Header";
import Link from "next/link";
import { toast } from "react-hot-toast";

const defaultPlatforms = [
  {
    id: "twitter",
    name: "Twitter",
    icon: "/icons/twitter.svg",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "/icons/instagram.svg",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "/icons/linkedin.svg",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "/icons/facebook.svg",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "/icons/youtube.svg",
  },
  {
    id: "newsletter",
    name: "Newsletter",
    icon: "/icons/newsletter.svg",
  },
];

// Add new type for content results
type ContentResult = {
  platform: string;
  content: string;
  viral_score: number;
  content_analysis?: { title: string; description: string }[];
};

// Update the interface for content analysis
interface ContentAnalysisItem {
  title: string;
  description: string;
  score: number;
}

interface ContentData {
  id: string;
  platform: string;
  script_result: string;
  viral_score: number;
  content_analysis: ContentAnalysisItem[];
  prompt_text: string;
}

export default function Content() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customPlatform, setCustomPlatform] = useState("");
  const [platforms, setPlatforms] = useState(defaultPlatforms);
  const router = useRouter();
  const { prompt, platforms: queryPlatforms, isExisting, id } = router.query;
  const [user, setUser] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [contentResults, setContentResults] = useState<ContentResult[]>([]);
  const [content, setContent] = useState<ContentData | null>(null);
  const [error, setError] = useState<string>("");
  const [addedToBoard, setAddedToBoard] = useState(false);
  const [isInBoard, setIsInBoard] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{
      role: "user" | "assistant";
      content: string;
    }>
  >([
    {
      role: "assistant",
      content:
        "Olá! Posso ajudar você a refinar seu conteúdo. O que você gostaria de melhorar?",
    },
  ]);
  const [isRefining, setIsRefining] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userInitial = user?.email?.[0].toUpperCase() || "U";
  const [contextPrompt, setContextPrompt] = useState<{
    title: string;
    content: string;
    viralScore: number;
  } | null>(null);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    const initializeContent = async () => {
      if (!router.isReady) return;

      try {
        setLoading(true);

        // Check user authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error("Session error:", sessionError);
          toast.error("Por favor, faça login para continuar");
          router.push("/signin");
          return;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("User error:", userError);
          toast.error("Por favor, faça login para continuar");
          router.push("/signin");
          return;
        }

        setUser(user);

        // Get the content ID from the URL
        const contentId = router.query.id as string;
        if (!contentId) {
          console.error("No content ID in URL");
          toast.error("ID do conteúdo não fornecido");
          router.push("/prompt");
          return;
        }

        // Fetch content and check board status in parallel
        const [contentResponse, boardResponse] = await Promise.all([
          // Fetch content
          supabase
            .from("user_prompts")
            .select("*")
            .eq("id", contentId)
            .single(),
          
          // Check if content exists in board
          supabase
            .from("content_board")
            .select("id")
            .eq("user_id", user.id)
            .eq("prompt_id", contentId)
            .eq("hidden", false)
            .single()
        ]);

        if (contentResponse.error) {
          console.error("Error fetching content:", contentResponse.error);
          toast.error("Erro ao carregar conteúdo");
          return;
        }

        if (!contentResponse.data) {
          console.error("No content found for ID:", contentId);
          toast.error("Conteúdo não encontrado");
          return;
        }

        // Set content data
        setContent(contentResponse.data);

        // Set board status
        setIsInBoard(!!boardResponse.data);

        // Get stored results from sessionStorage if they exist
        const storedResults = sessionStorage.getItem("contentResults");
        if (storedResults) {
          const parsedResults = JSON.parse(storedResults);
          setContentResults(parsedResults);
        }

        // Check for context in session storage
        const storedContext = sessionStorage.getItem("promptContext");
        if (storedContext) {
          setContextPrompt(JSON.parse(storedContext));
          // Clear it after reading
          sessionStorage.removeItem("promptContext");
        }

      } catch (error) {
        console.error("Error in initialization:", error);
        toast.error("Erro ao carregar dados");
        router.push("/signin");
      } finally {
        setLoading(false);
        setInitializing(false);
      }
    };

    initializeContent();
  }, [router.isReady, router.query.id]);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleAddCustomPlatform = () => {
    if (customPlatform.trim()) {
      const newPlatform = {
        id: customPlatform.toLowerCase().replace(/\s+/g, "-"),
        name: customPlatform,
        icon: "/icons/custom.svg", // Add a default icon for custom platforms
      };
      setPlatforms((prev) => [...prev, newPlatform]);
      setSelectedPlatforms((prev) => [...prev, newPlatform.id]);
      setCustomPlatform("");
      setShowCustomInput(false);
    }
  };

  const handleGenerate = async (platformsToUse = selectedPlatforms) => {
    try {
      setLoading(true);
      setMessage("");

      // Clear previous content ID
      sessionStorage.removeItem("contentId");

      // First check for duplicate prompt
      const { data: existingPrompts, error: fetchError } = await supabase
        .from("user_prompts")
        .select("*")
        .eq("user_id", user.id)
        .eq("prompt_text", prompt)
        .eq("hidden", false);

      if (fetchError) throw fetchError;

      // Find exact match with same platforms
      const exactMatch = existingPrompts?.find((existing) =>
        selectedPlatforms.includes(existing.platform)
      );

      if (exactMatch) {
        // Use existing content
        const contentResult = {
          platform: exactMatch.platform,
          content: exactMatch.script_result || "",
          viral_score: exactMatch.viral_score || 0,
          content_analysis: exactMatch.content_analysis || {},
        };

        sessionStorage.setItem(
          "contentResults",
          JSON.stringify([contentResult])
        );
        sessionStorage.setItem("currentPrompt", prompt as string);
        setContentResults([contentResult]);
        return;
      }

      // If no duplicate found, call OpenAI
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            (
              await supabase.auth.getSession()
            ).data.session?.access_token
          }`,
        },
        body: JSON.stringify({
          prompt: prompt,
          platforms: platformsToUse,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.message || "Failed to generate content");
      }

      const data = await response.json();
      console.log("OpenAI Response:", data);

      // Parse the content from the result string
      const contentResults = platformsToUse.map((platform) => {
        // Get the full content for this platform
        const platformRegex = new RegExp(
          `For ${platform}:([\\s\\S]*?)(?=For [A-Za-z]+:|$)`
        );
        const platformContent = data.result.match(platformRegex)?.[1] || "";

        // Split the content into sections
        const sections = platformContent.split(
          /(?=Viral Score:|Content Analysis:)/
        );

        // Extract viral score
        const viralScoreMatch = sections
          .find((s: string) => s.includes("Viral Score:"))
          ?.match(/Viral Score: (\d+)/);
        const viralScore = viralScoreMatch
          ? parseInt(viralScoreMatch[1], 10)
          : 0;

        // Extract content analysis - updated parsing
        const analysisMatch = platformContent.match(
          /Content Analysis:([\s\S]*?)(?=Viral Score:|$)/
        );
        const analysisText = analysisMatch ? analysisMatch[1].trim() : "";

        // Update the filter with proper typing
        const contentAnalysis = analysisText
          .split("\n")
          .filter((line: string) => line.trim().startsWith("-"))
          .map((line: string) => {
            const [title, ...descParts] = line.replace(/^-\s*/, "").split(":");

            return {
              title: title.trim(),
              description: descParts.join(":").trim(),
            };
          })
          .filter(
            (item: ContentAnalysisItem) => item.title && item.description
          );

        // Get main content (everything before Content Analysis)
        const mainContent = platformContent
          .split(/Content Analysis:/)[0]
          .replace(/^For [A-Za-z]+:/, "")
          .replace(/Viral Score: \d+/, "")
          .trim();

        console.log(`Platform ${platform} Analysis:`, {
          analysisText,
          parsedAnalysis: contentAnalysis,
        });

        return {
          platform,
          content: mainContent,
          viral_score: viralScore,
          content_analysis: contentAnalysis,
        };
      });

      console.log("Final parsed results:", contentResults);
      sessionStorage.setItem("contentResults", JSON.stringify(contentResults));
      sessionStorage.setItem("currentPrompt", prompt as string);
      setContentResults(contentResults);
    } catch (error: any) {
      console.error("Generation Error:", error);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleAddToBoard = async () => {
    try {
      if (!user || !content) {
        throw new Error("Missing required data");
      }

      // Check if already in board first
      const { data: existingContent, error: checkError } = await supabase
        .from("content_board")
        .select("id")
        .eq("user_id", user.id)
        .eq("prompt_id", content.id)
        .eq("script_result", content.script_result)
        .eq("platform", content.platform)
        .eq("hidden", false)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existingContent) {
        setIsInBoard(true);
        return;
      }

      // Add to board
      const { error: insertError } = await supabase
        .from("content_board")
        .insert({
          user_id: user.id,
          platform: content.platform,
          prompt_id: content.id,
          script_result: content.script_result,
          viral_score: content.viral_score || 0,
          content_analysis: content.content_analysis || [],
          status: "draft",
          hidden: false,
        });

      if (insertError) throw insertError;

      setIsInBoard(true);
      toast.success("Added to board successfully");
    } catch (error) {
      console.error("Error adding to board:", error);
      toast.error("Failed to add content to board");
    }
  };

  const handleRefineContent = async (message: string) => {
    try {
      setIsRefining(true);

      // Add user message to chat
      setChatMessages((prev) => [...prev, { role: "user", content: message }]);

      if (!content || !router.query.id) {
        throw new Error("No content available to refine");
      }

      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalPrompt: content.prompt_text,
          platform: content.platform,
          currentContent: content.script_result,
          refinementPrompt: message,
          contentId: router.query.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to refine content");
      }

      const data = await response.json();
      console.log("Refinement response:", data); // Add logging to debug

      // Validate refined content and content analysis
      if (
        !data.content ||
        typeof data.content !== "string" ||
        data.content.trim() === "" ||
        typeof data.viralScore !== "number" ||
        !Array.isArray(data.contentAnalysis)
      ) {
        console.error("Invalid refined content:", data);
        throw new Error("Received invalid content, viral score, or content analysis from AI");
      }

      const trimmedContent = data.content.trim();

      // Update Supabase directly with properly formatted data
      const { error: updateError } = await supabase
        .from("user_prompts")
        .update({
          script_result: trimmedContent,
          content_analysis: data.contentAnalysis.map((item: { title: string; description: string; score: number }) => ({
            title: item.title,
            description: item.description,
            score: item.score
          })),
          viral_score: data.viralScore,
          updated_at: new Date().toISOString(),
        })
        .eq("id", router.query.id);

      if (updateError) {
        throw new Error("Failed to update content in database");
      }

      // Update local state after successful database update
      setContent((prev) => {
        if (!prev) return null;
        console.log("Updating content with:", {
          content: trimmedContent,
          analysis: data.contentAnalysis,
          score: data.viralScore
        });
        return {
          ...prev,
          script_result: trimmedContent,
          content_analysis: data.contentAnalysis.map((item: { title: string; description: string; score: number }) => ({
            title: item.title,
            description: item.description,
            score: item.score
          })),
          viral_score: data.viralScore,
        };
      });

      // Add AI response to chat
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Refinei o conteúdo com base no seu pedido. Você pode ver as atualizações na área principal do conteúdo.",
        },
      ]);

      toast.success("Content updated successfully");
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to refine content"
      );

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Desculpe, encontrei um erro ao refinar o conteúdo. Por favor, tente novamente.",
        },
      ]);
    } finally {
      setIsRefining(false);
    }
  };

  // Add this function near other handlers
  const handleSaveContent = async () => {
    try {
      // Validate content before saving
      if (!editedContent || editedContent.trim() === "") {
        throw new Error("Cannot save empty content");
      }

      // Update Supabase
      const { error } = await supabase
        .from("user_prompts")
        .update({ script_result: editedContent })
        .eq("id", router.query.id);

      if (error) throw error;

      // Update local state
      setContent((prev) =>
        prev ? { ...prev, script_result: editedContent } : null
      );
      setIsEditing(false);
      toast.success("Content updated successfully");
    } catch (error) {
      console.error("Error updating content:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update content"
      );
    }
  };

  // Show loading state while initializing
  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="min-h-[600px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-t-2 border-b-2 border-[#0066FF] rounded-full animate-spin"></div>
              <span className="text-sm text-gray-500">Carregando conteúdo...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show content only if we have results
  if (contentResults.length === 0) {
    return null; // Return null while redirecting
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">Carregando conteúdo...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-red-600">{error}</div>
        </main>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">Nenhum conteúdo encontrado</div>
        </main>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>YouZit - Editar Conteúdo</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Column */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-6">
                {/* Header with platform and buttons */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Image
                      src={`/icons/${content.platform.toLowerCase()}.svg`}
                      alt={content.platform}
                      width={24}
                      height={24}
                    />
                    <h2 className="text-xl">{content.platform}</h2>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Edit Button */}
                    <button
                      onClick={() => {
                        setEditedContent(content.script_result);
                        setIsEditing(true);
                      }}
                      className="inline-flex items-center justify-center text-[#0066FF] hover:text-blue-700 font-medium p-3 hover:bg-blue-50 rounded-full transition-colors w-14 h-14"
                      title="Editar conteúdo"
                    >
                      <svg
                        className="w-7 h-7"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>

                    {/* Add to Board Button */}
                    {isInBoard ? (
                      <Link
                        href="/content-board"
                        className="inline-flex items-center justify-center text-[#0066FF] hover:text-blue-700 font-medium p-3 hover:bg-blue-50 rounded-full transition-colors w-14 h-14"
                        title="Ver no quadro"
                      >
                        <svg
                          className="w-7 h-7"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      </Link>
                    ) : (
                      <button
                        onClick={handleAddToBoard}
                        className="inline-flex items-center justify-center text-[#0066FF] hover:text-blue-700 font-medium p-3 hover:bg-blue-50 rounded-full transition-colors w-14 h-14"
                        title="Adicionar ao quadro"
                      >
                        <svg
                          className="w-7 h-7"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* User's Original Prompt */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-500">Prompt original:</div>
                    <button
                      onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                      className="text-sm text-[#0066FF] hover:text-blue-700"
                    >
                      {isPromptExpanded ? 'Ver menos' : 'Ver mais'}
                    </button>
                  </div>
                  <div className={`text-gray-700 ${!isPromptExpanded ? 'line-clamp-2' : ''}`}>
                    {content.prompt_text}
                  </div>
                </div>

                <div className="relative">
                  {isEditing ? (
                    <div className="space-y-4">
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full h-[500px] p-4 border rounded-lg font-[Inter] text-base leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveContent}
                          className="px-4 py-2 bg-[#0066FF] text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                          Salvar Alterações
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-base leading-relaxed font-[Inter]">
                      {content.script_result}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Analysis Column */}
            <div>
              <div className="bg-white rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-medium">Análise de Conteúdo</h2>
                  {/* Viral Score Circle */}
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">Pontuação Viral</span>
                    <div className="relative w-[60px] h-[60px]">
                      <svg 
                        viewBox="0 0 60 60"
                        className="w-full h-full"
                      >
                        <circle
                          cx="30"
                          cy="30"
                          r="26"
                          strokeWidth="4"
                          stroke="#E5E7EB"
                          fill="none"
                        />
                        <circle
                          cx="30"
                          cy="30"
                          r="26"
                          strokeWidth="4"
                          stroke="#0066FF"
                          fill="none"
                          strokeLinecap="round"
                          transform="rotate(-90 30 30)"
                          strokeDasharray={`${
                            (content.viral_score / 100) * (2 * Math.PI * 26)
                          } ${2 * Math.PI * 26}`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-medium">
                          {content.viral_score}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Analysis Items */}
                <div className="space-y-6">
                  {content.content_analysis.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getAnalysisIcon(item.title)}
                          <h3 className="font-medium">{item.title}</h3>
                        </div>
                        <div className="text-[#0066FF] font-medium">
                          {item.score}/10
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* AI Chat Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsChatOpen(true)}
            className="bg-[#0066FF] text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center group relative w-14 h-14"
            title="Refine with AI"
          >
            <svg
              className="w-7 h-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
              AI
            </span>
          </button>
        </div>

        {/* AI Chat Dialog */}
        {isChatOpen && (
          <div className="fixed bottom-24 right-6 z-50 w-96">
            <div className="bg-white rounded-2xl shadow-xl flex flex-col h-[600px]">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-medium">Refinar Conteúdo com IA</h3>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${
                      message.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100">
                      <span className="text-[#0066FF] text-sm font-medium">
                        {message.role === "assistant" ? "AI" : userInitial}
                      </span>
                    </div>
                    <div
                      className={`rounded-2xl p-4 max-w-[80%] ${
                        message.role === "assistant"
                          ? "bg-gray-100"
                          : "bg-[#0066FF] text-white"
                      }`}
                    >
                      <p>{message.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <div className="p-4 border-t">
                {/* Suggested Prompts */}
                <div className="mb-4">
                  <div className="text-sm text-gray-500 mb-2">
                    Melhorias sugeridas:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        handleRefineContent("Tornar mais envolvente");
                      }}
                      className="text-sm px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors disabled:opacity-50"
                      disabled={isRefining}
                    >
                      Tornar mais envolvente
                    </button>
                    <button
                      onClick={() => {
                        handleRefineContent("Melhorar a introdução");
                      }}
                      className="text-sm px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors disabled:opacity-50"
                      disabled={isRefining}
                    >
                      Melhorar a introdução
                    </button>
                    <button
                      onClick={() => {
                        handleRefineContent("Tornar mais conciso");
                      }}
                      className="text-sm px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors disabled:opacity-50"
                      disabled={isRefining}
                    >
                      Tornar mais conciso
                    </button>
                    <button
                      onClick={() => {
                        handleRefineContent("Adicionar mais exemplos");
                      }}
                      className="text-sm px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors disabled:opacity-50"
                      disabled={isRefining}
                    >
                      Adicionar mais exemplos
                    </button>
                  </div>
                </div>

                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.querySelector(
                      "input"
                    ) as HTMLInputElement;
                    if (input.value.trim()) {
                      handleRefineContent(input.value);
                      input.value = "";
                    }
                  }}
                >
                  <input
                    type="text"
                    placeholder="Digite sua mensagem..."
                    className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isRefining}
                  />
                  <button
                    type="submit"
                    className="bg-[#0066FF] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    disabled={isRefining}
                  >
                    {isRefining ? "Refinando..." : "Enviar"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Update this helper function at the bottom of the file
function getAnalysisIcon(title: string) {
  // Normalize the title to handle case variations
  const normalizedTitle = title.toLowerCase().trim();

  const iconMap: Record<string, JSX.Element> = {
    "potencial de engajamento": <span className="text-red-500">🎯</span>,
    "apelo ao público-alvo": <span className="text-blue-500">👥</span>,
    "efetividade do gancho": <span className="text-purple-500">🎣</span>,
    "força da chamada para ação": <span className="text-yellow-500">👊</span>,
    "seo/descoberta": <span className="text-gray-500">🔍</span>,
    "impacto emocional": <span className="text-red-500">❤️</span>,
    "fatores de compartilhamento": <span className="text-blue-500">📱</span>,

    // Add English fallbacks
    "engagement potential": <span className="text-red-500">🎯</span>,
    "target audience appeal": <span className="text-blue-500">👥</span>,
    "hook effectiveness": <span className="text-purple-500">🎣</span>,
    "call-to-action strength": <span className="text-yellow-500">👊</span>,
    "seo/discoverability": <span className="text-gray-500">🔍</span>,
    "emotional impact": <span className="text-red-500">❤️</span>,
    "shareability factors": <span className="text-blue-500">📱</span>,

    // Add shorter fallbacks
    engajamento: <span className="text-red-500">🎯</span>,
    público: <span className="text-blue-500">👥</span>,
    gancho: <span className="text-purple-500">🎣</span>,
    ação: <span className="text-yellow-500">👊</span>,
    seo: <span className="text-gray-500">🔍</span>,
    emoção: <span className="text-red-500">❤️</span>,
    compartilhar: <span className="text-blue-500">📱</span>,
  };

  // Find the matching icon using normalized title
  const icon = Object.entries(iconMap).find(([key]) =>
    normalizedTitle.includes(key)
  )?.[1];

  return icon || <span>•</span>;
}

