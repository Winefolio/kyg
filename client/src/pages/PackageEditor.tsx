// client/pages/PackageEditor.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { SLIDE_TEMPLATES } from '@/lib/wineTemplates';
import { 
  ArrowLeft, Save, PlusCircle, Edit3, Trash2, Wine, HelpCircle, 
  Video, Eye, Settings, ChevronRight, ChevronDown, Menu, X, Monitor, Smartphone, Plus, Sparkles, GripVertical,
  ArrowUp, ArrowDown, Package as PackageIcon
} from 'lucide-react';
import type { Package, PackageWine, Slide, GenericQuestion } from "@shared/schema";
import { WineModal } from '@/components/WineModal';
import { SlidePreview } from '@/components/SlidePreview';
import { SlideConfigPanel } from '@/components/editor/SlideConfigPanel';
import { QuickQuestionBuilder } from '@/components/editor/QuickQuestionBuilder';
import { SimpleCopyButton } from '@/components/editor/SimpleCopyButton';
import { PackageIntroCard } from '@/components/editor/PackageIntroCard';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Section details for organizing slides
const sectionDetails = {
  intro: { title: 'Intro', icon: '🎬' },
  deep_dive: { title: 'Deep Dive', icon: '🤔' },
  ending: { title: 'Ending', icon: '🏁' },
};

type EditorData = Package & { wines: PackageWine[]; slides: Slide[] };

