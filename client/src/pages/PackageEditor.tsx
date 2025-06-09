// client/pages/PackageEditor.tsx

import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { SLIDE_TEMPLATES } from '@/lib/wineTemplates';
import { 
  ArrowLeft, Save, PlusCircle, Edit3, Trash2, Wine, HelpCircle, 
  Video, Eye, Settings, ChevronRight, ChevronDown, Menu, X, Monitor, Smartphone, Plus, Sparkles
} from 'lucide-react';
import type { Package, PackageWine, Slide, GenericQuestion } from "@shared/schema";
import { WineModal } from '@/components/WineModal';
import { SlidePreview } from '@/components/SlidePreview';
import { SlideConfigPanel } from '@/components/editor/SlideConfigPanel';
import { QuickQuestionBuilder } from '@/components/editor/QuickQuestionBuilder';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isWineModalOpen, setIsWineModalOpen] = useState(false);
  const [editingWine, setEditingWine] = useState<PackageWine | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [expandedWines, setExpandedWines] = useState<Set<string>>(new Set());
  const [quickBuilderOpen, setQuickBuilderOpen] = useState(false);
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
    if (editorData) {
      const sortedWines = [...(editorData.wines || [])].sort((a, b) => a.position - b.position);
      const sortedSlides = [...(editorData.slides || [])].sort((a, b) => a.position - b.position);

      setWines(sortedWines);
      setSlides(sortedSlides);

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

  const activeSlide = slides.find(s => s.id === activeSlideId);

  // --- MUTATIONS ---
  const createWineMutation = useMutation({
    mutationFn: (wineData: any) => apiRequest('POST', `/api/wines`, wineData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
      toast({ title: "Wine created successfully" });
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
    onError: (error: any) => toast({ title: "Error creating slide", description: error.message, variant: "destructive" }),
  });

  const updateSlideMutation = useMutation({
    mutationFn: ({ slideId, data }: { slideId: string; data: any }) => apiRequest('PATCH', `/api/slides/${slideId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
      toast({ title: "Slide updated successfully" });
    },
    onError: (error: any) => toast({ title: "Error updating slide", description: error.message, variant: "destructive" }),
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
    const wineSlides = slides.filter(s => s.packageWineId === wineId);
    const nextPosition = (wineSlides.length > 0 ? Math.max(...wineSlides.map(s => s.position)) : 0) + 1;

    const slideData = {
      packageWineId: wineId,
      position: nextPosition,
      type: template.type,
      // Use the provided sectionType, or default from the template, or fallback to 'deep_dive'
      section_type: sectionType || template.sectionType || 'deep_dive',
      payloadJson: {
        title: template.name,
        description: template.description || '',
        ...(template.payloadTemplate || {}),
      },
    };
    createSlideMutation.mutate(slideData);
  };

  const handleSlideUpdate = (slideId: string, data: any) => {
    updateSlideMutation.mutate({ slideId, data });
  };

  const handleSlideDelete = (slideId: string) => {
    deleteSlideMutation.mutate(slideId);
  };

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

    const wineSlides = slides.filter(s => s.packageWineId === currentWineContext.wineId);
    // Position must be unique across ALL slides for this wine, not just the section
    const nextPosition = (wineSlides.length > 0 ? Math.max(...wineSlides.map(s => s.position)) : 0) + 1;

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
            <Button size="sm"><Save className="mr-2 h-4 w-4" />Save</Button>
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
                <div className="space-y-4">
                  {wines.map(wine => {
                    const wineSlides = slides.filter(s => s.packageWineId === wine.id);
                    const isExpanded = expandedWines.has(wine.id);
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
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pl-4 mt-2 border-l-2 border-white/10 ml-5 space-y-4 py-2">
                                {/* --- SECTION-BASED UI (POWER USER FLOW) --- */}
                                {Object.entries(sectionDetails).map(([key, { title, icon }]) => {
                                  const sectionSlides = wineSlides.filter(s => s.section_type === key);
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
                                          sectionSlides.map(slide => (
                                            <div 
                                              key={slide.id} 
                                              className={`group p-2.5 rounded-lg cursor-pointer transition-all duration-200 border border-transparent ${
                                                activeSlideId === slide.id 
                                                  ? 'bg-gradient-to-r from-purple-600/40 to-purple-700/30 border-purple-500/50 shadow-lg shadow-purple-900/25' 
                                                  : 'hover:bg-white/8 hover:border-white/10 hover:shadow-md'
                                              }`} 
                                              onClick={() => setActiveSlideId(slide.id)}
                                            >
                                              <div className="flex items-center">
                                                <div className={`w-1.5 h-1.5 rounded-full mr-2.5 transition-colors ${
                                                  activeSlideId === slide.id ? 'bg-purple-300' : 'bg-white/40 group-hover:bg-white/60'
                                                }`} />
                                                <p className="text-sm font-medium text-white truncate">
                                                  {(slide.payloadJson as any)?.title || 'Untitled Slide'}
                                                </p>
                                              </div>
                                            </div>
                                          ))
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
          {activeSlide ? (
            <motion.div key={activeSlide.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold">Slide Editor Panel</h2>
                <p className="text-white/70">Editing: {(activeSlide.payloadJson as any)?.title}</p>
              </div>
              <SlideConfigPanel
                slide={activeSlide}
                onUpdate={handleSlideUpdate}
                onDelete={handleSlideDelete}
              />
            </motion.div>
          ) : (
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