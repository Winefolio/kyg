// client/src/components/editor/SlideConfigPanel.tsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Loader2, FileAudio, FileVideo, X } from "lucide-react";
import type { Slide } from "@shared/schema";
import { QuestionConfigForm } from "./QuestionConfigForm";
import { InterludeConfigForm } from "./InterludeConfigForm";
import { MediaFileDisplay } from "./MediaFileDisplay";
import { MediaUpload } from "@/components/ui/media-upload";
import { VideoPlayer } from "@/components/ui/video-player";
import { AudioPlayer } from "@/components/ui/audio-player";

interface SlideConfigPanelProps {
    slide: Slide;
    onUpdate: (
        slideId: string,
        updates: Partial<Pick<Slide, "payloadJson" | "section_type">>,
    ) => void;
    onDelete: (slideId: string) => void;
    onPreviewUpdate?: (slideId: string, livePayload: any) => void;
}

// Debounce helper
function useDebounce<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): T {
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

    const debouncedCallback = useCallback((...args: Parameters<T>) => {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        const newTimer = setTimeout(() => {
            callback(...args);
        }, delay);
        setDebounceTimer(newTimer);
    }, [callback, delay, debounceTimer]) as T;

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
        };
    }, [debounceTimer]);

    return debouncedCallback;
}

