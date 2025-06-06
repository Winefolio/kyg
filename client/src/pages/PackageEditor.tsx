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
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  Eye, 
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SortableWineSection } from '@/components/editor/SlideListPanel';
import { SlidePreviewPanel } from '@/components/editor/SlidePreviewPanel';
import { SlideConfigPanel } from '@/components/editor/SlideConfigPanel';

interface PackageEditorData {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  wines: any[];
  slides: any[];
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
    if (packageData && packageData.wines && packageData.slides) {
      setSlides(packageData.slides || []);
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

  if (isLoading || !packageData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading package editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p>Error loading package: {error.message}</p>
          <Button onClick={() => setLocation('/sommelier')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!packageData.wines || !Array.isArray(packageData.wines)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p>Package has no wines configured</p>
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
                {(packageData?.wines || []).map(wine => {
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