import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Plus,
  Play,
  Pause,
  Settings,
  Edit3,
  Trash2,
  Copy,
  Move,
  Volume2,
  Video,
  MessageSquare,
  HelpCircle,
  Clapperboard,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { motion, AnimatePresence } from 'framer-motion';

interface Slide {
  id: string;
  packageWineId: string;
  position: number;
  type: 'interlude' | 'question' | 'video_message' | 'audio_message' | 'media';
  section_type: string;
  payloadJson: any;
}

interface Wine {
  id: string;
  wineName: string;
  wineDescription: string;
  wineImageUrl: string;
  position: number;
}

interface SlideTemplate {
  type: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  defaultPayload: any;
}

const SLIDE_TEMPLATES: SlideTemplate[] = [
  {
    type: 'interlude',
    name: 'Interlude',
    icon: <Clapperboard className="w-4 h-4" />,
    description: 'Wine introduction or transition slide',
    defaultPayload: {
      title: 'Wine Introduction',
      description: 'Welcome to our wine tasting experience',
      duration: 30,
      showContinueButton: true
    }
  },
  {
    type: 'question',
    name: 'Question',
    icon: <HelpCircle className="w-4 h-4" />,
    description: 'Interactive question for participants',
    defaultPayload: {
      question: 'What aromas do you detect?',
      questionType: 'multiple_choice',
      options: [
        { id: '1', text: 'Fruity notes' },
        { id: '2', text: 'Floral notes' },
        { id: '3', text: 'Earthy notes' },
        { id: '4', text: 'Spicy notes' }
      ],
      timeLimit: 60,
      points: 10
    }
  },
  {
    type: 'video_message',
    name: 'Video',
    icon: <Video className="w-4 h-4" />,
    description: 'Video message from sommelier',
    defaultPayload: {
      title: 'Sommelier Insights',
      description: 'Expert commentary on this wine',
      videoUrl: '',
      duration: 120
    }
  },
  {
    type: 'audio_message',
    name: 'Audio',
    icon: <Volume2 className="w-4 h-4" />,
    description: 'Audio message or tasting notes',
    defaultPayload: {
      title: 'Tasting Notes',
      description: 'Listen to detailed tasting notes',
      audioUrl: '',
      duration: 90
    }
  },
  {
    type: 'media',
    name: 'Media',
    icon: <ImageIcon className="w-4 h-4" />,
    description: 'Image gallery or visual content',
    defaultPayload: {
      title: 'Visual Guide',
      description: 'Visual elements for this wine',
      mediaItems: []
    }
  }
];

