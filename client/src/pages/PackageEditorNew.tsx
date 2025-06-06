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
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SortableWineSection } from '@/components/editor/SlideListPanel';
import { SlidePreviewPanel } from '@/components/editor/SlidePreviewPanel';
import { SlideConfigPanel } from '@/components/editor/SlideConfigPanel';

export default function PackageEditor() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSlide, setSelectedSlide] = useState<any>(null);
  const [allSlides, setAllSlides] = useState<any[]>([]);

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
  }, {} as Record<string, any[]>);

  // Sort slides within each wine by position
  Object.keys(slidesByWine).forEach(wineId => {
    slidesByWine[wineId].sort((a, b) => a.position - b.position);
  });

  // Update slides when package data changes
  useEffect(() => {
    if (packageData?.slides) {
      setAllSlides(packageData.slides);
    }
  }, [packageData]);

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

    const activeSlide = allSlides.find(s => s.id === active.id);
    const overSlide = allSlides.find(s => s.id === over.id);
    
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
    const oldIndex = wineSlides.findIndex(s => s.id === active.id);
    const newIndex = wineSlides.findIndex(s => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedSlides = arrayMove(wineSlides, oldIndex, newIndex);
    
    // Update positions
    const updates = reorderedSlides.map((slide, index) => ({
      slideId: slide.id,
      packageWineId: slide.packageWineId,
      position: index + 1,
    }));

    // Update local state immediately for responsiveness
    setAllSlides(prevSlides => {
      const newSlides = [...prevSlides];
      const slideUpdatesMap = new Map(updates.map(u => [u.slideId, u.position]));
      
      return newSlides.map(slide => {
        const newPosition = slideUpdatesMap.get(slide.id);
        return newPosition !== undefined ? { ...slide, position: newPosition } : slide;
      });
    });

    updateSlidesOrder.mutate(updates);
  };

  const handleSlideSelect = (slideId: string) => {
    const slide = allSlides.find(s => s.id === slideId);
    setSelectedSlide(slide || null);
  };

  const handleSlideUpdate = (slideId: string, updatedPayload: any) => {
    updateSlide.mutate({ slideId, payload: updatedPayload });
    
    // Update local state
    setSelectedSlide((prev: any) => prev?.id === slideId ? { ...prev, payloadJson: updatedPayload } : prev);
    setAllSlides((prev: any[]) => prev.map(slide => 
      slide.id === slideId ? { ...slide, payloadJson: updatedPayload } : slide
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Layers className="w-12 h-12 mx-auto mb-4 text-purple-500 animate-pulse" />
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
      {/* Header */}
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
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">{packageData.name}</h1>
                <p className="text-sm text-gray-400">Package Editor • {packageData.code}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" className="text-gray-300 border-gray-600">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button variant="default" size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Three-Panel Layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Slide List */}
        <div className="w-80 border-r border-gray-700 bg-gray-800/30 overflow-y-auto">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-white">Slides & Content</h2>
            </div>
            <p className="text-xs text-gray-400">
              {allSlides.length} slides across {packageData.wines?.length || 0} wines
            </p>
          </div>

          <div className="p-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-4">
                {packageData.wines?.map((wine: any) => {
                  const wineSlides = slidesByWine[wine.id] || [];
                  return (
                    <SortableContext
                      key={wine.id}
                      items={wineSlides.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <SortableWineSection
                        wine={wine}
                        slides={wineSlides}
                        activeSlideId={selectedSlide?.id || null}
                        onSlideClick={handleSlideSelect}
                      />
                    </SortableContext>
                  );
                })}
              </div>
            </DndContext>
          </div>
        </div>

        {/* Center Panel - Live Preview */}
        <div className="flex-1 bg-gray-900/50">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-700 bg-gray-800/30">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Real-time preview of selected slide
              </p>
            </div>
            <div className="flex-1">
              <SlidePreviewPanel activeSlide={selectedSlide} />
            </div>
          </div>
        </div>

        {/* Right Panel - Configuration */}
        <div className="w-96 border-l border-gray-700 bg-gray-800/30">
          <SlideConfigPanel
            activeSlide={selectedSlide}
            onSlideUpdate={handleSlideUpdate}
          />
        </div>
      </div>
    </div>
  );
}