import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";

interface ContentDetails {
  platform: {
    id: string;
    name: string;
    icon?: JSX.Element;
  };
  title: string;
  content: string;
  viralScore: number;
  readabilityLevel: string;
  liked?: boolean;
  disliked?: boolean;
  metrics?: {
    sentiment: string;
    tone: string;
    wordCount: number;
    estimatedReadTime: string;
  };
}

const getPlatformIcon = (platformId: string): string => {
  const platformMap: { [key: string]: string } = {
    twitter: "/icons/twitter.svg",
    youtube: "/icons/youtube.svg",
    instagram: "/icons/instagram.svg",
    linkedin: "/icons/linkedin.svg",
    facebook: "/icons/facebook.svg",
    newsletter: "/icons/newsletter.svg",
  };

  return platformMap[platformId.toLowerCase()] || "/icons/custom.svg";
};

export default function ContentEdit() {
  const router = useRouter();
  const { platform } = router.query;
  const [content, setContent] = useState<ContentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady) return;

    try {
      const { platform, content, viralScore } = router.query;

      if (!platform || !content) {
        router.push("/content");
        return;
      }

      // Create content object from query params
      const contentData: ContentDetails = {
        platform: {
          id: platform as string,
          name:
            (platform as string).charAt(0).toUpperCase() +
            (platform as string).slice(1),
        },
        title: content as string,
        content: content as string,
        viralScore: Number(viralScore) || 0,
        readabilityLevel: "Advanced", // You can add more metrics as needed
        metrics: {
          sentiment: "Positive",
          tone: "Professional",
          wordCount: (content as string).split(/\s+/).length,
          estimatedReadTime: `${Math.ceil(
            (content as string).split(/\s+/).length / 200
          )} min`,
        },
      };

      setContent(contentData);
    } catch (error) {
      console.error("Error loading content:", error);
      router.push("/content");
    } finally {
      setIsLoading(false);
    }
  }, [router.isReady, router.query]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-medium text-gray-900 mb-2">
            Loading...
          </div>
          <div className="text-sm text-gray-500">
            Please wait while we load your content
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-medium text-gray-900 mb-2">
            Content not found
          </div>
          <div className="text-sm text-gray-500">
            The requested content could not be loaded
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white">
      <Head>
        <title>Edit Content - {content.platform.name}</title>
      </Head>

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <Image
                src={getPlatformIcon(content.platform.id)}
                alt={content.platform.name}
                width={24}
                height={24}
              />
              <h1 className="text-3xl font-semibold text-gray-900">
                Edit Content for {content.platform.name}
              </h1>
            </div>
          </div>
        </div>

        {/* Content and Metrics */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Content Editor */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Content</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    rows={8}
                    value={content.content}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Metrics and Analysis */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Metrics</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Viral Score</label>
                  <div className="text-2xl font-semibold">
                    {content.viralScore}/100
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Readability</label>
                  <div className="text-2xl font-semibold">
                    {content.readabilityLevel}
                  </div>
                </div>
                {content.metrics && (
                  <>
                    <div>
                      <label className="text-sm text-gray-500">Sentiment</label>
                      <div className="text-2xl font-semibold">
                        {content.metrics.sentiment}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Tone</label>
                      <div className="text-2xl font-semibold">
                        {content.metrics.tone}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">
                        Word Count
                      </label>
                      <div className="text-2xl font-semibold">
                        {content.metrics.wordCount}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Read Time</label>
                      <div className="text-2xl font-semibold">
                        {content.metrics.estimatedReadTime}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
