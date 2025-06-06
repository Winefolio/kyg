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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  Menu,
  ChevronUp,
  ChevronDown,
  Upload,
  X,
  GripVertical
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
  title: string;
  description: string;
  payloadJson: any;
}

interface Wine {
  id: string;
  wineName: string;
  wineDescription: string;
  position: number;
}

// Modular slide template system with enhanced animations
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
        { id: '1', text: 'Red fruit flavors', description: 'Cherry, strawberry, raspberry' },
        { id: '2', text: 'Dark fruit flavors', description: 'Blackberry, plum, blackcurrant' },
        { id: '3', text: 'Herbal notes', description: 'Mint, eucalyptus, green bell pepper' },
        { id: '4', text: 'Spice characteristics', description: 'Black pepper, clove, cinnamon' }
      ],
      allow_multiple: true,
      allow_notes: true
    }
  },
  {
    type: 'interlude',
    name: 'Reflection',
    icon: <Pause className="w-4 h-4" />,
    description: 'Mindful pause for reflection',
    defaultPayload: {
      title: 'Take a Moment',
      description: 'Close your eyes and savor the aromas. What memories does this wine evoke?',
      duration: 30,
      animationType: 'gentle_fade',
      backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080'
    }
  },
  {
    type: 'interlude',
    name: 'Transition',
    icon: <Pause className="w-4 h-4" />,
    description: 'Smooth transition between wines',
    defaultPayload: {
      title: 'Moving Forward',
      description: 'Prepare your palate for the next wine in our journey',
      duration: 20,
      animationType: 'slide_transition',
      backgroundImage: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080'
    }
  },
  {
    type: 'interlude',
    name: 'Celebration',
    icon: <Pause className="w-4 h-4" />,
    description: 'Celebratory moment',
    defaultPayload: {
      title: 'Cheers!',
      description: 'A toast to the art of winemaking and the joy of discovery',
      duration: 15,
      animationType: 'celebration',
      backgroundImage: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080'
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
      duration: 120,
      autoplay: false,
      showControls: true
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
      duration: 90,
      autoplay: false,
      showWaveform: true
    }
  },
  {
    type: 'media',
    name: 'Gallery',
    icon: <ImageIcon className="w-4 h-4" />,
    description: 'Image gallery or visual content',
    defaultPayload: {
      title: 'Visual Guide',
      description: 'Visual elements for this wine',
      mediaItems: [],
      layout: 'grid',
      showCaptions: true
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
  const [expandedWines, setExpandedWines] = useState<Set<string>>(new Set());
  const [wineDropdownOpen, setWineDropdownOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);

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
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/slides/${id}`, {
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
    
    const newSlideData = {
      packageWineId: wineId,
      position: nextPosition,
      type: template.type,
      sectionType: 'deep_dive',
      title: template.defaultPayload.title,
      description: template.defaultPayload.description,
      payloadJson: template.defaultPayload,
    };
    
    createSlideMutation.mutate(newSlideData, {
      onSuccess: (response) => {
        // Auto-select the newly created slide for immediate editing
        setSelectedSlide(response.slide);
        // Expand the wine section in timeline
        setExpandedWines(prev => {
          const newSet = new Set(prev);
          newSet.add(wineId);
          return newSet;
        });
      }
    });
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    if (selectedWine) {
      const wineSlides = slidesByWine[selectedWine.id] || [];
      const oldIndex = wineSlides.findIndex(slide => slide.id === active.id);
      const newIndex = wineSlides.findIndex(slide => slide.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedSlides = arrayMove(wineSlides, oldIndex, newIndex);
        
        // Update positions and save to database
        const slideUpdates = reorderedSlides.map((slide, index) => ({
          slideId: slide.id,
          packageWineId: selectedWine.id,
          position: index + 1
        }));
        
        // Call API to update slide positions
        fetch('/api/slides/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: slideUpdates })
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/packages', code, 'slides'] });
          toast({ title: 'Slides reordered successfully' });
        });
      }
    }
  };

  const handleSlideUpdate = (field: string, value: any) => {
    if (!selectedSlide) return;
    
    const updatedData: any = {};
    if (field === 'title' || field === 'description') {
      updatedData[field] = value;
    } else {
      updatedData.payloadJson = {
        ...selectedSlide.payloadJson,
        [field]: value
      };
    }
    
    updateSlideMutation.mutate({ 
      id: selectedSlide.id, 
      data: updatedData 
    });
    
    // Update local state
    setSelectedSlide(prev => prev ? {
      ...prev,
      ...updatedData,
      payloadJson: updatedData.payloadJson || prev.payloadJson
    } : null);
  };

  // Image upload handler
  const handleImageUpload = (file: File, field: string) => {
    if (!selectedSlide) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      handleSlideUpdate(field, imageUrl);
    };
    reader.readAsDataURL(file);
  };

  // Create a sortable slide component
  const SortableSlide = ({ slide }: { slide: Slide }) => {
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
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all duration-200 border ${
          selectedSlide?.id === slide.id
            ? 'bg-purple-600 text-white border-purple-400'
            : 'hover:bg-gray-600 text-gray-300 border-transparent hover:border-gray-500'
        }`}
        onClick={() => setSelectedSlide(slide)}
      >
        <div 
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-3 h-3" />
        </div>
        <div className="flex-shrink-0">
          {slide.type === 'question' && <HelpCircle className="w-3 h-3" />}
          {slide.type === 'video_message' && <Video className="w-3 h-3" />}
          {slide.type === 'audio_message' && <Volume2 className="w-3 h-3" />}
          {slide.type === 'interlude' && <Pause className="w-3 h-3" />}
          {slide.type === 'media' && <ImageIcon className="w-3 h-3" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{slide.payloadJson?.title || slide.type}</div>
          <div className="text-xs opacity-70 truncate">{slide.type}</div>
        </div>
        <div className="text-xs opacity-50">#{slide.position}</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            deleteSlideMutation.mutate(slide.id);
          }}
          className="h-5 w-5 p-0 text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </motion.div>
    );
  };

  // Render slide content for both preview and editor modes
  const renderSlideContent = (slide: Slide, isPreview: boolean = false) => {
    const payload = slide.payloadJson;

    if (slide.type === 'question') {
      if (isPreview) {
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-4xl mx-auto bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">{slide.title}</h2>
              <p className="text-xl text-white/80">{slide.description}</p>
            </div>
            
            {payload.question_type === 'multiple_choice' && (
              <div className="space-y-4">
                {payload.options?.map((option: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full border-2 border-white/60" />
                      <span className="text-white text-lg">{option.text}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center mt-8 gap-4"
            >
              <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                Previous
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Next
              </Button>
            </motion.div>
          </motion.div>
        );
      }
      return null; // Will be handled in the editor section
    }

    if (slide.type === 'interlude') {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-black/30" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative z-10 text-center max-w-2xl mx-auto px-8"
          >
            <h2 className="text-4xl font-bold text-white mb-6">{slide.title}</h2>
            <p className="text-xl text-white/80 mb-8">{slide.description}</p>
            
            {isPreview && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex justify-center gap-4"
              >
                <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                  Previous
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                  Continue
                </Button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      );
    }

    if (slide.type === 'video_message') {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-4xl mx-auto bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 border border-white/20 shadow-2xl"
        >
          <div className="aspect-video bg-black rounded-xl mb-6 flex items-center justify-center">
            <Play className="w-16 h-16 text-white/60" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">{slide.title}</h3>
          <p className="text-white/80 mb-6">{slide.description}</p>
          
          {isPreview && (
            <div className="flex justify-center gap-4">
              <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                Previous
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Next
              </Button>
            </div>
          )}
        </motion.div>
      );
    }

    if (slide.type === 'audio_message') {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-4xl mx-auto bg-gradient-to-br from-green-900/90 to-teal-900/90 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center">
              <Volume2 className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">{slide.title}</h3>
            <p className="text-white/80 mb-6">{slide.description}</p>
          </div>
          
          <div className="bg-black/30 rounded-2xl p-6 mb-6">
            {payload.audioUrl ? (
              <audio controls className="w-full">
                <source src={payload.audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            ) : (
              <div className="text-center text-white/60 py-8">
                <Volume2 className="w-12 h-12 mx-auto mb-4" />
                <p>Audio content will appear here</p>
              </div>
            )}
          </div>
          
          {isPreview && (
            <div className="flex justify-center gap-4">
              <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                Previous
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Next
              </Button>
            </div>
          )}
        </motion.div>
      );
    }

    if (slide.type === 'media') {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-4xl mx-auto bg-gradient-to-br from-orange-900/90 to-red-900/90 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">{slide.title}</h2>
            <p className="text-xl text-white/80">{slide.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {payload.mediaItems?.map((item: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="aspect-square bg-black/30 rounded-xl overflow-hidden"
              >
                <img 
                  src={item.url} 
                  alt={item.caption || `Media ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ))}
            {(!payload.mediaItems || payload.mediaItems.length === 0) && (
              <div className="col-span-full text-center text-white/60 py-12">
                <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                <p>Media gallery will appear here</p>
              </div>
            )}
          </div>
          
          {isPreview && (
            <div className="flex justify-center gap-4">
              <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                Previous
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Next
              </Button>
            </div>
          )}
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-4xl mx-auto bg-gradient-card backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
      >
        <h3 className="text-2xl font-bold text-white mb-4">{slide.title}</h3>
        <p className="text-white/80 mb-6">{slide.description}</p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-white border-white/30">
            {slide.type}
          </Badge>
        </div>
        
        {isPreview && (
          <div className="flex justify-center gap-4 mt-6">
            <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30">
              Previous
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              Next
            </Button>
          </div>
        )}
      </motion.div>
    );
  };

  // Create a modular slide editor component
  const renderSlideEditor = (slide: Slide) => {
    const payload = slide.payloadJson;

    const editorComponents = {
      audio_message: () => (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 p-6 overflow-y-auto"
        >
          <div className="max-w-4xl mx-auto space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-green-900/90 to-teal-900/90 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Volume2 className="w-8 h-8" />
                  Audio Message Editor
                </h3>
                <Badge variant="outline" className="text-white border-white/30">
                  Audio Content
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <Label className="text-white text-lg font-medium">Audio Title</Label>
                    <Input
                      value={slide.title || ''}
                      onChange={(e) => handleSlideUpdate('title', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-3 text-lg p-4 rounded-xl"
                      placeholder="Enter audio title..."
                    />
                  </motion.div>
                  
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                    <Label className="text-white text-lg font-medium">Description</Label>
                    <Textarea
                      value={slide.description || ''}
                      onChange={(e) => handleSlideUpdate('description', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-3 p-4 rounded-xl min-h-[120px]"
                      placeholder="Describe the audio content..."
                    />
                  </motion.div>
                  
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                    <Label className="text-white text-lg font-medium">Audio URL</Label>
                    <Input
                      value={payload.audioUrl || ''}
                      onChange={(e) => handleSlideUpdate('audioUrl', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-3 rounded-xl p-3"
                      placeholder="Enter audio URL..."
                    />
                  </motion.div>
                </div>
                
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <h4 className="text-white font-medium mb-4 text-lg">Audio Preview</h4>
                  <div className="aspect-video bg-gradient-to-br from-green-800 to-teal-800 rounded-xl flex items-center justify-center">
                    {payload.audioUrl ? (
                      <div className="w-full p-6">
                        <audio controls className="w-full mb-4">
                          <source src={payload.audioUrl} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                        <div className="text-center text-white/80">
                          <Volume2 className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">Audio ready to play</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-white/60">
                        <Volume2 className="w-16 h-16 mx-auto mb-4" />
                        <p>Add an audio URL to preview</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ),

      media: () => (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 p-6 overflow-y-auto"
        >
          <div className="max-w-4xl mx-auto space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-orange-900/90 to-red-900/90 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <ImageIcon className="w-8 h-8" />
                  Media Gallery Editor
                </h3>
                <Badge variant="outline" className="text-white border-white/30">
                  Visual Content
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <Label className="text-white text-lg font-medium">Gallery Title</Label>
                    <Input
                      value={slide.title || ''}
                      onChange={(e) => handleSlideUpdate('title', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-3 text-lg p-4 rounded-xl"
                      placeholder="Enter gallery title..."
                    />
                  </motion.div>
                  
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                    <Label className="text-white text-lg font-medium">Description</Label>
                    <Textarea
                      value={slide.description || ''}
                      onChange={(e) => handleSlideUpdate('description', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-3 p-4 rounded-xl min-h-[120px]"
                      placeholder="Describe the visual content..."
                    />
                  </motion.div>
                  
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                    <Label className="text-white text-lg font-medium">Media Items</Label>
                    <div className="space-y-3 mt-3">
                      <AnimatePresence>
                        {payload.mediaItems?.map((item: any, index: number) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white/5 rounded-xl p-4 border border-white/10"
                          >
                            <div className="space-y-3">
                              <Input
                                value={item.url || ''}
                                onChange={(e) => {
                                  const newItems = [...(payload.mediaItems || [])];
                                  newItems[index] = { ...item, url: e.target.value };
                                  handleSlideUpdate('mediaItems', newItems);
                                }}
                                className="bg-white/10 border-white/20 text-white rounded-xl p-3"
                                placeholder="Image URL..."
                              />
                              <div className="flex gap-3">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload(file, 'mediaItemUrl');
                                  }}
                                  className="hidden"
                                  id={`media-upload-${index}`}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById(`media-upload-${index}`)?.click()}
                                  className="border-white/20 text-white hover:bg-white/10 rounded-xl"
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  Upload
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newItems = (payload.mediaItems || []).filter((_: any, i: number) => i !== index);
                                    handleSlideUpdate('mediaItems', newItems);
                                  }}
                                  className="text-red-400 border-red-400 hover:bg-red-400/20 rounded-xl"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const newItems = [...(payload.mediaItems || []), { url: '', caption: '' }];
                          handleSlideUpdate('mediaItems', newItems);
                        }}
                        className="border-white/20 text-white hover:bg-white/10 rounded-xl p-3 w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Media Item
                      </Button>
                    </div>
                  </motion.div>
                </div>
                
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <h4 className="text-white font-medium mb-4 text-lg">Gallery Preview</h4>
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {payload.mediaItems?.map((item: any, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="aspect-square bg-black/30 rounded-xl overflow-hidden"
                      >
                        {item.url ? (
                          <img 
                            src={item.url} 
                            alt={item.caption || `Media ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/40">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                    {(!payload.mediaItems || payload.mediaItems.length === 0) && (
                      <div className="col-span-2 text-center text-white/60 py-12">
                        <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                        <p>Add media items to see preview</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )
    };

    const editorComponent = editorComponents[slide.type as keyof typeof editorComponents];
    return editorComponent ? editorComponent() : null;
  };

  const renderSlidePreview = () => {
    if (previewMode && selectedWine) {
      const wineSlides = slidesByWine[selectedWine.id] || [];
      const currentSlide = wineSlides[previewSlideIndex];
      
      if (!currentSlide) {
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <h3 className="text-xl mb-4">No slides to preview</h3>
              <Button onClick={() => setPreviewMode(false)} className="bg-purple-600">
                Exit Preview
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex-1 flex flex-col bg-gray-900 relative">
          {/* Preview Navigation */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <div className="bg-black/50 backdrop-blur-lg rounded-lg px-3 py-1 text-white text-sm">
              {previewSlideIndex + 1} / {wineSlides.length}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewSlideIndex(Math.max(0, previewSlideIndex - 1))}
              disabled={previewSlideIndex === 0}
              className="bg-black/50 backdrop-blur-lg border-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewSlideIndex(Math.min(wineSlides.length - 1, previewSlideIndex + 1))}
              disabled={previewSlideIndex === wineSlides.length - 1}
              className="bg-black/50 backdrop-blur-lg border-white/20"
            >
              <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
            </Button>
          </div>

          {/* Full Screen Slide Preview */}
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex items-center justify-center p-8"
          >
            {renderSlideContent(currentSlide, true)}
          </motion.div>
        </div>
      );
    }

    if (!selectedSlide) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Slide Selected</h3>
            <p>Select a slide from the timeline to preview and edit.</p>
          </div>
        </div>
      );
    }

    const payload = selectedSlide.payloadJson;

    // Use modular editor for audio and media slides
    if (selectedSlide.type === 'audio_message' || selectedSlide.type === 'media') {
      const modularEditor = renderSlideEditor(selectedSlide);
      if (modularEditor) return modularEditor;
    }

    if (selectedSlide.type === 'question') {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 p-6 overflow-y-auto"
        >
          <div className="max-w-4xl mx-auto space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <HelpCircle className="w-8 h-8" />
                  Question Slide Editor
                </h3>
                <Badge variant="outline" className="text-white border-white/30">
                  Interactive Question
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Label className="text-white text-lg font-medium">Question Title</Label>
                    <Input
                      value={selectedSlide.title || ''}
                      onChange={(e) => handleSlideUpdate('title', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-3 text-lg p-4 rounded-xl"
                      placeholder="Enter your question title..."
                    />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Label className="text-white text-lg font-medium">Description</Label>
                    <Textarea
                      value={selectedSlide.description || ''}
                      onChange={(e) => handleSlideUpdate('description', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-3 p-4 rounded-xl min-h-[120px]"
                      placeholder="Provide context or instructions..."
                    />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Label className="text-white text-lg font-medium">Question Type</Label>
                    <select
                      value={payload.question_type || 'multiple_choice'}
                      onChange={(e) => handleSlideUpdate('question_type', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 text-white mt-3 rounded-xl px-4 py-3"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="scale">Rating Scale</option>
                      <option value="text">Text Response</option>
                    </select>
                  </motion.div>

                  {payload.question_type === 'multiple_choice' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Label className="text-white text-lg font-medium">Answer Options</Label>
                      <div className="space-y-3 mt-3">
                        <AnimatePresence>
                          {payload.options?.map((option: any, index: number) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="flex gap-3"
                            >
                              <Input
                                value={option.text}
                                onChange={(e) => {
                                  const newOptions = [...payload.options];
                                  newOptions[index] = { ...option, text: e.target.value };
                                  handleSlideUpdate('options', newOptions);
                                }}
                                className="bg-white/10 border-white/20 text-white rounded-xl p-3"
                                placeholder={`Option ${index + 1}`}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newOptions = payload.options.filter((_: any, i: number) => i !== index);
                                  handleSlideUpdate('options', newOptions);
                                }}
                                className="text-red-400 border-red-400 hover:bg-red-400/20 rounded-xl px-3"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const newOptions = [...(payload.options || []), { id: Date.now().toString(), text: 'New Option', description: '' }];
                            handleSlideUpdate('options', newOptions);
                          }}
                          className="border-white/20 text-white hover:bg-white/10 rounded-xl p-3 w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
                >
                  <h4 className="text-white font-medium mb-4 text-lg">Live Preview</h4>
                  <div className="min-h-[400px] flex items-center justify-center">
                    {payload.question_type === 'multiple_choice' ? (
                      <MultipleChoiceQuestion
                        question={payload}
                        value={{ selected: [], notes: '' }}
                        onChange={() => {}}
                      />
                    ) : payload.question_type === 'scale' ? (
                      <ScaleQuestion
                        question={payload}
                        value={5}
                        onChange={() => {}}
                      />
                    ) : (
                      <div className="text-center text-white/70">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4" />
                        <p>Text response question preview</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      );
    }

    if (selectedSlide.type === 'interlude') {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 p-6 overflow-y-auto"
        >
          <div className="max-w-4xl mx-auto space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-indigo-900/90 to-purple-900/90 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Pause className="w-8 h-8" />
                  Interlude Slide Editor
                </h3>
                <Badge variant="outline" className="text-white border-white/30">
                  Transition
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Label className="text-white text-lg font-medium">Title</Label>
                    <Input
                      value={selectedSlide.title || ''}
                      onChange={(e) => handleSlideUpdate('title', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-3 text-lg p-4 rounded-xl"
                      placeholder="Enter transition title..."
                    />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Label className="text-white text-lg font-medium">Message</Label>
                    <Textarea
                      value={selectedSlide.description || ''}
                      onChange={(e) => handleSlideUpdate('description', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-3 p-4 rounded-xl min-h-[120px]"
                      placeholder="Enter your transition message..."
                    />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Label className="text-white text-lg font-medium">Background Image</Label>
                    <div className="mt-3 space-y-3">
                      <Input
                        value={payload.backgroundImage || ''}
                        onChange={(e) => handleSlideUpdate('backgroundImage', e.target.value)}
                        className="bg-white/10 border-white/20 text-white rounded-xl p-3"
                        placeholder="Enter image URL or upload..."
                      />
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, 'backgroundImage');
                          }}
                          className="hidden"
                          id="background-upload"
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('background-upload')?.click()}
                          className="border-white/20 text-white hover:bg-white/10 rounded-xl"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Image
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Label className="text-white text-lg font-medium">Animation Type</Label>
                    <select
                      value={payload.animationType || 'gentle_fade'}
                      onChange={(e) => handleSlideUpdate('animationType', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 text-white mt-3 rounded-xl px-4 py-3"
                    >
                      <option value="gentle_fade">Gentle Fade</option>
                      <option value="slide_transition">Slide Transition</option>
                      <option value="celebration">Celebration</option>
                      <option value="zoom_in">Zoom In</option>
                      <option value="particle_flow">Particle Flow</option>
                    </select>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Label className="text-white text-lg font-medium">Duration (seconds)</Label>
                    <Input
                      type="number"
                      value={payload.duration || 5}
                      onChange={(e) => handleSlideUpdate('duration', parseInt(e.target.value))}
                      className="bg-white/10 border-white/20 text-white mt-3 rounded-xl p-3"
                      min="1"
                      max="300"
                    />
                  </motion.div>
                </div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
                >
                  <h4 className="text-white font-medium mb-4 text-lg">Live Preview</h4>
                  <div className="aspect-video bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl flex items-center justify-center relative overflow-hidden">
                    {payload.backgroundImage && (
                      <img 
                        src={payload.backgroundImage} 
                        alt="Background" 
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/30" />
                    
                    {/* Animation overlay based on type */}
                    {payload.animationType === 'celebration' && (
                      <div className="absolute inset-0 overflow-hidden">
                        {[...Array(20)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ y: '100%', x: Math.random() * 100 + '%', opacity: 0 }}
                            animate={{ 
                              y: '-20%', 
                              opacity: [0, 1, 1, 0],
                              rotate: Math.random() * 360 
                            }}
                            transition={{ 
                              duration: 3, 
                              delay: Math.random() * 2,
                              repeat: Infinity,
                              repeatDelay: Math.random() * 3
                            }}
                            className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                          />
                        ))}
                      </div>
                    )}
                    
                    {payload.animationType === 'particle_flow' && (
                      <div className="absolute inset-0">
                        {[...Array(15)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ x: '-10%', opacity: 0 }}
                            animate={{ 
                              x: '110%', 
                              opacity: [0, 0.6, 0],
                            }}
                            transition={{ 
                              duration: 4, 
                              delay: i * 0.3,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                            className="absolute top-1/2 w-1 h-20 bg-white/20 rounded-full"
                            style={{ transform: `translateY(${Math.random() * 200 - 100}px) rotate(45deg)` }}
                          />
                        ))}
                      </div>
                    )}
                    
                    <motion.div 
                      className="relative z-10 text-center text-white p-4"
                      initial={{ 
                        opacity: payload.animationType === 'zoom_in' ? 0 : 1,
                        scale: payload.animationType === 'zoom_in' ? 0.8 : 1,
                        x: payload.animationType === 'slide_transition' ? -50 : 0
                      }}
                      animate={{ 
                        opacity: 1,
                        scale: 1,
                        x: 0
                      }}
                      transition={{ 
                        duration: payload.animationType === 'gentle_fade' ? 2 : 1,
                        ease: "easeOut"
                      }}
                    >
                      <h2 className="text-2xl font-bold mb-4">{selectedSlide.title || 'Title'}</h2>
                      <p className="text-lg opacity-80">{selectedSlide.description || 'Description'}</p>
                      <div className="mt-4 text-sm opacity-60">
                        Animation: {payload.animationType?.replace('_', ' ').toUpperCase() || 'GENTLE FADE'}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      );
    }

    if (selectedSlide.type === 'video_message') {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 p-6 overflow-y-auto"
        >
          <div className="max-w-4xl mx-auto space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Video className="w-8 h-8" />
                  Video Message Editor
                </h3>
                <Badge variant="outline" className="text-white border-white/30">
                  Video Content
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Label className="text-white text-lg font-medium">Video Title</Label>
                    <Input
                      value={selectedSlide.title || ''}
                      onChange={(e) => handleSlideUpdate('title', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-3 text-lg p-4 rounded-xl"
                      placeholder="Enter video title..."
                    />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Label className="text-white text-lg font-medium">Description</Label>
                    <Textarea
                      value={selectedSlide.description || ''}
                      onChange={(e) => handleSlideUpdate('description', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-3 p-4 rounded-xl min-h-[120px]"
                      placeholder="Describe the video content..."
                    />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Label className="text-white text-lg font-medium">Video URL</Label>
                    <Input
                      value={payload.videoUrl || ''}
                      onChange={(e) => handleSlideUpdate('videoUrl', e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-3 rounded-xl p-3"
                      placeholder="Enter video URL..."
                    />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Label className="text-white text-lg font-medium">Duration (seconds)</Label>
                    <Input
                      type="number"
                      value={payload.duration || 120}
                      onChange={(e) => handleSlideUpdate('duration', parseInt(e.target.value))}
                      className="bg-white/10 border-white/20 text-white mt-3 rounded-xl p-3"
                      min="1"
                      max="1800"
                    />
                  </motion.div>
                </div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
                >
                  <h4 className="text-white font-medium mb-4 text-lg">Video Preview</h4>
                  <div className="aspect-video bg-black rounded-xl flex items-center justify-center">
                    {payload.videoUrl ? (
                      <video 
                        src={payload.videoUrl} 
                        controls 
                        className="w-full h-full rounded-xl"
                        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Cpath fill='%23333' d='M0 0h400v300H0z'/%3E%3C/svg%3E"
                      />
                    ) : (
                      <div className="text-center text-white/60">
                        <Play className="w-16 h-16 mx-auto mb-4" />
                        <p>Add a video URL to preview</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      );
    }

    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-gradient-card backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-2">{selectedSlide.title}</h3>
          <p className="text-white/70">{selectedSlide.description}</p>
          <div className="mt-4">
            <Badge variant="outline" className="text-white">
              {selectedSlide.type}
            </Badge>
          </div>
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
              <h1 className="text-lg font-bold text-white truncate">
                {selectedPackage?.name || packageData?.name || 'Slide Editor'}
              </h1>
              <p className="text-gray-400 text-xs">
                {selectedPackage?.code || packageData?.code || 'No package selected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setPreviewMode(!previewMode);
                if (!previewMode && selectedWine) {
                  const wineSlides = slidesByWine[selectedWine.id] || [];
                  if (wineSlides.length > 0) {
                    setPreviewSlideIndex(0);
                  }
                }
              }}
              className="text-xs px-3 py-2"
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewMode ? 'Exit Preview' : 'Preview'}
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="bg-purple-600 hover:bg-purple-700 text-xs px-3 py-2"
              onClick={() => {
                toast({
                  title: "Changes Saved",
                  description: "All package changes have been saved successfully.",
                });
              }}
            >
              <Save className="w-4 h-4 mr-2" />
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
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => setWineDropdownOpen(!wineDropdownOpen)}
                    className="w-full justify-between border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    {selectedWine ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {selectedWine.position}
                        </div>
                        <span className="truncate">{selectedWine.wineName}</span>
                      </div>
                    ) : (
                      <span>Choose wine...</span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform ${wineDropdownOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  
                  {wineDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                      {selectedPackage?.wines?.map((wine: Wine) => (
                        <Button
                          key={wine.id}
                          variant="ghost"
                          onClick={() => {
                            setSelectedWine(wine);
                            setWineDropdownOpen(false);
                          }}
                          className="w-full justify-start p-2 h-auto text-gray-300 hover:bg-gray-600 border-0"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {wine.position}
                            </div>
                            <div className="text-left">
                              <div className="font-medium">{wine.wineName}</div>
                              <div className="text-xs opacity-70">
                                {slidesByWine[wine.id]?.length || 0} slides
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
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
                
                <div className="space-y-3">
                  {selectedPackage?.wines?.map((wine: Wine) => {
                    const wineSlides = slidesByWine[wine.id] || [];
                    const isExpanded = expandedWines.has(wine.id);
                    return (
                      <div 
                        key={wine.id}
                        className={`border rounded-lg transition-colors ${
                          selectedWine?.id === wine.id 
                            ? 'border-purple-500 bg-purple-500/10' 
                            : 'border-gray-600 bg-gray-800/50'
                        }`}
                      >
                        <div 
                          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-700/50"
                          onClick={() => {
                            setSelectedWine(wine);
                            toggleWineExpansion(wine.id);
                          }}
                        >
                          <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {wine.position}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium text-sm truncate">{wine.wineName}</h4>
                            <p className="text-xs text-gray-400">{wineSlides.length} slides</p>
                          </div>
                          <ChevronDown 
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`} 
                          />
                        </div>
                        
                        {isExpanded && wineSlides.length > 0 && (
                          <div className="border-t border-gray-600 p-2">
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDragEnd}
                            >
                              <SortableContext
                                items={wineSlides.map(s => s.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-1">
                                  {wineSlides.map((slide: Slide) => (
                                    <SortableSlide key={slide.id} slide={slide} />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderSlidePreview()}
        </div>
      </div>
    </div>
  );
}