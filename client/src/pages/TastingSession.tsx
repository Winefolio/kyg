import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SegmentedProgressBar } from "@/components/ui/SegmentedProgressBar";
import { MultipleChoiceQuestion } from "@/components/questions/MultipleChoiceQuestion";
import { EnhancedMultipleChoice } from "@/components/questions/EnhancedMultipleChoice";
import { ScaleQuestion } from "@/components/questions/ScaleQuestion";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useSessionPersistence } from "@/hooks/useSessionPersistence";
import { useHaptics } from "@/hooks/useHaptics";
import { apiRequest } from "@/lib/queryClient";
import { Menu, Users, BadgeCheck, CloudOff, ArrowLeft, ArrowRight, X, CheckCircle, Clock, Pause, Award, Wine, ChevronDown } from "lucide-react";
import { DynamicTextRenderer } from "@/components/ui/DynamicTextRenderer";
import { WineTransition } from "@/components/WineTransition";
import { SectionTransition } from "@/components/SectionTransition";
import type { Slide, Participant, Session, Package } from "@shared/schema";

export default function TastingSession() {
  const { sessionId, participantId } = useParams();
  const [, setLocation] = useLocation();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completedSlides, setCompletedSlides] = useState<number[]>([]);
  const [isTransitioningSection, setIsTransitioningSection] = useState(false);
  const [transitionSectionName, setTransitionSectionName] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [showSectionTransition, setShowSectionTransition] = useState(false);
  const [sectionTransitionData, setSectionTransitionData] = useState<{
    fromSection: string;
    toSection: string;
    wineName: string;
  } | null>(null);
  const [expandedWines, setExpandedWines] = useState<Record<string, boolean>>({});
  const { saveResponse, syncStatus, initializeForSession, endSession } = useSessionPersistence();
  const { triggerHaptic } = useHaptics();
  const queryClient = useQueryClient();

  // Initialize session storage when component mounts
  useEffect(() => {
    if (sessionId && participantId) {
      initializeForSession(sessionId, participantId);
    }
  }, [sessionId, participantId, initializeForSession]);

  // Get session details including status
  const { data: currentSession, isLoading: sessionDetailsLoading } = useQuery<Session & { packageCode?: string }>({
    queryKey: [`/api/sessions/${sessionId}`],
    enabled: !!sessionId,
    refetchInterval: 3000, // Refetch every 3 seconds to check status
  });

  // Get participant data
  const { data: participant } = useQuery<Participant>({
    queryKey: [`/api/participants/${participantId}`],
    enabled: !!participantId
  });

  // Get session slides and wine data - use dynamic package code from session
  const { data: slidesData, isLoading } = useQuery<{ package: Package; slides: Slide[]; totalCount: number; wines: any[] }>({
    queryKey: [`/api/packages/${currentSession?.packageCode}/slides`, participantId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/packages/${currentSession?.packageCode}/slides?participantId=${participantId}`, null);
      return response.json();
    },
    enabled: !!currentSession?.packageCode && !!participantId
  });

  // Extract wines data from slides response
  const packageData = slidesData ? { wines: slidesData.wines } : null;

  // Get participant responses
  const { data: responses } = useQuery({
    queryKey: [`/api/participants/${participantId}/responses`],
    enabled: !!participantId
  });

  if (sessionDetailsLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center text-white p-8">
        <h2 className="text-2xl font-semibold mb-2">Session Not Found</h2>
        <p className="text-purple-200 text-center">The session you're looking for doesn't exist or has expired.</p>
      </div>
    );
  }

  // Handle session status
  if (currentSession.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center text-white p-8">
        <div className="text-center">
          <Clock className="w-16 h-16 mx-auto mb-4 text-purple-300 animate-pulse" />
          <h2 className="text-2xl font-semibold mb-2">Waiting for Session to Start</h2>
          <p className="text-purple-200">The host will begin the tasting shortly...</p>
        </div>
      </div>
    );
  }

  if (currentSession.status === 'paused') {
    return (
      <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center text-white p-8">
        <div className="text-center">
          <Pause className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
          <h2 className="text-2xl font-semibold mb-2">Session Paused</h2>
          <p className="text-purple-200">Please wait while the host resumes the session...</p>
        </div>
      </div>
    );
  }

  if (!slidesData || !slidesData.slides || slidesData.slides.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center text-white p-8">
        <h2 className="text-2xl font-semibold mb-2">No Content Available</h2>
        <p className="text-purple-200 text-center">This session doesn't have any slides configured yet.</p>
      </div>
    );
  }

  const allSlides = slidesData.slides || [];
  const wines = slidesData.wines || [];
  
  // Filter out transition slides from navigation (they auto-play between regular slides)
  const rawSlides = allSlides.filter(slide => slide.type !== 'transition');
  
  // Group slides by wine and sort them properly within each wine
  const slidesByWine = rawSlides.reduce((acc: Record<string, any[]>, slide) => {
    const wineId = slide.packageWineId;
    if (!acc[wineId]) {
      acc[wineId] = [];
    }
    acc[wineId].push(slide);
    return acc;
  }, {});

  // Separate package-level intro slides from wine-specific slides
  let packageIntroSlides: any[] = [];
  const wineSpecificSlidesByWine: Record<string, any[]> = {};
  
  Object.keys(slidesByWine).forEach(wineId => {
    const wineSlides = slidesByWine[wineId];
    const wine = wines.find(w => w.id === wineId);
    const isFirstWine = wine?.position === 1;
    
    // Sort slides by position
    const sortedWineSlides = wineSlides.sort((a, b) => a.position - b.position);
    
    if (isFirstWine) {
      // For first wine, identify package intro slides (usually the first slide with generic content)
      const firstSlide = sortedWineSlides[0];
      if (firstSlide && (
        firstSlide.payloadJson?.title?.includes('Welcome') || 
        firstSlide.payloadJson?.title?.includes('Your Wine Tasting') ||
        firstSlide.position === 1
      )) {
        packageIntroSlides.push(firstSlide);
        firstSlide._computedSection = 'package_intro';
        wineSpecificSlidesByWine[wineId] = sortedWineSlides.slice(1); // Rest of slides
      } else {
        wineSpecificSlidesByWine[wineId] = sortedWineSlides;
      }
    } else {
      wineSpecificSlidesByWine[wineId] = sortedWineSlides;
    }
  });

  // Sort each wine's slides to follow Intro → Deep Dive → Ending progression
  const sortedSlidesByWine = Object.keys(wineSpecificSlidesByWine).reduce((acc, wineId) => {
    const wineSlides = wineSpecificSlidesByWine[wineId];
    
    if (wineSlides.length === 0) {
      acc[wineId] = [];
      return acc;
    }
    
    // SMART SECTION ASSIGNMENT: Override database section_type with position-based logic
    const totalSlides = wineSlides.length;
    const introCount = Math.ceil(totalSlides * 0.4); // First 40%
    const deepDiveCount = Math.ceil(totalSlides * 0.4); // Next 40%
    // Remaining slides are ending (last 20%)
    
    const introSlides = wineSlides.slice(0, introCount);
    const deepDiveSlides = wineSlides.slice(introCount, introCount + deepDiveCount);
    const endingSlides = wineSlides.slice(introCount + deepDiveCount);
    
    // Override section_type for proper flow detection
    introSlides.forEach(slide => {
      slide._computedSection = 'intro';
    });
    deepDiveSlides.forEach(slide => {
      slide._computedSection = 'deep_dive';
    });
    endingSlides.forEach(slide => {
      slide._computedSection = 'ending';
    });
    
    // Combine in proper order: Intro → Deep Dive → Ending
    acc[wineId] = [...introSlides, ...deepDiveSlides, ...endingSlides];
    return acc;
  }, {} as Record<string, any[]>);

  // Create final ordered slides array: Package intro first, then wines in order
  const slides = [
    ...packageIntroSlides, // Package welcome slide appears first
    ...wines
      .sort((a, b) => a.position - b.position)
      .flatMap(wine => sortedSlidesByWine[wine.id] || [])
  ];
    
  const currentSlide = slides[currentSlideIndex];
  const currentWine = currentSlide ? wines.find(w => w.id === currentSlide.packageWineId) : null;

  // Helper function to get section for a slide (defined early to avoid hoisting issues)
  const getSlideSection = (slide: any) => {
    // Use computed section if available (from our smart assignment)
    if (slide._computedSection) {
      return slide._computedSection;
    }
    // Fallback to database section_type
    return slide.section_type || slide.payloadJson?.section_type || 'intro';
  };

  // Helper function to check if current slide is the last slide of its section
  const isLastSlideOfSection = (slideIndex: number, wineSlides: any[], currentSection: string) => {
    const currentSlideInWine = slideIndex - (currentWine ? slides.findIndex(s => s.packageWineId === currentWine.id) : 0);
    
    // Find all slides in current section
    const sectionSlides = wineSlides.filter(slide => getSlideSection(slide) === currentSection);
    const lastSlideInSection = sectionSlides[sectionSlides.length - 1];
    const lastSlideIndexInWine = wineSlides.findIndex(s => s.id === lastSlideInSection?.id);
    
    return currentSlideInWine === lastSlideIndexInWine;
  };

  // Calculate section progress based on current wine's slides only
  const currentWineSlides = currentWine ? sortedSlidesByWine[currentWine.id] || [] : [];
  const currentWineStartIndex = currentWine ? slides.findIndex(s => s.packageWineId === currentWine.id) : 0;
  const currentSlideInWine = currentSlideIndex - currentWineStartIndex;
  
  const sectionNames = ['intro', 'deep dive', 'ending'];
  const sections = sectionNames.map((sectionName) => {
    // Find section slides within current wine using computed sections
    const sectionSlides = currentWineSlides.filter(slide => {
      const computedSection = getSlideSection(slide);
      if (sectionName === 'intro') return computedSection === 'intro';
      if (sectionName === 'deep dive') return computedSection === 'deep_dive' || computedSection === 'tasting';
      if (sectionName === 'ending') return computedSection === 'ending' || computedSection === 'conclusion';
      return false;
    });
    
    if (sectionSlides.length === 0) {
      // Fallback: divide current wine's slides into three equal sections
      const totalWineSlides = currentWineSlides.length;
      const slidesPerSection = Math.ceil(totalWineSlides / 3);
      let sectionIndex = 0;
      if (sectionName === 'deep dive') sectionIndex = 1;
      if (sectionName === 'ending') sectionIndex = 2;
      
      const startIndex = sectionIndex * slidesPerSection;
      const endIndex = Math.min(startIndex + slidesPerSection, totalWineSlides);
      const isActive = currentSlideInWine >= startIndex && currentSlideInWine < endIndex;
      const isCompleted = currentSlideInWine >= endIndex;
      const progress = isCompleted ? 100 : isActive ? ((currentSlideInWine - startIndex + 1) / slidesPerSection) * 100 : 0;
      
      return {
        name: sectionName,
        progress: Math.max(0, Math.min(100, progress)),
        isActive,
        isCompleted
      };
    }
    
    // Find section boundaries within current wine
    const firstSlideIndex = currentWineSlides.findIndex(s => sectionSlides.includes(s));
    const lastSlideIndex = currentWineSlides.findIndex(s => s === sectionSlides[sectionSlides.length - 1]);
    const isActive = currentSlideInWine >= firstSlideIndex && currentSlideInWine <= lastSlideIndex;
    
    // Section is only completed when we've FINISHED the last slide (not just reached it)
    const isCompleted = currentSlideInWine > lastSlideIndex || 
      (currentSlideInWine === lastSlideIndex && completedSlides.includes(slides.findIndex(s => s.id === currentWineSlides[lastSlideIndex]?.id)));
    
    // Progress calculation: only show 100% when section is fully completed
    let progress = 0;
    if (isCompleted) {
      progress = 100;
    } else if (isActive) {
      // Show incremental progress within the section, but never reach 100% until completed
      const progressInSection = (currentSlideInWine - firstSlideIndex) / sectionSlides.length;
      progress = Math.min(95, progressInSection * 100); // Cap at 95% until completion
    }
    
    return {
      name: sectionName,
      progress: Math.max(0, Math.min(100, progress)),
      isActive,
      isCompleted
    };
  });



  // Navigation functions
  const goToNextSlide = async () => {
    if (currentSlideIndex < slides.length - 1) {
      const nextSlide = slides[currentSlideIndex + 1];
      const nextWine = wines.find(w => w.id === nextSlide.packageWineId);
      
      const currentSection = getSlideSection(currentSlide);
      const nextSection = getSlideSection(nextSlide);
      
      // Check if we're transitioning to a new wine
      if (currentWine && nextWine && currentWine.id !== nextWine.id) {
        setIsTransitioningSection(true);
        setTransitionSectionName(nextWine.wineName);
        triggerHaptic('success');
        
        setTimeout(() => {
          setCurrentSlideIndex(currentSlideIndex + 1);
          setCompletedSlides(prev => [...prev, currentSlideIndex]);
          setIsTransitioningSection(false);
        }, 2500); // Extended to 2.5 seconds for proper animation loading
      } 
      // Check if we're transitioning to a new section within the same wine
      // ONLY trigger section transition when completing the LAST slide of current section
      else if (currentWine && nextWine && currentWine.id === nextWine.id && 
               currentSection !== nextSection && 
               isLastSlideOfSection(currentSlideIndex, currentWineSlides, currentSection)) {
        setSectionTransitionData({
          fromSection: currentSection,
          toSection: nextSection,
          wineName: currentWine.wineName
        });
        setShowSectionTransition(true);
        triggerHaptic('success');
      } else {
        setIsNavigating(true);
        triggerHaptic('success');
        
        setTimeout(() => {
          setCurrentSlideIndex(currentSlideIndex + 1);
          setCompletedSlides(prev => [...prev, currentSlideIndex]);
          setIsNavigating(false);
        }, 150);
      }
    }
  };

  const handleSectionTransitionComplete = () => {
    setShowSectionTransition(false);
    setCurrentSlideIndex(currentSlideIndex + 1);
    setCompletedSlides(prev => [...prev, currentSlideIndex]);
    setSectionTransitionData(null);
  };

  const goToPreviousSlide = () => {
    if (currentSlideIndex > 0) {
      setIsNavigating(true);
      triggerHaptic('selection');
      
      setTimeout(() => {
        setCurrentSlideIndex(currentSlideIndex - 1);
        setCompletedSlides(prev => prev.filter(i => i !== currentSlideIndex));
        setIsNavigating(false);
      }, 150);
    }
  };

  const jumpToSlide = (slideIndex: number) => {
    if (slideIndex !== currentSlideIndex) {
      setIsNavigating(true);
      triggerHaptic('selection');
      
      setTimeout(() => {
        setCurrentSlideIndex(slideIndex);
        setIsNavigating(false);
      }, 150);
    }
    setSidebarOpen(false);
  };

  // Handle answer changes
  const handleAnswerChange = (slideId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [slideId]: answer }));
    saveResponse(slideId, answer);
  };

  // Handle completion
  const handleComplete = async () => {
    triggerHaptic('success');
    const progress = 100;
    
    // Navigate to completion page
    setLocation(`/completion/${sessionId}/${participantId}?progress=${progress}`);
  };

  // Render current slide content
  const renderSlideContent = () => {
    if (!currentSlide) return null;

    switch (currentSlide.type) {
      case 'interlude':
        return (
          <motion.div
            key={`interlude-${currentSlide.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl text-center"
          >
            <h2 className="text-2xl font-bold text-white mb-4">
              <DynamicTextRenderer text={currentSlide.payloadJson.title} />
            </h2>
            {currentSlide.payloadJson.description && (
              <p className="text-white/80 text-lg leading-relaxed">
                <DynamicTextRenderer text={currentSlide.payloadJson.description} />
              </p>
            )}
          </motion.div>
        );

      case 'question':
        const questionData = currentSlide.payloadJson;
        
        if (questionData.questionType === 'multiple_choice' || questionData.question_type === 'multiple_choice') {
          return (
            <MultipleChoiceQuestion
              question={{
                title: questionData.title || questionData.question,
                description: questionData.description || '',
                category: questionData.category || 'Question',
                options: questionData.options || [],
                allow_multiple: questionData.allow_multiple || questionData.allowMultiple || false,
                allow_notes: questionData.allow_notes || questionData.allowNotes || false
              }}
              value={answers[currentSlide.id] || { selected: [], notes: '' }}
              onChange={(value) => handleAnswerChange(currentSlide.id, value)}
            />
          );
        }

        if (questionData.questionType === 'scale' || questionData.question_type === 'scale') {
          return (
            <ScaleQuestion
              question={{
                title: questionData.title || questionData.question,
                description: questionData.description || '',
                category: questionData.category || 'Scale',
                scale_min: questionData.scale_min || questionData.scaleMin || 1,
                scale_max: questionData.scale_max || questionData.scaleMax || 10,
                scale_labels: questionData.scale_labels || questionData.scaleLabels || ['Low', 'High']
              }}
              value={answers[currentSlide.id] || questionData.scale_min || questionData.scaleMin || 1}
              onChange={(value) => handleAnswerChange(currentSlide.id, value)}
            />
          );
        }

        return (
          <div className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">
              <DynamicTextRenderer text={questionData.title || questionData.question || 'Question'} />
            </h3>
            <p className="text-white/70 text-sm">
              <DynamicTextRenderer text={questionData.description || ''} />
            </p>
          </div>
        );

      default:
        return (
          <div className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl text-center">
            <p className="text-white">Unknown slide type: {currentSlide.type}</p>
          </div>
        );
    }
  };

  // Wine transition overlay
  if (isTransitioningSection && currentWine) {
    const nextSlide = slides[currentSlideIndex + 1];
    const nextWine = nextSlide ? wines.find(w => w.id === nextSlide.packageWineId) : null;
    
    return (
      <WineTransition
        currentWine={{
          wineName: currentWine.wineName,
          wineDescription: currentWine.wineDescription || '',
          wineImageUrl: currentWine.wineImageUrl || '',
          position: wines.findIndex(w => w.id === currentWine.id) + 1
        }}
        nextWine={nextWine ? {
          wineName: nextWine.wineName,
          wineDescription: nextWine.wineDescription || '',
          wineImageUrl: nextWine.wineImageUrl || '',
          position: wines.findIndex(w => w.id === nextWine.id) + 1
        } : undefined}
        onContinue={() => {
          setCurrentSlideIndex(currentSlideIndex + 1);
          setCompletedSlides(prev => [...prev, currentSlideIndex]);
          setIsTransitioningSection(false);
        }}
      />
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-primary flex relative">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              
              {/* Sidebar content */}
              <motion.div
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
                className="fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-purple-950/95 to-purple-900/95 backdrop-blur-xl border-r border-white/10 z-50 lg:relative lg:w-96"
              >
                <div className="flex flex-col h-full">
                  {/* Sidebar header */}
                  <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-white">Wine Tasting</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSidebarOpen(false)}
                        className="text-white hover:bg-white/10 lg:hidden"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                    
                    {/* Overall progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/80">Overall Progress</span>
                        <span className="text-white font-medium">
                          {Math.round(((currentSlideIndex + 1) / slides.length) * 100)}%
                        </span>
                      </div>
                      <Progress value={((currentSlideIndex + 1) / slides.length) * 100} className="h-2" />
                    </div>

                    {/* Sync status */}
                    <div className="flex items-center justify-between mt-3 text-xs">
                      <span className="text-white/60">Session Status</span>
                      <div className="flex items-center space-x-1">
                        {syncStatus === 'synced' ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-green-400">Synced</span>
                          </>
                        ) : syncStatus === 'syncing' ? (
                          <>
                            <div className="w-3 h-3 rounded-full border border-yellow-400 border-t-transparent animate-spin" />
                            <span className="text-yellow-400">Syncing</span>
                          </>
                        ) : (
                          <>
                            <CloudOff className="w-3 h-3 text-red-400" />
                            <span className="text-red-400">Offline</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Wine sections */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {wines.map((wine, wineIndex) => {
                      const wineSlides = slidesByWine[wine.id] || [];
                      const wineStartIndex = slides.findIndex(s => s.packageWineId === wine.id);
                      const isExpanded = expandedWines[wine.id];
                      const section = sections[wineIndex];

                      return (
                        <motion.div
                          key={wine.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: wineIndex * 0.1 }}
                          className="space-y-3"
                        >
                          {/* Wine header */}
                          <button
                            onClick={() => setExpandedWines(prev => ({ ...prev, [wine.id]: !isExpanded }))}
                            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                section.isCompleted ? 'bg-green-400' : 
                                section.isActive ? 'bg-purple-400' : 'bg-white/30'
                              }`} />
                              <div className="text-left">
                                <h3 className="font-medium text-white">
                                  <DynamicTextRenderer text={wine.wineName} />
                                </h3>
                                <p className="text-xs text-white/60">
                                  <DynamicTextRenderer text={wine.wineDescription || ''} />
                                </p>
                              </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`} />
                          </button>

                          {/* Wine progress */}
                          <div className="px-4">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-white/60">
                                {wineSlides.length} slides
                              </span>
                              <span className="text-white/80">
                                {Math.round(section.progress)}%
                              </span>
                            </div>
                            <Progress value={section.progress} className="h-1" />
                          </div>

                          {/* Slides list */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-2 overflow-hidden"
                              >
                                {wineSlides.map((slide, slideIndex) => {
                                  const globalSlideIndex = wineStartIndex + slideIndex;
                                  const isCompleted = completedSlides.includes(globalSlideIndex);
                                  const isCurrent = globalSlideIndex === currentSlideIndex;

                                  return (
                                    <button
                                      key={slide.id}
                                      onClick={() => jumpToSlide(globalSlideIndex)}
                                      className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                                        isCurrent 
                                          ? 'bg-purple-500/30 border border-purple-400/50' 
                                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                                      }`}
                                    >
                                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                        isCompleted ? 'bg-green-400' : 
                                        isCurrent ? 'bg-purple-400' : 'bg-white/30'
                                      }`} />
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${
                                          isCurrent ? 'text-purple-100' : 'text-white'
                                        }`}>
                                          {slide.type === 'interlude' 
                                            ? (slide.payloadJson as any)?.title || 'Interlude'
                                            : (slide.payloadJson as any)?.title || (slide.payloadJson as any)?.question || 'Question'
                                          }
                                        </p>
                                        <p className="text-xs text-white/60 capitalize">
                                          {slide.type.replace('_', ' ')}
                                        </p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="text-white hover:bg-white/10"
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <div className="text-white">
                  <h1 className="font-semibold">
                    <DynamicTextRenderer text={currentWine?.wineName || 'Wine Tasting'} />
                  </h1>
                  <p className="text-xs text-white/60">
                    <DynamicTextRenderer text={slidesData.package.name} />
                  </p>
                </div>
              </div>
              
              <div className="text-right text-white">
                <p className="text-sm font-medium">{currentSlideIndex + 1} of {slides.length}</p>
                <p className="text-xs text-white/60">
                  {Math.round(((currentSlideIndex + 1) / slides.length) * 100)}% complete
                </p>
              </div>
            </div>
            
            {/* Section progress bars */}
            <div className="mt-4">
              <SegmentedProgressBar 
                sections={sections}
                currentWineName={currentWine?.wineName}
                currentOverallProgressInfo={`${currentSlideIndex + 1} of ${slides.length} slides`}
                onSectionClick={(sectionName) => {
                  const wine = wines.find(w => w.wineName === sectionName);
                  if (wine) {
                    const wineStartIndex = slides.findIndex(s => s.packageWineId === wine.id);
                    if (wineStartIndex !== -1) {
                      jumpToSlide(wineStartIndex);
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Main slide content */}
          <div className="flex-1 flex flex-col p-3 pb-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide?.id || currentSlideIndex}
                initial={{ opacity: 0, x: isNavigating ? (currentSlideIndex > 0 ? 20 : -20) : 0, y: 20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: isNavigating ? (currentSlideIndex < slides.length - 1 ? -20 : 20) : 0, y: -20 }}
                transition={{ 
                  duration: 0.4, 
                  ease: "easeInOut",
                  opacity: { duration: 0.3 },
                  y: { duration: 0.4, ease: "easeOut" }
                }}
                className="flex-grow flex flex-col justify-center max-w-2xl mx-auto w-full"
              >
                {renderSlideContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation footer */}
          <div className="flex-shrink-0 p-4 border-t border-white/10 bg-gradient-to-t from-purple-950/20 to-transparent">
            <div className="flex justify-between items-center max-w-2xl mx-auto">
              <Button
                variant="ghost"
                onClick={goToPreviousSlide}
                disabled={currentSlideIndex === 0 || isNavigating}
                className="text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {/* Slide indicators */}
              <div className="flex space-x-2">
                {slides.slice(Math.max(0, currentSlideIndex - 2), currentSlideIndex + 3).map((_, relativeIndex) => {
                  const actualIndex = Math.max(0, currentSlideIndex - 2) + relativeIndex;
                  return (
                    <button
                      key={actualIndex}
                      onClick={() => jumpToSlide(actualIndex)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        actualIndex === currentSlideIndex 
                          ? 'bg-purple-400 scale-125' 
                          : actualIndex < currentSlideIndex 
                            ? 'bg-purple-600 hover:bg-purple-500' 
                            : 'bg-white/30 hover:bg-white/50'
                      }`}
                      aria-label={`Go to slide ${actualIndex + 1}`}
                    />
                  );
                })}
              </div>

              <Button
                variant="ghost"
                onClick={currentSlideIndex >= slides.length - 1 ? handleComplete : goToNextSlide}
                disabled={isNavigating}
                className="text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentSlideIndex >= slides.length - 1 ? 'Complete' : 'Next'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Section Transition Overlay */}
      {showSectionTransition && sectionTransitionData && (
        <SectionTransition
          isVisible={showSectionTransition}
          fromSection={sectionTransitionData.fromSection}
          toSection={sectionTransitionData.toSection}
          wineName={sectionTransitionData.wineName}
          onComplete={handleSectionTransitionComplete}
          duration={2500}
        />
      )}
    </>
  );
}