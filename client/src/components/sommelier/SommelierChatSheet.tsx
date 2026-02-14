import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { useSommelierChat } from "@/hooks/useSommelierChat";
import { Wine, Sparkles, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const SUGGESTED_PROMPTS = [
  { icon: Wine, text: "What wine pairs with grilled salmon?" },
  { icon: Sparkles, text: "Help me pick a bottle under $30" },
  { icon: MessageCircle, text: "What should I try based on my tastings?" },
];

interface SommelierChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function WelcomeState({ onSelectPrompt }: { onSelectPrompt: (text: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <div className="w-16 h-16 rounded-full bg-purple-600/20 flex items-center justify-center mb-4">
        <Wine className="w-8 h-8 text-purple-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Hi, I'm your sommelier</h3>
      <p className="text-sm text-zinc-400 text-center mb-8 max-w-xs">
        Ask me anything about wine. I know your tasting history and can give personalized recommendations.
      </p>

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

export function SommelierChatSheet({ open, onOpenChange }: SommelierChatSheetProps) {
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    sendMessageWithImage,
    startNewChat,
    clearError,
  } = useSommelierChat(open);

  const handleClose = () => onOpenChange(false);

  const showWelcome = !isLoading && messages.length === 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[92vh] bg-zinc-950 border-zinc-800 flex flex-col">
        <ChatHeader onClose={handleClose} onNewChat={startNewChat} />

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-900/30 border-b border-red-800/50 flex items-center justify-between">
            <span className="text-xs text-red-300">{error}</span>
            <button onClick={clearError} className="text-xs text-red-400 hover:text-red-300 ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : showWelcome ? (
          <WelcomeState onSelectPrompt={sendMessage} />
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}

        <ChatInput
          onSendMessage={sendMessage}
          onSendMessageWithImage={sendMessageWithImage}
          isStreaming={isStreaming}
        />
      </DrawerContent>
    </Drawer>
  );
}
