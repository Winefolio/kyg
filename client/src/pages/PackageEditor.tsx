// client/pages/PackageEditor.tsx

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  ArrowUp, ArrowDown, Package as PackageIcon, ChevronLeft, ChevronUp, ChevronDown as ChevronDownIcon
} from 'lucide-react';
import type { Package, PackageWine, Slide, GenericQuestion } from "@shared/schema";
import { WineModal } from '@/components/WineModal';
import { SlidePreview } from '@/components/SlidePreview';
import { SlideConfigPanel } from '@/components/editor/SlideConfigPanel';
import { SlidePreviewPanel } from '@/components/editor/SlidePreviewPanel';
import { QuickQuestionBuilder } from '@/components/editor/QuickQuestionBuilder';
import { SimpleCopyButton } from '@/components/editor/SimpleCopyButton';
import { PackageIntroCard } from '@/components/editor/PackageIntroCard';
import { DraggableSlideList } from '@/components/editor/DraggableSlideList';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Section details for organizing slides
const sectionDetails = {
  intro: { title: 'Intro', icon: '🎬' },
  deep_dive: { title: 'Deep Dive', icon: '🤔' },
  ending: { title: 'Ending', icon: '🏁' },
};

type EditorData = Package & { wines: PackageWine[]; slides: Slide[] };

