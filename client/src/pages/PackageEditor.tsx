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
import { ArrowLeft, Save, PlusCircle, Edit3, Trash2, Wine, HelpCircle, Video, Settings, ChevronRight, ChevronDown, Menu, X } from 'lucide-react';
import type { Package, PackageWine, Slide } from "@shared/schema";
import { WineModal } from '@/components/WineModal';
import { SlidePreview } from '@/components/SlidePreview'; // Assuming this will be used later

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
        setExpandedWines(new Set([sortedWines[0].id]));
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
    onError: (err: any) => toast({ title: "Error creating wine", description: err.message, variant: "destructive" }),
  });

  const updateWineMutation = useMutation({
    mutationFn: ({ wineId, data }: { wineId: string; data: any }) => apiRequest('PATCH', `/api/wines/${wineId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
      toast({ title: "Wine updated successfully" });
      setIsWineModalOpen(false);
    },
    onError: (err: any) => toast({ title: "Error updating wine", description: err.message, variant: "destructive" }),
  });

  const deleteWineMutation = useMutation({
    mutationFn: (wineId: string) => apiRequest('DELETE', `/api/wines/${wineId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
      toast({ title: "Wine deleted successfully" });
    },
    onError: (err: any) => toast({ title: "Error deleting wine", description: err.message, variant: "destructive" }),
  });

  // --- HANDLERS ---
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
      newSet.has(wineId) ? newSet.delete(wineId) : newSet.add(wineId);
      return newSet;
    });
  };

  if (isLoading) return <div className="min-h-screen bg-gradient-primary text-white flex items-center justify-center">Loading Editor...</div>;
  if (error) return <div className="min-h-screen bg-gradient-primary text-white flex items-center justify-center">Error loading package data.</div>;

  return (
    <div className="min-h-screen bg-gradient-primary text-white">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <Link href="/sommelier"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Dashboard</Button></Link>
            <div>
              <h1 className="text-lg font-bold">{editorData?.name}</h1>
              <p className="text-white/60 text-xs">Code: {editorData?.code}</p>
            </div>
          </div>
          <Button size="sm"><Save className="mr-2 h-4 w-4" />Save Package</Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-57px)]">
        <AnimatePresence>
          {sidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden" />}
        </AnimatePresence>

        <AnimatePresence>
          {sidebarOpen && (
            <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: "spring", damping: 30, stiffness: 250 }} className="fixed lg:relative inset-y-0 left-0 z-40 w-80 lg:w-96 bg-gradient-to-br from-purple-900/90 to-black/90 backdrop-blur-xl border-r border-white/10 overflow-y-auto">
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
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <button onClick={() => toggleWineExpansion(wine.id)} className="flex-1 flex items-center space-x-2 text-left p-1 rounded-md hover:bg-white/10">
                              {isExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                              <Wine className="h-4 w-4 text-purple-400 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-white text-sm">{wine.wineName}</p>
                                <p className="text-xs text-white/60">{wineSlides.length} slides</p>
                              </div>
                            </button>
                            <div className="flex items-center">
                              <Button size="icon" variant="ghost" onClick={() => { setEditingWine(wine); setIsWineModalOpen(true); }} className="h-7 w-7"><Edit3 className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => deleteWineMutation.mutate(wine.id)} className="h-7 w-7 text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pl-4 mt-2 border-l-2 border-white/10 space-y-1">
                                {/* Slide placeholder */}
                                <div className="text-xs text-center text-white/50 py-4">Slide editing coming soon.</div>
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

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Settings className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Editor Panel</h3>
              <p className="text-white/60">Select an item from the sidebar to edit its content.</p>
            </div>
          </div>
        </main>
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