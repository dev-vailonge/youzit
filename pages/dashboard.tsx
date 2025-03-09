import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Image from "next/image";
import Header from "@/components/Header";

interface PromptResult {
  id: string;
  created_at: string;
  prompt: string;
  result: string;
  user_id: string;
  platforms: string[];
  hidden: boolean;
}

export default function Dashboard() {
  const [prompts, setPrompts] = useState<PromptResult[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletePromptId, setDeletePromptId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showError, setShowError] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();
  const itemsPerPage = 5;
  const [promptCount, setPromptCount] = useState(0);
  const [contentCount, setContentCount] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/signin");
        return;
      }

      setUser(user);
    };

    checkUser();
  }, [router]);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        router.push("/signin");
        return;
      }

      try {
        // Get prompt count from user_prompts table
        const { count: promptCount, error: promptError } = await supabase
          .from("user_prompts")
          .select("prompt_text", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .eq("hidden", false);

        if (promptError) throw promptError;

        // Get content board count
        const { count: contentCount, error: contentError } = await supabase
          .from("content_board")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .eq("hidden", false);

        if (contentError) throw contentError;

        setPromptCount(promptCount || 0);
        setContentCount(contentCount || 0);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching counts:", error);
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        // Get total count of non-hidden prompts from user_prompts table
        const { count } = await supabase
          .from("user_prompts")
          .select("*", { count: "exact", head: true })
          .eq("hidden", false);

        const newTotalPages = Math.ceil((count || 0) / itemsPerPage);
        setTotalPages(newTotalPages);

        // Adjust current page if needed
        if (currentPage > newTotalPages) {
          setCurrentPage(newTotalPages);
          return; // The page change will trigger another fetch
        }

        // Get paginated data from user_prompts table
        const { data, error } = await supabase
          .from("user_prompts")
          .select("*")
          .eq("hidden", false)
          .order("created_at", { ascending: false })
          .range(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage - 1
          );

        if (error) throw error;
        setPrompts(data || []);
      } catch (error) {
        console.error("Error fetching prompts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrompts();
  }, [currentPage, itemsPerPage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push("/signin");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDelete = async (promptId: string) => {
    setDeletePromptId(promptId);
  };

  const confirmDelete = async () => {
    if (!deletePromptId) return;
    setErrorMessage("");
    setShowError(false);
    setSuccessMessage("");
    setShowSuccess(false);

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Authentication required");
      }

      // Log for debugging
      console.log("Attempting to update prompt:", deletePromptId);
      console.log("Current user:", user.id);

      // Simple update in user_prompts table
      const { error: updateError } = await supabase
        .from("user_prompts")
        .update({ hidden: true })
        .eq("id", deletePromptId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) {
        console.error("Update error details:", updateError);
        throw new Error("Failed to delete prompt. Please try again.");
      }

      // Refresh the list immediately from user_prompts table
      const { data: newData, error: fetchError } = await supabase
        .from("user_prompts")
        .select("*")
        .eq("hidden", false)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw new Error("Failed to refresh the list. Please reload the page.");
      }

      // Update states
      const totalCount = newData?.length || 0;
      const newTotalPages = Math.ceil(totalCount / itemsPerPage);
      const newCurrentPage = Math.min(currentPage, Math.max(newTotalPages, 1));
      const start = (newCurrentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;

      setPrompts(newData.slice(start, end));
      setCurrentPage(newCurrentPage);
      setTotalPages(newTotalPages);
      setDeletePromptId(null);

      // Show success message
      setSuccessMessage("Prompt deleted successfully");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage("");
      }, 5000);
    } catch (error) {
      console.error("Error hiding prompt:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An error occurred while deleting the prompt."
      );
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
        setErrorMessage("");
      }, 5000);
    } finally {
      setDeletePromptId(null);
    }
  };

  const handlePromptClick = async (prompt: PromptResult) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/signin");
      return;
    }

    try {
      if (!prompt.result) {
        throw new Error("No content found for this prompt");
      }

      let resultData;
      try {
        // Get the raw content
        const rawContent =
          typeof prompt.result === "string"
            ? prompt.result
            : JSON.stringify(prompt.result);

        // Split content by platform sections
        const platformSections = rawContent.split(/(?=For [A-Za-z]+:)/);

        // Extract content analysis for each platform
        const extractContentAnalysis = (section: string) => {
          const analysisMatch = section.match(
            /Content Analysis:([\s\S]*?)(?=\[|$)/
          );
          if (!analysisMatch) return [];

          return analysisMatch[1]
            .split("\n")
            .filter((line) => line.trim().startsWith("-"))
            .map((line) => {
              const [title, description] = line
                .substring(2)
                .split(":")
                .map((s) => s.trim());
              return { title, description };
            });
        };

        resultData = platformSections
          .filter((section) => section.trim())
          .map((section) => {
            // Extract platform name
            const platformMatch = section.match(/For ([A-Za-z]+):/);
            const platform = platformMatch ? platformMatch[1] : "YouTube";

            // Extract viral score
            const viralScoreMatch = section.match(/Viral Score: (\d+)/);
            const viralScore = viralScoreMatch
              ? parseInt(viralScoreMatch[1], 10)
              : 0;

            // Extract content analysis before cleaning the content
            const contentAnalysis = extractContentAnalysis(section);

            // Remove platform header and viral score
            let content = section
              .replace(/For [A-Za-z]+:/, "")
              .replace(/Viral Score: \d+/, "")
              .replace(/Content Analysis:[\s\S]*?(?=\[|$)/, "")
              .trim();

            // Format based on platform
            if (platform.toLowerCase() === "youtube") {
              // Extract all sections including their content
              const sections = [
                "Hook",
                "Introduction",
                "Main Content",
                "Engagement Prompt",
                "Final Takeaways",
              ];

              const formattedContent = sections
                .map((sectionName) => {
                  const sectionRegex = new RegExp(
                    `\\[${sectionName}[^\\]]*\\]([\\s\\S]*?)(?=\\[|$)`
                  );
                  const match = content.match(sectionRegex);
                  if (match && match[1]) {
                    return `[${sectionName}]\n${match[1].trim()}`;
                  }
                  return null;
                })
                .filter(Boolean)
                .join("\n\n");

              content = formattedContent || content;
            } else if (platform.toLowerCase() === "instagram") {
              // Extract REELS content with all its sections
              const reelsRegex = /REELS:[\s\S]*?(?=\[|$)/;
              const hookRegex = /\[Hook.*?\]([\s\S]*?)(?=\[|$)/;
              const mainContentRegex = /\[Main Content.*?\]([\s\S]*?)(?=\[|$)/;

              const reelsMatch = content.match(reelsRegex);
              const hookMatch = content.match(hookRegex);
              const mainContentMatch = content.match(mainContentRegex);

              let formattedContent = [];
              if (reelsMatch) formattedContent.push(reelsMatch[0].trim());
              if (hookMatch)
                formattedContent.push(`[Hook]\n${hookMatch[1].trim()}`);
              if (mainContentMatch)
                formattedContent.push(
                  `[Main Content]\n${mainContentMatch[1].trim()}`
                );

              content = formattedContent.join("\n\n") || content;
            }

            // Clean up any remaining analysis or metadata
            content = content
              .replace(/Content Analysis:[\s\S]*?(?=\[|$)/, "")
              .replace(/Viral Score: \d+/, "")
              .replace(/For [A-Za-z]+:/, "")
              .trim();

            return {
              platform,
              content,
              viralScore,
              contentAnalysis,
            };
          });

        // Ensure we have valid data
        if (!resultData.length) {
          throw new Error("No valid content found");
        }

        // When storing in sessionStorage:
        const processedResults = resultData.map((result) => ({
          ...result,
          contentAnalysis: result.contentAnalysis || [],
        }));

        sessionStorage.setItem(
          "contentResults",
          JSON.stringify(processedResults)
        );
        sessionStorage.setItem("currentPrompt", prompt.prompt);

        // Navigate to content page
        router.push({
          pathname: "/content",
          query: { prompt: prompt.prompt },
        });
      } catch (parseError) {
        console.error("Parse error:", parseError);
        throw new Error("Failed to parse content");
      }
    } catch (error) {
      console.error("Error processing prompt data:", error);
      setErrorMessage("Failed to load content. Please try again.");
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
        setErrorMessage("");
      }, 5000);
    }
  };

  if (!user) {
    return null; // or a loading state
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>YouZit - Painel de Controle</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-semibold mb-8">Painel de Controle</h1>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Prompts Card */}
            <div
              onClick={() => router.push("/prompt-list")}
              className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Prompts</h2>
                <span className="text-2xl font-bold text-blue-600">
                  {promptCount}
                </span>
              </div>
              <p className="text-gray-600 mb-6">
                Gerencie seus prompts de IA e gere novo conteúdo para múltiplas
                plataformas.
              </p>
              <div className="flex items-center text-blue-600">
                <span className="font-medium">Ver Prompts</span>
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>

            {/* Content Board Card */}
            <div
              onClick={() => router.push("/content-board")}
              className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Quadro de Conteúdo</h2>
                <span className="text-2xl font-bold text-blue-600">
                  {contentCount}
                </span>
              </div>
              <p className="text-gray-600 mb-6">
                Organize e acompanhe seu conteúdo gerado em diferentes
                estágios.
              </p>
              <div className="flex items-center text-blue-600">
                <span className="font-medium">Ver Quadro de Conteúdo</span>
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => router.push("/prompt")}
              className="inline-flex items-center px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Criar Novo Conteúdo
            </button>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deletePromptId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Excluir Prompt
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Tem certeza que deseja excluir este prompt? Esta ação não pode ser
              desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletePromptId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && successMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-50">
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>{successMessage}</span>
          <button
            onClick={() => {
              setShowSuccess(false);
              setSuccessMessage("");
            }}
            className="ml-auto text-green-700 hover:text-green-800"
          >
            <svg
              className="w-4 h-4"
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
      )}

      {/* Error Message */}
      {showError && errorMessage && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-50">
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{errorMessage}</span>
          <button
            onClick={() => {
              setShowError(false);
              setErrorMessage("");
            }}
            className="ml-auto text-red-700 hover:text-red-800"
          >
            <svg
              className="w-4 h-4"
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
      )}
    </>
  );
}
