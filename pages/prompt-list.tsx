import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Link from "next/link";
import { toast } from "react-hot-toast";

interface Prompt {
  id: string;
  prompt_text: string;
  platform: string;
  script_result: string;
  content_analysis: any[];
  created_at: string;
}

interface GroupedPrompt {
  id: string;
  prompt_text: string;
  created_at: string;
  platforms: Array<{
    name: string;
    id: string;
  }>;
  content_board: Array<{
    platform: string | { name: string; id: string };
  }>;
}

export default function PromptList() {
  const [prompts, setPrompts] = useState<GroupedPrompt[]>([]);
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

  useEffect(() => {
    const checkAuth = async () => {
      // First check session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        toast.error("Por favor, faça login para continuar");
        router.push("/signin");
        return;
      }

      // Then get user details
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User error:", userError);
        toast.error("Erro ao carregar dados do usuário");
        router.push("/signin");
        return;
      }

      console.log("User data:", { id: user.id, email: user.email });
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    const fetchPrompts = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        return;
      }

      // Fetch all prompts to get total count
      const { data: promptsData, error } = await supabase
        .from("prompts")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("hidden", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching prompts:", error);
        return;
      }

      // Calculate pagination
      const totalCount = promptsData.length;
      const totalPages = Math.ceil(totalCount / itemsPerPage);
      setTotalPages(totalPages);

      // Process only the current page's prompts
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const currentPagePrompts = promptsData.slice(start, end);

      const processedPrompts = currentPagePrompts.map((prompt) => ({
        id: prompt.id,
        prompt_text: prompt.prompt_text,
        created_at: prompt.created_at,
        platforms: [
          {
            name: prompt.platform,
            id: prompt.platform.toLowerCase(),
          },
        ],
        content_board: prompt.content_board || [],
      }));

      setPrompts(processedPrompts);
    };

    fetchPrompts();
  }, [currentPage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const { error: updateError } = await supabase
        .from("prompts")
        .update({ hidden: true })
        .eq("id", deletePromptId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Refresh the list
      const { data: newData, error: fetchError } = await supabase
        .from("prompts")
        .select("*")
        .eq("user_id", user.id)
        .eq("hidden", false)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Update states
      const totalCount = newData?.length || 0;
      const newTotalPages = Math.ceil(totalCount / itemsPerPage);
      const newCurrentPage = Math.min(currentPage, Math.max(newTotalPages, 1));
      const start = (newCurrentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;

      setPrompts(
        newData.slice(start, end).map((prompt: any) => ({
          id: prompt.id,
          prompt_text: prompt.prompt_text,
          platforms: prompt.platforms,
          created_at: prompt.created_at,
          content_board: prompt.content_board || [],
        }))
      );
      setCurrentPage(newCurrentPage);
      setTotalPages(newTotalPages);
      setDeletePromptId(null);

      setSuccessMessage("Prompt deleted successfully");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage("");
      }, 3000);
    } catch (error: any) {
      console.error("Error deleting prompt:", error);
      setErrorMessage(error.message || "Failed to delete prompt");
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
        setErrorMessage("");
      }, 3000);
    }
  };

  const handlePromptClick = async (prompt: GroupedPrompt) => {
    try {
      // Fetch directly from prompts table
      const { data: promptData, error } = await supabase
        .from("prompts")
        .select("*")
        .eq("id", prompt.id)
        .eq("hidden", false);

      if (error) throw error;

      // Store in session storage
      sessionStorage.setItem(
        "contentResults",
        JSON.stringify(
          promptData?.map((p) => ({
            platform: p.platform,
            content: p.script_result,
            viralScore: p.viral_score || 0,
            contentAnalysis: p.content_analysis || [],
          })) || []
        )
      );
      sessionStorage.setItem("currentPrompt", prompt.prompt_text);

      // Navigate to content page
      router.push(`/content?id=${prompt.id}&source=list`);
    } catch (error) {
      console.error("Error fetching prompt content:", error);
      toast.error("Failed to load content");
    }
  };

  // Add the getPlatformIcon helper function
  const getPlatformIcon = (platformId: string = "") => {
    // Map platform IDs to icon names
    const iconMap: { [key: string]: string } = {
      youtube: "youtube",
      instagram: "instagram",
      linkedin: "linkedin",
      twitter: "twitter",
      facebook: "facebook",
      newsletter: "newsletter",
    };

    const normalizedPlatform = platformId.toLowerCase().trim();
    return `/icons/${iconMap[normalizedPlatform] || "default"}.svg`;
  };

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
        <title>YouZit - Seus Prompts</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold">Seus Prompts</h1>
            <Link
              href="/prompt"
              className="inline-flex items-center gap-2 text-[#0066FF] hover:text-blue-700 font-medium"
            >
              <span className="text-2xl">+</span>
              <span>Novo conteúdo</span>
            </Link>
          </div>

          {prompts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Nenhum prompt ainda</p>
              <Link
                href="/prompt"
                className="text-blue-600 hover:text-blue-700"
              >
                Crie seu primeiro prompt
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handlePromptClick(prompt)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium mb-3">
                        {prompt.prompt_text}
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {prompt.platforms.map((platform) => (
                          <div
                            key={platform.id}
                            className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full"
                          >
                            <div className="w-5 h-5 relative">
                              <Image
                                src={`/icons/${platform.id}.svg`}
                                alt={platform.name}
                                fill
                                className="object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/icons/default.svg";
                                }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 capitalize">
                              {platform.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(prompt.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {prompts.length > 0 && (
            <div className="flex justify-center items-center gap-4 mt-8 text-sm">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="text-gray-500 hover:text-gray-900 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-gray-500">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="text-gray-500 hover:text-gray-900 disabled:opacity-50"
              >
                Próximo
              </button>
            </div>
          )}
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
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg shadow-lg">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {showError && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-lg">
          {errorMessage}
        </div>
      )}
    </>
  );
}
