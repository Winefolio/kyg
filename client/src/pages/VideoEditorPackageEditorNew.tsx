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
  BarChart3,
  Save, 
  Eye, 
  Plus,
  Play,
  Pause,
  Settings,
  Edit3,
  Trash2,
  Volume2,
  Wine,
  Video,
  MessageSquare,
  HelpCircle,
  Image as ImageIcon,
  X,
  Upload,
  GripVertical,
  Menu,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
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
  const [collapsedWines, setCollapsedWines] = useState<Record<string, boolean>>({});

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

  // Get wine slides for the selected wine
  const wineSlides = selectedWine ? slidesByWine[selectedWine.id] || [] : [];

  // Generate all slides with automatic wine transitions for preview
  const getAllSlidesWithTransitions = () => {
    if (!selectedPackage?.wines) return [];
    
    let allSlidesWithTransitions: any[] = [];
    const sortedWines = [...selectedPackage.wines].sort((a: any, b: any) => a.position - b.position);
    
    sortedWines.forEach((wine: any, wineIndex: number) => {
      const wineSlides = slidesByWine[wine.id] || [];
      
      // Add wine transition slide (except for the first wine)
      if (wineIndex > 0) {
        allSlidesWithTransitions.push({
          id: `transition-${wine.id}`,
          type: 'wine_transition',
          title: `Wine ${wineIndex + 1}: ${wine.wineName}`,
          description: wine.wineDescription || 'Prepare for the next wine in our tasting journey',
          payloadJson: {
            wineName: wine.wineName,
            wineDescription: wine.wineDescription,
            wineImageUrl: wine.wineImageUrl,
            position: wine.position,
            animationType: 'slide_transition',
            backgroundImage: wine.wineImageUrl || 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080'
          },
          packageWineId: wine.id,
          position: -1, // Special position for transitions
          sectionType: 'transition'
        });
      }
      
      // Add wine slides sorted by position
      const sortedSlides = [...wineSlides].sort((a, b) => a.position - b.position);
      allSlidesWithTransitions.push(...sortedSlides);
    });
    
    return allSlidesWithTransitions;
  };

  // Get progress for each wine
  const getWineProgress = (wineId: string) => {
    const slides = slidesByWine[wineId] || [];
    const totalSlides = slides.length;
    const completedSlides = slides.filter(slide => slide.id === selectedSlide?.id).length;
    return totalSlides > 0 ? Math.round((completedSlides / totalSlides) * 100) : 0;
  };

  // Toggle wine collapse state
  const toggleWineCollapse = (wineId: string) => {
    setCollapsedWines(prev => ({
      ...prev,
      [wineId]: !prev[wineId]
    }));
  };

  // Toggle wine expansion in timeline
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

  // Render slide content based on type
  const renderSlideContent = (slide: any, isPreview: boolean = false) => {
    if (!slide) return null;

    if (slide.type === 'wine_transition') {
      return renderWineTransition(slide, isPreview);
    }

    const payload = slide.payloadJson || slide.payload_json || {};

    switch (slide.type) {
      case 'question':
        return renderQuestionSlide(slide, payload, isPreview);
      case 'interlude':
        return renderInterludeSlide(slide, payload, isPreview);
      case 'video_message':
        return renderVideoSlide(slide, payload, isPreview);
      case 'audio_message':
        return renderAudioSlide(slide, payload, isPreview);
      case 'media':
        return renderMediaSlide(slide, payload, isPreview);
      default:
        return (
          <div className="text-white text-center">
            <p>Unsupported slide type: {slide.type}</p>
          </div>
        );
    }
  };

  // Render question slide with proper question types
  const renderQuestionSlide = (slide: any, payload: any, isPreview: boolean = false) => {
    if (payload.question_type === 'multiple_choice') {
      return (
        <div className="w-full max-w-4xl mx-auto">
          <MultipleChoiceQuestion
            question={{
              title: payload.title || payload.question || 'Question',
              description: payload.description || '',
              category: payload.category || 'General',
              options: payload.options || [],
              allow_multiple: payload.allow_multiple || payload.allowMultiple || false,
              allow_notes: payload.allow_notes || payload.allowNotes || false
            }}
            value={null}
            onChange={() => {}}
          />
        </div>
      );
    }

    if (payload.question_type === 'scale') {
      return (
        <div className="w-full max-w-4xl mx-auto">
          <ScaleQuestion
            question={{
              title: payload.title || 'Scale Question',
              description: payload.description || '',
              category: payload.category || 'Scale',
              scale_min: payload.scale_min || 1,
              scale_max: payload.scale_max || 10,
              scale_labels: payload.scale_labels || ['Low', 'High']
            }}
            value={payload.scale_min || 1}
            onChange={() => {}}
          />
        </div>
      );
    }

    return (
      <div className="w-full max-w-4xl mx-auto bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">{payload.title || 'Question'}</h3>
        <p className="text-white/70 mb-4">{payload.description || ''}</p>
        <Badge variant="outline" className="text-white">
          {payload.question_type || 'Unknown Question Type'}
        </Badge>
      </div>
    );
  };

  // Render interlude slide
  const renderInterludeSlide = (slide: any, payload: any, isPreview: boolean = false) => {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl mx-auto bg-gradient-to-br from-purple-900/90 to-indigo-900/90 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl text-center text-white relative overflow-hidden"
      >
        {payload.backgroundImage && (
          <img 
            src={payload.backgroundImage} 
            alt="Background" 
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-4">{payload.title || 'Take a Moment'}</h2>
          <p className="text-xl text-white/90 mb-6">{payload.description || 'Reflect on this experience'}</p>
          {payload.duration && (
            <p className="text-purple-200">Duration: {payload.duration} seconds</p>
          )}
        </div>
      </motion.div>
    );
  };

  // Render video slide
  const renderVideoSlide = (slide: any, payload: any, isPreview: boolean = false) => {
    return (
      <div className="w-full max-w-4xl mx-auto bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-white mb-2">{payload.title || 'Video Message'}</h3>
          <p className="text-white/70">{payload.description || ''}</p>
        </div>
        <div className="bg-black/50 rounded-2xl p-8 text-center">
          <Video className="w-16 h-16 mx-auto mb-4 text-white/60" />
          <p className="text-white/60">Video Player</p>
          {payload.videoUrl && (
            <p className="text-xs text-white/40 mt-2">URL: {payload.videoUrl}</p>
          )}
        </div>
      </div>
    );
  };

  // Render audio slide
  const renderAudioSlide = (slide: any, payload: any, isPreview: boolean = false) => {
    return (
      <div className="w-full max-w-4xl mx-auto bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-white mb-2">{payload.title || 'Audio Message'}</h3>
          <p className="text-white/70">{payload.description || ''}</p>
        </div>
        <div className="bg-black/50 rounded-2xl p-8 text-center">
          <Volume2 className="w-16 h-16 mx-auto mb-4 text-white/60" />
          <p className="text-white/60">Audio Player</p>
          {payload.audioUrl && (
            <p className="text-xs text-white/40 mt-2">URL: {payload.audioUrl}</p>
          )}
        </div>
      </div>
    );
  };

  // Render media slide
  const renderMediaSlide = (slide: any, payload: any, isPreview: boolean = false) => {
    return (
      <div className="w-full max-w-4xl mx-auto bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-white mb-2">{payload.title || 'Media Gallery'}</h3>
          <p className="text-white/70">{payload.description || ''}</p>
        </div>
        <div className="bg-black/50 rounded-2xl p-8 text-center">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-white/60" />
          <p className="text-white/60">Media Gallery</p>
          {payload.mediaItems && (
            <p className="text-xs text-white/40 mt-2">{payload.mediaItems.length} items</p>
          )}
        </div>
      </div>
    );
  };

  // Render slide editor
  const renderSlideEditor = () => {
    if (!selectedSlide) return null;

    const payload = selectedSlide.payloadJson || {};

    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Slide Preview */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Live Preview
            </h3>
            <div className="bg-black rounded-xl p-4 min-h-[300px] flex items-center justify-center">
              {renderSlideContent(selectedSlide, false)}
            </div>
          </div>

          {/* Slide Properties */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Slide Properties
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-white">Slide Type</Label>
                <Badge variant="outline" className="text-white ml-2">
                  {selectedSlide.type}
                </Badge>
              </div>
              
              {payload.title && (
                <div>
                  <Label className="text-white">Title</Label>
                  <Input 
                    value={payload.title || ''}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    readOnly
                  />
                </div>
              )}
              
              {payload.description && (
                <div>
                  <Label className="text-white">Description</Label>
                  <Textarea 
                    value={payload.description || ''}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    readOnly
                  />
                </div>
              )}

              {payload.category && (
                <div>
                  <Label className="text-white">Category</Label>
                  <Input 
                    value={payload.category || ''}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    readOnly
                  />
                </div>
              )}

              {payload.question_type && (
                <div>
                  <Label className="text-white">Question Type</Label>
                  <Badge variant="outline" className="text-white ml-2">
                    {payload.question_type}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render wine transition slide
  const renderWineTransition = (slide: any, isPreview: boolean = false) => {
    const payload = slide.payloadJson;
    
    return (
      <motion.div
        initial={{ opacity: 0, x: isPreview ? 50 : 0 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-4xl mx-auto bg-gradient-to-br from-amber-900/90 to-orange-900/90 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl relative overflow-hidden"
      >
        {payload.backgroundImage && (
          <img 
            src={payload.backgroundImage} 
            alt="Wine Background" 
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-transparent" />
        
        <div className="relative z-10 text-center text-white">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-8"
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center">
              <Video className="w-12 h-12 text-amber-300" />
            </div>
            <h2 className="text-4xl font-bold mb-4">{slide.title}</h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">{slide.description}</p>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-amber-200"
          >
            <p className="text-lg">Take a moment to cleanse your palate</p>
            <p className="text-sm opacity-75 mt-2">Prepare for the next wine experience</p>
          </motion.div>
          
          {/* Floating particles animation */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: '100%', x: Math.random() * 100 + '%', opacity: 0 }}
                animate={{ 
                  y: '-20%', 
                  opacity: [0, 0.6, 0],
                }}
                transition={{ 
                  duration: 4, 
                  delay: i * 0.5,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
                className="absolute w-1 h-8 bg-amber-300/40 rounded-full"
              />
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  // Update slides when data changes
  useEffect(() => {
    if (slidesData?.slides) {
      setAllSlides(slidesData.slides);
    }
  }, [slidesData]);

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
              variant="ghost"
              size="sm"
              onClick={() => setPreviewMode(true)}
              className="text-gray-400 hover:text-white"
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-12'} bg-gray-800 border-r border-gray-700 flex-shrink-0 transition-all duration-200 overflow-hidden`}>
          {/* Sidebar Header */}
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-white"
            >
              <Menu className="w-4 h-4" />
            </Button>
            {sidebarOpen && (
              <h2 className="text-white font-semibold text-sm">Slide Editor</h2>
            )}
          </div>

          {sidebarOpen && (
            <div className="flex-1 overflow-y-auto">
              {/* Package Selection */}
              <div className="p-3 border-b border-gray-700">
                <h3 className="text-white font-semibold mb-3 text-sm">Package</h3>
                <select
                  value={selectedPackage?.id || ''}
                  onChange={(e) => {
                    const packageId = e.target.value;
                    const pkg = packages?.find(p => p.id === packageId);
                    if (pkg) {
                      setSelectedPackage(pkg);
                      setSelectedWine(null);
                      setSelectedSlide(null);
                    }
                  }}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 text-sm"
                >
                  <option value="">Select package...</option>
                  {packages?.map((pkg: any) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.packageName} ({pkg.packageCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Wine Progress Overview */}
              <div className="p-3 border-b border-gray-700">
                <h3 className="text-white font-semibold mb-3 text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Wine Progress
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {selectedPackage?.wines?.sort((a: any, b: any) => a.position - b.position).map((wine: Wine) => {
                    const wineSlides = slidesByWine[wine.id] || [];
                    const progress = wineSlides.length > 0 ? Math.round((wineSlides.filter(slide => slide.id === selectedSlide?.id).length / wineSlides.length) * 100) : 0;
                    const isCollapsed = collapsedWines[wine.id];
                    const isSelected = selectedWine?.id === wine.id;
                    
                    return (
                      <div key={wine.id} className="space-y-1">
                        <div 
                          className={`p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                            isSelected ? 'bg-purple-600/20 border border-purple-500/30' : 'bg-gray-700/50 hover:bg-gray-600/50'
                          }`}
                          onClick={() => {
                            setSelectedWine(wine);
                            toggleWineCollapse(wine.id);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {wine.position}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-white text-sm truncate">{wine.wineName}</div>
                                <div className="text-xs text-gray-400">
                                  {wineSlides.length} slides • {progress}% complete
                                </div>
                              </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isCollapsed ? '' : 'rotate-180'}`} />
                          </div>
                          
                          {/* Progress bar */}
                          <div className="mt-2 h-1 bg-gray-600 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-purple-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                        
                        {/* Collapsible slides list */}
                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="ml-4 space-y-1 overflow-hidden"
                            >
                              {wineSlides.sort((a, b) => a.position - b.position).map((slide, index) => (
                                <motion.div
                                  key={slide.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  className={`p-2 rounded text-xs cursor-pointer transition-all ${
                                    selectedSlide?.id === slide.id 
                                      ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50' 
                                      : 'bg-gray-600/30 text-gray-300 hover:bg-gray-500/30'
                                  }`}
                                  onClick={() => setSelectedSlide(slide)}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 flex items-center justify-center">
                                      {slide.type === 'question' && <HelpCircle className="w-3 h-3" />}
                                      {slide.type === 'interlude' && <Pause className="w-3 h-3" />}
                                      {slide.type === 'video_message' && <Video className="w-3 h-3" />}
                                      {slide.type === 'audio_message' && <Volume2 className="w-3 h-3" />}
                                      {slide.type === 'media' && <ImageIcon className="w-3 h-3" />}
                                    </div>
                                    <span className="truncate flex-1">{slide.title || `${slide.type} slide`}</span>
                                    <span className="text-xs opacity-60">#{slide.position}</span>
                                  </div>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Slide Templates */}
              <div className="p-3 border-b border-gray-700">
                <h3 className="text-white font-semibold mb-3 text-sm">Add Slides</h3>
                <div className="space-y-2">
                  {SLIDE_TEMPLATES.map((template) => (
                    <Button
                      key={template.type}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700"
                      onClick={() => {
                        // Add slide functionality would go here
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {template.icon}
                        <span className="text-xs">{template.name}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {previewMode && selectedPackage ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            >
              <button
                onClick={() => setPreviewMode(false)}
                className="absolute top-6 right-6 z-10 text-white/80 hover:text-white"
              >
                <X className="w-8 h-8" />
              </button>
              
              <div className="relative w-full h-full flex items-center justify-center p-6">
                {renderSlideContent(getAllSlidesWithTransitions()[previewSlideIndex], true)}
              </div>
              
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                <Button
                  onClick={() => setPreviewSlideIndex(Math.max(0, previewSlideIndex - 1))}
                  disabled={previewSlideIndex === 0}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                
                <div className="text-white px-4 py-2 bg-black/30 rounded-lg">
                  {previewSlideIndex + 1} / {getAllSlidesWithTransitions().length}
                </div>
                
                <Button
                  onClick={() => setPreviewSlideIndex(Math.min(getAllSlidesWithTransitions().length - 1, previewSlideIndex + 1))}
                  disabled={previewSlideIndex === getAllSlidesWithTransitions().length - 1}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          ) : selectedSlide ? (
            <div className="flex-1 overflow-y-auto">
              {renderSlideEditor()}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-white/60">
                <Edit3 className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Select a Slide to Edit</h3>
                <p>Choose a slide from the timeline to start editing</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}