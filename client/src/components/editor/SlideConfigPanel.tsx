// client/src/components/editor/SlideConfigPanel.tsx

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { Slide } from "@shared/schema";
import { QuestionConfigForm } from "./QuestionConfigForm"; // We will use this

interface SlideConfigPanelProps {
    slide: Slide;
    onUpdate: (
        slideId: string,
        updates: Partial<Pick<Slide, "payloadJson">>,
    ) => void;
    onDelete: (slideId: string) => void;
}

export function SlideConfigPanel({
    slide,
    onUpdate,
    onDelete,
}: SlideConfigPanelProps) {
    const payload = slide.payloadJson as any;

    const handlePayloadChange = (newPayload: any) => {
        onUpdate(slide.id, { payloadJson: newPayload });
    };

    const handleFieldChange = (field: string, value: any) => {
        handlePayloadChange({ ...payload, [field]: value });
    };

    return (
        <div className="space-y-6">
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
                            value={payload.title || ""}
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
                            value={payload.description || ""}
                            onChange={(e) =>
                                handleFieldChange("description", e.target.value)
                            }
                            className="bg-white/10 border-white/20 text-white"
                            placeholder="Enter slide description (optional)"
                            rows={3}
                        />
                    </div>
                </CardContent>
            </Card>

            {slide.type === "question" && (
                <QuestionConfigForm
                    payload={payload}
                    onPayloadChange={handlePayloadChange}
                />
            )}

            {slide.type !== "question" && (
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
