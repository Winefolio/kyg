import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Camera, X, Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHaptics } from "@/hooks/useHaptics";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onSendMessageWithImage: (text: string, file: File) => void;
  isStreaming: boolean;
}

/**
 * Compress image using Canvas API before sending
 */
async function compressImage(file: File, maxDim: number = 2048, quality: number = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Scale down if needed
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          resolve(new File([blob], file.name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

export function ChatInput({ onSendMessage, onSendMessageWithImage, isStreaming }: ChatInputProps) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { triggerHaptic } = useHaptics();
  const { toast } = useToast();

  // Voice-to-text transcription
  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    setIsTranscribing(true);
    triggerHaptic("success");
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await response.json();
      if (data.success && data.text) {
        setText((prev) => (prev.trim() ? `${prev.trim()} ${data.text}` : data.text));
      } else {
        throw new Error(data.error || "Transcription failed");
      }
    } catch (error) {
      toast({
        title: "Transcription failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  }, [triggerHaptic, toast]);

  const { isRecording, isSupported, startRecording, stopRecording, error: recorderError } = useAudioRecorder({
    onRecordingComplete: handleRecordingComplete,
    maxDuration: 60,
  });

  useEffect(() => {
    if (recorderError) {
      toast({ title: "Recording error", description: recorderError, variant: "destructive" });
    }
  }, [recorderError, toast]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
      triggerHaptic("success");
    } else {
      startRecording();
      triggerHaptic("selection");
    }
  }, [isRecording, startRecording, stopRecording, triggerHaptic]);

  const handleSend = useCallback(async () => {
    if (isStreaming) return;
    const trimmed = text.trim();
    if (!trimmed && !imageFile) return;

    triggerHaptic("selection");

    if (imageFile) {
      try {
        const compressed = await compressImage(imageFile);
        onSendMessageWithImage(trimmed, compressed);
      } catch {
        onSendMessageWithImage(trimmed, imageFile);
      }
      setImageFile(null);
      setImagePreview(null);
    } else {
      onSendMessage(trimmed);
    }

    setText("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, imageFile, isStreaming, onSendMessage, onSendMessageWithImage, triggerHaptic]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-grow textarea
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-3 py-2 pb-[env(safe-area-inset-bottom,8px)]">
      {/* Image preview */}
      {imagePreview && (
        <div className="relative inline-block mb-2">
          <img
            src={imagePreview}
            alt="Preview"
            className="h-16 w-16 object-cover rounded-lg border border-zinc-700"
          />
          <button
            onClick={removeImage}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-700 rounded-full flex items-center justify-center hover:bg-zinc-600"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Camera button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="text-zinc-400 hover:text-purple-400 shrink-0 h-9 w-9"
          disabled={isStreaming}
        >
          <Camera className="w-5 h-5" />
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Text input */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask Pierre..."
            disabled={isStreaming}
            rows={1}
            className="w-full resize-none bg-zinc-800 text-white text-sm rounded-xl px-4 py-2.5 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 disabled:opacity-50"
          />
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-1 right-1 flex items-center gap-1.5 bg-red-500/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-red-400">Recording...</span>
            </div>
          )}
        </div>

        {/* Mic button */}
        {isSupported && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRecording}
            disabled={isStreaming || isTranscribing}
            className={`shrink-0 h-9 w-9 ${
              isRecording
                ? "text-red-400 hover:text-red-300"
                : "text-zinc-400 hover:text-purple-400"
            }`}
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-5 h-5 animate-pulse" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </Button>
        )}

        {/* Send button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSend}
          disabled={isStreaming || (!text.trim() && !imageFile)}
          className="text-purple-400 hover:text-purple-300 disabled:text-zinc-600 shrink-0 h-9 w-9"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