export function SlideConfigPanel({
    slide,
    onUpdate,
    onDelete,
    onPreviewUpdate,
}: SlideConfigPanelProps) {
    const payload = slide.payloadJson as any;
    const [localPayload, setLocalPayload] = useState(payload);
    const [isSaving, setIsSaving] = useState(false);

    // Update local state when slide changes
    useEffect(() => {
        setLocalPayload(slide.payloadJson);
    }, [slide.id, slide.payloadJson]);

    // Debounced update function
    const debouncedUpdate = useDebounce((updates: any) => {
        onUpdate(slide.id, updates);
        // Simulate saving indicator
        setTimeout(() => setIsSaving(false), 500);
    }, 500);

    const handlePayloadChange = useCallback((newPayload: any) => {
        setLocalPayload(newPayload);
        setIsSaving(true);
        // Trigger immediate preview update
        if (onPreviewUpdate) {
            onPreviewUpdate(slide.id, newPayload);
        }
        // Trigger debounced save
        debouncedUpdate({ payloadJson: newPayload });
    }, [debouncedUpdate, onPreviewUpdate, slide.id]);

    const handleFieldChange = useCallback((field: string, value: any) => {
        const newPayload = { ...localPayload, [field]: value };
        handlePayloadChange(newPayload);
    }, [localPayload, handlePayloadChange]);

    return (
        <div className="space-y-6">
            {/* Saving indicator */}
            {isSaving && (
                <div className="fixed top-20 right-6 bg-purple-600/90 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-lg z-50">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Saving...</span>
                </div>
            )}

            {/* Only show general settings for non-package intro slides */}
            {!(localPayload as any)?.is_package_intro && (
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg text-white">
                            General Slide Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="slide-title" className="text-white/80">
                                Slide Title
                            </Label>
                            <Input
                                id="slide-title"
                                value={localPayload.title || ""}
                                onChange={(e) =>
                                    handleFieldChange("title", e.target.value)
                                }
                                className="bg-white/10 border-white/20 text-white"
                                placeholder="Enter slide title"
                            />
                        </div>
                        <div>
                            <Label
                                htmlFor="slide-description"
                                className="text-white/80"
                            >
                                Description
                            </Label>
                            <Textarea
                                id="slide-description"
                                value={localPayload.description || ""}
                                onChange={(e) =>
                                    handleFieldChange("description", e.target.value)
                                }
                                className="bg-white/10 border-white/20 text-white"
                                placeholder="Enter slide description (optional)"
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label className="text-white/80">Section</Label>
                            <div className="flex items-center space-x-2">
                                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1">
                                    <span className="text-white">
                                        {slide.section_type === 'intro' && '🎬 Intro'}
                                        {slide.section_type === 'deep_dive' && '🤔 Deep Dive'}
                                        {slide.section_type === 'ending' && '🏁 Ending'}
                                        {!slide.section_type && '🤔 Deep Dive'}
                                    </span>
                                </div>
                                <span className="text-white/40 text-sm">
                                    (Cannot be changed)
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {slide.type === "question" && (
                <QuestionConfigForm
                    payload={localPayload}
                    onPayloadChange={handlePayloadChange}
                />
            )}

            {slide.type === "interlude" && (
                <InterludeConfigForm
                    slide={{ ...slide, payloadJson: localPayload }}
                    onSave={handlePayloadChange}
                />
            )}

            {slide.type === "video_message" && (
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg text-white">
                            Video Message Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-white/80">Video File</Label>
                            {(localPayload.video_publicId || localPayload.video_url) ? (
                                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-purple-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                                                <FileVideo className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium text-sm truncate">
                                                    {localPayload.video_fileName || `video_${localPayload.video_publicId || 'legacy'}`}
                                                </p>
                                                <p className="text-white/60 text-xs">
                                                    {localPayload.video_fileSize ? `${Math.round(localPayload.video_fileSize / (1024*1024))} MB` : 'Video file'}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => {
                                                handleFieldChange('video_publicId', '');
                                                handleFieldChange('video_url', '');
                                                handleFieldChange('video_fileName', '');
                                                handleFieldChange('video_fileSize', 0);
                                            }}
                                            variant="ghost"
                                            size="sm"
                                            className="text-white/60 hover:text-white hover:bg-white/10"
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <MediaUpload
                                    accept="video"
                                    value={localPayload.video_url || ''}
                                    onChange={(result) => {
                                        if (result) {
                                            const updates = {
                                                video_publicId: result.publicId,
                                                video_url: result.url,
                                                video_fileName: result.fileName,
                                                video_fileSize: result.fileSize
                                            };
                                            handlePayloadChange({ ...localPayload, ...updates });
                                        } else {
                                            const updates = {
                                                video_publicId: '',
                                                video_url: '',
                                                video_fileName: '',
                                                video_fileSize: 0
                                            };
                                            handlePayloadChange({ ...localPayload, ...updates });
                                        }
                                    }}
                                    label="Upload Video"
                                    entityId={slide.id}
                                    entityType="slide"
                                />
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="autoplay"
                                checked={localPayload.autoplay || false}
                                onChange={(e) => handleFieldChange("autoplay", e.target.checked)}
                                className="rounded"
                            />
                            <Label htmlFor="autoplay" className="text-white/80">Autoplay video</Label>
                        </div>
                        
                        {/* Video Preview Below Settings */}
                        {(localPayload.video_publicId || localPayload.video_url) && (
                            <div>
                                <Label className="text-white/80 text-sm mb-2 block">Preview</Label>
                                <div className="bg-black/20 rounded-lg overflow-hidden">
                                    <VideoPlayer
                                        src={localPayload.video_publicId ? `/api/media/${localPayload.video_publicId}/stream` : localPayload.video_url}
                                        title={localPayload.video_fileName}
                                        className="w-full h-32"
                                        controls={true}
                                        autoplay={false}
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {slide.type === "audio_message" && (
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg text-white">
                            Audio Message Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-white/80">Audio File</Label>
                            {(localPayload.audio_publicId || localPayload.audio_url) ? (
                                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-purple-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                                                <FileAudio className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium text-sm truncate">
                                                    {localPayload.audio_fileName || `audio_${localPayload.audio_publicId || 'legacy'}`}
                                                </p>
                                                <p className="text-white/60 text-xs">
                                                    {localPayload.audio_fileSize ? `${Math.round(localPayload.audio_fileSize / 1024)} KB` : 'Audio file'}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => {
                                                handleFieldChange('audio_publicId', '');
                                                handleFieldChange('audio_url', '');
                                                handleFieldChange('audio_fileName', '');
                                                handleFieldChange('audio_fileSize', 0);
                                            }}
                                            variant="ghost"
                                            size="sm"
                                            className="text-white/60 hover:text-white hover:bg-white/10"
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <MediaUpload
                                    accept="audio"
                                    value={localPayload.audio_url || ''}
                                    onChange={(result) => {
                                        if (result) {
                                            const updates = {
                                                audio_publicId: result.publicId,
                                                audio_url: result.url,
                                                audio_fileName: result.fileName,
                                                audio_fileSize: result.fileSize
                                            };
                                            handlePayloadChange({ ...localPayload, ...updates });
                                        } else {
                                            const updates = {
                                                audio_publicId: '',
                                                audio_url: '',
                                                audio_fileName: '',
                                                audio_fileSize: 0
                                            };
                                            handlePayloadChange({ ...localPayload, ...updates });
                                        }
                                    }}
                                    label="Upload Audio"
                                    entityId={slide.id}
                                    entityType="slide"
                                />
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="autoplay-audio"
                                checked={localPayload.autoplay || false}
                                onChange={(e) => handleFieldChange("autoplay", e.target.checked)}
                                className="rounded"
                            />
                            <Label htmlFor="autoplay-audio" className="text-white/80">Autoplay audio</Label>
                        </div>
                        
                        {/* Audio Preview Below Settings */}
                        {(localPayload.audio_publicId || localPayload.audio_url) && (
                            <div>
                                <Label className="text-white/80 text-sm mb-2 block">Preview</Label>
                                <div className="bg-black/20 rounded-lg p-3 flex justify-center">
                                    <div className="w-full max-w-md">
                                        <AudioPlayer
                                            src={localPayload.audio_publicId ? `/api/media/${localPayload.audio_publicId}/stream` : localPayload.audio_url}
                                            title={localPayload.audio_fileName}
                                            className="w-full scale-75 origin-center"
                                            autoplay={false}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {slide.type === "transition" && (
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg text-white">
                            Transition Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-white/80">Title</Label>
                            <Input
                                value={localPayload.title || ""}
                                onChange={(e) => handleFieldChange("title", e.target.value)}
                                className="bg-white/10 border-white/20 text-white"
                                placeholder="Enter transition title"
                            />
                        </div>
                        <div>
                            <Label className="text-white/80">Description (optional)</Label>
                            <Textarea
                                value={localPayload.description || ""}
                                onChange={(e) => handleFieldChange("description", e.target.value)}
                                className="bg-white/10 border-white/20 text-white"
                                placeholder="Enter transition description"
                                rows={2}
                            />
                        </div>
                        <div>
                            <Label className="text-white/80">Duration (milliseconds)</Label>
                            <Input
                                type="number"
                                value={localPayload.duration || 2000}
                                onChange={(e) => handleFieldChange("duration", parseInt(e.target.value) || 2000)}
                                className="bg-white/10 border-white/20 text-white"
                                min={500}
                                max={10000}
                                step={500}
                            />
                        </div>
                        <div>
                            <Label className="text-white/80">Animation Type</Label>
                            <select
                                value={localPayload.animation_type || "wine_glass_fill"}
                                onChange={(e) => handleFieldChange("animation_type", e.target.value)}
                                className="w-full bg-white/10 border border-white/20 text-white rounded-md px-3 py-2"
                            >
                                <option value="wine_glass_fill">Wine Glass Fill</option>
                                <option value="fade">Fade Progress</option>
                                <option value="slide">Sliding Dots</option>
                            </select>
                        </div>
                        <div>
                            <Label className="text-white/80">Background Image URL (optional)</Label>
                            <Input
                                value={localPayload.backgroundImage || ""}
                                onChange={(e) => handleFieldChange("backgroundImage", e.target.value)}
                                className="bg-white/10 border-white/20 text-white"
                                placeholder="Enter image URL"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="showContinueButton"
                                checked={localPayload.showContinueButton || false}
                                onChange={(e) => handleFieldChange("showContinueButton", e.target.checked)}
                                className="rounded"
                            />
                            <Label htmlFor="showContinueButton" className="text-white/80">
                                Show manual continue button
                            </Label>
                        </div>
                    </CardContent>
                </Card>
            )}

            {slide.type === "media" && (
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg text-white">
                            Media Slide Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="title" className="text-white/80">
                                Title (Optional)
                            </Label>
                            <Input
                                id="title"
                                value={localPayload.title || ""}
                                onChange={(e) => handleFieldChange("title", e.target.value)}
                                placeholder="Enter image title..."
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                            />
                        </div>
                        
                        <div>
                            <Label htmlFor="alt_text" className="text-white/80">
                                Alt Text
                            </Label>
                            <Input
                                id="alt_text"
                                value={localPayload.alt_text || ""}
                                onChange={(e) => handleFieldChange("alt_text", e.target.value)}
                                placeholder="Describe the image for accessibility..."
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                            />
                        </div>
                        
                        <div>
                            <Label htmlFor="image_url" className="text-white/80">
                                Image URL
                            </Label>
                            <Input
                                id="image_url"
                                value={localPayload.image_url || ""}
                                onChange={(e) => handleFieldChange("image_url", e.target.value)}
                                placeholder="Enter image URL or upload below..."
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                            />
                        </div>
                        
                        {/* Image preview */}
                        {localPayload.image_url && (
                            <div>
                                <Label className="text-white/80 text-sm mb-2 block">Preview</Label>
                                <div className="bg-black/20 rounded-lg overflow-hidden">
                                    <img 
                                        src={localPayload.image_url} 
                                        alt={localPayload.alt_text || localPayload.title || "Preview"} 
                                        className="w-full h-48 object-contain"
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {slide.type !== "question" && slide.type !== "video_message" && slide.type !== "audio_message" && slide.type !== "transition" && slide.type !== "interlude" && slide.type !== "media" && (
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg text-white">
                            Content Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-white/50 text-center py-8">
                            Editor for '{slide.type.replace("_", " ")}' slides
                            is not yet implemented.
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="pt-6 border-t border-red-500/20">
                <Button
                    variant="destructive"
                    onClick={() => onDelete(slide.id)}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete This Slide
                </Button>
            </div>
        </div>
    );
}