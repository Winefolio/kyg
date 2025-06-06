import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Minus } from 'lucide-react';
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
            <div className="space-y-4">
                <div>
                    <Label htmlFor="question-type" className="text-white">Question Type</Label>
                    <Select
                        value={payload.question_type || 'multiple_choice'}
                        onValueChange={(value) => updatePayload({ question_type: value })}
                    >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                            <SelectItem value="scale">Scale (1-10)</SelectItem>
                            <SelectItem value="text">Text Input</SelectItem>
                            <SelectItem value="boolean">Yes/No</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {payload.question_type === 'multiple_choice' && (
                    <div>
                        <Label className="text-white">Options</Label>
                        <div className="space-y-2 mt-2">
                            {(payload.options || []).map((option: any, index: number) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <Input
                                        value={option.text || ''}
                                        onChange={(e) => {
                                            const newOptions = [...(payload.options || [])];
                                            newOptions[index] = { ...option, text: e.target.value };
                                            updatePayload({ options: newOptions });
                                        }}
                                        className="bg-white/10 border-white/20 text-white"
                                        placeholder={`Option ${index + 1}`}
                                    />
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => {
                                            const newOptions = (payload.options || []).filter((_: any, i: number) => i !== index);
                                            updatePayload({ options: newOptions });
                                        }}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    const newOptions = [...(payload.options || []), { text: '', value: (payload.options || []).length }];
                                    updatePayload({ options: newOptions });
                                }}
                                className="w-full"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Option
                            </Button>
                        </div>
                    </div>
                )}

                {payload.question_type === 'scale' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="scale-min" className="text-white">Min Value</Label>
                            <Input
                                id="scale-min"
                                type="number"
                                value={payload.scale_min || 1}
                                onChange={(e) => updatePayload({ scale_min: parseInt(e.target.value) })}
                                className="bg-white/10 border-white/20 text-white"
                            />
                        </div>
                        <div>
                            <Label htmlFor="scale-max" className="text-white">Max Value</Label>
                            <Input
                                id="scale-max"
                                type="number"
                                value={payload.scale_max || 10}
                                onChange={(e) => updatePayload({ scale_max: parseInt(e.target.value) })}
                                className="bg-white/10 border-white/20 text-white"
                            />
                        </div>
                        <div className="col-span-2">
                            <Label htmlFor="scale-min-label" className="text-white">Min Label</Label>
                            <Input
                                id="scale-min-label"
                                value={payload.scale_min_label || ''}
                                onChange={(e) => updatePayload({ scale_min_label: e.target.value })}
                                className="bg-white/10 border-white/20 text-white"
                                placeholder="e.g., Strongly Disagree"
                            />
                        </div>
                        <div className="col-span-2">
                            <Label htmlFor="scale-max-label" className="text-white">Max Label</Label>
                            <Input
                                id="scale-max-label"
                                value={payload.scale_max_label || ''}
                                onChange={(e) => updatePayload({ scale_max_label: e.target.value })}
                                className="bg-white/10 border-white/20 text-white"
                                placeholder="e.g., Strongly Agree"
                            />
                        </div>
                    </div>
                )}
            </div>
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