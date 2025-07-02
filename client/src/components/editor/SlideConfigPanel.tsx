// client/src/components/editor/SlideConfigPanel.tsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Loader2 } from "lucide-react";
import type { Slide } from "@shared/schema";
import { QuestionConfigForm } from "./QuestionConfigForm";
import { InterludeConfigForm } from "./InterludeConfigForm";
import { MediaFileDisplay } from "./MediaFileDisplay";
import { MediaUpload } from "@/components/ui/media-upload";

interface SlideConfigPanelProps {
    slide: Slide;
    onUpdate: (
        slideId: string,
        updates: Partial<Pick<Slide, "payloadJson" | "section_type">>,
    ) => void;
    onDelete: (slideId: string) => void;
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
        debouncedUpdate({ payloadJson: newPayload });
    }, [debouncedUpdate]);

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
                            <Label htmlFor="section-type" className="text-white/80">Section</Label>
                            <Select
                                value={slide.section_type || 'deep_dive'}
                                onValueChange={(value: string) => {
                                    setIsSaving(true);
                                    onUpdate(slide.id, { section_type: value });
                                    setTimeout(() => setIsSaving(false), 500);
                                }}
                            >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="intro">🎬 Intro</SelectItem>
                                    <SelectItem value="deep_dive">🤔 Deep Dive</SelectItem>
                                    <SelectItem value="ending">🏁 Ending</SelectItem>
                                </SelectContent>
                            </Select>
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
                            {localPayload.video_publicId ? (
                                <MediaFileDisplay
                                    mediaType="video"
                                    fileName={localPayload.video_fileName}
                                    fileSize={localPayload.video_fileSize}
                                    publicId={localPayload.video_publicId}
                                    onReplace={() => {
                                        // TODO: Implement media upload modal
                                        console.log("Replace video");
                                    }}
                                />
                            ) : (
                                <MediaUpload
                                    accept="video/*"
                                    onUpload={async (file) => {
                                        // TODO: Implement upload handler
                                        console.log("Upload video", file);
                                    }}
                                    maxSizeMB={200}
                                    uploading={false}
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
                            {localPayload.audio_publicId ? (
                                <MediaFileDisplay
                                    mediaType="audio"
                                    fileName={localPayload.audio_fileName}
                                    fileSize={localPayload.audio_fileSize}
                                    publicId={localPayload.audio_publicId}
                                    onReplace={() => {
                                        // TODO: Implement media upload modal
                                        console.log("Replace audio");
                                    }}
                                />
                            ) : (
                                <MediaUpload
                                    accept="audio/*"
                                    onUpload={async (file) => {
                                        // TODO: Implement upload handler
                                        console.log("Upload audio", file);
                                    }}
                                    maxSizeMB={200}
                                    uploading={false}
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

            {slide.type !== "question" && slide.type !== "video_message" && slide.type !== "audio_message" && slide.type !== "transition" && slide.type !== "interlude" && (
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