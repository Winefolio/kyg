import React from "react";
import { Button } from "@/components/ui/button";
import { FileAudio, FileVideo, Image, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaFileDisplayProps {
  mediaType: "video" | "audio" | "image";
  fileName?: string;
  fileSize?: number;
  publicId?: string;
  onReplace: () => void;
  className?: string;
}

export function MediaFileDisplay({
  mediaType,
  fileName,
  fileSize,
  publicId,
  onReplace,
  className,
}: MediaFileDisplayProps) {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getIcon = () => {
    switch (mediaType) {
      case "video":
        return <FileVideo className="w-8 h-8 text-purple-400" />;
      case "audio":
        return <FileAudio className="w-8 h-8 text-purple-400" />;
      case "image":
        return <Image className="w-8 h-8 text-purple-400" />;
    }
  };

  if (!fileName && !publicId) {
    return (
      <div className={cn("flex items-center justify-center p-8 bg-white/5 border-2 border-dashed border-white/20 rounded-lg", className)}>
        <div className="text-center">
          <Upload className="w-12 h-12 text-white/40 mx-auto mb-2" />
          <p className="text-white/60">No {mediaType} uploaded</p>
          <Button
            onClick={onReplace}
            variant="outline"
            size="sm"
            className="mt-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            Upload {mediaType}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white/5 border border-white/10 rounded-lg p-4", className)}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">
            {fileName || `${mediaType}_${publicId}`}
          </p>
          {fileSize && (
            <p className="text-white/60 text-sm">{formatFileSize(fileSize)}</p>
          )}
          {publicId && (
            <p className="text-white/40 text-xs mt-1 font-mono">ID: {publicId}</p>
          )}
        </div>
        <Button
          onClick={onReplace}
          variant="ghost"
          size="sm"
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4 mr-1" />
          Replace
        </Button>
      </div>
    </div>
  );
}