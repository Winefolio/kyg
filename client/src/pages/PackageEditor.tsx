// client/pages/PackageEditor.tsx

import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { SLIDE_TEMPLATES } from '@/lib/wineTemplates';
import { 
  ArrowLeft, Save, PlusCircle, Edit3, Trash2, Wine, HelpCircle, 
  Video, Eye, Settings, ChevronRight, ChevronDown, Menu, X, Monitor, Smartphone
} from 'lucide-react';
import type { Package, PackageWine, Slide } from "@shared/schema";
import { WineModal } from '@/components/WineModal';
import { SlidePreview } from '@/components/SlidePreview';

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

  const { data: editorData, isLoading, error } = useQuery<EditorData>({
    queryKey: [`/api/packages/${code}/editor`],
    enabled: !!code,
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

  const handleAddSlide = (wineId: string, template: any) => {
    const wineSlides = slides.filter(s => s.packageWineId === wineId);
    const nextPosition = wineSlides.length > 0 ? Math.max(...wineSlides.map(s => s.position)) + 1 : 1;

    const slideData = {
      packageWineId: wineId,
      position: nextPosition,
      type: template.type,
      sectionType: template.sectionType,
      payloadJson: {
        title: template.name, // Use template name as default title
        description: template.description,
        ...template.payloadTemplate,
      },
    };
    createSlideMutation.mutate(slideData);
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
                  <Button size="sm" onClick={() => { setEditingWine(null); setIsWineModalOpen(true); }} className="bg-purple-600 hover:bg-purple-700">
                    <PlusCircle className="mr-2 h-4 w-4" />Add Wine
                  </Button>
                </div>
                <div className="space-y-4">
                  {wines.map(wine => {
                    const wineSlides = slides.filter(s => s.packageWineId === wine.id);
                    const isExpanded = expandedWines.has(wine.id);
                    return (
                      <Card key={wine.id} className="bg-white/5 border-white/10">
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <Button variant="ghost" onClick={() => toggleWineExpansion(wine.id)} className="flex-1 justify-start text-left p-0 h-auto">
                              <div className="flex items-center space-x-2">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <Wine className="h-4 w-4 text-purple-400" />
                                <div>
                                  <p className="font-medium text-white">{wine.wineName}</p>
                                  <p className="text-xs text-white/60">{wineSlides.length} slides</p>
                                </div>
                              </div>
                            </Button>
                            <div className="flex space-x-1">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingWine(wine); setIsWineModalOpen(true); }}>
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteWineMutation.mutate(wine.id)} className="text-red-400 hover:text-red-300">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-2 pl-4 border-l-2 border-white/10 ml-5">
                                {/* Slides List */}
                                <div className="mt-2 space-y-1">
                                  {wineSlides.map((slide, index) => (
                                    <div
                                      key={slide.id}
                                      className={`p-2 rounded-md cursor-pointer transition-colors ${
                                        activeSlideId === slide.id
                                          ? 'bg-purple-600/20'
                                          : 'hover:bg-white/10'
                                      }`}
                                      onClick={() => setActiveSlideId(slide.id)}
                                    >
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs text-white/40">#{index + 1}</span>
                                        <p className="text-sm font-medium text-white truncate">
                                          {(slide.payloadJson as any)?.title || 'Untitled Slide'}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Add Slide Templates */}
                                <div className="mt-4 pt-2 border-t border-white/10">
                                  <div className="space-y-2">
                                    {SLIDE_TEMPLATES.map(template => (
                                      <Button
                                        key={template.name}
                                        size="sm"
                                        variant="ghost"
                                        className="w-full text-xs h-8 justify-start text-white/70 hover:text-white hover:bg-white/5"
                                        onClick={() => handleAddSlide(wine.id, template)}
                                        title={template.description}
                                      >
                                        {template.icon && <template.icon className="mr-2 h-3 w-3 flex-shrink-0 text-purple-400" />}
                                        <span className="truncate">Add {template.name}</span>
                                      </Button>
                                    ))}
                                  </div>
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
              <div className="text-center">
                <h2 className="text-2xl font-bold">Slide Editor Panel</h2>
                <p className="text-white/70">Editing: {(activeSlide.payloadJson as any)?.title}</p>
                {/* Placeholder for actual slide editor UI */}
              </div>
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
    </div>
  );
}