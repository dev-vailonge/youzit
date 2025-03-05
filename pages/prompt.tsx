import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import Header from "@/components/Header";
import Image from "next/image";

export default function Prompt() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [contextPrompt, setContextPrompt] = useState<{
    title: string;
    content: string;
    viralScore: number;
    platform?: {
      id: string;
      name: string;
    };
  } | null>(null);

  useEffect(() => {
    adjustTextareaHeight();
    checkUser();

    // Always check for context in session storage
    const storedContext = sessionStorage.getItem("promptContext");
    console.log("Stored context:", storedContext); // Debug log

    if (storedContext) {
      try {
        const parsedContext = JSON.parse(storedContext);
        console.log("Parsed context:", parsedContext); // Debug log
        setContextPrompt(parsedContext);
      } catch (error) {
        console.error("Error parsing context:", error);
        sessionStorage.removeItem("promptContext");
      }
    }
  }, []); // Remove prompt and router.isReady dependencies since we only want to check once on mount

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

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const handleRemoveContext = () => {
    setContextPrompt(null);
    sessionStorage.removeItem("promptContext");
    // Reset textarea styling
    setPrompt("");
  };

  const handleContinue = () => {
    if (prompt.trim()) {
      sessionStorage.setItem("currentPrompt", prompt);
      // Clear any existing context when continuing with new prompt
      sessionStorage.removeItem("promptContext");
      router.push({
        pathname: "/platforms",
        query: { prompt: prompt },
      });
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>YouZit - Criar Conteúdo</title>
      </Head>

      <div className="min-h-screen bg-white">
        <Header />

        {/* Main content with flex centering */}
        <main className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="w-full max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-semibold text-center mb-8">
              O que você gostaria de criar?
            </h1>

            <div className="space-y-4">
              <div className="relative">
                {/* Context box that overlaps the textarea - only show when we have context */}
                {contextPrompt && (
                  <div className="absolute -top-3 right-4 z-10 inline-flex items-center gap-2 bg-blue-100 text-blue-900 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
                    {/* Platform Icon */}
                    <Image
                      src={`/icons/${
                        contextPrompt.platform?.id || "default"
                      }.svg`}
                      alt={contextPrompt.platform?.name || ""}
                      width={16}
                      height={16}
                      className="w-4 h-4"
                    />
                    <span className="max-w-[200px] truncate">
                      {contextPrompt.title}
                    </span>
                    <button
                      onClick={handleRemoveContext}
                      className="ml-1 text-blue-400 hover:text-blue-600"
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

                {/* Textarea with conditional styling based on context */}
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Digite seu prompt aqui..."
                  className={`w-full p-4 text-lg rounded-2xl resize-none transition-all duration-200 ${
                    contextPrompt
                      ? "border-2 border-blue-200 bg-blue-50/30 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      : "border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  }`}
                />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleContinue}
                  disabled={!prompt.trim()}
                  className="px-8 py-3 text-lg font-medium text-white bg-[#0066FF] rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
