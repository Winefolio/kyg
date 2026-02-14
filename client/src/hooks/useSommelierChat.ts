import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  imageDescription?: string | null;
  metadata?: any;
  createdAt: string;
  isStreaming?: boolean;
}

interface SommelierChat {
  id: number;
  userId: number;
  title: string | null;
  summary: string | null;
  messageCount: number;
}

export function useSommelierChat(isOpen: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  // Load active chat + messages when sheet opens
  const { data: chatData, isLoading } = useQuery({
    queryKey: ["/api/sommelier-chat/active"],
    queryFn: async () => {
      const res = await fetch("/api/sommelier-chat/active", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load chat");
      return res.json() as Promise<{ chat: SommelierChat; messages: ChatMessage[] }>;
    },
    enabled: isOpen,
    staleTime: 30000,
  });

  // Sync server messages with local state
  useEffect(() => {
    if (chatData?.messages && !isStreaming) {
      setMessages(chatData.messages);
    }
  }, [chatData?.messages, isStreaming]);

  const parseSSEStream = useCallback(async (
    response: Response,
    optimisticUserMsg: ChatMessage
  ) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    // Add placeholder assistant message
    const streamingMsg: ChatMessage = {
      id: -1,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, streamingMsg]);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);
            if (event.type === "token") {
              fullContent += event.content;
              setStreamingContent(fullContent);
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.isStreaming) {
                  updated[updated.length - 1] = { ...last, content: fullContent };
                }
                return updated;
              });
            } else if (event.type === "done") {
              // Replace streaming message with final message
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (updated[lastIdx]?.isStreaming) {
                  updated[lastIdx] = {
                    id: event.messageId,
                    role: "assistant",
                    content: event.fullContent || fullContent,
                    createdAt: new Date().toISOString(),
                    isStreaming: false,
                  };
                }
                return updated;
              });
            } else if (event.type === "error") {
              setError(event.message);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    setError(null);
    setIsStreaming(true);
    setStreamingContent("");

    const optimisticMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMsg]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/sommelier-chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
        credentials: "include",
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to send message" }));
        throw new Error(err.error || "Failed to send message");
      }

      await parseSSEStream(res, optimisticMsg);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(err.message || "Something went wrong. Try again.");
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [isStreaming, parseSSEStream]);

  const sendMessageWithImage = useCallback(async (text: string, imageFile: File) => {
    if (isStreaming) return;

    setError(null);
    setIsStreaming(true);
    setStreamingContent("");

    const optimisticMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: text.trim() || "What can you tell me about these wines?",
      metadata: { hasImage: true },
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMsg]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const formData = new FormData();
      formData.append("message", text.trim() || "What can you tell me about these wines?");
      formData.append("image", imageFile);

      const res = await fetch("/api/sommelier-chat/message-with-image", {
        method: "POST",
        body: formData,
        credentials: "include",
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to send message" }));
        throw new Error(err.error || "Failed to send message");
      }

      await parseSSEStream(res, optimisticMsg);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(err.message || "Something went wrong. Try again.");
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [isStreaming, parseSSEStream]);

  const startNewChat = useCallback(async () => {
    try {
      const res = await fetch("/api/sommelier-chat/new", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setMessages([]);
        setError(null);
        queryClient.invalidateQueries({ queryKey: ["/api/sommelier-chat/active"] });
      }
    } catch {
      setError("Failed to start new chat");
    }
  }, [queryClient]);

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    sendMessageWithImage,
    startNewChat,
    cancelStream,
    clearError,
  };
}
