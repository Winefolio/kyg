import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { SLIDE_TEMPLATES } from '@/lib/wineTemplates';
import { 
  ArrowLeft, 
  Save, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  Wine, 
  HelpCircle, 
  Video, 
  Eye, 
  Settings, 
  ChevronRight,
  ChevronDown,
  GripVertical,
  Menu,
  X,
  Monitor,
  Smartphone
} from 'lucide-react';
import type { Package, PackageWine, Slide } from "@shared/schema";
import { WineModal } from '@/components/WineModal';
import { SlidePreview } from '@/components/SlidePreview';

type EditorData = Package & { wines: PackageWine[]; slides: Slide[] };

interface QuestionOption {
  text: string;
  description?: string;
  tooltip?: string;
  value: any;
}

export default function PackageEditor() {
  const { code } = useParams<{ code: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State management
  const [wines, setWines] = useState<PackageWine[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isWineModalOpen, setIsWineModalOpen] = useState(false);
  const [editingWine, setEditingWine] = useState<PackageWine | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [expandedWines, setExpandedWines] = useState<Set<string>>(new Set());

  // Data fetching
  const { data: editorData, isLoading, error } = useQuery<EditorData>({
    queryKey: [`/api/packages/${code}/editor`],
    enabled: !!code,
  });

  useEffect(() => {
    if (editorData) {
      setWines(editorData.wines || []);
      setSlides(editorData.slides || []);
      // Auto-expand first wine and select first slide
      if (editorData.wines?.length > 0) {
        setExpandedWines(new Set([editorData.wines[0].id]));
        const firstWineSlides = editorData.slides?.filter(s => s.packageWineId === editorData.wines[0].id);
        if (firstWineSlides?.length > 0) {
          setActiveSlideId(firstWineSlides[0].id);
        }
      }
    }
  }, [editorData]);

  const activeSlide = slides.find(s => s.id === activeSlideId);

  // Mutations
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
      return apiRequest('PATCH', `/api/packages/${editorData?.id}/wines/${wineId}`, data);
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
      return apiRequest('DELETE', `/api/packages/${editorData?.id}/wines/${wineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packages/${code}/editor`] });
      toast({ title: "Wine deleted successfully" });
    }
  });

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

  // Helper functions

  const toggleWineExpansion = (wineId: string) => {
    const newExpanded = new Set(expandedWines);
    if (newExpanded.has(wineId)) {
      newExpanded.delete(wineId);
    } else {
      newExpanded.add(wineId);
    }
    setExpandedWines(newExpanded);
  };

  const handleAddSlide = (wineId: string, template: any) => {
    const wineSlides = slides.filter(s => s.packageWineId === wineId);
    const nextPosition = wineSlides.length + 1;

    const slideData = {
      packageWineId: wineId,
      position: nextPosition,
      type: template.type,
      section_type: 'deep_dive',
      payloadJson: {
        title: template.defaultPayload.title,
        description: template.defaultPayload.description || '',
        ...template.defaultPayload
      }
    };

    createSlideMutation.mutate(slideData);
  };

  const handleUpdateSlide = (slideId: string, updates: any) => {
    updateSlideMutation.mutate({ slideId, data: updates });
  };

  const updateSlidePayload = (updates: any) => {
    if (!activeSlide) return;
    const newPayload = { ...(activeSlide.payloadJson as any), ...updates };
    handleUpdateSlide(activeSlide.id, { payloadJson: newPayload });
  };

  const updateQuestionOption = (index: number, field: string, value: string) => {
    if (!activeSlide) return;
    const payload = activeSlide.payloadJson as any;
    const options = [...(payload.options || [])];
    options[index] = { ...options[index], [field]: value };
    updateSlidePayload({ options });
  };

  const addQuestionOption = () => {
    if (!activeSlide) return;
    const payload = activeSlide.payloadJson as any;
    const options = [...(payload.options || [])];
    options.push({ 
      text: '', 
      description: '', 
      tooltip: '', 
      value: options.length 
    });
    updateSlidePayload({ options });
  };

  const removeQuestionOption = (index: number) => {
    if (!activeSlide) return;
    const payload = activeSlide.payloadJson as any;
    const options = (payload.options || []).filter((_: any, i: number) => i !== index);
    updateSlidePayload({ options });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading Editor...</p>
        </div>
      </div>
    );
  }

  if (error || !editorData) {
    return (
      <div className="min-h-screen bg-gradient-primary text-white flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Error Loading Editor</h2>
        <p className="text-red-400 mb-6">{error ? (error as Error).message : 'Package not found'}</p>
        <Link href="/sommelier">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <Link href="/sommelier">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold">{editorData.name}</h1>
              <p className="text-white/60 text-xs">Code: {editorData.code}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-2">
              <Button
                variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('desktop')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('mobile')}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
            <Button size="sm">
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Mobile Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 20 }}
              className="fixed lg:relative inset-y-0 left-0 z-50 w-80 lg:w-96 bg-gradient-to-br from-purple-900/90 to-black/90 backdrop-blur-xl border-r border-white/10 overflow-y-auto"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white">Content Structure</h2>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingWine(null); // Ensure we are not in edit mode
                        setIsWineModalOpen(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Wine
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSidebarOpen(false)}
                      className="lg:hidden text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {wines.map(wine => {
                    const wineSlides = slides.filter(s => s.packageWineId === wine.id);
                    const isExpanded = expandedWines.has(wine.id);

                    return (
                      <Card key={wine.id} className="bg-white/5 border-white/10">
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <Button
                              variant="ghost"
                              onClick={() => toggleWineExpansion(wine.id)}
                              className="flex-1 justify-start text-left p-0 h-auto"
                            >
                              <div className="flex items-center space-x-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <Wine className="h-4 w-4 text-purple-400" />
                                <div>
                                  <p className="font-medium text-white">{wine.wineName}</p>
                                  <p className="text-xs text-white/60">{wineSlides.length} slides</p>
                                </div>
                              </div>
                            </Button>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingWine(wine);
                                  setIsWineModalOpen(true);
                                }}
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteWineMutation.mutate(wine.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 space-y-2"
                              >
                                {/* Slides */}
                                {wineSlides.map((slide, index) => (
                                  <div
                                    key={slide.id}
                                    className={`p-3 rounded cursor-pointer transition-colors ${
                                      activeSlideId === slide.id
                                        ? 'bg-purple-600/20 border border-purple-400'
                                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
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
                                        <div>
                                          <p className="text-sm font-medium text-white">
                                            {(slide.payloadJson as any)?.title || 'Untitled Slide'}
                                          </p>
                                          <p className="text-xs text-white/60">
                                            {slide.type.replace('_', ' ')}
                                          </p>
                                        </div>
                                      </div>
                                      <span className="text-xs text-white/40">#{index + 1}</span>
                                    </div>
                                  </div>
                                ))}

                                {/* Add Slide Templates */}
                                <div className="pt-2 border-t border-white/10">
                                  <p className="text-xs text-white/60 mb-3">Add Slide:</p>
                                  <div className="grid grid-cols-1 gap-2">
                                    {SLIDE_TEMPLATES.map(template => (
                                      <Button
                                        key={`${template.type}-${template.name}`}
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-9 justify-start"
                                        onClick={() => handleAddSlide(wine.id, template)}
                                        title={template.description}
                                      >
                                        <template.icon className="mr-2 h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{template.name}</span>
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
        <div className="flex-1 flex overflow-hidden">
          {/* Content Editor */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto">
            {activeSlide ? (
              <motion.div
                key={activeSlide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto"
              >
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Edit Slide</h2>
                    <Badge variant="secondary">
                      {activeSlide.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                    {/* Basic Settings */}
                    <Card className="bg-white/5 border-white/10">
                      <div className="p-4 md:p-6">
                        <h3 className="text-lg font-medium mb-4">Basic Settings</h3>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="title" className="text-white">Title</Label>
                            <Input
                              id="title"
                              value={(activeSlide.payloadJson as any)?.title || ''}
                              onChange={(e) => updateSlidePayload({ title: e.target.value })}
                              className="bg-white/10 border-white/20 text-white"
                              placeholder="Enter slide title"
                            />
                          </div>
                          <div>
                            <Label htmlFor="description" className="text-white">Description</Label>
                            <Textarea
                              id="description"
                              value={(activeSlide.payloadJson as any)?.description || ''}
                              onChange={(e) => updateSlidePayload({ description: e.target.value })}
                              className="bg-white/10 border-white/20 text-white"
                              placeholder="Enter slide description"
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Type-specific Settings */}
                    {activeSlide.type === 'question' && (
                      <Card className="bg-white/5 border-white/10">
                        <div className="p-6">
                          <h3 className="text-lg font-medium mb-4">Question Settings</h3>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-white">Question Type</Label>
                              <Select
                                value={(activeSlide.payloadJson as any)?.question_type || 'multiple_choice'}
                                onValueChange={(value) => updateSlidePayload({ question_type: value })}
                              >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                  <SelectItem value="scale">Scale (1-10)</SelectItem>
                                  <SelectItem value="text">Text Input</SelectItem>
                                  <SelectItem value="boolean">Yes/No</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {(activeSlide.payloadJson as any)?.question_type === 'multiple_choice' && (
                              <div>
                                <Label className="text-white">Answer Options</Label>
                                <div className="space-y-3 mt-2">
                                  {((activeSlide.payloadJson as any)?.options || []).map((option: QuestionOption, index: number) => (
                                    <Card key={index} className="bg-white/5 border-white/10">
                                      <div className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                          <h4 className="text-sm font-medium text-white">Option {index + 1}</h4>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeQuestionOption(index)}
                                            className="text-red-400 hover:text-red-300"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                        <div className="space-y-3">
                                          <div>
                                            <Label className="text-white text-xs">Title</Label>
                                            <Input
                                              value={option.text || ''}
                                              onChange={(e) => updateQuestionOption(index, 'text', e.target.value)}
                                              className="bg-white/10 border-white/20 text-white"
                                              placeholder="Option title"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-white text-xs">Description</Label>
                                            <Textarea
                                              value={option.description || ''}
                                              onChange={(e) => updateQuestionOption(index, 'description', e.target.value)}
                                              className="bg-white/10 border-white/20 text-white"
                                              placeholder="Option description"
                                              rows={2}
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-white text-xs">Tooltip</Label>
                                            <Input
                                              value={option.tooltip || ''}
                                              onChange={(e) => updateQuestionOption(index, 'tooltip', e.target.value)}
                                              className="bg-white/10 border-white/20 text-white"
                                              placeholder="Helpful tooltip text"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </Card>
                                  ))}
                                  <Button
                                    onClick={addQuestionOption}
                                    variant="outline"
                                    className="w-full"
                                  >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Option
                                  </Button>
                                </div>
                              </div>
                            )}

                            {(activeSlide.payloadJson as any)?.question_type === 'scale' && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-white">Min Value</Label>
                                    <Input
                                      type="number"
                                      value={(activeSlide.payloadJson as any)?.scale_min || 1}
                                      onChange={(e) => updateSlidePayload({ scale_min: parseInt(e.target.value) })}
                                      className="bg-white/10 border-white/20 text-white"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-white">Max Value</Label>
                                    <Input
                                      type="number"
                                      value={(activeSlide.payloadJson as any)?.scale_max || 10}
                                      onChange={(e) => updateSlidePayload({ scale_max: parseInt(e.target.value) })}
                                      className="bg-white/10 border-white/20 text-white"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-white">Min Label</Label>
                                  <Input
                                    value={(activeSlide.payloadJson as any)?.scale_min_label || ''}
                                    onChange={(e) => updateSlidePayload({ scale_min_label: e.target.value })}
                                    className="bg-white/10 border-white/20 text-white"
                                    placeholder="e.g., Strongly Disagree"
                                  />
                                </div>
                                <div>
                                  <Label className="text-white">Max Label</Label>
                                  <Input
                                    value={(activeSlide.payloadJson as any)?.scale_max_label || ''}
                                    onChange={(e) => updateSlidePayload({ scale_max_label: e.target.value })}
                                    className="bg-white/10 border-white/20 text-white"
                                    placeholder="e.g., Strongly Agree"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    )}

                    {activeSlide.type === 'video_message' && (
                      <Card className="bg-white/5 border-white/10">
                        <div className="p-6">
                          <h3 className="text-lg font-medium mb-4">Video Settings</h3>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-white">Video URL</Label>
                              <Input
                                value={(activeSlide.payloadJson as any)?.video_url || ''}
                                onChange={(e) => updateSlidePayload({ video_url: e.target.value })}
                                className="bg-white/10 border-white/20 text-white"
                                placeholder="https://..."
                              />
                            </div>
                            <div>
                              <Label className="text-white">Duration (seconds)</Label>
                              <Input
                                type="number"
                                value={(activeSlide.payloadJson as any)?.duration_seconds || ''}
                                onChange={(e) => updateSlidePayload({ duration_seconds: parseInt(e.target.value) })}
                                className="bg-white/10 border-white/20 text-white"
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex justify-between">
                    <Button
                      variant="destructive"
                      onClick={() => deleteSlideMutation.mutate(activeSlide.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Slide
                    </Button>
                    <div className="space-x-2">
                      <Button variant="outline">
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                      <Button>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Live Preview Section */}
                <div className="mt-8 border-t border-white/10 pt-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Live Preview</h3>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPreviewMode('desktop')}
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPreviewMode('mobile')}
                      >
                        <Smartphone className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                    <SlidePreview slide={activeSlide} mode={previewMode} />
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Settings className="h-12 w-12 text-white/40 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Select a slide to edit</h3>
                  <p className="text-white/60">Choose a slide from the sidebar to start editing its content.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}