export default function PackageEditor() {
  const { code } = useParams<{ code: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [wines, setWines] = useState<PackageWine[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [localSlides, setLocalSlides] = useState<Slide[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isWineModalOpen, setIsWineModalOpen] = useState(false);
  const [editingWine, setEditingWine] = useState<PackageWine | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [expandedWines, setExpandedWines] = useState<Set<string>>(new Set());
  const [quickBuilderOpen, setQuickBuilderOpen] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const dataLoadedRef = useRef(false);
  const [currentWineContext, setCurrentWineContext] = useState<{
    wineId: string;
    wineName: string;
    wineType: string;
    sectionType: 'intro' | 'deep_dive' | 'ending';
  } | null>(null);

  const { data: editorData, isLoading, error } = useQuery<EditorData>({
    queryKey: [`/api/packages/${code}/editor`],
    enabled: !!code,
  });

  const { data: slideTemplates = [] } = useQuery<any[]>({
    queryKey: ['/api/slide-templates'],
  });

  useEffect(() => {
    // Only sync from server on initial load or when we don't have unsaved changes
    if (editorData && !dataLoadedRef.current) {
      const sortedWines = [...(editorData.wines || [])].sort((a, b) => a.position - b.position);
      const sortedSlides = [...(editorData.slides || [])].sort((a, b) => a.position - b.position);

      setWines(sortedWines);
      setSlides(sortedSlides);
      setLocalSlides(sortedSlides); // Set localSlides for UI rendering
      dataLoadedRef.current = true; // Mark as loaded

      if (sortedWines.length > 0) {
        const firstWineId = sortedWines[0].id;
        setExpandedWines(new Set([firstWineId]));
        const firstWineSlides = sortedSlides.filter(s => s.packageWineId === firstWineId);
        if (firstWineSlides.length > 0) {
          setActiveSlideId(firstWineSlides[0].id);
        }
      }
    }
  }, [editorData]);

  const activeSlide = localSlides.find(s => s.id === activeSlideId);

  // --- MUTATIONS ---
  const createWineMutation = useMutation({
    mutationFn: async (wineData: any) => {
      const response = await apiRequest('POST', `/api/wines`, wineData);
      const result = await response.json();
      return result.wine;
    },
    onSuccess: async (newWine: PackageWine) => {
      // Check if this is the first wine
      const wines = editorData?.wines || [];
      const isFirstWine = wines.length === 0;
      
      if (isFirstWine && editorData?.id) {
        // Ensure package intro exists
        try {
          await apiRequest('POST', `/api/packages/${editorData.id}/intro`, {
            title: `Welcome to ${editorData.name || 'Your Wine Tasting'}`,
            description: 'You are about to embark on a journey through exceptional wines. Each wine has been carefully selected to showcase unique characteristics and flavors.',
            imageUrl: editorData.imageUrl
          });
        } catch (error) {
          console.error('Failed to create package intro slide:', error);
        }
      }
      
      // Auto-create wine introduction slide
      const wineIntroPosition = 1; // Local position within wine
      const wineIntroData = {
        packageWineId: newWine.id,
        position: wineIntroPosition,
        type: 'interlude',
        section_type: 'intro',
        payloadJson: {
          title: `Meet ${newWine.wineName}`,
          description: newWine.wineDescription || `Discover the unique characteristics of this exceptional wine.`,
          wine_name: newWine.wineName,
          wine_image: newWine.wineImageUrl || '',
          wine_type: newWine.wineType,
          wine_region: newWine.region,
          wine_vintage: newWine.vintage,
          is_welcome: true,
          is_wine_intro: true
        }
      };
      
      try {
        await apiRequest('POST', '/api/slides', wineIntroData);
        toast({ 
          title: "🍷 Wine created with welcome slide", 
          description: `${newWine.wineName} is ready for content`
        });
        // Invalidate and reset data loaded flag to get fresh data
        dataLoadedRef.current = false;
      } catch (error) {
        console.error('Failed to create welcome slide:', error);
        toast({ title: "Wine created successfully", description: "Note: Welcome slide creation failed" });
      }
      
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
      setIsWineModalOpen(false);
    },
    onError: (error: any) => toast({ title: "Error creating wine", description: error.message, variant: "destructive" }),
  });

  const updateWineMutation = useMutation({
    mutationFn: ({ wineId, data }: { wineId: string; data: any }) => apiRequest('PATCH', `/api/wines/${wineId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
      toast({ title: "Wine updated successfully" });
      setIsWineModalOpen(false);
    },
    onError: (error: any) => toast({ title: "Error updating wine", description: error.message, variant: "destructive" }),
  });

  const deleteWineMutation = useMutation({
    mutationFn: (wineId: string) => apiRequest('DELETE', `/api/wines/${wineId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
      toast({ title: "Wine deleted successfully" });
    },
    onError: (error: any) => toast({ title: "Error deleting wine", description: error.message, variant: "destructive" }),
  });

  const createSlideMutation = useMutation({
    mutationFn: (slideData: any) => apiRequest('POST', '/api/slides', slideData),
    onSuccess: () => {
      dataLoadedRef.current = false; // Reset to reload fresh data
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
      toast({ title: "Slide created successfully" });
    },
    onError: (error: any) => toast({ title: "Error creating slide", description: error.message, variant: "destructive" }),
  });

  const updateSlideMutation = useMutation({
    mutationFn: ({ slideId, data }: { slideId: string; data: any }) => apiRequest('PATCH', `/api/slides/${slideId}`, data),
    onSuccess: () => {
      dataLoadedRef.current = false; // Reset to reload fresh data
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
      toast({ title: "Slide updated successfully" });
    },
    onError: (error: any) => toast({ title: "Error updating slide", description: error.message, variant: "destructive" }),
  });

  const deleteSlideMutation = useMutation({
    mutationFn: (slideId: string) => apiRequest('DELETE', `/api/slides/${slideId}`),
    onSuccess: () => {
      dataLoadedRef.current = false; // Reset to reload fresh data
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
      toast({ title: "Slide deleted successfully" });
      setActiveSlideId(null); // Clear selection when slide is deleted
    },
    onError: (error: any) => toast({ title: "Error deleting slide", description: error.message, variant: "destructive" }),
  });

  const reorderSlidesMutation = useMutation({
    mutationFn: (updates: { slideId: string; position: number; packageWineId?: string }[]) => 
      apiRequest('PUT', '/api/slides/reorder', { updates }),
    onSuccess: () => {
      toast({ 
        title: "Slide order updated", 
        description: "Changes saved successfully",
      });
      // Refresh data to ensure consistency
      dataLoadedRef.current = false;
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating slide order", 
        description: error.message || "Please try again", 
        variant: "destructive" 
      });
      // Revert local changes on error
      if (editorData) {
        setLocalSlides([...editorData.slides]);
        setSlides([...editorData.slides]);
      }
    },
  });

  // --- HELPER FUNCTIONS ---
  const getNextPositionForWine = (wineId: string): number => {
    const wineSlides = localSlides.filter(s => s.packageWineId === wineId);
    if (wineSlides.length === 0) return 10;
    
    const maxPosition = Math.max(...wineSlides.map(s => s.position));
    // Round up to next multiple of 10 for clean gaps
    return Math.ceil((maxPosition + 1) / 10) * 10;
  };

  // --- HANDLER FUNCTIONS ---
  const handleWineSave = (wineData: Partial<any>) => {
    if (editingWine) {
      updateWineMutation.mutate({ wineId: editingWine.id, data: wineData });
    } else {
      createWineMutation.mutate({ ...wineData, packageId: editorData?.id });
    }
  };

  const toggleWineExpansion = (wineId: string) => {
    setExpandedWines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wineId)) newSet.delete(wineId);
      else newSet.add(wineId);
      return newSet;
    });
  };

  const handleAddSlide = (wineId: string, template: any, sectionType?: 'intro' | 'deep_dive' | 'ending') => {
    const targetSection = sectionType || template.sectionType || 'deep_dive';
    const nextPosition = getNextPositionForWine(wineId);
    const wine = wines.find(w => w.id === wineId);

    // Clone the payload template and replace placeholders
    let payloadJson = {
      ...template.payloadTemplate,
      title: template.payloadTemplate?.title || template.name,
      description: template.payloadTemplate?.description || template.description || ''
    };

    // Replace wine name placeholder in welcome slides
    if (template.id === 'welcome-slide' && wine) {
      payloadJson.title = payloadJson.title.replace('{Wine Name}', wine.wineName);
      payloadJson.wine_name = wine.wineName;
      payloadJson.wine_image = wine.wineImageUrl || '';
    }

    const slideData = {
      packageWineId: wineId,
      position: nextPosition,
      type: template.type,
      section_type: targetSection,
      payloadJson,
    };
    createSlideMutation.mutate(slideData);
  };

  const handleSlideUpdate = (slideId: string, data: any) => {
    updateSlideMutation.mutate({ slideId, data });
  };

  const handleSlideDelete = (slideId: string) => {
    const slide = localSlides.find(s => s.id === slideId);
    if (!slide) return;
    
    // Check if this is a welcome slide
    const isWelcomeSlide = slide.type === 'interlude' && 
      slide.section_type === 'intro' &&
      ((slide.payloadJson as any)?.is_welcome || 
       (slide.payloadJson as any)?.title?.toLowerCase().includes('welcome'));
    
    if (isWelcomeSlide) {
      // Check if this is the only welcome slide for this wine
      const wineWelcomeSlides = localSlides.filter(s => 
        s.packageWineId === slide.packageWineId &&
        s.type === 'interlude' &&
        s.section_type === 'intro' &&
        ((s.payloadJson as any)?.is_welcome || 
         (s.payloadJson as any)?.title?.toLowerCase().includes('welcome'))
      );
      
      if (wineWelcomeSlides.length === 1) {
        toast({ 
          title: "Cannot delete welcome slide", 
          description: "Each wine must have at least one welcome slide",
          variant: "destructive" 
        });
        return;
      }
    }
    
    deleteSlideMutation.mutate(slideId);
  };

  const handleSlideReorder = (slideId: string, direction: 'up' | 'down') => {
    const slide = localSlides.find(s => s.id === slideId);
    if (!slide) return;
    
    // Check if this is a welcome slide in intro section
    const isWelcomeSlide = slide.type === 'interlude' && 
      slide.section_type === 'intro' &&
      ((slide.payloadJson as any)?.is_welcome || 
       (slide.payloadJson as any)?.title?.toLowerCase().includes('welcome'));
    
    // Prevent moving welcome slide down from position 1
    if (isWelcomeSlide && direction === 'down' && slide.position === 1) {
      toast({ 
        title: "Cannot move welcome slide", 
        description: "Welcome slides must remain at the beginning of the intro section",
        variant: "destructive" 
      });
      return;
    }
    
    // Get slides in the same wine AND section, sorted by position
    const sectionSlides = localSlides
      .filter(s => s.packageWineId === slide.packageWineId && s.section_type === slide.section_type)
      .sort((a, b) => a.position - b.position);
    
    const sectionIndex = sectionSlides.findIndex(s => s.id === slideId);
    if ((direction === 'up' && sectionIndex === 0) || 
        (direction === 'down' && sectionIndex === sectionSlides.length - 1)) {
      return;
    }
    
    const sectionTargetIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;
    const targetSlide = sectionSlides[sectionTargetIndex];
    
    // Check if target is a welcome slide at position 1
    const targetIsWelcome = targetSlide.type === 'interlude' && 
      targetSlide.section_type === 'intro' &&
      ((targetSlide.payloadJson as any)?.is_welcome || 
       (targetSlide.payloadJson as any)?.title?.toLowerCase().includes('welcome')) &&
      targetSlide.position === 1;
    
    if (targetIsWelcome && direction === 'up') {
      toast({ 
        title: "Cannot move above welcome slide", 
        description: "Welcome slides must remain at the beginning of the intro section",
        variant: "destructive" 
      });
      return;
    }
    
    // Instead of swapping positions directly, recalculate positions for the entire wine
    // This prevents duplicate position conflicts that cause database constraint violations
    const allWineSlides = localSlides
      .filter(s => s.packageWineId === slide.packageWineId)
      .sort((a, b) => a.position - b.position);
    
    // Find current positions in sorted array
    const wineSlideIndex = allWineSlides.findIndex(s => s.id === slide.id);
    const wineTargetIndex = direction === 'up' ? wineSlideIndex - 1 : wineSlideIndex + 1;
    
    // Create new order by moving the slide
    const reorderedSlides = [...allWineSlides];
    reorderedSlides.splice(wineSlideIndex, 1);
    reorderedSlides.splice(wineTargetIndex, 0, slide);
    
    // Assign clean sequential positions (10, 20, 30, etc.) to avoid conflicts
    const updates: Array<{ slideId: string; position: number }> = [];
    reorderedSlides.forEach((reorderedSlide, index) => {
      const newPosition = (index + 1) * 10;
      if (reorderedSlide.position !== newPosition) {
        updates.push({ slideId: reorderedSlide.id, position: newPosition });
      }
    });
    
    // Update local state with new positions
    const newLocalSlides = localSlides.map(s => {
      const update = updates.find(u => u.slideId === s.id);
      if (update) {
        return { ...s, position: update.position };
      }
      return s;
    });
    
    // Set local state and mark as having changes
    setLocalSlides(newLocalSlides);
    setHasUnsavedChanges(true);
    
    // Also update slides state for activeSlide reference
    setSlides(newLocalSlides);
    
    // Immediately save the changes to database - much more reliable than complex state management
    if (updates.length > 0) {
      console.log('🔄 Immediately saving slide order changes:', updates);
      
      // Reset unsaved changes flag since we're saving immediately
      setHasUnsavedChanges(false);
      
      // Save to database right away
      reorderSlidesMutation.mutate(updates);
    }
  };

  // Save all slide order changes
  const handleSaveSlideOrder = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    
    setIsSavingOrder(true);
    
    // Calculate all position updates needed - RESPECT current positions in localSlides
    const updates: { slideId: string; position: number }[] = [];
    
    // Check what slides have changed from the original slides state
    localSlides.forEach(localSlide => {
      const originalSlide = slides.find(s => s.id === localSlide.id);
      if (originalSlide && originalSlide.position !== localSlide.position) {
        updates.push({ 
          slideId: localSlide.id, 
          position: localSlide.position 
        });
      }
    });
    
    // Add validation - check for duplicate positions within same wine
    const positionsByWine = new Map<string, Set<number>>();
    const duplicates: string[] = [];
    
    localSlides.forEach(slide => {
      const wineId = slide.packageWineId;
      if (!positionsByWine.has(wineId)) {
        positionsByWine.set(wineId, new Set());
      }
      const positions = positionsByWine.get(wineId)!;
      if (positions.has(slide.position)) {
        duplicates.push(`Wine has duplicate position ${slide.position}`);
      }
      positions.add(slide.position);
    });
    
    if (duplicates.length > 0) {
      setIsSavingOrder(false);
      toast({ 
        title: "❌ Position conflict detected", 
        description: duplicates[0],
        variant: "destructive" 
      });
      return;
    }
    
    console.log(`📋 Sending ${updates.length} position updates to server:`, updates);
    
    if (updates.length > 0) {
      reorderSlidesMutation.mutate(updates);
    } else {
      setHasUnsavedChanges(false);
      setIsSavingOrder(false);
      toast({ title: "No changes to save" });
    }
  }, [hasUnsavedChanges, localSlides, slides, reorderSlidesMutation, toast]);

  // Keyboard shortcut for saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && hasUnsavedChanges) {
        e.preventDefault();
        handleSaveSlideOrder();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, handleSaveSlideOrder]);

  const handleQuickAddQuestion = (wineId: string, sectionType: 'intro' | 'deep_dive' | 'ending') => {
    const wine = wines.find(w => w.id === wineId);
    if (wine) {
      setCurrentWineContext({
        wineId,
        wineName: wine.wineName,
        wineType: wine.wineType || 'red',
        sectionType
      });
      setQuickBuilderOpen(true);
    }
  };

  const handleQuestionSave = (question: GenericQuestion) => {
    if (!currentWineContext) return;

    // Use getNextPositionForWine for proper wine-based positioning
    const nextPosition = getNextPositionForWine(currentWineContext.wineId);

    // Determine the correct slide type based on question format
    let slideType: 'question' | 'video_message' | 'audio_message' = 'question';
    let payloadJson: any = {
      ...question.config,
      question_type: question.format
    };

    if (question.format === 'video_message') {
      slideType = 'video_message';
      console.log('🎥 Creating video_message slide with type:', slideType);
      // Structure payload for VideoMessagePayload format
      payloadJson = {
        title: question.config.title,
        description: question.config.description,
        video_url: (question.config as any).videoUrl,
        autoplay: (question.config as any).autoplay || false,
        show_controls: (question.config as any).controls !== false
      };
    } else if (question.format === 'audio_message') {
      slideType = 'audio_message';
      console.log('🎵 Creating audio_message slide with type:', slideType);
      // Structure payload for AudioMessagePayload format
      payloadJson = {
        title: question.config.title,
        description: question.config.description,
        audio_url: (question.config as any).audioUrl,
        autoplay: (question.config as any).autoplay || false,
        show_controls: true
      };
    }

    const slideData = {
      packageWineId: currentWineContext.wineId,
      position: nextPosition,
      type: slideType,
      section_type: currentWineContext.sectionType,
      payloadJson,
      genericQuestions: question
    };

    createSlideMutation.mutate(slideData);
    setQuickBuilderOpen(false);
    setCurrentWineContext(null);
  };

  if (isLoading) return <div className="min-h-screen bg-gradient-primary text-white flex items-center justify-center">Loading Editor...</div>;
  if (error || !editorData) return <div className="min-h-screen bg-gradient-primary text-white flex items-center justify-center">Error loading package data.</div>;

  return (
    <div className="min-h-screen bg-gradient-primary text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <Link href="/sommelier"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Button></Link>
            <div>
              <h1 className="text-lg font-bold">{editorData.name}</h1>
              <p className="text-white/60 text-xs">Code: {editorData.code}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg blur-lg opacity-50 animate-pulse" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        onClick={handleSaveSlideOrder}
                        disabled={isSavingOrder}
                        className="relative bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                      >
                        {isSavingOrder ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Slide Order
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-700">
                      <p className="text-sm">Save all position changes</p>
                      <p className="text-xs text-gray-400 mt-1">
                        <kbd className="px-1 py-0.5 bg-gray-800 rounded text-[10px]">⌘</kbd>
                        <span className="mx-1">+</span>
                        <kbd className="px-1 py-0.5 bg-gray-800 rounded text-[10px]">S</kbd>
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white animate-bounce">
                  Unsaved
                </Badge>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop Overlay for Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed lg:relative inset-y-0 left-0 z-50 w-80 lg:w-96 bg-gradient-to-br from-purple-900/90 to-black/90 backdrop-blur-xl border-r border-white/10 overflow-y-auto"
            >
              <div className="p-4">
                {hasUnsavedChanges && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                        <p className="text-sm font-medium text-amber-300">Unsaved slide order changes</p>
                      </div>
                      <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/40">
                        {localSlides.filter(s => s.position !== slides.find(os => os.id === s.id)?.position).length} changed
                      </Badge>
                    </div>
                    <p className="text-xs text-amber-300/70 mt-1">Click "Save Slide Order" to persist changes</p>
                  </motion.div>
                )}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white">Content Structure</h2>
                  <Button 
                    size="sm" 
                    onClick={() => { setEditingWine(null); setIsWineModalOpen(true); }} 
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-900/25 hover:shadow-xl hover:shadow-purple-900/40 transition-all duration-200 hover:scale-105"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Wine
                  </Button>
                </div>
                {/* Package Introduction - Non-editable Overview */}
                {editorData && (
                  <PackageIntroCard 
                    packageName={editorData.name}
                    description={editorData.description || "Explore exceptional wines in this curated tasting experience"}
                    wineCount={wines.length}
                  />
                )}

                {/* Package Introduction Section */}
                {editorData && localSlides.some(s => (s.payloadJson as any)?.is_package_intro) && (
                  <Card className="mb-4 bg-gradient-to-br from-purple-600/20 to-purple-700/10 border-purple-500/30 backdrop-blur-sm shadow-xl shadow-purple-900/20">
                    <div className="p-5">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-purple-600/30 rounded-lg">
                          <PackageIcon className="h-4 w-4 text-purple-300" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Package Introduction</p>
                          <p className="text-xs text-white/60">{editorData.name}</p>
                        </div>
                      </div>
                      {localSlides
                        .filter(s => (s.payloadJson as any)?.is_package_intro)
                        .map(slide => (
                          <div 
                            key={slide.id}
                            onClick={() => setActiveSlideId(slide.id)}
                            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                              activeSlideId === slide.id 
                                ? 'bg-purple-600/30 border border-purple-500/50' 
                                : 'bg-white/5 hover:bg-white/10 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-white/90">
                                {(slide.payloadJson as any)?.title || 'Welcome to Your Tasting'}
                              </span>
                              <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-300">
                                Intro
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </Card>
                )}

                <div className="space-y-4">
                  {wines.map(wine => {
                    // Filter out package intro slides from wine slides
                    const wineSlides = localSlides.filter(s => 
                      s.packageWineId === wine.id && 
                      !(s.payloadJson as any)?.is_package_intro
                    );
                    const isExpanded = expandedWines.has(wine.id);
                    
                    // Check if this wine only has the package intro slide
                    const allSlidesForWine = localSlides.filter(s => s.packageWineId === wine.id);
                    const hasOnlyPackageIntro = allSlidesForWine.length === 1 && 
                      (allSlidesForWine[0].payloadJson as any)?.is_package_intro;
                    
                    // Don't show wines that only have the package intro
                    if (hasOnlyPackageIntro) {
                      return null;
                    }
                    
                    return (
                      <Card key={wine.id} className="bg-gradient-to-br from-white/8 to-white/4 border-white/20 backdrop-blur-sm shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
                        <div className="p-5">
                          <div className="flex items-center justify-between">
                            <Button variant="ghost" onClick={() => toggleWineExpansion(wine.id)} className="flex-1 justify-start text-left p-0 h-auto hover:bg-white/5 rounded-lg transition-colors">
                              <div className="flex items-center space-x-3">
                                <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                                  <ChevronDown className="h-4 w-4 text-white/70" />
                                </div>
                                <div className="p-2 bg-purple-600/20 rounded-lg">
                                  <Wine className="h-4 w-4 text-purple-300" />
                                </div>
                                <div>
                                  <p className="font-semibold text-white">{wine.wineName}</p>
                                  <p className="text-xs text-white/60 font-medium">{wineSlides.length} slides</p>
                                </div>
                              </div>
                            </Button>
                            <div className="flex space-x-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => { setEditingWine(wine); setIsWineModalOpen(true); }}
                                className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                                title="Edit wine"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => deleteWineMutation.mutate(wine.id)} 
                                className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                                title="Delete wine"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Copy Button Row - Separate line below wine header */}
                          {wineSlides.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/10 flex justify-end">
                              <SimpleCopyButton
                                sourceWine={{ ...wine, slideCount: wineSlides.length }}
                                availableWines={wines.filter(w => w.id !== wine.id).map(w => ({
                                  ...w,
                                  slideCount: localSlides.filter(s => s.packageWineId === w.id).length
                                }))}
                                onCopyComplete={async (targetWineId, count) => {
                                  // Force immediate refresh of editor data
                                  await queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
                                  
                                  // Refetch and update local state immediately
                                  try {
                                    const response = await fetch(`/api/packages/${code}/editor`);
                                    const freshData = await response.json();
                                    
                                    // Update all relevant state with fresh data
                                    setLocalSlides(freshData.slides || []);
                                    setSlides(freshData.slides || []);
                                    
                                    // Also update query cache
                                    queryClient.setQueryData([`/api/packages/${code}/editor`], freshData);
                                    
                                    toast({
                                      title: "Slides Copied Successfully", 
                                      description: `${count} non-intro slides copied to wine`,
                                    });
                                  } catch (error) {
                                    console.error('Error refreshing editor data:', error);
                                    toast({
                                      title: "Slides Copied",
                                      description: `${count} slides copied, please refresh page if not visible`,
                                      variant: "default"
                                    });
                                  }
                                }}
                              />
                            </div>
                          )}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pl-4 mt-2 border-l-2 border-white/10 ml-5 space-y-4 py-2">
                                {/* --- SECTION-BASED UI (POWER USER FLOW) --- */}
                                {Object.entries(sectionDetails).map(([key, { title, icon }]) => {
                                  const sectionSlides = wineSlides
                                    .filter(s => s.section_type === key)
                                    .sort((a, b) => {
                                      // Welcome slides always first in intro section
                                      if (key === 'intro') {
                                        const aIsWelcome = a.type === 'interlude' && 
                                          ((a.payloadJson as any)?.is_welcome || 
                                           (a.payloadJson as any)?.title?.toLowerCase().includes('welcome'));
                                        const bIsWelcome = b.type === 'interlude' && 
                                          ((b.payloadJson as any)?.is_welcome || 
                                           (b.payloadJson as any)?.title?.toLowerCase().includes('welcome'));
                                        if (aIsWelcome && !bIsWelcome) return -1;
                                        if (!aIsWelcome && bIsWelcome) return 1;
                                      }
                                      return a.position - b.position;
                                    });
                                  return (
                                    <div key={key}>
                                      <div className="mb-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <h4 className="text-sm font-semibold text-white/90 flex items-center">
                                            {icon}<span className="ml-2">{title}</span>
                                          </h4>
                                        </div>
                                        
                                        {/* Modern Create Question Button */}
                                        <Button 
                                          onClick={() => handleQuickAddQuestion(wine.id, key as any)}
                                          className="w-full h-8 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-xs font-medium shadow-lg shadow-purple-900/25 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-900/40"
                                        >
                                          <Sparkles className="w-3.5 h-3.5 mr-2" />
                                          Create a Question
                                        </Button>
                                      </div>
                                      <div className="pl-3 space-y-1.5">
                                        {sectionSlides.length > 0 ? (
                                          sectionSlides.map(slide => {
                                            const isWelcomeSlide = slide.type === 'interlude' && 
                                              ((slide.payloadJson as any)?.is_welcome || 
                                               (slide.payloadJson as any)?.title?.toLowerCase().includes('welcome'));
                                            
                                            const slideIndex = sectionSlides.findIndex(s => s.id === slide.id);
                                            const canMoveUp = slideIndex > 0;
                                            const canMoveDown = slideIndex < sectionSlides.length - 1;
                                            
                                            return (
                                              <div 
                                                key={slide.id} 
                                                className={`group relative rounded-lg transition-all duration-200 border ${
                                                  activeSlideId === slide.id 
                                                    ? 'bg-gradient-to-r from-purple-600/40 to-purple-700/30 border-purple-500/50 shadow-lg shadow-purple-900/25' 
                                                    : isWelcomeSlide
                                                    ? 'bg-gradient-to-r from-amber-900/20 to-amber-800/10 border-amber-500/20 hover:border-amber-500/40'
                                                    : hasUnsavedChanges
                                                    ? 'border-amber-500/30 bg-amber-500/5'
                                                    : 'border-transparent hover:bg-white/8 hover:border-white/10 hover:shadow-md'
                                                }`}
                                              >
                                                <div 
                                                  className="p-2.5 cursor-pointer flex items-center"
                                                  onClick={() => setActiveSlideId(slide.id)}
                                                >
                                                  <GripVertical className="w-3.5 h-3.5 text-white/30 mr-2 flex-shrink-0" />
                                                  <div className={`w-1.5 h-1.5 rounded-full mr-2.5 transition-colors ${
                                                    activeSlideId === slide.id 
                                                      ? 'bg-purple-300' 
                                                      : isWelcomeSlide 
                                                      ? 'bg-amber-400' 
                                                      : 'bg-white/40 group-hover:bg-white/60'
                                                  }`} />
                                                  <div className="flex items-center flex-1 min-w-0">
                                                    {isWelcomeSlide && (
                                                      <>
                                                        <Sparkles className="w-3 h-3 mr-1.5 text-amber-400 flex-shrink-0" />
                                                        <Badge className="mr-2 px-1.5 py-0 text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40">
                                                          Welcome
                                                        </Badge>
                                                      </>
                                                    )}
                                                    <p className="text-sm font-medium text-white truncate">
                                                      {(slide.payloadJson as any)?.title || 'Untitled Slide'}
                                                    </p>
                                                  </div>
                                                  
                                                  {/* Reorder buttons */}
                                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSlideReorder(slide.id, 'up');
                                                      }}
                                                      disabled={!canMoveUp}
                                                      className="h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
                                                      title="Move up"
                                                    >
                                                      <ArrowUp className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSlideReorder(slide.id, 'down');
                                                      }}
                                                      disabled={!canMoveDown}
                                                      className="h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
                                                      title="Move down"
                                                    >
                                                      <ArrowDown className="w-3 h-3" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })
                                        ) : (
                                          <div className="px-3 py-2 text-xs text-white/50 italic bg-white/5 rounded-lg border border-dashed border-white/20">
                                            No slides in this section
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* --- MODERN TEMPLATE DROPDOWN --- */}
                                <div className="mt-6 pt-4 border-t border-white/10">
                                  <h4 className="text-sm font-semibold text-white/90 mb-3">Add from Template Library</h4>
                                  <Select onValueChange={(templateName) => {
                                    const template = SLIDE_TEMPLATES.find(t => t.name === templateName);
                                    if (template) handleAddSlide(wine.id, template);
                                  }}>
                                    <SelectTrigger className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 transition-colors">
                                      <SelectValue placeholder="Choose a template..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900/95 border-gray-700 backdrop-blur-xl">
                                      {SLIDE_TEMPLATES.map(template => (
                                        <SelectItem 
                                          key={template.name} 
                                          value={template.name}
                                          className="text-white hover:bg-purple-600/20 focus:bg-purple-600/20 cursor-pointer"
                                        >
                                          <div className="flex items-center">
                                            {template.icon && <template.icon className="mr-2 h-4 w-4 text-purple-400" />}
                                            <span>{template.name}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeSlide ? (() => {
            const currentWine = wines.find(w => w.id === activeSlide.packageWineId);
            const wineSlides = localSlides.filter(s => s.packageWineId === activeSlide.packageWineId);
            const slideNumber = wineSlides.findIndex(s => s.id === activeSlide.id) + 1;
            const totalSlidesInWine = wineSlides.length;
            
            return (
              <motion.div key={activeSlide.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Enhanced Breadcrumb Navigation */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 text-white/60 text-sm mb-3">
                    <span className="text-white/80 font-medium">{editorData.name}</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-white/80 font-medium">{currentWine?.wineName}</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-white/80 font-medium">
                      {sectionDetails[activeSlide.section_type as keyof typeof sectionDetails]?.icon || sectionDetails.deep_dive.icon} {sectionDetails[activeSlide.section_type as keyof typeof sectionDetails]?.title || sectionDetails.deep_dive.title}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-purple-300 font-medium">Slide {slideNumber} of {totalSlidesInWine}</span>
                  </div>
                  
                  {/* Slide Title and Type */}
                  <div className="bg-gradient-to-r from-purple-900/30 to-transparent rounded-lg p-4 border border-purple-500/20">
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {(activeSlide.payloadJson as any)?.title || 'Untitled Slide'}
                    </h2>
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-purple-600/20 text-purple-300">
                        {activeSlide.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                      <span className="text-white/50 text-sm">
                        Position: {activeSlide.position}
                      </span>
                    </div>
                  </div>
                </div>
                
                <SlideConfigPanel
                  slide={activeSlide}
                  onUpdate={handleSlideUpdate}
                  onDelete={handleSlideDelete}
                />
              </motion.div>
            );
          })() : (
            <div className="flex items-center justify-center h-full"><div className="text-center"><Settings className="h-12 w-12 text-white/40 mx-auto mb-4" /><h3 className="text-lg font-medium text-white mb-2">Select a Wine or Slide</h3><p className="text-white/60">Choose an item from the sidebar to begin editing.</p></div></div>
          )}
        </div>
      </div>

      {isWineModalOpen && (
        <WineModal
          mode={editingWine ? 'edit' : 'create'}
          wine={editingWine}
          packageId={editorData.id}
          onClose={() => { setIsWineModalOpen(false); setEditingWine(null); }}
          onSave={handleWineSave}
        />
      )}

      <QuickQuestionBuilder
        open={quickBuilderOpen}
        onClose={() => {
          setQuickBuilderOpen(false);
          setCurrentWineContext(null);
        }}
        onSave={handleQuestionSave}
        wineContext={currentWineContext ? {
          wineName: currentWineContext.wineName,
          wineType: currentWineContext.wineType
        } : undefined}
        sectionType={currentWineContext?.sectionType}
      />
    </div>
  );
}