export default function VideoEditorPackageEditor() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSlide, setSelectedSlide] = useState<Slide | null>(null);
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [allSlides, setAllSlides] = useState<Slide[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  // Fetch package data
  const { data: packageData, isLoading } = useQuery({
    queryKey: ['/api/packages', code, 'editor'],
    enabled: !!code,
  });

  // Organize slides by wine
  const slidesByWine = allSlides.reduce((acc, slide) => {
    if (!acc[slide.packageWineId]) {
      acc[slide.packageWineId] = [];
    }
    acc[slide.packageWineId].push(slide);
    return acc;
  }, {} as Record<string, Slide[]>);

  // Sort slides within each wine by position
  Object.keys(slidesByWine).forEach(wineId => {
    slidesByWine[wineId].sort((a: any, b: any) => a.position - b.position);
  });

  // Get all slides in sequence across all wines
  const allSlidesSequence = packageData?.wines?.flatMap((wine: Wine) => 
    (slidesByWine[wine.id] || []).map(slide => ({ ...slide, wine }))
  ) || [];

  // Update slides when package data changes
  useEffect(() => {
    if (packageData?.slides) {
      setAllSlides(packageData.slides);
    }
  }, [packageData]);

  const createSlide = useMutation({
    mutationFn: async (slideData: any) => {
      const response = await fetch('/api/slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slideData),
      });
      if (!response.ok) throw new Error('Failed to create slide');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages', code, 'editor'] });
      toast({ title: 'Slide created successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to create slide', variant: 'destructive' });
    },
  });

  const updateSlide = useMutation({
    mutationFn: async ({ slideId, payload }: { slideId: string; payload: any }) => {
      const response = await fetch(`/api/slides/${slideId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payloadJson: payload }),
      });
      if (!response.ok) throw new Error('Failed to update slide');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages', code, 'editor'] });
      toast({ title: 'Slide updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update slide', variant: 'destructive' });
    },
  });

  const deleteSlide = useMutation({
    mutationFn: async (slideId: string) => {
      const response = await fetch(`/api/slides/${slideId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete slide');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages', code, 'editor'] });
      toast({ title: 'Slide deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete slide', variant: 'destructive' });
    },
  });

  const updateSlidesOrder = useMutation({
    mutationFn: async (slideUpdates: { slideId: string; packageWineId: string; position: number }[]) => {
      const response = await fetch('/api/slides/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: slideUpdates }),
      });
      if (!response.ok) throw new Error('Failed to reorder slides');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages', code, 'editor'] });
      toast({ title: 'Slides reordered successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to reorder slides', variant: 'destructive' });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const activeSlide = allSlides.find((s: any) => s.id === active.id);
    const overSlide = allSlides.find((s: any) => s.id === over.id);
    
    if (!activeSlide || !overSlide) return;

    // Only allow reordering within the same wine
    if (activeSlide.packageWineId !== overSlide.packageWineId) {
      toast({ 
        title: 'Cannot move slides between wines', 
        description: 'Slides can only be reordered within the same wine.',
        variant: 'destructive' 
      });
      return;
    }

    const wineSlides = slidesByWine[activeSlide.packageWineId] || [];
    const oldIndex = wineSlides.findIndex((s: any) => s.id === active.id);
    const newIndex = wineSlides.findIndex((s: any) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedSlides = arrayMove(wineSlides, oldIndex, newIndex);
    
    // Update positions
    const updates = reorderedSlides.map((slide: any, index: number) => ({
      slideId: slide.id,
      packageWineId: slide.packageWineId,
      position: index + 1,
    }));

    // Update local state immediately for responsiveness
    setAllSlides((prevSlides: any[]) => {
      const newSlides = [...prevSlides];
      const slideUpdatesMap = new Map(updates.map(u => [u.slideId, u.position]));
      
      return newSlides.map((slide: any) => {
        const newPosition = slideUpdatesMap.get(slide.id);
        return newPosition !== undefined ? { ...slide, position: newPosition } : slide;
      });
    });

    updateSlidesOrder.mutate(updates);
  };

  const handleAddSlide = (template: SlideTemplate, wineId: string) => {
    const wineSlides = slidesByWine[wineId] || [];
    const nextPosition = wineSlides.length + 1;

    createSlide.mutate({
      packageWineId: wineId,
      type: template.type,
      section_type: 'general',
      payloadJson: template.defaultPayload,
      position: nextPosition
    });
  };

  const handleSlideUpdate = (slideId: string, updatedPayload: any) => {
    updateSlide.mutate({ slideId, payload: updatedPayload });
    
    // Update local state
    setSelectedSlide((prev: any) => prev?.id === slideId ? { ...prev, payloadJson: updatedPayload } : prev);
    setAllSlides((prev: any[]) => prev.map((slide: any) => 
      slide.id === slideId ? { ...slide, payloadJson: updatedPayload } : slide
    ));
  };

  const playSlideshow = () => {
    setIsPlaying(true);
    setCurrentSlideIndex(0);
  };

  const pauseSlideshow = () => {
    setIsPlaying(false);
  };

  const nextSlide = () => {
    if (currentSlideIndex < allSlidesSequence.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white">Loading package editor...</p>
        </div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white">Package not found</p>
          <Button 
            onClick={() => setLocation('/dashboard')}
            className="mt-4"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Video Editor Header */}
      <div className="border-b border-gray-700 bg-gray-800/50 backdrop-blur">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/dashboard')}
                className="text-gray-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">{packageData.name}</h1>
                <p className="text-sm text-gray-400">Wine Experience Editor • {packageData.code}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {!isPlaying ? (
                <Button
                  onClick={playSlideshow}
                  variant="outline"
                  size="sm"
                  className="text-green-400 border-green-400 hover:bg-green-400/10"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              ) : (
                <Button
                  onClick={pauseSlideshow}
                  variant="outline"
                  size="sm"
                  className="text-orange-400 border-orange-400 hover:bg-orange-400/10"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}
              <Button variant="default" size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Editor Layout */}
      <div className="flex h-[calc(100vh-73px)]">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Timeline Panel */}
          <ResizablePanel defaultSize={25} minSize={20}>
            <div className="h-full bg-gray-800/30 border-r border-gray-700">
              {/* Add Slide Templates */}
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold mb-3">Add Slides</h3>
                <div className="grid grid-cols-1 gap-2">
                  {SLIDE_TEMPLATES.map((template) => (
                    <Button
                      key={template.type}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedWine) {
                          handleAddSlide(template, selectedWine.id);
                        } else {
                          toast({ 
                            title: 'Select a wine first', 
                            description: 'Choose a wine to add slides to.',
                            variant: 'destructive' 
                          });
                        }
                      }}
                      className="flex items-center gap-2 p-2 h-auto border-gray-600 text-gray-300 hover:bg-gray-700 justify-start"
                    >
                      {template.icon}
                      <span className="text-xs">{template.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="p-4 overflow-y-auto">
                <h3 className="text-white font-semibold mb-3">Timeline</h3>
                
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className="space-y-4">
                    {packageData.wines?.map((wine: Wine) => {
                      const wineSlides = slidesByWine[wine.id] || [];
                      return (
                        <div 
                          key={wine.id}
                          className={`border rounded-lg p-2 mb-3 transition-colors ${
                            selectedWine?.id === wine.id 
                              ? 'border-purple-500 bg-purple-500/10' 
                              : 'border-gray-600 bg-gray-800/50'
                          }`}
                        >
                          <div 
                            className="flex items-center gap-2 mb-2 cursor-pointer"
                            onClick={() => setSelectedWine(wine)}
                          >
                            <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {wine.position}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-white font-medium text-sm">{wine.wineName}</h4>
                              <p className="text-xs text-gray-400">{wineSlides.length} slides</p>
                            </div>
                          </div>

                          <SortableContext
                            items={wineSlides.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-1">
                              {wineSlides.map((slide, index) => (
                                <motion.div
                                  key={slide.id}
                                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                                    selectedSlide?.id === slide.id
                                      ? 'border-blue-500 bg-blue-500/10'
                                      : 'border-gray-600 bg-gray-700/50 hover:bg-gray-600/50'
                                  }`}
                                  onClick={() => setSelectedSlide(slide)}
                                >
                                  <div className="text-gray-400">
                                    {SLIDE_TEMPLATES.find(t => t.type === slide.type)?.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-xs truncate">
                                      {slide.payloadJson?.title || slide.payloadJson?.question || slide.type}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-purple-400">#{slide.position}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSlide.mutate(slide.id);
                                      }}
                                      className="h-6 w-6 p-0 text-red-400 hover:bg-red-500/20"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </SortableContext>
                        </div>
                      );
                    })}
                  </div>
                </DndContext>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center Preview Panel */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full bg-gray-900/50 flex flex-col">
              <div className="p-4 border-b border-gray-700 bg-gray-800/30">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-white flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Live Preview
                  </h2>
                  {isPlaying && (
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={prevSlide}
                        variant="ghost"
                        size="sm"
                        disabled={currentSlideIndex === 0}
                        className="text-gray-400"
                      >
                        Previous
                      </Button>
                      <Badge variant="outline" className="text-white">
                        {currentSlideIndex + 1} / {allSlidesSequence.length}
                      </Badge>
                      <Button
                        onClick={nextSlide}
                        variant="ghost"
                        size="sm"
                        disabled={currentSlideIndex === allSlidesSequence.length - 1}
                        className="text-gray-400"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                <div className="aspect-[9/16] max-w-sm mx-auto bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-3xl shadow-2xl overflow-hidden relative">
                  {/* Phone-like header */}
                  <div className="absolute top-0 left-0 right-0 h-6 bg-black/20 rounded-t-3xl flex items-center justify-center">
                    <div className="w-16 h-1 bg-white/30 rounded-full"></div>
                  </div>

                  {/* Content area */}
                  <div className="pt-8 h-full p-6 flex flex-col justify-center">
                    {!selectedSlide && !isPlaying && (
                      <div className="text-center text-white/50">
                        <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">Select a slide to preview</p>
                      </div>
                    )}

                    {(selectedSlide || (isPlaying && allSlidesSequence[currentSlideIndex])) && (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={isPlaying ? currentSlideIndex : selectedSlide?.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                          className="text-center text-white"
                        >
                          {(() => {
                            const slide = isPlaying ? allSlidesSequence[currentSlideIndex] : selectedSlide;
                            if (!slide) return null;

                            const payload = slide.payloadJson;

                            if (slide.type === 'interlude') {
                              return (
                                <div>
                                  <h3 className="text-xl font-bold mb-2">{payload?.title || 'Interlude'}</h3>
                                  <p className="text-white/70 text-sm">{payload?.description}</p>
                                  {payload?.duration && (
                                    <Badge variant="outline" className="mt-4 border-white/30 text-white/70">
                                      {payload.duration}s
                                    </Badge>
                                  )}
                                </div>
                              );
                            }

                            if (slide.type === 'question') {
                              return (
                                <div>
                                  <h3 className="text-lg font-bold mb-4">{payload?.question || 'Question'}</h3>
                                  <div className="space-y-2">
                                    {payload?.options?.slice(0, 4).map((option: any, index: number) => (
                                      <div 
                                        key={option.id || index}
                                        className="bg-white/10 rounded-lg p-2 text-sm border border-white/20"
                                      >
                                        {option.text}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div>
                                <h3 className="text-lg font-bold mb-2">{payload?.title || slide.type}</h3>
                                <p className="text-white/70 text-sm">{payload?.description || 'Content preview'}</p>
                              </div>
                            );
                          })()}
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Properties Panel */}
          <ResizablePanel defaultSize={25} minSize={20}>
            <div className="h-full bg-gray-800/30 border-l border-gray-700 overflow-y-auto">
              <div className="p-4 border-b border-gray-700">
                <h2 className="font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Properties
                </h2>
              </div>

              <div className="p-4">
                {!selectedSlide ? (
                  <div className="text-center text-gray-400 mt-8">
                    <Settings className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">Select a slide to edit properties</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Slide Info */}
                    <Card className="bg-gray-800 border-gray-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-white flex items-center gap-2">
                          {SLIDE_TEMPLATES.find(t => t.type === selectedSlide.type)?.icon}
                          {selectedSlide.type.replace('_', ' ').toUpperCase()}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                            Position #{selectedSlide.position}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Slide Configuration */}
                    {selectedSlide.type === 'interlude' && (
                      <Card className="bg-gray-800 border-gray-700">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-white">Interlude Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label className="text-white text-sm">Title</Label>
                            <Input
                              value={selectedSlide.payloadJson?.title || ''}
                              onChange={(e) => {
                                const newPayload = { ...selectedSlide.payloadJson, title: e.target.value };
                                handleSlideUpdate(selectedSlide.id, newPayload);
                              }}
                              className="bg-gray-700 border-gray-600 text-white"
                              placeholder="Enter slide title"
                            />
                          </div>
                          <div>
                            <Label className="text-white text-sm">Description</Label>
                            <Textarea
                              value={selectedSlide.payloadJson?.description || ''}
                              onChange={(e) => {
                                const newPayload = { ...selectedSlide.payloadJson, description: e.target.value };
                                handleSlideUpdate(selectedSlide.id, newPayload);
                              }}
                              className="bg-gray-700 border-gray-600 text-white resize-none"
                              rows={3}
                              placeholder="Enter description"
                            />
                          </div>
                          <div>
                            <Label className="text-white text-sm">Duration (seconds)</Label>
                            <Input
                              type="number"
                              value={selectedSlide.payloadJson?.duration || 30}
                              onChange={(e) => {
                                const newPayload = { ...selectedSlide.payloadJson, duration: parseInt(e.target.value) };
                                handleSlideUpdate(selectedSlide.id, newPayload);
                              }}
                              className="bg-gray-700 border-gray-600 text-white"
                              min="5"
                              max="300"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {selectedSlide.type === 'question' && (
                      <Card className="bg-gray-800 border-gray-700">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-white">Question Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label className="text-white text-sm">Question</Label>
                            <Textarea
                              value={selectedSlide.payloadJson?.question || ''}
                              onChange={(e) => {
                                const newPayload = { ...selectedSlide.payloadJson, question: e.target.value };
                                handleSlideUpdate(selectedSlide.id, newPayload);
                              }}
                              className="bg-gray-700 border-gray-600 text-white resize-none"
                              rows={2}
                              placeholder="Enter your question"
                            />
                          </div>
                          <div>
                            <Label className="text-white text-sm">Question Type</Label>
                            <Select
                              value={selectedSlide.payloadJson?.questionType || 'multiple_choice'}
                              onValueChange={(value) => {
                                const newPayload = { ...selectedSlide.payloadJson, questionType: value };
                                handleSlideUpdate(selectedSlide.id, newPayload);
                              }}
                            >
                              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                <SelectItem value="scale">Scale</SelectItem>
                                <SelectItem value="text">Text Input</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-white text-sm">Time Limit (seconds)</Label>
                            <Input
                              type="number"
                              value={selectedSlide.payloadJson?.timeLimit || 60}
                              onChange={(e) => {
                                const newPayload = { ...selectedSlide.payloadJson, timeLimit: parseInt(e.target.value) };
                                handleSlideUpdate(selectedSlide.id, newPayload);
                              }}
                              className="bg-gray-700 border-gray-600 text-white"
                              min="10"
                              max="300"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}