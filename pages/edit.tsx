import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

// Add this interface at the top of the file
interface ContentAnalysis {
  title: string;
  description: string;
  icon: string;
}

// Add this interface with the others
interface SaveToastProps {
  message: string;
  type: "success" | "error";
}

export default function Edit() {
  const router = useRouter();
  const { platform, content, viralScore, originalPrompt } = router.query;
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  // Add new state for content analysis
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis[]>([]);

  // Add these state variables in the Edit component
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<SaveToastProps | null>(null);

  // Add new state to track if content is saved
  const [isSavedToBoard, setIsSavedToBoard] = useState(false);

  useEffect(() => {
    if (originalPrompt) {
      // Don't navigate back immediately
      // router.push({
      //   pathname: "/content",
      //   query: { prompt: originalPrompt },
      // });
    }
  }, [originalPrompt]);

  useEffect(() => {
    // Get the stored content results when mounting
    const parseContent = () => {
      try {
        // If we have content in query params, use that
        if (router.query.content) {
          return;
        }

        // Otherwise check sessionStorage
        const storedResults = sessionStorage.getItem("contentResults");
        if (!storedResults) {
          // If no results stored, redirect to prompt page
          router.push("/prompt");
          return;
        }

        const results = JSON.parse(storedResults);
        const currentPlatformResult = results.find(
          (r: any) =>
            r.platform.toLowerCase() === platform?.toString().toLowerCase()
        );

        if (!currentPlatformResult) return;

        // Update the URL with the content
        router.replace({
          pathname: router.pathname,
          query: {
            ...router.query,
            platform: currentPlatformResult.platform,
            content: currentPlatformResult.content,
            viralScore: currentPlatformResult.viralScore,
          },
        });
      } catch (error) {
        console.error("Error parsing content:", error);
      }
    };

    parseContent();
  }, [platform, router]);

  useEffect(() => {
    // Parse the content analysis from the stored results when mounting
    const parseContentAnalysis = () => {
      const storedResults = sessionStorage.getItem("contentResults");
      if (!storedResults) return;

      try {
        const results = JSON.parse(storedResults);
        const currentPlatformResult = results.find(
          (r: any) =>
            r.platform.toLowerCase() === platform?.toString().toLowerCase()
        );

        if (!currentPlatformResult) return;

        // Check if we have stored content analysis
        if (currentPlatformResult.contentAnalysis?.[platform as string]) {
          // Use stored analysis
          const analysisPoints = currentPlatformResult.contentAnalysis[
            platform as string
          ].map((analysis: any) => ({
            title: analysis.title,
            description: analysis.description,
            icon: getAnalysisIcon(analysis.title),
          }));
          setContentAnalysis(analysisPoints);
          return;
        }

        // Fallback to parsing from content if no stored analysis
        const analysisMatch = currentPlatformResult.content.match(
          /Content Analysis:([\s\S]*?)(?=\[|$)/
        );
        if (!analysisMatch) return;

        const analysisPoints = analysisMatch[1]
          .split("\n")
          .filter((line: string) => line.trim().startsWith("-"))
          .map((line: string) => {
            const [title, description] = line
              .substring(2)
              .split(":")
              .map((s) => s.trim());
            return {
              title,
              description,
              icon: getAnalysisIcon(title),
            };
          });

        setContentAnalysis(analysisPoints);
      } catch (error) {
        console.error("Error parsing content analysis:", error);
      }
    };

    parseContentAnalysis();
  }, [platform]);

  // Helper function to get icons for different analysis points
  const getAnalysisIcon = (title: string): string => {
    const icons: { [key: string]: string } = {
      "Engagement Potential": "🎯",
      "Target Audience Appeal": "👥",
      "Hook Effectiveness": "🎣",
      "Call-to-Action Strength": "💪",
      "SEO/Discoverability": "🔍",
      "Emotional Impact": "❤️",
      "Shareability Factors": "🔄",
    };
    return icons[title] || "📊";
  };

  // Handle refinement submission
  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinementPrompt.trim()) return;

    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: refinementPrompt },
    ]);
    // Clear input after sending
    setRefinementPrompt("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Authentication required");
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: `Original content: "${content}"
Original prompt: "${originalPrompt}"
Refinement request: "${refinementPrompt}"
Please refine the content for ${platform} platform while maintaining its effectiveness.`,
          platforms: [platform as string],
          userId: session.user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error refining content");
      }

      // Parse the refined content
      const refinedContent = data.result
        .replace(`For ${platform}:\n`, "")
        .replace(/Viral Score: \d+\n/, "")
        .trim();

      // Add the response to messages but don't set it as input
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: refinedContent },
      ]);
    } catch (error: any) {
      console.error("Error refining content:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: error.message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(refinementPrompt);
  };

  const handleBack = () => {
    if (originalPrompt) {
      router.push({
        pathname: "/content",
        query: {
          prompt: originalPrompt,
          isExisting: true,
        },
      });
    } else {
      router.push("/prompt");
    }
  };

  // Add function to check if content is already saved
  useEffect(() => {
    const checkIfSaved = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("content_board")
          .select("id")
          .eq("user_id", user.id)
          .eq("platform", platform)
          .eq("content", content)
          .eq("hidden", false)
          .single();

        setIsSavedToBoard(!!data);
      } catch (error) {
        console.error("Error checking saved status:", error);
      }
    };

    checkIfSaved();
  }, [platform, content]);

  // Update handleSaveToBoard to handle both save and remove
  const handleSaveToBoard = async () => {
    setIsSaving(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Authentication required");

      if (isSavedToBoard) {
        // Remove from board
        const { error: removeError } = await supabase
          .from("content_board")
          .update({ hidden: true })
          .eq("user_id", user.id)
          .eq("platform", platform)
          .eq("content", content);

        if (removeError) throw removeError;
        setIsSavedToBoard(false);
        setToast({
          message: "Content removed from board",
          type: "success",
        });
      } else {
        // Get prompt from query params or session storage
        const currentPrompt =
          router.query.originalPrompt ||
          sessionStorage.getItem("currentPrompt");

        const { data, error } = await supabase.from("content_board").insert({
          user_id: user.id,
          platform: platform,
          content: content,
          prompt: currentPrompt,
          viral_score: viralScore,
          status: "draft",
          content_analysis: contentAnalysis,
          hidden: false,
        });

        if (error) {
          console.error("Error saving content:", error);
          setToast({
            message: "Failed to save content",
            type: "error",
          });
          return;
        }

        setIsSavedToBoard(true);
        setToast({
          message: "Content saved to board",
          type: "success",
        });
      }
    } catch (error: any) {
      console.error("Error:", error);
      setToast({
        message: error.message || "Failed to update board",
        type: "error",
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <>
      <Head>
        <title>YouZit - Edit Content</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back button and title */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={handleBack}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-semibold">Edit Content</h1>
          </div>

          <div className="flex gap-6">
            {/* Content panel - Without content analysis */}
            <div className="flex-1 bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Image
                      src={`/icons/${platform?.toString().toLowerCase()}.svg`}
                      alt={platform as string}
                      width={24}
                      height={24}
                    />
                    <h2 className="text-xl font-medium">{platform}</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 transform -rotate-90">
                          <circle
                            className="text-gray-200"
                            strokeWidth="4"
                            stroke="currentColor"
                            fill="transparent"
                            r="20"
                            cx="24"
                            cy="24"
                          />
                          <circle
                            className="text-[#0066FF]"
                            strokeWidth="4"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="20"
                            cx="24"
                            cy="24"
                            strokeDasharray={`${
                              (Number(viralScore) / 100) * 125.6
                            } 125.6`}
                          />
                        </svg>
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                          <span className="text-sm font-semibold">
                            {viralScore}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">Viral Score</span>
                    </div>
                    <button
                      onClick={handleSaveToBoard}
                      disabled={isSaving}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isSavedToBoard
                          ? "bg-red-50 text-red-600 border-red-200 hover:border-red-300"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {isSavedToBoard ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        )}
                      </svg>
                      <span>
                        {isSaving
                          ? "Processing..."
                          : isSavedToBoard
                          ? "Remove from Board"
                          : "Save to Board"}
                      </span>
                    </button>
                  </div>
                </div>
                {/* Content without analysis section */}
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">
                    {content
                      ?.toString()
                      .replace(/For [A-Za-z]+:/, "")
                      .replace(/Viral Score: \d+/, "")
                      .replace(/Content Analysis:[\s\S]*?(?=\[|$)/, "")
                      .trim()}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Analysis Panel - Separate sidebar */}
            <div className="w-96 bg-white rounded-lg shadow h-fit">
              <div className="p-6">
                <h2 className="text-xl font-medium mb-6">Content Analysis</h2>
                <div className="space-y-4">
                  {contentAnalysis.map((analysis, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 rounded-lg bg-gray-50"
                    >
                      <span className="text-2xl">{analysis.icon}</span>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {analysis.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {analysis.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg ${
              toast.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            } transition-opacity duration-300`}
          >
            <div className="flex items-center gap-2">
              {toast.type === "success" ? (
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              {toast.message}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
