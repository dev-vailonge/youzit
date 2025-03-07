import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DroppableStateSnapshot,
} from "react-beautiful-dnd";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { ContentDetails } from "@/types/content";
import Link from "next/link";
import { ArrowUturnRightIcon } from "@heroicons/react/24/outline";
import Tooltip from "@/components/Tooltip";

interface StrictModeDroppableProps {
  droppableId: string;
  children: (
    provided: DroppableProvided,
    snapshot: DroppableStateSnapshot
  ) => React.ReactElement;
}

const StrictModeDroppable = ({
  children,
  droppableId,
}: StrictModeDroppableProps) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => children(provided, snapshot)}
    </Droppable>
  );
};

type ContentStatus = "draft" | "to-do" | "in-progress" | "done";
type FormatType = "Gravação" | "Reação" | "Curso";

interface ContentItem {
  id: string;
  user_id: string;
  platform: {
    id: string;
    name: string;
  };
  content: string;
  prompt_id: string;
  script_result: string;
  viral_score: number;
  content_analysis: any[];
  status: ContentStatus;
  hidden: boolean;
  created_at: string;
  updated_at?: string;
}

interface BoardColumn {
  title: string;
  status: ContentStatus;
  items: ContentDetails[];
  count: number;
}

export default function ContentBoard() {
  const [contents, setContents] = useState<ContentDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [columns, setColumns] = useState<BoardColumn[]>([
    { title: "Rascunho", status: "draft", items: [], count: 0 },
    { title: "A Fazer", status: "to-do", items: [], count: 0 },
    { title: "Em Andamento", status: "in-progress", items: [], count: 0 },
    { title: "Concluído", status: "done", items: [], count: 0 },
  ]);
  const router = useRouter();
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/signin");
        return;
      }
      setUser(user);
      fetchContents(user.id);
    };

    checkUser();
  }, [router]);

  const fetchContents = async (userId: string) => {
    try {
      const { data: fetchedContents, error } = await supabase
        .from("content_board")
        .select(
          `
          *,
          prompt:prompts (
            id,
            prompt_text,
            script_result,
            viral_score,
            content_analysis,
            platform
          )
        `
        )
        .eq("user_id", userId)
        .eq("hidden", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter out duplicates based on prompt_id
      const uniqueContents = filterUniqueContents(fetchedContents);
      setContents(uniqueContents);

      // Update columns with unique contents
      setColumns((prevColumns) =>
        prevColumns.map((col) => ({
          ...col,
          items: uniqueContents.filter(
            (content) => content.status === col.status
          ),
          count: uniqueContents.filter(
            (content) => content.status === col.status
          ).length,
        }))
      );
    } catch (error) {
      console.error("Error fetching contents:", error);
      setError("Failed to load content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Update the filterUniqueContents function to use prompt_id
  const filterUniqueContents = (contents: ContentDetails[]) => {
    const seen = new Set();
    return contents.filter((content) => {
      const duplicate = seen.has(content.prompt_id);
      seen.add(content.prompt_id);
      return !duplicate;
    });
  };

  const getFormatTagStyle = (platform: string) => {
    switch (platform) {
      case "Gravação":
        return "bg-purple-100 text-purple-800";
      case "Reação":
        return "bg-red-100 text-red-800";
      case "Curso":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result;

      if (!destination) return;

      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      // Validate the status value
      const validStatuses: ContentStatus[] = [
        "draft",
        "to-do",
        "in-progress",
        "done",
      ];
      if (!validStatuses.includes(destination.droppableId as ContentStatus)) {
        console.error("Invalid status:", destination.droppableId);
        toast.error("Invalid status value");
        return;
      }

      // Update UI first
      setColumns((prev) => {
        const newColumns = [...prev];
        const sourceColumn = newColumns.find(
          (col) => col.status === source.droppableId
        );
        const destColumn = newColumns.find(
          (col) => col.status === destination.droppableId
        );

        if (!sourceColumn || !destColumn) return prev;

        const [movedItem] = sourceColumn.items.splice(source.index, 1);
        movedItem.status = destination.droppableId as ContentStatus;
        destColumn.items.splice(destination.index, 0, movedItem);

        sourceColumn.count = sourceColumn.items.length;
        destColumn.count = destColumn.items.length;

        return newColumns;
      });

      // Update Supabase with type assertion
      try {
        const { error } = await supabase
          .from("content_board")
          .update({
            status: destination.droppableId as ContentStatus,
          })
          .eq("id", draggableId);

        if (error) {
          console.error("Error details:", {
            error,
            source: source.droppableId,
            destination: destination.droppableId,
            itemId: draggableId,
          });
          toast.error("Failed to update status");
          fetchContents(user.id);
          return;
        }

        toast.success("Status updated");
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to update status");
        fetchContents(user.id);
      }
    },
    [user]
  );

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("content_board")
        .update({ hidden: true })
        .eq("id", id);

      if (error) throw error;

      setContents(contents.filter((content) => content.id !== id));

      // Remove from local state
      setColumns((prev) =>
        prev.map((column) => ({
          ...column,
          items: column.items.filter((item) => item.id !== id),
          count: column.items.filter((item) => item.id !== id).length,
        }))
      );

      toast.success("Content removed from board");
    } catch (error) {
      console.error("Error deleting content:", error);
      setError("Failed to delete content. Please try again.");
    }
  };

  const handleCardClick = async (item: ContentDetails) => {
    try {
      // Store the content data directly in session storage
      const contentResult = {
        platform: typeof item.platform === 'string' ? item.platform : item.platform.name,
        content: item.prompt?.script_result || item.content,
        viralScore: item.prompt?.viral_score || item.viralScore,
        contentAnalysis: [], // Initialize empty array for content analysis
      };

      // Store in session storage
      sessionStorage.setItem("contentResults", JSON.stringify([contentResult]));
      sessionStorage.setItem(
        "currentPrompt",
        item.prompt?.prompt_text || item.title
      );

      // Navigate to content page
      router.push({
        pathname: "/content",
        query: {
          id: item.prompt_id,
          source: "board",
        },
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load content");
    }
  };

  const handleContextToggle = (contentId: string) => {
    setSelectedContexts((prev) =>
      prev.includes(contentId)
        ? prev.filter((id) => id !== contentId)
        : [...prev, contentId]
    );
  };

  const handleUseAsContext = async (contentId: string) => {
    try {
      // Find the selected content
      const selectedContent = contents.find(
        (content) => content.id === contentId
      );

      if (!selectedContent) return;

      // Prepare context data with all required fields
      const contextData = {
        title: selectedContent.prompt?.prompt_text || selectedContent.title,
        content:
          selectedContent.prompt?.script_result || selectedContent.content,
        viralScore:
          selectedContent.prompt?.viral_score || selectedContent.viralScore,
        platform: {
          id:
            typeof selectedContent.platform === "string"
              ? selectedContent.platform.toLowerCase()
              : selectedContent.platform?.id || "",
          name:
            typeof selectedContent.platform === "string"
              ? selectedContent.platform
              : selectedContent.platform?.name || "",
        },
      };

      // Store the context in session storage
      sessionStorage.setItem("promptContext", JSON.stringify(contextData));

      // Navigate to prompt page
      router.push({
        pathname: "/prompt",
        query: { withContext: "true" },
      });
    } catch (error) {
      console.error("Error setting context:", error);
      toast.error("Failed to use content as context");
    }
  };

  // Add a helper function to get the platform icon
  const getPlatformIcon = (item: ContentDetails) => {
    // Get platform from either prompt or content
    const platformId =
      typeof item.platform === "string"
        ? item.platform.toLowerCase()
        : item.platform?.id?.toLowerCase() || "default";

    // Map platform IDs to icon names
    const iconMap: { [key: string]: string } = {
      youtube: "youtube",
      instagram: "instagram",
      linkedin: "linkedin",
      twitter: "twitter",
      facebook: "facebook",
      newsletter: "newsletter",
      // Add more mappings as needed
    };

    return `/icons/${iconMap[platformId] || "default"}.svg`;
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
        <title>YouZit - Quadro de Conteúdo</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold">Quadro de Conteúdo</h1>
            <Link
              href="/prompt"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              + Novo conteúdo
            </Link>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-4 gap-4">
              {columns.map((column) => (
                <StrictModeDroppable
                  droppableId={column.status}
                  key={column.status}
                >
                  {(
                    provided: DroppableProvided,
                    snapshot: DroppableStateSnapshot
                  ) => (
                    <div
                      className={`bg-gray-100 rounded-lg p-4 min-h-[200px] ${
                        snapshot.isDraggingOver ? "bg-gray-200" : ""
                      }`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            column.status === "draft"
                              ? "bg-gray-400"
                              : column.status === "to-do"
                              ? "bg-blue-400"
                              : column.status === "in-progress"
                              ? "bg-yellow-400"
                              : "bg-green-400"
                          }`}
                        />
                        <h2 className="text-lg font-medium">
                          {column.title}
                          <span className="ml-2 text-gray-500">
                            {column.count}
                          </span>
                        </h2>
                      </div>

                      <div className="space-y-3">
                        {column.items.map((item, index) => (
                          <Draggable
                            key={item.id}
                            draggableId={item.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white p-4 rounded-lg cursor-move hover:shadow-md transition-shadow ${
                                  snapshot.isDragging
                                    ? "shadow-lg"
                                    : "shadow-sm"
                                }`}
                                onClick={() => handleCardClick(item)}
                                role="button"
                                tabIndex={0}
                              >
                                {/* Platform and Delete Button Row */}
                                <div className="flex justify-between items-center mb-3">
                                  <div className="flex items-center gap-2">
                                    <Image
                                      src={getPlatformIcon(item)}
                                      alt={
                                        typeof item.platform === "string"
                                          ? item.platform
                                          : item.platform?.name || ""
                                      }
                                      width={20}
                                      height={20}
                                    />
                                    <span className="text-sm line-clamp-2">
                                      {item.prompt?.prompt_text ||
                                        item.title ||
                                        "Sem título"}
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(item.id);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
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

                                {/* Content Preview */}
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                  {(
                                    item.prompt?.script_result ||
                                    item.content ||
                                    ""
                                  )
                                    .replace(/For [A-Za-z]+:/, "")
                                    .replace(/Viral Score: \d+/, "")
                                    .replace(
                                      /Content Analysis:[\s\S]*?(?=\[|$)/,
                                      ""
                                    )
                                    .trim()}
                                </p>

                                {/* Footer with Viral Score and Context Button */}
                                <div className="flex justify-end items-center gap-2">
                                  {(item.prompt?.viral_score != null ||
                                    item.viralScore != null) && (
                                    <>
                                      <span className="text-xs text-gray-500">
                                        ⚡{" "}
                                        {item.prompt?.viral_score ||
                                          item.viralScore}
                                      </span>
                                      <Tooltip text="Use este conteúdo como contexto para novas gerações">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUseAsContext(item.id);
                                          }}
                                          className="text-gray-400 hover:text-blue-500 transition-colors"
                                        >
                                          <ArrowUturnRightIcon className="w-4 h-4" />
                                        </button>
                                      </Tooltip>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </StrictModeDroppable>
              ))}
            </div>
          </DragDropContext>
        </main>
      </div>
    </>
  );
}
