import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useLocation } from 'wouter';
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
  Volume2,
  Video,
  MessageSquare,
  HelpCircle,
  Image as ImageIcon,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { MultipleChoiceQuestion } from '@/components/questions/MultipleChoiceQuestion';
import { ScaleQuestion } from '@/components/questions/ScaleQuestion';

interface Slide {
  id: string;
  packageWineId: string;
  position: number;
  type: 'interlude' | 'question' | 'video_message' | 'audio_message' | 'media';
  sectionType: 'intro' | 'deep_dive' | 'ending';
  payloadJson: any;
}

interface Wine {
  id: string;
  wineName: string;
  wineDescription: string;
  position: number;
}

const SLIDE_TEMPLATES = [
  {
    type: 'question',
    name: 'Question',
    icon: <HelpCircle className="w-4 h-4" />,
    description: 'Interactive question for participants',
    defaultPayload: {
      title: 'Wine Tasting Question',
      description: 'What do you notice about this wine?',
      question_type: 'multiple_choice',
      category: 'General',
      options: [
        { id: '1', text: 'Option 1', description: 'Description 1' },
        { id: '2', text: 'Option 2', description: 'Description 2' }
      ],
      allow_multiple: true,
      allow_notes: true
    }
  },
  {
    type: 'interlude',
    name: 'Interlude',
    icon: <Pause className="w-4 h-4" />,
    description: 'Break or transition slide',
    defaultPayload: {
      title: 'Take a Moment',
      description: 'Reflect on what you\'ve experienced so far',
      duration: 30
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

export default function VideoEditorPackageEditorNew() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSlide, setSelectedSlide] = useState<Slide | null>(null);
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [allSlides, setAllSlides] = useState<Slide[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  // Get URL parameters for pre-selection
  const urlParams = new URLSearchParams(window.location.search);
  const preSelectedWineId = urlParams.get('packageWineId');
  const preSelectedWineName = urlParams.get('wineName');

  // Fetch all packages for selection
  const { data: packages, isLoading: packagesLoading } = useQuery<any[]>({
    queryKey: ['/api/packages'],
  });

  // Fetch package data when code is provided
  const { data: packageData, isLoading } = useQuery<any>({
    queryKey: ['/api/packages', code],
    enabled: !!code,
  });

  // Fetch package wines
  const { data: winesData } = useQuery<any[]>({
    queryKey: ['/api/packages', packageData?.id, 'wines'],
    enabled: !!packageData?.id,
  });

  // Fetch slides
  const { data: slidesData } = useQuery<any>({
    queryKey: ['/api/packages', code, 'slides'],
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

  // Update slides when data changes
  useEffect(() => {
    if (slidesData?.slides) {
      setAllSlides(slidesData.slides);
    }
  }, [slidesData]);

  // Initialize with pre-selected wine from URL or default
  useEffect(() => {
    if (packages && preSelectedWineId) {
      // Find the wine and package from URL parameters
      for (const pkg of packages) {
        const wine = pkg.wines?.find((w: any) => w.id === preSelectedWineId);
        if (wine) {
          setSelectedPackage(pkg);
          setSelectedWine(wine);
          break;
        }
      }
    } else if (winesData && winesData.length > 0 && !selectedWine) {
      setSelectedWine(winesData[0]);
    }
  }, [packages, winesData, preSelectedWineId, selectedWine]);

  // Set default package when packages load
  useEffect(() => {
    if (packages && packages.length > 0 && !selectedPackage) {
      setSelectedPackage(packages[0]);
    }
  }, [packages, selectedPackage]);

  // Create slide mutation
  const createSlideMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['/api/packages', code, 'slides'] });
      toast({ title: 'Slide created successfully' });
    },
  });

  // Delete slide mutation
  const deleteSlideMutation = useMutation({
    mutationFn: async (slideId: string) => {
      const response = await fetch(`/api/slides/${slideId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete slide');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages', code, 'slides'] });
      toast({ title: 'Slide deleted successfully' });
    },
  });

  // Update slide mutation
  const updateSlideMutation = useMutation({
    mutationFn: async ({ slideId, data }: { slideId: string; data: any }) => {
      const response = await fetch(`/api/slides/${slideId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update slide');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages', code, 'slides'] });
      toast({ title: 'Slide updated successfully' });
    },
  });

  const handleAddSlide = (template: any, wineId: string) => {
    if (!selectedWine) return;
    
    const wineSlides = slidesByWine[wineId] || [];
    const nextPosition = wineSlides.length + 1;
    
    createSlideMutation.mutate({
      packageWineId: wineId,
      position: nextPosition,
      type: template.type,
      sectionType: 'deep_dive',
      payloadJson: template.defaultPayload,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // Implement drag and drop reordering
  };

  const renderSlidePreview = () => {
    if (!selectedSlide) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Slide Selected</h3>
            <p>Select a slide from the left panel to preview and configure its properties.</p>
          </div>
        </div>
      );
    }

    const payload = selectedSlide.payloadJson;

    if (selectedSlide.type === 'question') {
      if (payload.question_type === 'multiple_choice') {
        return (
          <div className="flex-1 p-6 overflow-y-auto">
            <MultipleChoiceQuestion
              question={payload}
              value={{ selected: [], notes: '' }}
              onChange={() => {}}
            />
          </div>
        );
      } else if (payload.question_type === 'scale') {
        return (
          <div className="flex-1 p-6 overflow-y-auto">
            <ScaleQuestion
              question={payload}
              value={5}
              onChange={() => {}}
            />
          </div>
        );
      }
    }

    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-gradient-card backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-2">{payload.title}</h3>
          <p className="text-white/70">{payload.description}</p>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white">Loading package editor...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between w-full max-w-none">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/sommelier')}
              className="text-gray-400 hover:text-white flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-white truncate">{packageData?.name}</h1>
              <p className="text-gray-400 text-xs">Code: {packageData?.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {selectedWine && (
              <div className="text-xs text-gray-300 bg-gray-700 px-2 py-1 rounded">
                Editing: {selectedWine.wineName}
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-xs px-2"
            >
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="bg-purple-600 hover:bg-purple-700 text-xs px-2"
              onClick={() => {
                toast({
                  title: "Changes Saved",
                  description: "All package changes have been saved successfully.",
                });
              }}
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Collapsible */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-12'} transition-all duration-300 bg-gray-800/50 border-r border-gray-700 flex flex-col`}>
          {/* Sidebar Header */}
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-white"
            >
              <Menu size={20} />
            </Button>
          </div>

          {sidebarOpen && (
            <div className="flex-1 overflow-y-auto">
              {/* Package Selection */}
              <div className="p-3 border-b border-gray-700">
                <h3 className="text-white font-semibold mb-3 text-sm">Select Package</h3>
                <select
                  value={selectedPackage?.id || ''}
                  onChange={(e) => {
                    const pkg = packages?.find(p => p.id === e.target.value);
                    if (pkg) {
                      setSelectedPackage(pkg);
                      setSelectedWine(null); // Reset wine selection
                    }
                  }}
                  className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded px-2 py-1"
                >
                  <option value="">Choose package...</option>
                  {packages?.map((pkg: any) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Wine Selection */}
              <div className="p-3 border-b border-gray-700">
                <h3 className="text-white font-semibold mb-3 text-sm">Select Wine</h3>
                <div className="space-y-2">
                  {selectedPackage?.wines?.map((wine: Wine) => (
                    <Button
                      key={wine.id}
                      variant={selectedWine?.id === wine.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedWine(wine)}
                      className={`w-full flex items-center gap-2 p-2 h-10 justify-start text-xs ${
                        selectedWine?.id === wine.id 
                          ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500' 
                          : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {wine.position}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-medium truncate">{wine.wineName}</div>
                        <div className="text-xs opacity-70">
                          {slidesByWine[wine.id]?.length || 0} slides
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Add Slide Templates */}
              <div className="p-3 border-b border-gray-700">
                <h3 className="text-white font-semibold mb-3 text-sm">Add Slides</h3>
                <div className="space-y-2">
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
                      className="w-full flex items-center gap-2 p-2 h-8 border-gray-600 text-gray-300 hover:bg-gray-700 justify-start text-xs"
                    >
                      {template.icon}
                      <span>{template.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="p-3">
                <h3 className="text-white font-semibold mb-3 text-sm">Timeline</h3>
                
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className="space-y-3">
                    {winesData?.map((wine: Wine) => {
                      const wineSlides = slidesByWine[wine.id] || [];
                      return (
                        <div 
                          key={wine.id}
                          className={`border rounded-lg p-2 transition-colors ${
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
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-medium text-sm truncate">{wine.wineName}</h4>
                              <p className="text-xs text-gray-400">{wineSlides.length} slides</p>
                            </div>
                          </div>

                          <SortableContext
                            items={wineSlides.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-1">
                              {wineSlides.map((slide) => (
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
                                      {slide.payloadJson?.title || slide.type}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-purple-400">#{slide.position}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSlideMutation.mutate(slide.id);
                                      }}
                                      className="h-5 w-5 p-0 text-red-400 hover:bg-red-500/20"
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
          )}
        </div>

        {/* Main Preview Area - Full Screen */}
        <div className="flex-1 bg-gray-900/50 flex flex-col">
          <div className="p-4 border-b border-gray-700 bg-gray-800/30">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </h2>
              {selectedSlide && (
                <Badge variant="outline" className="text-white">
                  {selectedSlide.type} - Position {selectedSlide.position}
                </Badge>
              )}
            </div>
          </div>

          {renderSlidePreview()}
        </div>
      </div>
    </div>
  );
}