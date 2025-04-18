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
    const checkUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) {
          router.push('/signin');
          return;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (user) {
          setPrompts([]);
          fetchPrompts(user.id);
        }
      } catch {
        // Silent fail - auth error
        router.push('/signin');
      }
    };

    checkUser();
  }, [router]);

  const fetchPrompts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_prompts')
        .select('*')
        .eq('user_id', userId)
        .eq('hidden', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedData = data?.map(prompt => ({
        id: prompt.id,
        prompt_text: prompt.prompt_text,
        created_at: prompt.created_at,
        platforms: [{
          id: prompt.platform.toLowerCase(),
          name: prompt.platform
        }],
        content_board: prompt.content_board || []
      })) || [];

      setPrompts(transformedData);
    } catch {
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  };

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
        .from("user_prompts")
        .update({ hidden: true })
        .eq("id", deletePromptId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      const { data: newData, error: fetchError } = await supabase
        .from("user_prompts")
        .select("*")
        .eq("user_id", user.id)
        .eq("hidden", false)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const transformedData = newData?.map(prompt => ({
        id: prompt.id,
        prompt_text: prompt.prompt_text,
        created_at: prompt.created_at,
        platforms: [{
          id: prompt.platform.toLowerCase(),
          name: prompt.platform
        }],
        content_board: prompt.content_board || []
      })) || [];

      const totalCount = transformedData.length;
      const newTotalPages = Math.ceil(totalCount / itemsPerPage);
      const newCurrentPage = Math.min(currentPage, Math.max(newTotalPages, 1));
      const start = (newCurrentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;

      setPrompts(transformedData.slice(start, end));
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
      setErrorMessage("Failed to delete prompt");
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
        setErrorMessage("");
      }, 3000);
    }
  };

  const handlePromptClick = async (prompt: GroupedPrompt) => {
    try {
      const { data: promptData, error } = await supabase
        .from("user_prompts")
        .select("*")
        .eq("id", prompt.id)
        .eq("hidden", false);

      if (error) throw error;

      sessionStorage.setItem(
        "contentResults",
        JSON.stringify(
          promptData?.map((p) => ({
            platform: p.platform,
            content: p.script_result,
            viral_score: p.viral_score || 0,
            content_analysis: p.content_analysis || [],
          })) || []
        )
      );
      sessionStorage.setItem("currentPrompt", prompt.prompt_text);

      router.push(`/content?id=${prompt.id}&source=list`);
    } catch {
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
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-500">
                        {formatDate(prompt.created_at)}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          handleDelete(prompt.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Excluir prompt"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
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
