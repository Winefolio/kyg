import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileAudio, FileVideo, Image, Upload, X, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { VideoPlayer } from "@/components/ui/video-player";
import { AudioPlayer } from "@/components/ui/audio-player";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface MediaFileDisplayProps {
  mediaType: "video" | "audio" | "image";
  fileName?: string;
  fileSize?: number;
  publicId?: string;
  legacyUrl?: string; // For backward compatibility with audio_url/video_url
  onReplace: () => void;
  className?: string;
  compact?: boolean;
  showPreview?: boolean;
}

export function MediaFileDisplay({
  mediaType,
  fileName,
  fileSize,
  publicId,
  legacyUrl,
  onReplace,
  className,
  compact = false,
  showPreview = true,
}: MediaFileDisplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Get signed URL for media preview
  const { data: mediaAccess, isLoading: isLoadingUrl } = useQuery({
    queryKey: ['media-access', publicId],
    queryFn: async () => {
      if (!publicId) return null;
      const response = await apiRequest('GET', `/api/media/${publicId}/access`);
      return await response.json();
    },
    enabled: !!publicId && showPreview,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour (renamed from cacheTime)
  });
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

  if (!fileName && !publicId && !legacyUrl) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-white/5 border-2 border-dashed border-white/20 rounded-lg",
        compact ? "p-4" : "p-8",
        className
      )}>
        <div className="text-center">
          <Upload className={cn("text-white/40 mx-auto mb-2", compact ? "w-8 h-8" : "w-12 h-12")} />
          <p className={cn("text-white/60", compact ? "text-sm" : "")}>
            No {mediaType} uploaded
          </p>
          <Button
            onClick={onReplace}
            variant="outline"
            size={compact ? "sm" : "default"}
            className="mt-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            Upload {mediaType}
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingUrl && publicId && showPreview) {
    return (
      <div className={cn("bg-white/5 border border-white/10 rounded-lg p-4 animate-pulse", className)}>
        <div className="flex items-center space-x-3">
          <div className={cn("bg-white/10 rounded", compact ? "w-12 h-12" : "w-16 h-12")} />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-3 bg-white/10 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // Show preview with fallback if media access fails but we have publicId or legacyUrl
  if (showPreview && (publicId || legacyUrl) && !isLoadingUrl) {
    const mediaUrl = mediaAccess?.url || (publicId ? `/api/media/${publicId}/file` : legacyUrl);
    
    if (compact) {
      // Compact preview for editor sidebar
      return (
        <div className={cn("bg-white/5 border border-white/10 rounded-lg p-3", className)}>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {mediaType === 'video' ? (
                <div className="relative w-16 h-12 bg-black rounded overflow-hidden">
                  <video
                    src={mediaUrl}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-4 h-4 text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center">
                  <FileAudio className="w-6 h-6 text-purple-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {fileName || `${mediaType}_${publicId || 'legacy'}`}
              </p>
              {fileSize && (
                <p className="text-white/60 text-xs">{formatFileSize(fileSize)}</p>
              )}
            </div>
            <Button
              onClick={onReplace}
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      );
    }

    // Full preview for main editor
    return (
      <div className={cn("bg-white/5 border border-white/10 rounded-lg overflow-hidden", className)}>
        {/* Media Player */}
        <div className="relative">
          {mediaType === 'video' ? (
            <VideoPlayer
              src={mediaUrl}
              title={fileName}
              className="w-full h-48"
              controls={true}
            />
          ) : (
            <div className="p-4">
              <AudioPlayer
                src={mediaUrl}
                title={fileName}
                className="w-full"
              />
            </div>
          )}
        </div>
        
        {/* File Info */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">
                {fileName || `${mediaType}_${publicId || 'legacy'}`}
              </p>
              <div className="flex items-center space-x-4 text-xs text-white/60 mt-1">
                {fileSize && <span>{formatFileSize(fileSize)}</span>}
                {publicId && <span className="font-mono">ID: {publicId}</span>}
                {!publicId && legacyUrl && <span className="font-mono">Legacy URL</span>}
              </div>
            </div>
            <Button
              onClick={onReplace}
              variant="outline"
              size="sm"
              className="ml-3 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <X className="w-4 h-4 mr-1" />
              Replace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to metadata display
  return (
    <div className={cn("bg-white/5 border border-white/10 rounded-lg p-4", className)}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">
            {fileName || `${mediaType}_${publicId || 'legacy'}`}
          </p>
          {fileSize && (
            <p className="text-white/60 text-sm">{formatFileSize(fileSize)}</p>
          )}
          {publicId && (
            <p className="text-white/40 text-xs mt-1 font-mono">ID: {publicId}</p>
          )}
          {!publicId && legacyUrl && (
            <p className="text-white/40 text-xs mt-1 font-mono">Legacy URL</p>
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