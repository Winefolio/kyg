import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  onClose: () => void;
  onNewChat: () => void;
}

export function ChatHeader({ onClose, onNewChat }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="text-zinc-400 hover:text-white"
      >
        <X className="w-5 h-5" />
      </Button>
      <h2 className="text-sm font-semibold text-white">Pierre</h2>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNewChat}
        className="text-zinc-400 hover:text-white"
        title="New conversation"
      >
        <Plus className="w-5 h-5" />
      </Button>
    </div>
  );
}