// Debounce helper hook
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
  const [currentWineContext, setCurrentWineContext] = useState<{
    wineId: string;
    wineName: string;
    wineType: string;
    sectionType: 'intro' | 'deep_dive' | 'ending';
  } | null>(null);
  const [pendingContentChanges, setPendingContentChanges] = useState<Set<string>>(new Set());
  const [pendingReorders, setPendingReorders] = useState<Map<string, any>>(new Map());
  const [activelyMovingSlide, setActivelyMovingSlide] = useState<string | null>(null);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [livePreviewData, setLivePreviewData] = useState<Map<string, any>>(new Map());
  const [buttonStates, setButtonStates] = useState<Map<string, 'idle' | 'blocked' | 'processing'>>(new Map());
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(() => {
    // Initialize based on screen size if available
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024; // Start collapsed on mobile
    }
    return false;
  });
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const originalSlidesRef = useRef<Slide[]>([]);

  const { data: editorData, isLoading, error } = useQuery<EditorData>({
    queryKey: [`/api/packages/${code}/editor`],
    enabled: !!code,
  });

  const { data: slideTemplates = [] } = useQuery<any[]>({
    queryKey: ['/api/slide-templates'],
  });

  useEffect(() => {
    // Sync from server data when it changes
    if (editorData) {
      const sortedWines = [...(editorData.wines || [])].sort((a, b) => a.position - b.position);
      let sortedSlides = [...(editorData.slides || [])].sort((a, b) => a.position - b.position);
      
      // Convert legacy positions to gap-based positions
      const needsPositionMigration = sortedSlides.some(s => s.position < 100000);
      if (needsPositionMigration) {
        console.log('🔄 Migrating legacy slide positions to gap-based system');
        const slidesByWine = new Map<string, typeof sortedSlides>();
        
        // Group slides by wine
        sortedSlides.forEach(slide => {
          const wineId = slide.packageWineId!;
          if (!slidesByWine.has(wineId)) {
            slidesByWine.set(wineId, []);
          }
          slidesByWine.get(wineId)!.push(slide);
        });
        
        // Assign new gap-based positions
        const updatedSlides: typeof sortedSlides = [];
        slidesByWine.forEach((wineSlides, wineId) => {
          const sortedWineSlides = wineSlides.sort((a, b) => a.position - b.position);
          sortedWineSlides.forEach((slide, index) => {
            updatedSlides.push({
              ...slide,
              position: 100000 + (index * 1000)
            });
          });
        });
        
        sortedSlides = updatedSlides.sort((a, b) => a.position - b.position);
      }

      setWines(sortedWines);
      setSlides(sortedSlides);
      
      // Only update localSlides if we don't have pending content changes
      if (pendingContentChanges.size === 0) {
        setLocalSlides(sortedSlides);
        originalSlidesRef.current = sortedSlides;
      }

      // Clean up live preview data for slides that no longer exist
      setLivePreviewData(prev => {
        const newMap = new Map();
        const existingSlideIds = new Set(sortedSlides.map(s => s.id));
        prev.forEach((data, slideId) => {
          if (existingSlideIds.has(slideId)) {
            newMap.set(slideId, data);
          }
        });
        return newMap;
      });

      // Only set initial expansion and active slide if none are set
      if (expandedWines.size === 0 && sortedWines.length > 0) {
        const firstWineId = sortedWines[0].id;
        setExpandedWines(new Set([firstWineId]));
        const firstWineSlides = sortedSlides.filter(s => s.packageWineId === firstWineId);
        if (firstWineSlides.length > 0 && !activeSlideId) {
          setActiveSlideId(firstWineSlides[0].id);
        }
      }
    }
  }, [editorData]);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 1024;
      const wasMobile = isMobileView;
      
      setIsMobileView(isMobile);
      
      // Only auto-collapse when switching FROM desktop TO mobile
      // (but don't interfere if user manually toggled on mobile)
      if (!wasMobile && isMobile) {
        setIsPreviewCollapsed(true);
      }
      // When switching from mobile to desktop, expand preview
      else if (wasMobile && !isMobile) {
        setIsPreviewCollapsed(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobileView]); // Only depend on isMobileView, not isPreviewCollapsed

  const activeSlide = localSlides.find(s => s.id === activeSlideId);

  // Navigation functions for preview
  const navigateToSlide = (direction: 'prev' | 'next') => {
    if (!activeSlide) return;

    const currentWineSlides = localSlides
      .filter(s => s.packageWineId === activeSlide.packageWineId)
      .sort((a, b) => a.position - b.position);
    
    const currentIndex = currentWineSlides.findIndex(s => s.id === activeSlideId);
    
    if (direction === 'prev' && currentIndex > 0) {
      setActiveSlideId(currentWineSlides[currentIndex - 1].id);
    } else if (direction === 'next' && currentIndex < currentWineSlides.length - 1) {
      setActiveSlideId(currentWineSlides[currentIndex + 1].id);
    }
  };

  // --- MUTATIONS ---
  const createWineMutation = useMutation({
    mutationFn: async (wineData: any) => {
      const response = await apiRequest('POST', `/api/wines`, wineData);
      const result = await response.json();
      return result.wine;
    },
    onSuccess: async (newWine: PackageWine) => {
      // Wine introduction slide is now automatically created in the backend
      toast({ 
        title: "🍷 Wine created successfully", 
        description: `${newWine.wineName} is ready for content`
      });
      
      // Auto-expand the newly created wine to show its sections
      setExpandedWines(prev => {
        const newSet = new Set(prev);
        newSet.add(newWine.id);
        return newSet;
      });
      
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
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
      toast({ title: "Slide created successfully" });
    },
    onError: (error: any) => {
      // Extract better error messages from the API response
      const errorData = error?.response?.data;
      const title = errorData?.error || "Error creating slide";
      const description = errorData?.message || error.message || "Please try again";
      
      toast({ 
        title, 
        description, 
        variant: "destructive" 
      });
    },
  });

  const updateSlideMutation = useMutation({
    mutationFn: ({ slideId, data }: { slideId: string; data: any }) => {
      console.log('🌐 PackageEditor: Making API request PATCH /api/slides/' + slideId, {
        slideId,
        requestData: data,
        url: `/api/slides/${slideId}`,
        timestamp: new Date().toISOString()
      });
      return apiRequest('PATCH', `/api/slides/${slideId}`, data);
    },
    onSuccess: (response, variables) => {
      console.log('✅ PackageEditor: updateSlideMutation onSuccess (global handler)', {
        slideId: variables.slideId,
        response,
        timestamp: new Date().toISOString()
      });
      // Remove from pending content changes on successful save
      setPendingContentChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.slideId);
        return newSet;
      });
      // Don't refetch all data - use optimistic updates instead
      // Only show success toast after actual save, not on every keystroke
      console.log('✅ Slide content saved:', variables.slideId);
    },
    onError: (error: any, variables) => {
      console.error('❌ PackageEditor: updateSlideMutation onError (global handler)', {
        slideId: variables.slideId,
        error,
        errorMessage: error?.message,
        timestamp: new Date().toISOString()
      });
      toast({ title: "Error updating slide", description: error.message, variant: "destructive" });
    },
  });

  const deleteSlideMutation = useMutation({
    mutationFn: (slideId: string) => apiRequest('DELETE', `/api/slides/${slideId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
      toast({ title: "Slide deleted successfully" });
      setActiveSlideId(null); // Clear selection when slide is deleted
    },
    onError: (error: any) => toast({ title: "Error deleting slide", description: error.message, variant: "destructive" }),
  });

  // New mutation for single slide position update using fractional indexing
  const updateSlidePositionMutation = useMutation({
    mutationFn: ({ slideId, newPosition }: { slideId: string; newPosition: number }) => 
      apiRequest('PUT', `/api/slides/${slideId}/position`, { newPosition }),
    onSuccess: () => {
      // Show subtle success confirmation
      toast({ 
        title: "Saved", 
        description: "Slide order updated successfully",
        duration: 2000,
      });
      // Clear pending state after successful save
      setPendingContentChanges(new Set());
      setActivelyMovingSlide(null);
      setHasUnsavedChanges(false);
      setIsSavingOrder(false);
      
      // No need for synchronous refetch - optimistic updates already applied
      console.log('✅ Slide position update completed');
    },
    onError: (error: any) => {
      console.error('❌ Slide reorder mutation failed:', error);
      
      // Parse error response for better user feedback
      let errorMessage = "Please try again";
      let errorTitle = "Error updating slide order";
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (errorData.error === "DUPLICATE_POSITION") {
          errorTitle = "Position Conflict";
          errorMessage = "Multiple slides cannot have the same position. Refreshing data...";
        } else if (errorData.error === "VALIDATION_ERROR") {
          errorTitle = "Invalid Data";
          errorMessage = errorData.details || "Invalid slide data format";
        } else if (errorData.error === "DATABASE_CONNECTION_ERROR") {
          errorTitle = "Connection Issue";
          errorMessage = "Database temporarily unavailable. Please try again.";
        } else if (errorData.guidance) {
          errorMessage = errorData.guidance;
        }
      }
      
      toast({ 
        title: errorTitle,
        description: errorMessage,
        variant: "destructive" 
      });
      setIsSavingOrder(false);
      
      // Rollback optimistic updates immediately
      console.log('↩️ Rolling back optimistic updates due to error');
      setLocalSlides(originalSlidesRef.current);
      
      // Reset state without refetch
      setActivelyMovingSlide(null);
      setHasUnsavedChanges(false);
    },
  });

  // Smart swap mutation for adjacent slide swapping
  const smartSwapMutation = useMutation({
    mutationFn: ({ slideId1, slideId2 }: { slideId1: string; slideId2: string }) => 
      apiRequest('POST', '/api/slides/smart-swap', { slideId1, slideId2 }),
    onSuccess: () => {
      console.log('✅ Smart swap completed successfully');
      setHasUnsavedChanges(false);
      setActivelyMovingSlide(null);
      toast({
        title: "Slide moved",
        description: "Position updated successfully",
        duration: 2000,
      });
      // Refresh data to ensure consistency
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
    },
    onError: (error) => {
      console.error('❌ Failed to swap slide positions:', error);
      // Revert the optimistic update
      setLocalSlides(originalSlidesRef.current);
      setActivelyMovingSlide(null);
      toast({
        title: "Failed to move slide",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  // Batch update mutation for drag-and-drop
  const batchUpdateMutation = useMutation({
    mutationFn: (updates: Array<{ slideId: string; position: number }>) =>
      apiRequest('POST', '/api/slides/batch-update-positions', { updates }),
    onSuccess: () => {
      console.log('✅ Batch position update completed successfully');
      setHasUnsavedChanges(false);
      toast({
        title: "Slides reordered",
        description: "Order updated successfully",
        duration: 2000,
      });
      // Refresh data to ensure consistency
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
    },
    onError: (error) => {
      console.error('❌ Failed to batch update positions:', error);
      // Revert the optimistic update
      setLocalSlides(originalSlidesRef.current);
      toast({
        title: "Failed to reorder slides",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  // Enhanced validation function for slide updates
  const validateSlideUpdates = (updates: Array<{ slideId: string; position: number; packageWineId: string }>) => {
    const errors: string[] = [];
    
    // Check for required fields
    updates.forEach((update, index) => {
      if (!update.slideId) errors.push(`Update ${index + 1}: Missing slideId`);
      if (typeof update.position !== 'number' || update.position < 0) errors.push(`Update ${index + 1}: Invalid position`);
      if (!update.packageWineId) errors.push(`Update ${index + 1}: Missing packageWineId`);
    });
    
    // Check for duplicate positions within same wine
    const positionsByWine = new Map<string, Set<number>>();
    updates.forEach((update, index) => {
      if (!positionsByWine.has(update.packageWineId)) {
        positionsByWine.set(update.packageWineId, new Set());
      }
      const winePositions = positionsByWine.get(update.packageWineId)!;
      if (winePositions.has(update.position)) {
        errors.push(`Update ${index + 1}: Duplicate position ${update.position} for wine ${update.packageWineId}`);
      }
      winePositions.add(update.position);
    });
    
    // Check for valid slide IDs
    const validSlideIds = new Set(localSlides.map(s => s.id));
    updates.forEach((update, index) => {
      if (!validSlideIds.has(update.slideId)) {
        errors.push(`Update ${index + 1}: Invalid slideId ${update.slideId}`);
      }
    });
    
    // Enhanced conflict detection with state sync awareness
    const slidesBeingUpdated = new Set(updates.map(u => u.slideId));
    updates.forEach((update, index) => {
      // Check for conflicts with existing positions, but only for slides NOT being updated
      const existingSlideWithPosition = localSlides.find(s => 
        s.position === update.position && 
        s.id !== update.slideId &&
        !slidesBeingUpdated.has(s.id) // Ignore slides that are also being moved
      );
      
      // Only warn about potential conflicts, don't block the operation
      // The server will handle the final validation with fresh data
      if (existingSlideWithPosition) {
        console.warn(`⚠️ Position ${update.position} may conflict with slide ${existingSlideWithPosition.id} - server will validate with fresh data`);
      }
      
      // Legacy positions are now handled by automatic migration, so we don't need to error on them
      // The backend will handle the actual position assignments
    });
    
    return errors;
  };

  // Force refresh function for when state gets out of sync
  const forceDataRefresh = useCallback(async () => {
    console.log('🔄 Force refreshing package data...');
    setPendingContentChanges(new Set());
    setActivelyMovingSlide(null);
    setHasUnsavedChanges(false);
    
    // Force refetch and update local state
    await queryClient.refetchQueries({ 
      queryKey: [`/api/packages/${code}/editor`],
      exact: true 
    });
    
    const freshData = queryClient.getQueryData([`/api/packages/${code}/editor`]) as any;
    if (freshData?.slides) {
      const sortedSlides = freshData.slides.sort((a: any, b: any) => a.position - b.position);
      setLocalSlides(sortedSlides);
      originalSlidesRef.current = sortedSlides;
    }
    
    toast({
      title: "Data Refreshed",
      description: "Package data has been refreshed from the server",
      variant: "default"
    });
  }, [code, queryClient, toast]);


  // --- HELPER FUNCTIONS ---
  const getNextPositionForWine = (wineId: string): number => {
    const wineSlides = localSlides.filter(s => s.packageWineId === wineId);
    
    // Use gap-based positioning system consistent with backend
    const GAP_SIZE = 1000;
    const BASE_POSITION = 100000;
    
    if (wineSlides.length === 0) {
      // Start at base position for new wines
      return BASE_POSITION;
    }
    
    // Find the highest position for this wine and add gap
    const maxWinePosition = Math.max(...wineSlides.map(s => s.position));
    
    // Calculate next position with consistent gap
    const nextPosition = Math.ceil(maxWinePosition / GAP_SIZE) * GAP_SIZE + GAP_SIZE;
    
    // Ensure minimum position
    return Math.max(nextPosition, BASE_POSITION);
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

  // Type-safe helper functions for wine expansion
  const expandWine = (wineId: string) => {
    setExpandedWines(prev => new Set(prev).add(wineId));
  };

  const collapseWine = (wineId: string) => {
    setExpandedWines(prev => {
      const newSet = new Set(prev);
      newSet.delete(wineId);
      return newSet;
    });
  };

  const expandAllWines = () => {
    setExpandedWines(new Set(wines.map(w => w.id)));
  };

  const collapseAllWines = () => {
    setExpandedWines(new Set());
  };

  const handleAddSlide = (wineId: string, template: any, sectionType?: 'intro' | 'deep_dive' | 'ending') => {
    const targetSection = sectionType || template.sectionType || 'deep_dive';
    const nextPosition = getNextPositionForWine(wineId);
    const wine = wines.find(w => w.id === wineId);

    // Clone the payload template and replace placeholders
    let payloadJson = {
      ...template.payloadTemplate,
      title: template.payloadTemplate?.title || template.payloadTemplate?.question || template.name,
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
    console.log('🚀 PackageEditor: handleSlideUpdate called', {
      slideId,
      data,
      dataKeys: Object.keys(data),
      timestamp: new Date().toISOString()
    });
    
    // Apply optimistic update to local state immediately
    setLocalSlides(prev => prev.map(slide => 
      slide.id === slideId ? { ...slide, ...data } : slide
    ));
    
    // Track content changes
    setPendingContentChanges(prev => {
      const newSet = new Set(prev);
      newSet.add(slideId);
      return newSet;
    });
    setHasUnsavedChanges(true);
    
    console.log('📡 PackageEditor: Triggering updateSlideMutation', {
      slideId,
      mutationData: { slideId, data }
    });
    
    // Update with success/error handling
    updateSlideMutation.mutate(
      { slideId, data },
      {
        onSuccess: (response) => {
          console.log('✅ PackageEditor: updateSlideMutation success', {
            slideId,
            response,
            timestamp: new Date().toISOString()
          });
          // The mutation's onSuccess will handle clearing pending changes
          // Just update the unsaved changes flag here
          setPendingContentChanges(prev => {
            if (pendingReorders.size === 0 && prev.size <= 1) {
              setHasUnsavedChanges(false);
            }
            return prev;
          });
        },
        onError: (error) => {
          console.error('❌ PackageEditor: updateSlideMutation error', {
            slideId,
            error,
            errorMessage: error?.message,
            timestamp: new Date().toISOString()
          });
          // Revert optimistic update on error
          setLocalSlides(prev => prev.map(slide => 
            slide.id === slideId ? slides.find(s => s.id === slideId) || slide : slide
          ));
          
          // Keep in pending changes on error
          toast({
            title: "Failed to save slide changes",
            description: "Please try again",
            variant: "destructive"
          });
        }
      }
    );
  };

  const handlePreviewUpdate = useCallback((slideId: string, livePayload: any) => {
    setLivePreviewData(prev => {
      const newMap = new Map(prev);
      newMap.set(slideId, livePayload);
      return newMap;
    });
  }, []);

  // Handler for wine updates from SlideConfigPanel
  const handleWineUpdate = useCallback((wineId: string, updates: any) => {
    // Call the wine update mutation with proper field mapping
    updateWineMutation.mutate(
      { 
        wineId, 
        data: {
          wineName: updates.wineName,
          wineDescription: updates.wineDescription,
          wineType: updates.wineType,
          wineImageUrl: updates.wineImageUrl
        }
      },
      {
        onSuccess: () => {
          toast({
            title: "Wine updated",
            description: "Wine description saved successfully",
            duration: 2000,
          });
        },
        onError: (error) => {
          toast({
            title: "Failed to update wine",
            description: "Please try again",
            variant: "destructive"
          });
        }
      }
    );
  }, [updateWineMutation, toast]);

  const getSlideWithLivePreview = useCallback((slide: Slide): Slide => {
    const livePayload = livePreviewData.get(slide.id);
    if (livePayload) {
      return {
        ...slide,
        payloadJson: livePayload
      };
    }
    return slide;
  }, [livePreviewData]);

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
    
    // Clean up live preview data for the deleted slide
    setLivePreviewData(prev => {
      const newMap = new Map(prev);
      newMap.delete(slideId);
      return newMap;
    });
    
    deleteSlideMutation.mutate(slideId);
  };

  const handleSlideReorder = (slideId: string, direction: 'up' | 'down') => {
    const slide = localSlides.find(s => s.id === slideId);
    if (!slide) return;
    
    // Prevent operations while queue is processing
    if (isProcessingQueue) {
      toast({
        title: "Operation in Progress",
        description: "Please wait for the current operation to complete",
        variant: "default"
      });
      return;
    }
    
    // Mark this slide as actively being moved
    console.log(`🔄 Setting active moving slide: ${slideId} (${slide.type} in ${slide.section_type} section, moving ${direction})`);
    setActivelyMovingSlide(slideId);
    
    // Check if this is a welcome slide in intro section
    const isWelcomeSlide = slide.type === 'interlude' && 
      slide.section_type === 'intro' &&
      ((slide.payloadJson as any)?.is_welcome || 
       (slide.payloadJson as any)?.title?.toLowerCase().includes('welcome'));
    
    // Prevent moving welcome slide down from position 1
    if (isWelcomeSlide && direction === 'down' && slide.position === 1) {
      console.log(`🚫 Blocking welcome slide movement: ${slideId} - welcome slide cannot move down from position 1`);
      
      // Show visual feedback for blocked action
      const buttonKey = `${slideId}-${direction}`;
      setButtonStates(prev => new Map(prev).set(buttonKey, 'blocked'));
      
      // Show toast feedback
      toast({ 
        title: "Cannot move welcome slide", 
        description: "Welcome slides must remain at the beginning of the intro section",
        variant: "destructive" 
      });
      
      // Clear blocked state after 1.5 seconds
      setTimeout(() => {
        setButtonStates(prev => {
          const newMap = new Map(prev);
          newMap.delete(buttonKey);
          return newMap;
        });
        setActivelyMovingSlide(null);
      }, 1500);
      
      return;
    }
    
    // Get slides in the same wine AND section, sorted by position
    const sectionSlides = localSlides
      .filter(s => s.packageWineId === slide.packageWineId && s.section_type === slide.section_type)
      .sort((a, b) => a.position - b.position);
    
    const sectionIndex = sectionSlides.findIndex(s => s.id === slideId);
    
    // Check if movement is blocked by section boundaries
    const isFirstInSection = sectionIndex === 0;
    const isLastInSection = sectionIndex === sectionSlides.length - 1;
    const isMovingUpFromFirst = direction === 'up' && isFirstInSection;
    const isMovingDownFromLast = direction === 'down' && isLastInSection;
    
    if (isMovingUpFromFirst || isMovingDownFromLast) {
      // Provide helpful feedback to user about why the move isn't allowed
      const sectionName = slide.section_type === 'intro' ? 'Introduction' : 
                         slide.section_type === 'deep_dive' ? 'Deep Dive' : 'Ending';
      const moveDirection = direction === 'up' ? 'up' : 'down';
      const boundary = direction === 'up' ? 'beginning' : 'end';
      
      console.log(`🚫 Blocking section boundary movement: ${slideId} - ${slide.type} slide cannot move ${moveDirection}, already at ${boundary} of ${sectionName} section`);
      
      // Show visual feedback for blocked action
      const buttonKey = `${slideId}-${direction}`;
      setButtonStates(prev => new Map(prev).set(buttonKey, 'blocked'));
      
      // Show toast feedback
      toast({
        title: "Movement Limited",
        description: `Cannot move ${moveDirection} - slide is at the ${boundary} of the ${sectionName} section`,
        variant: "default"
      });
      
      // Clear blocked state after 1.5 seconds
      setTimeout(() => {
        setButtonStates(prev => {
          const newMap = new Map(prev);
          newMap.delete(buttonKey);
          return newMap;
        });
        setActivelyMovingSlide(null);
      }, 1500);
      
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
    
    // SIMPLIFIED: Use simple position swapping instead of fractional indexing
    // Find the target slide to swap with (adjacent slide in the same section)
    const currentSlidePosition = slide.position;
    const targetSlidePosition = targetSlide.position;
    
    console.log(`🔄 Simple swap: ${slideId} (pos ${currentSlidePosition}) ↔ ${targetSlide.id} (pos ${targetSlidePosition})`);
    
    // Update local state immediately for instant UI feedback
    const updatedSlides = localSlides.map(s => {
      if (s.id === slideId) {
        return { ...s, position: targetSlidePosition };
      } else if (s.id === targetSlide.id) {
        return { ...s, position: currentSlidePosition };
      }
      return s;
    });
    setLocalSlides(updatedSlides);
    setHasUnsavedChanges(true);
    
    // Clear the actively moving slide after animation
    setTimeout(() => {
      setActivelyMovingSlide(null);
    }, 300);
    
    // Execute the smart swap to properly exchange positions
    smartSwapMutation.mutate({ slideId1: slideId, slideId2: targetSlide.id });
  };

  // Handle drag-and-drop reordering with comprehensive section and position management
  const handleDragReorder = (reorderedSlides: Slide[], wineId: string, sectionType?: string) => {
    if (reorderedSlides.length === 0) return;
    
    // Get all slides for this wine, regardless of section
    const wineSlides = localSlides.filter(s => s.packageWineId === wineId).sort((a, b) => a.position - b.position);
    
    // Check if the order actually changed
    const orderChanged = reorderedSlides.some((slide, index) => {
      const originalSlides = sectionType 
        ? wineSlides.filter(s => s.section_type === sectionType)
        : wineSlides;
      const originalIndex = originalSlides.findIndex(s => s.id === slide.id);
      return originalIndex !== index;
    });
    
    if (!orderChanged) {
      console.log('No slide order changed');
      return;
    }
    
    // Create updates with proper position calculations
    const updates: Array<{ slideId: string; position: number; section_type?: string }> = [];
    const baseTime = Date.now();
    
    reorderedSlides.forEach((slide, index) => {
      // Calculate section-specific position ranges
      let positionBase = 0;
      if (sectionType === 'intro') positionBase = 100000;
      else if (sectionType === 'deep_dive') positionBase = 200000;
      else if (sectionType === 'ending') positionBase = 300000;
      
      // Create unique positions within the section
      const newPosition = positionBase + (index + 1) * 1000 + (baseTime % 1000);
      
      const updateData: any = { slideId: slide.id, position: newPosition };
      
      // If we're moving to a different section, update the section_type
      if (sectionType && slide.section_type !== sectionType) {
        updateData.section_type = sectionType;
      }
      
      if (slide.position !== newPosition || (sectionType && slide.section_type !== sectionType)) {
        updates.push(updateData);
      }
    });
    
    if (updates.length === 0) {
      console.log('No position changes needed');
      return;
    }
    
    console.log(`🔄 Batch updating ${updates.length} slide positions in wine ${wineId}${sectionType ? ` (section: ${sectionType})` : ''}`);
    console.log('Updates:', updates.map(u => `${u.slideId.slice(-6)}: ${u.position}${u.section_type ? ` -> ${u.section_type}` : ''}`));
    
    // Update local state immediately for all affected slides
    const updatedSlides = localSlides.map(s => {
      const update = updates.find(u => u.slideId === s.id);
      if (update) {
        return { 
          ...s, 
          position: update.position,
          ...(update.section_type && { section_type: update.section_type })
        };
      }
      return s;
    });
    setLocalSlides(updatedSlides);
    setHasUnsavedChanges(true);
    
    // Execute batch update
    batchUpdateMutation.mutate(updates);
  };

  // Since we're now doing real-time saves, this function is simplified
  const handleSaveSlideOrder = useCallback(async () => {
    // No longer needed for slide reordering as updates are saved immediately
    toast({ 
      title: "Already saved", 
      description: "Changes are saved automatically",
      duration: 2000 
    });
  }, [toast]);

  // Development invariant checks
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (!(expandedWines instanceof Set)) {
        console.error('⚠️ State corruption detected: expandedWines is not a Set!', {
          type: typeof expandedWines,
          value: expandedWines,
          isArray: Array.isArray(expandedWines)
        });
      }
    }
  }, [expandedWines]);

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

  // Warn before leaving with unsaved content changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingContentChanges.size > 0) {
        // Standard way to trigger the browser's confirmation dialog
        e.preventDefault();
        e.returnValue = 'You have unsaved content changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingContentChanges]);

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

    // Define position ranges for each section to prevent conflicts
    // Updated intro range to start at 100 to avoid conflicts with reserved positions
    const SECTION_RANGES = {
      'intro': { min: 100, max: 10000 },      // Changed from 0 to 100
      'deep_dive': { min: 10000, max: 20000 },
      'ending': { min: 30000, max: 40000 }
    };

    const sectionRange = SECTION_RANGES[currentWineContext.sectionType] || SECTION_RANGES.intro;
    
    // Get all slides for this wine
    const wineSlides = localSlides.filter(s => 
      s.packageWineId === currentWineContext.wineId
    );
    
    // Get all used positions for this wine
    const usedPositions = new Set(wineSlides.map(s => s.position));
    
    // Get slides in the current section
    const sectionSlides = wineSlides.filter(s => s.section_type === currentWineContext.sectionType);
    
    // Get wine position for special handling
    const wine = wines.find(w => w.id === currentWineContext.wineId);
    const winePosition = wine?.position || 1;
    
    let nextPosition;
    
    if (sectionSlides.length === 0) {
      // No slides in this section - start at the beginning of the range
      // Special handling for Wine 1 intro to align with backend expectations
      if (winePosition === 1 && currentWineContext.sectionType === 'intro') {
        // For Wine 1 intro, use a position that aligns with backend calculation
        // Backend calculates: wineBasePosition (1000) + sectionOffset (50) = 1050
        nextPosition = 1050;
      } else {
        nextPosition = sectionRange.min + 10; // Start at min + 10 to leave room
      }
    } else {
      // Find the highest position in this section
      const sectionPositions = sectionSlides
        .map(s => s.position)
        .filter(p => p >= sectionRange.min && p < sectionRange.max);
      
      if (sectionPositions.length === 0) {
        // All section slides are outside the range (legacy positions) - start fresh
        // Special handling for Wine 1 intro
        if (winePosition === 1 && currentWineContext.sectionType === 'intro') {
          nextPosition = 1050;
        } else {
          nextPosition = sectionRange.min + 10;
        }
      } else {
        const maxSectionPosition = Math.max(...sectionPositions);
        nextPosition = maxSectionPosition + 10;
      }
    }
    
    // Ensure we don't exceed the section's max range
    if (nextPosition >= sectionRange.max) {
      // Find a gap within the range
      nextPosition = sectionRange.min + 10;
      while (usedPositions.has(nextPosition) && nextPosition < sectionRange.max) {
        nextPosition += 10;
      }
      
      if (nextPosition >= sectionRange.max) {
        console.error(`Section ${currentWineContext.sectionType} is full! Cannot add more slides.`);
        toast({
          title: "Section Full",
          description: `The ${currentWineContext.sectionType} section has reached its maximum capacity.`,
          variant: "destructive"
        });
        return;
      }
    }
    
    // Final check to ensure position is available
    while (usedPositions.has(nextPosition) && nextPosition < sectionRange.max) {
      nextPosition += 10;
    }

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
        video_url: (question.config as any).video_url,
        video_publicId: (question.config as any).video_publicId,
        video_fileName: (question.config as any).video_fileName,
        video_fileSize: (question.config as any).video_fileSize,
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
        audio_url: (question.config as any).audio_url,
        audio_publicId: (question.config as any).audio_publicId,
        audio_fileName: (question.config as any).audio_fileName,
        audio_fileSize: (question.config as any).audio_fileSize,
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

    // Log slide creation attempt for debugging
    console.log(`📝 Creating slide for Wine ${winePosition} (${currentWineContext.wineName}) in ${currentWineContext.sectionType} section:`, {
      wineId: currentWineContext.wineId,
      winePosition,
      section: currentWineContext.sectionType,
      calculatedPosition: nextPosition,
      slideType,
      existingSlideCount: sectionSlides.length,
      usedPositions: Array.from(usedPositions).sort((a, b) => a - b)
    });

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
                {editorData && (
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
                      {localSlides.filter(s => (s.payloadJson as any)?.is_package_intro).length === 0 && (
                        <div className="p-3 bg-white/5 rounded-lg">
                          <p className="text-sm text-white/60 text-center">No package introduction slide yet</p>
                          <p className="text-xs text-white/40 text-center mt-1">Package intro is created automatically</p>
                        </div>
                      )}
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
                                  <p className="font-semibold text-white">
                                    {wine.position > 0 ? `Wine ${wine.position}: ` : ''}{wine.wineName}
                                  </p>
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
                                      {sectionSlides.length > 0 ? (
                                        <DraggableSlideList
                                          slides={sectionSlides}
                                          activeSlideId={activeSlideId}
                                          pendingReorders={pendingReorders}
                                          pendingContentChanges={pendingContentChanges}
                                          activelyMovingSlide={activelyMovingSlide}
                                          isProcessingQueue={isProcessingQueue}
                                          buttonStates={buttonStates}
                                          onSlideClick={setActiveSlideId}
                                          onSlideReorder={(newOrder) => handleDragReorder(newOrder, wine.id, key as any)}
                                          onSlideDelete={handleSlideDelete}
                                          onSlideMove={handleSlideReorder}
                                        />
                                      ) : (
                                        <div className="pl-3">
                                          <div className="px-3 py-2 text-xs text-white/50 italic bg-white/5 rounded-lg border border-dashed border-white/20">
                                            No slides in this section
                                          </div>
                                        </div>
                                      )}
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
        <div className={cn(
          "flex-1 overflow-hidden",
          isMobileView ? "flex flex-col" : "flex"
        )}>
          {/* Editor Panel */}
          <div className={cn(
            "p-4 sm:p-6 overflow-y-auto",
            isMobileView ? "flex-1" : `${isPreviewCollapsed ? 'flex-1' : 'flex-1'}`
          )}>
            {activeSlide ? (() => {
              const currentWine = wines.find(w => w.id === activeSlide.packageWineId);
              const wineSlides = localSlides.filter(s => s.packageWineId === activeSlide.packageWineId);
              const slideNumber = wineSlides.findIndex(s => s.id === activeSlide.id) + 1;
              const totalSlidesInWine = wineSlides.length;
              
              return (
                <motion.div key={activeSlide.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  {/* Enhanced Breadcrumb Navigation */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2 text-white/60 text-sm">
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
                      </div>
                    </div>
                  </div>
                  
                  <SlideConfigPanel
                    slide={activeSlide}
                    onUpdate={handleSlideUpdate}
                    onDelete={handleSlideDelete}
                    onPreviewUpdate={handlePreviewUpdate}
                    onWineUpdate={handleWineUpdate}
                  />
                </motion.div>
              );
            })() : (
              <div className="flex items-center justify-center h-full"><div className="text-center"><Settings className="h-12 w-12 text-white/40 mx-auto mb-4" /><h3 className="text-lg font-medium text-white mb-2">Select a Wine or Slide</h3><p className="text-white/60">Choose an item from the sidebar to begin editing.</p></div></div>
            )}
          </div>

          {/* Mobile Preview Section - Slides up from bottom */}
          <AnimatePresence>
            {isMobileView && activeSlide && !isPreviewCollapsed && (
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="fixed inset-x-0 bottom-0 top-0 z-50 bg-gradient-to-br from-black/95 to-purple-900/95 backdrop-blur-xl border-t border-white/20 shadow-2xl flex flex-col overflow-hidden"
              >
              <div className="p-3 border-b border-white/10 flex-shrink-0 bg-black/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3
                      }}
                    >
                      <Eye className="w-4 h-4 text-purple-400" />
                    </motion.div>
                    <h3 className="text-sm font-medium text-white/90">Live Preview</h3>
                    <Badge variant="outline" className="text-xs border-purple-400/40 text-purple-300 bg-purple-600/10">
                      Real-time
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
                    className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
                  >
                    <motion.div
                      animate={{ rotate: isPreviewCollapsed ? 0 : 180 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDownIcon className="w-4 h-4" />
                    </motion.div>
                  </Button>
                </div>
              </div>
              
              {/* Mobile Navigation Controls */}
                  {(() => {
                    const wineSlides = localSlides.filter(s => s.packageWineId === activeSlide.packageWineId).sort((a, b) => a.position - b.position);
                    const currentIndex = wineSlides.findIndex(s => s.id === activeSlideId);
                    const canGoPrev = currentIndex > 0;
                    const canGoNext = currentIndex < wineSlides.length - 1;
                    
                    return (
                      <div className="p-2 border-b border-white/10 bg-black/10 flex-shrink-0">
                        <div className="flex items-center justify-between">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateToSlide('prev')}
                            disabled={!canGoPrev}
                            className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 text-xs"
                          >
                            <ChevronLeft className="w-3 h-3 mr-1" />
                            Prev
                          </Button>
                          <div className="text-xs text-white/60 font-medium">
                            {currentIndex + 1} of {wineSlides.length}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateToSlide('next')}
                            disabled={!canGoNext}
                            className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 text-xs"
                          >
                            Next
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                  
                <div className="flex-1 overflow-y-auto">
                  <div className="pt-2 pb-4 px-2 h-full">
                    <SlidePreviewPanel 
                      activeSlide={activeSlide}
                      livePreviewData={livePreviewData}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live Preview Panel - Responsive */}
          {!isMobileView && !isPreviewCollapsed && (
            <div className="w-80 border-l border-white/10 bg-gradient-to-br from-black/20 to-purple-900/20 backdrop-blur-sm">
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-white/70" />
                    <h3 className="text-sm font-medium text-white/90">Live Preview</h3>
                    <Badge variant="outline" className="text-xs border-white/30 text-white/60">
                      Real-time
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPreviewCollapsed(true)}
                    className="h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Navigation Controls */}
              {activeSlide && (() => {
                const wineSlides = localSlides.filter(s => s.packageWineId === activeSlide.packageWineId).sort((a, b) => a.position - b.position);
                const currentIndex = wineSlides.findIndex(s => s.id === activeSlideId);
                const canGoPrev = currentIndex > 0;
                const canGoNext = currentIndex < wineSlides.length - 1;
                
                return (
                  <div className="p-3 border-b border-white/10 bg-black/10">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateToSlide('prev')}
                        disabled={!canGoPrev}
                        className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Prev
                      </Button>
                      <div className="text-xs text-white/60 font-medium">
                        {currentIndex + 1} of {wineSlides.length}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateToSlide('next')}
                        disabled={!canGoNext}
                        className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })()}
              
              <div className="h-full pb-16">
                <SlidePreviewPanel 
                  activeSlide={activeSlide}
                  livePreviewData={livePreviewData}
                />
              </div>
            </div>
          )}

          {/* Preview Collapse Button (Desktop) */}
          {!isMobileView && isPreviewCollapsed && (
            <div className="w-12 border-l border-white/10 bg-gradient-to-br from-black/20 to-purple-900/20 backdrop-blur-sm flex flex-col items-center justify-start pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPreviewCollapsed(false)}
                className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 mb-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-xs text-white/60 font-medium transform -rotate-90 mt-8">
                Preview
              </div>
            </div>
          )}

          {/* Floating Preview Toggle for Mobile */}
          {isMobileView && activeSlide && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="fixed bottom-4 right-4 z-40"
            >
              <Button
                onClick={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
                className={cn(
                  "w-14 h-14 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center",
                  isPreviewCollapsed 
                    ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/25 shadow-2xl" 
                    : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/25"
                )}
              >
                <motion.div
                  animate={{ 
                    rotate: isPreviewCollapsed ? 0 : 180
                  }}
                  transition={{ 
                    duration: 0.4, 
                    ease: "easeInOut"
                  }}
                >
                  {isPreviewCollapsed ? (
                    <Eye className="w-6 h-6" />
                  ) : (
                    <X className="w-6 h-6" />
                  )}
                </motion.div>
              </Button>
            </motion.div>
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
          wineId: currentWineContext.wineId,
          wineName: currentWineContext.wineName,
          wineType: currentWineContext.wineType
        } : undefined}
        sectionType={currentWineContext?.sectionType}
      />
    </div>
  );
}