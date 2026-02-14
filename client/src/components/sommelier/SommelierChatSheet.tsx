import { useRef, useState, useCallback } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ChatHeader } from "./ChatHeader";
import { ChatHistorySidebar } from "./ChatHistorySidebar";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { useSommelierChat } from "@/hooks/useSommelierChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { Camera, Sparkles, Wine } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SUGGESTED_PROMPTS = [
  { icon: Sparkles, text: "What's a wine I'd love but haven't tried yet?" },
  { icon: Wine, text: "I'm cooking tonight \u2014 what should I open?" },
];

interface SommelierChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function WelcomeState({
  onSelectPrompt,
  onSendWithImage,
}: {
  onSelectPrompt: (text: string) => void;
  onSendWithImage: (text: string, file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onSendWithImage("What should I get from this?", file);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-6">
      <div className="w-14 h-14 rounded-full bg-purple-600/15 flex items-center justify-center mb-4">
        <span className="text-2xl">{"\uD83C\uDF77"}</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-1.5">I already know what you like.</h3>
      <p className="text-sm text-zinc-400 text-center mb-6 max-w-[280px] leading-relaxed">
        I've been paying attention to your tastings. Ask me anything &mdash; or show me what's in front of you.
      </p>

      {/* Camera CTA - the hero action */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => fileInputRef.current?.click()}
        className="w-full max-w-sm mb-4 flex items-center gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-purple-600/20 to-purple-500/10 border border-purple-500/30 text-left hover:from-purple-600/30 hover:to-purple-500/20 transition-all"
      >
        <div className="w-11 h-11 rounded-xl bg-purple-600/30 flex items-center justify-center shrink-0">
          <Camera className="w-5 h-5 text-purple-300" />
        </div>
        <div>
          <span className="text-sm font-medium text-white block">Snap a wine list or shelf</span>
          <span className="text-xs text-zinc-400">I'll pick the best one for you</span>
        </div>
      </motion.button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      {/* Text prompts */}
      <div className="w-full max-w-sm space-y-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <motion.button
            key={prompt.text}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectPrompt(prompt.text)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50 text-left hover:bg-zinc-800 transition-colors"
          >
            <prompt.icon className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-sm text-zinc-300">{prompt.text}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/** Hook for swipe-from-left-edge gesture to open sidebar (ChatGPT-style) */
function useEdgeSwipe(onSwipeRight: () => void) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    // Only track touches starting within 30px of the left edge
    if (touch.clientX <= 30) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    const elapsed = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // Swipe right: moved >60px horizontally, <80px vertically, within 500ms
    if (dx > 60 && dy < 80 && elapsed < 500) {
      onSwipeRight();
    }
  }, [onSwipeRight]);

  return { onTouchStart, onTouchEnd };
}

/** Shared chat content used by both mobile drawer and desktop panel */
function ChatContent({
  onClose,
  messages,
  isLoading,
  isLoadingChat,
  isStreaming,
  error,
  sendMessage,
  sendMessageWithImage,
  clearError,
  sidebarOpen,
  onOpenSidebar,
  onCloseSidebar,
  chatList,
  activeChatId,
  isLoadingChatList,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}: {
  onClose: () => void;
  messages: any[];
  isLoading: boolean;
  isLoadingChat: boolean;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (text: string) => void;
  sendMessageWithImage: (text: string, file: File) => void;
  clearError: () => void;
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  onCloseSidebar: () => void;
  chatList: any[];
  activeChatId: number | null;
  isLoadingChatList: boolean;
  onSelectChat: (chatId: number) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: number) => void;
}) {
  const showWelcome = !isLoading && !isLoadingChat && messages.length === 0;
  const swipeHandlers = useEdgeSwipe(onOpenSidebar);

  return (
    <div
      className="relative flex flex-col flex-1 overflow-hidden"
      {...swipeHandlers}
    >
      <ChatHeader onClose={onClose} onToggleSidebar={onOpenSidebar} />

      {error && (
        <div className="px-4 py-2 bg-red-900/30 border-b border-red-800/50 flex items-center justify-between">
          <span className="text-xs text-red-300">{error}</span>
          <button onClick={clearError} className="text-xs text-red-400 hover:text-red-300 ml-2">
            Dismiss
          </button>
        </div>
      )}

      {isLoading || isLoadingChat ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : showWelcome ? (
        <WelcomeState onSelectPrompt={sendMessage} onSendWithImage={sendMessageWithImage} />
      ) : (
        <MessageList messages={messages} isStreaming={isStreaming} />
      )}

      <ChatInput
        onSendMessage={sendMessage}
        onSendMessageWithImage={sendMessageWithImage}
        isStreaming={isStreaming}
      />

      {/* Sidebar overlay */}
      <ChatHistorySidebar
        open={sidebarOpen}
        onClose={onCloseSidebar}
        chatList={chatList}
        activeChatId={activeChatId}
        isLoading={isLoadingChatList}
        onSelectChat={onSelectChat}
        onNewChat={onNewChat}
        onDeleteChat={onDeleteChat}
      />
    </div>
  );
}

export function SommelierChatSheet({ open, onOpenChange }: SommelierChatSheetProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    messages,
    activeChatId,
    chatList,
    isLoading,
    isLoadingChat,
    isLoadingChatList,
    isStreaming,
    error,
    sendMessage,
    sendMessageWithImage,
    loadChat,
    deleteChat,
    startNewChat,
    clearError,
  } = useSommelierChat(open);

  const handleClose = () => onOpenChange(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const chatProps = {
    onClose: handleClose,
    messages,
    isLoading,
    isLoadingChat,
    isStreaming,
    error,
    sendMessage,
    sendMessageWithImage,
    clearError,
    sidebarOpen,
    onOpenSidebar: openSidebar,
    onCloseSidebar: closeSidebar,
    chatList,
    activeChatId,
    isLoadingChatList,
    onSelectChat: (chatId: number) => {
      loadChat(chatId);
      setSidebarOpen(false);
    },
    onNewChat: () => {
      startNewChat();
      setSidebarOpen(false);
    },
    onDeleteChat: deleteChat,
  };

  // Mobile: bottom drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[92vh] bg-zinc-950 border-zinc-800 flex flex-col">
          <ChatContent {...chatProps} />
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: floating panel
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop - click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
          >
            <ChatContent {...chatProps} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
