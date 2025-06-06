import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  Eye, 
  Settings,
  GripVertical,
  Wine,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Package {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface PackageWine {
  id: string;
  packageId: string;
  position: number;
  wineName: string;
  wineDescription: string;
  wineImageUrl: string;
  wineType: string;
  vintage: number;
  region: string;
  producer: string;
  grapeVarietals: string[];
  alcoholContent: string;
  expectedCharacteristics: Record<string, any>;
}

interface Slide {
  id: string;
  packageWineId: string;
  position: number;
  type: 'interlude' | 'question' | 'video_message' | 'audio_message' | 'media';
  sectionType: 'intro' | 'deep_dive' | 'ending';
  title: string;
  description: string;
  payloadJson: any;
}

interface PackageEditorData {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  wines: PackageWine[];
  slides: Slide[];
}

function SortableSlideItem({ slide, wine, isSelected, onClick }: {
  slide: Slide;
  wine: PackageWine;
  isSelected: boolean;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getSlideIcon = (type: string) => {
    switch (type) {
      case 'question': return '❓';
      case 'interlude': return '🎭';
      case 'video_message': return '🎥';
      case 'audio_message': return '🎵';
      case 'media': return '📷';
      default: return '📝';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative p-3 border rounded-lg cursor-pointer transition-all",
        isSelected ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300",
        isDragging && "opacity-50 z-50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <div
          {...attributes}
          {...listeners}
          className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-lg">{getSlideIcon(slide.type)}</span>
            <Badge variant="outline" className="text-xs">
              {slide.type.replace('_', ' ')}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {slide.sectionType}
            </Badge>
          </div>
          <p className="font-medium text-sm truncate">{slide.title}</p>
          <p className="text-xs text-gray-500 truncate">{slide.description}</p>
          <p className="text-xs text-purple-600 mt-1">Wine: {wine.wineName}</p>
        </div>
      </div>
    </div>
  );
}

function WineSection({ wine, slides, selectedSlide, onSlideSelect, isExpanded, onToggle }: {
  wine: PackageWine;
  slides: Slide[];
  selectedSlide: Slide | null;
  onSlideSelect: (slide: Slide) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-3">
          <Wine className="w-5 h-5 text-purple-600" />
          <div>
            <h3 className="font-medium">{wine.wineName}</h3>
            <p className="text-sm text-gray-500">{slides.length} slides</p>
          </div>
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 space-y-2 overflow-hidden"
          >
            <SortableContext items={slides.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {slides.map((slide) => (
                <SortableSlideItem
                  key={slide.id}
                  slide={slide}
                  wine={wine}
                  isSelected={selectedSlide?.id === slide.id}
                  onClick={() => onSlideSelect(slide)}
                />
              ))}
            </SortableContext>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SlideConfigPanel({ slide, wine, onUpdate }: {
  slide: Slide | null;
  wine: PackageWine | null;
  onUpdate: (slideId: string, updates: Partial<Slide>) => void;
}) {
  const [localSlide, setLocalSlide] = useState(slide);

  useEffect(() => {
    setLocalSlide(slide);
  }, [slide]);

  if (!slide || !wine) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a slide to configure</p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (localSlide) {
      onUpdate(slide.id, localSlide);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Configure Slide</h3>
        <div className="flex items-center space-x-2 mb-4">
          <Badge>{slide.type.replace('_', ' ')}</Badge>
          <Badge variant="secondary">{slide.sectionType}</Badge>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="slide-title">Title</Label>
          <Input
            id="slide-title"
            value={localSlide?.title || ''}
            onChange={(e) => setLocalSlide(prev => prev ? { ...prev, title: e.target.value } : null)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="slide-description">Description</Label>
          <Textarea
            id="slide-description"
            value={localSlide?.description || ''}
            onChange={(e) => setLocalSlide(prev => prev ? { ...prev, description: e.target.value } : null)}
            className="mt-1"
            rows={3}
          />
        </div>

        {slide.type === 'question' && (
          <div className="space-y-4">
            <h4 className="font-medium">Question Settings</h4>
            
            <div>
              <Label htmlFor="question-text">Question</Label>
              <Input
                id="question-text"
                value={localSlide?.payloadJson?.question || ''}
                onChange={(e) => setLocalSlide(prev => prev ? {
                  ...prev,
                  payloadJson: { ...prev.payloadJson, question: e.target.value }
                } : null)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="question-type">Question Type</Label>
              <select
                id="question-type"
                value={localSlide?.payloadJson?.questionType || 'multiple_choice'}
                onChange={(e) => setLocalSlide(prev => prev ? {
                  ...prev,
                  payloadJson: { ...prev.payloadJson, questionType: e.target.value }
                } : null)}
                className="mt-1 w-full p-2 border rounded-md"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="scale">Scale</option>
                <option value="text">Text Input</option>
              </select>
            </div>
          </div>
        )}

        {slide.type === 'interlude' && (
          <div className="space-y-4">
            <h4 className="font-medium">Interlude Settings</h4>
            
            <div>
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                value={localSlide?.payloadJson?.duration || 30}
                onChange={(e) => setLocalSlide(prev => prev ? {
                  ...prev,
                  payloadJson: { ...prev.payloadJson, duration: parseInt(e.target.value) }
                } : null)}
                className="mt-1"
              />
            </div>
          </div>
        )}

        <Separator />

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Associated Wine</h4>
          <div className="flex items-center space-x-3">
            <Wine className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-medium">{wine.wineName}</p>
              <p className="text-sm text-gray-500">{wine.producer}, {wine.vintage}</p>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}

export default function PackageEditor() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSlide, setSelectedSlide] = useState<Slide | null>(null);
  const [expandedWines, setExpandedWines] = useState<Set<string>>(new Set());
  const [slides, setSlides] = useState<Slide[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch package data
  const { data: packageData, isLoading, error } = useQuery<PackageEditorData>({
    queryKey: ['/api/packages', code, 'editor'],
    enabled: !!code
  });

  useEffect(() => {
    if (packageData) {
      setSlides(packageData.slides);
      // Auto-expand all wine sections
      setExpandedWines(new Set(packageData.wines.map(w => w.id)));
    }
  }, [packageData]);

  // Update slide order mutation
  const updateSlideOrderMutation = useMutation({
    mutationFn: async (slideUpdates: { slideId: string; packageWineId: string; position: number }[]) => {
      const response = await fetch('/api/slides/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slideUpdates })
      });
      if (!response.ok) throw new Error('Failed to update slide order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages', code, 'editor'] });
      toast({ title: "Slide order updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update slide order", variant: "destructive" });
    }
  });

  // Update slide mutation
  const updateSlideMutation = useMutation({
    mutationFn: async ({ slideId, updates }: { slideId: string; updates: Partial<Slide> }) => {
      const response = await fetch(`/api/slides/${slideId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update slide');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages', code, 'editor'] });
      toast({ title: "Slide updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update slide", variant: "destructive" });
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeSlide = slides.find(s => s.id === active.id);
    const overSlide = slides.find(s => s.id === over.id);

    if (!activeSlide || !overSlide) return;

    setSlides(slides => {
      const oldIndex = slides.findIndex(s => s.id === active.id);
      const newIndex = slides.findIndex(s => s.id === over.id);
      
      const newSlides = arrayMove(slides, oldIndex, newIndex);
      
      // Create slide updates with new positions
      const slideUpdates = newSlides.map((slide, index) => ({
        slideId: slide.id,
        packageWineId: slide.packageWineId,
        position: index + 1
      }));

      // Update server
      updateSlideOrderMutation.mutate(slideUpdates);

      return newSlides;
    });
  };

  const handleSlideUpdate = (slideId: string, updates: Partial<Slide>) => {
    updateSlideMutation.mutate({ slideId, updates });
  };

  const toggleWineExpansion = (wineId: string) => {
    setExpandedWines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wineId)) {
        newSet.delete(wineId);
      } else {
        newSet.add(wineId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading package editor...</p>
        </div>
      </div>
    );
  }

  if (error || !packageData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p>Package not found</p>
          <Button onClick={() => setLocation('/sommelier')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const selectedWine = selectedSlide ? packageData.wines.find(w => w.id === selectedSlide.packageWineId) || null : null;

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/sommelier')}
              className="text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">{packageData.name}</h1>
              <p className="text-slate-400">Package Editor • {packageData.code}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save Package
            </Button>
          </div>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Slide List */}
        <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Slides</h2>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Slide
              </Button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-4">
                {packageData.wines.map(wine => {
                  const wineSlides = slides.filter(s => s.packageWineId === wine.id);
                  return (
                    <WineSection
                      key={wine.id}
                      wine={wine}
                      slides={wineSlides}
                      selectedSlide={selectedSlide}
                      onSlideSelect={setSelectedSlide}
                      isExpanded={expandedWines.has(wine.id)}
                      onToggle={() => toggleWineExpansion(wine.id)}
                    />
                  );
                })}
              </div>
            </DndContext>
          </div>
        </div>

        {/* Center Panel - Preview */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Live Preview</h3>
            <p>Select a slide to see the preview</p>
          </div>
        </div>

        {/* Right Panel - Configuration */}
        <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
          <SlideConfigPanel
            slide={selectedSlide}
            wine={selectedWine}
            onUpdate={handleSlideUpdate}
          />
        </div>
      </div>
    </div>
  );
}