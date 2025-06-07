import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Minus } from 'lucide-react';
import { QuestionConfigForm } from './QuestionConfigForm';
import type { Slide } from "@shared/schema";

interface SlideConfigPanelProps {
    slide: Slide;
    onUpdate: (slideId: string, updates: any) => void;
    onDelete: () => void;
}

export function SlideConfigPanel({ slide, onUpdate, onDelete }: SlideConfigPanelProps) {
    const [payload, setPayload] = useState(slide.payloadJson as any || {});

    const updatePayload = (updates: any) => {
        const newPayload = { ...payload, ...updates };
        setPayload(newPayload);
        onUpdate(slide.id, { payloadJson: newPayload });
    };

    const renderQuestionConfig = () => {
        if (slide.type !== 'question') return null;

        return (
            <QuestionConfigForm 
                payload={payload}
                onPayloadChange={updatePayload}
            />
        );
    };

    const renderVideoConfig = () => {
        if (slide.type !== 'video_message') return null;

        return (
            <div className="space-y-4">
                <div>
                    <Label htmlFor="video-url" className="text-white">Video URL</Label>
                    <Input
                        id="video-url"
                        value={payload.video_url || ''}
                        onChange={(e) => updatePayload({ video_url: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="https://..."
                    />
                </div>
                <div>
                    <Label htmlFor="video-duration" className="text-white">Duration (seconds)</Label>
                    <Input
                        id="video-duration"
                        type="number"
                        value={payload.duration_seconds || ''}
                        onChange={(e) => updatePayload({ duration_seconds: parseInt(e.target.value) })}
                        className="bg-white/10 border-white/20 text-white"
                    />
                </div>
            </div>
        );
    };

    const renderInterludeConfig = () => {
        if (slide.type !== 'interlude') return null;

        return (
            <div className="space-y-4">
                <div>
                    <Label htmlFor="background-color" className="text-white">Background Color</Label>
                    <Input
                        id="background-color"
                        value={payload.background_color || '#1a1a1a'}
                        onChange={(e) => updatePayload({ background_color: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        type="color"
                    />
                </div>
                <div>
                    <Label htmlFor="duration" className="text-white">Auto-advance after (seconds)</Label>
                    <Input
                        id="duration"
                        type="number"
                        value={payload.auto_advance_seconds || ''}
                        onChange={(e) => updatePayload({ auto_advance_seconds: parseInt(e.target.value) })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="Leave empty for manual advance"
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Basic Configuration */}
            <div className="space-y-4">
                <div>
                    <Label htmlFor="slide-title" className="text-white">Title</Label>
                    <Input
                        id="slide-title"
                        value={payload.title || ''}
                        onChange={(e) => updatePayload({ title: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="Enter slide title"
                    />
                </div>
                <div>
                    <Label htmlFor="slide-description" className="text-white">Description</Label>
                    <Textarea
                        id="slide-description"
                        value={payload.description || ''}
                        onChange={(e) => updatePayload({ description: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="Enter slide description"
                        rows={3}
                    />
                </div>
            </div>

            {/* Type-specific Configuration */}
            <div>
                <h3 className="text-sm font-medium text-white mb-3">Type-specific Settings</h3>
                {renderQuestionConfig()}
                {renderVideoConfig()}
                {renderInterludeConfig()}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-white/10">
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDelete}
                    className="w-full"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Slide
                </Button>
            </div>
        </div>
    );
}