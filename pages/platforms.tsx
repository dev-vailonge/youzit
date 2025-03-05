import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Header from "@/components/Header";
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

export default function Platforms() {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customPlatform, setCustomPlatform] = useState("");
  const [platforms, setPlatforms] = useState(defaultPlatforms);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const { prompt } = router.query;

  useEffect(() => {
    console.log("Prompt from URL:", prompt);
  }, [prompt]);

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
    const checkSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        console.error("Session error:", error);
        toast.error("Por favor, faça login para continuar");
        router.push("/signin");
        return;
      }
    };

    checkSession();
  }, []);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatform(platformId === selectedPlatform ? "" : platformId);
  };

  const handleAddCustomPlatform = () => {
    if (customPlatform.trim()) {
      const newPlatform = {
        id: customPlatform.toLowerCase().replace(/\s+/g, "-"),
        name: customPlatform,
        icon: "/icons/custom.svg",
      };
      setPlatforms((prev) => [...prev, newPlatform]);
      setSelectedPlatform(newPlatform.id);
      setCustomPlatform("");
      setShowCustomInput(false);
    }
  };

  const handleGenerate = async () => {
    try {
      console.log("Starting generate process...");
      console.log("Current state:", {
        prompt,
        selectedPlatform,
        loading,
        user: user ? "present" : "missing",
      });

      // Check session first
      console.log("Checking session...");
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        toast.error("Erro ao verificar sessão");
        return;
      }

      if (!session) {
        console.error("No session found");
        toast.error("Por favor, faça login para continuar");
        router.push("/signin");
        return;
      }

      console.log("Session found:", {
        userId: session.user.id,
        hasAccessToken: !!session.access_token,
      });

      if (selectedPlatform.length === 0) {
        console.error("No platform selected");
        toast.error("Por favor, selecione pelo menos uma plataforma");
        return;
      }

      if (!prompt) {
        console.error("No prompt provided");
        toast.error("Por favor, insira um prompt");
        return;
      }

      console.log("Generating content with:", {
        prompt,
        selectedPlatform,
        userId: session.user.id,
        session: {
          access_token: session.access_token ? "present" : "missing",
          user: {
            id: session.user.id,
            email: session.user.email,
          },
        },
      });

      setLoading(true);

      const requestBody = {
        prompt: prompt,
        platforms: [selectedPlatform],
        userId: session.user.id,
      };

      console.log("Request body:", requestBody);

      // Call the generate API with auth token
      console.log("Making API request...");
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log("API Response status:", response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          console.error("Failed to parse error response:", e);
          errorData = { message: "Failed to parse error response" };
        }

        console.error("API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
          requestBody,
          headers: {
            authorization: response.headers.get("authorization") ? "present" : "missing",
            contentType: response.headers.get("content-type"),
          },
        });

        throw new Error(errorData.message || "Failed to generate content");
      }

      const data = await response.json();
      console.log("Generate API Response:", {
        id: data.id,
        contentId: data.contentId,
        fullData: data,
      });

      // Store the results in session storage
      sessionStorage.setItem("currentPrompt", prompt as string);
      sessionStorage.setItem(
        "contentResults",
        JSON.stringify([
          {
            platform: selectedPlatform,
            content: data.script_result || data.content,
            viralScore: data.viral_score || data.viralScore,
            contentAnalysis: data.content_analysis || data.contentAnalysis,
          },
        ])
      );

      // Use consistent id field from response
      const contentId = data.id;
      if (contentId) {
        console.log("Setting content ID:", contentId);
        sessionStorage.setItem("contentId", contentId);
        router.push(`/content?id=${contentId}`);
      } else {
        console.error("Missing content ID in response:", data);
        throw new Error("No content ID received in response");
      }
    } catch (error) {
      console.error("Error in handleGenerate:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      toast.error(
        error instanceof Error ? error.message : "Falha ao gerar conteúdo"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/signin");
  };

  return (
    <>
      <Head>
        <title>YouZit - Escolher Plataformas</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-semibold text-center mb-8">
            Escolha suas plataformas
          </h1>

          {/* Platform selection grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                className={`flex items-center justify-between p-6 text-left rounded-2xl border-2 transition-all ${
                  platform.id === selectedPlatform
                    ? "border-[#0066FF] bg-blue-50"
                    : "border-gray-200 hover:border-[#0066FF]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={platform.icon}
                    alt={platform.name}
                    width={24}
                    height={24}
                  />
                  <h3 className="text-lg font-medium">{platform.name}</h3>
                </div>
                {platform.id === selectedPlatform && (
                  <svg
                    className="w-6 h-6 text-[#0066FF]"
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
                )}
              </button>
            ))}

            {/* Add Custom Platform Button */}
            {!showCustomInput && (
              <button
                onClick={() => setShowCustomInput(true)}
                className="flex items-center justify-center p-6 text-left rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#0066FF] transition-all"
              >
                <div className="flex items-center gap-2">
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
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  <span>Adicionar Plataforma Personalizada</span>
                </div>
              </button>
            )}
          </div>

          {/* Custom Platform Input */}
          {showCustomInput && (
            <div className="mb-8 flex gap-2">
              <input
                type="text"
                value={customPlatform}
                onChange={(e) => setCustomPlatform(e.target.value)}
                placeholder="Digite o nome da plataforma"
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              />
              <button
                onClick={handleAddCustomPlatform}
                className="px-4 py-2 bg-[#0066FF] text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Adicionar
              </button>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomPlatform("");
                }}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Generate Content Button */}
          <div className="text-center">
            <button
              onClick={handleGenerate}
              disabled={!selectedPlatform || loading}
              className="inline-flex items-center px-6 py-3 text-lg font-medium text-white bg-[#0066FF] rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 mr-3 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  Gerando...
                </>
              ) : (
                "Gerar Conteúdo"
              )}
            </button>
          </div>

          {message && (
            <div className="mt-4 text-sm text-center text-red-600">
              {message}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
