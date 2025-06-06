import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Home, Save, PlusCircle, Edit, ArrowLeft, Eye, Layers, Wine, HelpCircle, Video, Trash2 } from 'lucide-react';
import type { Package, PackageWine, Slide } from "@shared/schema";
import { WineModal } from '@/components/WineModal';
import { SlideConfigPanel } from '@/components/editor/SlideConfigPanel';
import { SLIDE_TEMPLATES } from '@/lib/wineTemplates';

type EditorData = Package & { wines: PackageWine[]; slides: Slide[] };

export default function PackageEditor() {
    const { code } = useParams<{ code: string }>();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [wines, setWines] = useState<PackageWine[]>([]);
    const [slides, setSlides] = useState<Slide[]>([]);
    const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
    const [isWineModalOpen, setIsWineModalOpen] = useState(false);
    const [editingWine, setEditingWine] = useState<PackageWine | null>(null);

    const { data: editorData, isLoading, error } = useQuery<EditorData>({
        queryKey: [`/api/packages/${code}/editor`],
        enabled: !!code,
    });

    const sensors = useSensors(
        useSensor(PointerSensor)
    );

    useEffect(() => {
        if (editorData) {
            setWines(editorData.wines || []);
            setSlides(editorData.slides || []);
            // Auto-select first slide if none selected
            if (!activeSlideId && editorData.slides && editorData.slides.length > 0) {
                setActiveSlideId(editorData.slides[0].id);
            }
        }
    }, [editorData, activeSlideId]);

    const activeSlide = slides.find(s => s.id === activeSlideId);

    // Slide order update mutation
    const updateSlideOrderMutation = useMutation({
        mutationFn: async (slideUpdates: { slideId: string; packageWineId: string; position: number }[]) => {
            return apiRequest('PUT', '/api/slides/order', { slideUpdates });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
            toast({ title: "Slide order updated successfully" });
        },
        onError: () => {
            toast({ title: "Failed to update slide order", variant: "destructive" });
        }
    });

    // Wine management mutations
    const createWineMutation = useMutation({
        mutationFn: async (wineData: any) => {
            return apiRequest('POST', `/api/packages/${editorData?.id}/wines`, wineData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
            toast({ title: "Wine created successfully" });
            setIsWineModalOpen(false);
        }
    });

    const updateWineMutation = useMutation({
        mutationFn: async ({ wineId, data }: { wineId: string; data: any }) => {
            return apiRequest('PATCH', `/api/wines/${wineId}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
            toast({ title: "Wine updated successfully" });
            setIsWineModalOpen(false);
            setEditingWine(null);
        }
    });

    const deleteWineMutation = useMutation({
        mutationFn: async (wineId: string) => {
            return apiRequest('DELETE', `/api/wines/${wineId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
            toast({ title: "Wine deleted successfully" });
        }
    });

    // Slide management mutations
    const createSlideMutation = useMutation({
        mutationFn: async (slideData: any) => {
            return apiRequest('POST', '/api/slides', slideData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
            toast({ title: "Slide created successfully" });
        }
    });

    const updateSlideMutation = useMutation({
        mutationFn: async ({ slideId, data }: { slideId: string; data: any }) => {
            return apiRequest('PATCH', `/api/slides/${slideId}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
            toast({ title: "Slide updated successfully" });
        }
    });

    const deleteSlideMutation = useMutation({
        mutationFn: async (slideId: string) => {
            return apiRequest('DELETE', `/api/slides/${slideId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
            toast({ title: "Slide deleted successfully" });
            setActiveSlideId(null);
        }
    });

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const activeSlide = slides.find(s => s.id === active.id);
            const overSlide = slides.find(s => s.id === over.id);

            if (activeSlide && overSlide) {
                const newSlides = arrayMove(slides, 
                    slides.findIndex(s => s.id === active.id), 
                    slides.findIndex(s => s.id === over.id)
                );
                
                setSlides(newSlides);

                // Update positions in backend
                const slideUpdates = newSlides.map((slide, index) => ({
                    slideId: slide.id,
                    packageWineId: slide.packageWineId,
                    position: index + 1
                }));

                updateSlideOrderMutation.mutate(slideUpdates);
            }
        }
    };

    const handleAddSlide = (wineId: string, template: any) => {
        const wineSlides = slides.filter(s => s.packageWineId === wineId);
        const nextPosition = wineSlides.length + 1;

        const slideData = {
            packageWineId: wineId,
            position: nextPosition,
            type: template.type,
            sectionType: 'deep_dive',
            title: template.defaultPayload.title,
            description: template.defaultPayload.description || '',
            payloadJson: template.defaultPayload
        };

        createSlideMutation.mutate(slideData);
    };

    const handleUpdateSlide = (slideId: string, updates: any) => {
        updateSlideMutation.mutate({ slideId, data: updates });
    };

    const handleWineSave = (wineData: any) => {
        if (editingWine) {
            updateWineMutation.mutate({ wineId: editingWine.id, data: wineData });
        } else {
            createWineMutation.mutate(wineData);
        }
    };

    if (isLoading) {
        return <LoadingOverlay isVisible={true} message="Loading Editor..." />;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-primary text-white flex flex-col items-center justify-center">
                <h2 className="text-2xl font-bold mb-4">Error Loading Editor</h2>
                <p className="text-red-400 mb-6">{(error as Error).message}</p>
                <Link href="/sommelier">
                    <Button variant="outline">
                        <Home className="mr-2 h-4 w-4" /> Go back to Dashboard
                    </Button>
                </Link>
            </div>
        );
    }

    if (!editorData) {
        return (
            <div className="min-h-screen bg-gradient-primary text-white flex flex-col items-center justify-center">
                <h2 className="text-2xl font-bold mb-4">Package Not Found</h2>
                <p className="text-purple-200 mb-6">The package you're looking for doesn't exist.</p>
                <Link href="/sommelier">
                    <Button variant="outline">
                        <Home className="mr-2 h-4 w-4" /> Go back to Dashboard
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-primary text-white">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4">
                        <Link href="/sommelier">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Dashboard
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">{editorData.name}</h1>
                            <p className="text-white/60 text-sm">Package Code: {editorData.code}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                        </Button>
                        <Button size="sm">
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </Button>
                    </div>
                </div>
            </div>

            {/* Three-Panel Layout */}
            <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-73px)]">
                {/* Left Panel - Slide List */}
                <ResizablePanel defaultSize={25} minSize={20}>
                    <div className="h-full bg-black/10 border-r border-white/10">
                        <div className="p-4 border-b border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold flex items-center">
                                    <Layers className="mr-2 h-4 w-4" />
                                    Slides
                                </h2>
                                <Button 
                                    size="sm" 
                                    onClick={() => setIsWineModalOpen(true)}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Wine
                                </Button>
                            </div>
                        </div>
                        
                        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-80px)]">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext items={slides.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                    {wines.map(wine => {
                                        const wineSlides = slides.filter(s => s.packageWineId === wine.id);
                                        
                                        return (
                                            <div key={wine.id} className="space-y-2">
                                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                                    <div className="flex items-center space-x-2">
                                                        <Wine className="h-4 w-4 text-purple-400" />
                                                        <span className="font-medium text-sm">{wine.wineName}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setEditingWine(wine);
                                                                setIsWineModalOpen(true);
                                                            }}
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => deleteWineMutation.mutate(wine.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                
                                                {/* Wine Slides */}
                                                {wineSlides.map((slide, index) => (
                                                    <div
                                                        key={slide.id}
                                                        className={`p-3 rounded border cursor-pointer transition-colors ${
                                                            activeSlideId === slide.id
                                                                ? 'bg-purple-600/20 border-purple-400'
                                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                        }`}
                                                        onClick={() => setActiveSlideId(slide.id)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-2">
                                                                {slide.type === 'question' ? (
                                                                    <HelpCircle className="h-4 w-4" />
                                                                ) : slide.type === 'video_message' ? (
                                                                    <Video className="h-4 w-4" />
                                                                ) : (
                                                                    <Eye className="h-4 w-4" />
                                                                )}
                                                                <span className="text-sm">{(slide.payloadJson as any)?.title || 'Untitled Slide'}</span>
                                                            </div>
                                                            <span className="text-xs text-white/60">#{index + 1}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                
                                                {/* Add Slide Buttons */}
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    {SLIDE_TEMPLATES.map(template => (
                                                        <Button
                                                            key={template.type}
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-xs"
                                                            onClick={() => handleAddSlide(wine.id, template)}
                                                        >
                                                            <template.icon className="mr-1 h-3 w-3" />
                                                            {template.name}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </SortableContext>
                            </DndContext>
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle />

                {/* Center Panel - Preview */}
                <ResizablePanel defaultSize={50}>
                    <div className="h-full bg-black/5">
                        <div className="p-4 border-b border-white/10">
                            <h2 className="font-semibold">Preview</h2>
                        </div>
                        <div className="p-4 h-[calc(100%-60px)] overflow-y-auto">
                            {activeSlide ? (
                                <div className="bg-gradient-card rounded-lg p-6 border border-white/20">
                                    <h3 className="text-lg font-semibold mb-2">{(activeSlide.payloadJson as any)?.title || 'Untitled Slide'}</h3>
                                    <p className="text-white/70 mb-4">{(activeSlide.payloadJson as any)?.description || 'No description'}</p>
                                    
                                    {/* Render slide content based on type */}
                                    {activeSlide.type === 'question' && (
                                        <div className="space-y-4">
                                            <p className="font-medium">Question Type: {(activeSlide.payloadJson as any).question_type}</p>
                                            {(activeSlide.payloadJson as any).question_type === 'multiple_choice' && (
                                                <div className="space-y-2">
                                                    {((activeSlide.payloadJson as any).options || []).map((option: any, index: number) => (
                                                        <div key={index} className="p-2 bg-white/10 rounded">
                                                            {option.text}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {(activeSlide.payloadJson as any).question_type === 'scale' && (
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span>{(activeSlide.payloadJson as any).scale_min}</span>
                                                        <span>{(activeSlide.payloadJson as any).scale_max}</span>
                                                    </div>
                                                    <div className="bg-white/20 h-2 rounded"></div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {activeSlide.type === 'interlude' && (
                                        <div className="text-center">
                                            <p className="text-white/60">Interlude Slide</p>
                                        </div>
                                    )}
                                    
                                    {activeSlide.type === 'video_message' && (
                                        <div className="text-center">
                                            <Video className="mx-auto h-12 w-12 text-white/60 mb-2" />
                                            <p className="text-white/60">Video Message</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-white/60">
                                    <p>Select a slide to preview</p>
                                </div>
                            )}
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle />

                {/* Right Panel - Configuration */}
                <ResizablePanel defaultSize={25} minSize={20}>
                    <div className="h-full bg-black/10 border-l border-white/10">
                        <div className="p-4 border-b border-white/10">
                            <h2 className="font-semibold">Configuration</h2>
                        </div>
                        <div className="p-4 h-[calc(100%-60px)] overflow-y-auto">
                            {activeSlide ? (
                                <SlideConfigPanel
                                    slide={activeSlide}
                                    onUpdate={handleUpdateSlide}
                                    onDelete={() => deleteSlideMutation.mutate(activeSlide.id)}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-white/60">
                                    <p>Select a slide to configure</p>
                                </div>
                            )}
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>

            {/* Wine Modal */}
            {isWineModalOpen && (
                <WineModal
                    mode={editingWine ? 'edit' : 'create'}
                    wine={editingWine}
                    packageId={editorData.id}
                    onClose={() => {
                        setIsWineModalOpen(false);
                        setEditingWine(null);
                    }}
                    onSave={handleWineSave}
                />
            )}
        </div>
    );
}