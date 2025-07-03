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
import { TextQuestion } from "@/components/questions/TextQuestion";
import { BooleanQuestion } from "@/components/questions/BooleanQuestion";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useSessionPersistence } from "@/hooks/useSessionPersistence";
import { useHaptics } from "@/hooks/useHaptics";
import { apiRequest } from "@/lib/queryClient";
import { Menu, Users, BadgeCheck, CloudOff, ArrowLeft, ArrowRight, X, CheckCircle, Clock, Pause, Award, Wine, ChevronDown } from "lucide-react";
import { DynamicTextRenderer } from "@/components/ui/DynamicTextRenderer";
import { WineTransition } from "@/components/WineTransition";
import { WineIntroduction } from "@/components/WineIntroduction";
import { SectionTransition } from "@/components/SectionTransition";
import { VideoMessageSlide } from "@/components/slides/VideoMessageSlide";
import { AudioMessageSlide } from "@/components/slides/AudioMessageSlide";
import { TransitionSlide } from "@/components/slides/TransitionSlide";
import type { Slide, Participant, Session, Package, VideoMessagePayload, AudioMessagePayload, TransitionPayload } from "@shared/schema";

// Configurable transition durations (in milliseconds)
const TRANSITION_DURATIONS = {
  slideNavigation: 600,        // Delay before changing slides
  slideJump: 400,             // Delay when jumping to a specific slide
  slideAnimation: {           // Framer Motion animation config
    type: "spring",
    stiffness: 200,
    damping: 25,
    mass: 0.8,
    opacity: { duration: 0.4 },
    scale: { duration: 0.5 }
  },
  packageIntroAnimation: {    // Special animation for package intro
    type: "spring",
    stiffness: 150,
    damping: 20,
    duration: 0.8,
    opacity: { duration: 0.6 }
  }
};

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
  const [showingWineIntroduction, setShowingWineIntroduction] = useState(false);
  const [wineIntroductionData, setWineIntroductionData] = useState<{
    wine: any;
    isFirstWine: boolean;
  } | null>(null);
  const { saveResponse, syncStatus, initializeForSession, endSession } = useSessionPersistence();
  const { triggerHaptic } = useHaptics();
  const queryClient = useQueryClient();

  // Initialize session storage when component mounts
  useEffect(() => {
    if (sessionId && participantId) {
      initializeForSession(sessionId, participantId);
    }
  }, [sessionId, participantId, initializeForSession]);

  // Get session details including status - handle both session ID and package code
  const { data: currentSession, isLoading: sessionDetailsLoading } = useQuery<Session & { packageCode?: string }>({
    queryKey: [`/api/sessions/${sessionId}`],
    queryFn: async () => {
      // First try as session ID
      try {
        const response = await apiRequest('GET', `/api/sessions/${sessionId}`, null);
        return response.json();
      } catch (error: any) {
        // If 404, try looking up by package code
        if (error.message.includes('404')) {
          console.log(`Session ${sessionId} not found, trying as package code...`);
          const response = await apiRequest('GET', `/api/sessions/by-package/${sessionId}`, null);
          return response.json();
        }
        throw error;
      }
    },
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
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-card backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-xl max-w-md w-full text-center"
        >
          <Wine className="w-16 h-16 mx-auto mb-4 text-purple-300" />
          <h2 className="text-2xl font-semibold text-white mb-2">Preparing Your Wine Journey</h2>
          <p className="text-purple-200 mb-6">Loading tasting experience...</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          </div>
        </motion.div>
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
  // All wines should now start from position 1 (no more position 0 wines after migration)
  const wines = slidesData.wines || [];
  
  // Include transition slides in the navigation flow
  const rawSlides = allSlides;
  
  // Separate package-level slides from wine-level slides
  const packageLevelSlides = rawSlides.filter(slide => slide.packageId && !slide.packageWineId);
  const wineLevelSlides = rawSlides.filter(slide => slide.packageWineId);
  
  // Group wine-level slides by wine
  const slidesByWine = wineLevelSlides.reduce((acc: Record<string, any[]>, slide) => {
    const wineId = slide.packageWineId;
    if (!wineId) return acc; // Skip slides without packageWineId
    if (!acc[wineId]) {
      acc[wineId] = [];
    }
    acc[wineId].push(slide);
    return acc;
  }, {});

  // Handle package intro slides
  let packageIntroSlides: any[] = packageLevelSlides.sort((a, b) => (a.globalPosition || 0) - (b.globalPosition || 0));
  const wineSpecificSlidesByWine: Record<string, any[]> = {};
  
  Object.keys(slidesByWine).forEach(wineId => {
    const wineSlides = slidesByWine[wineId];
    const wine = wines.find(w => w.id === wineId);

    
    // Sort slides by position
    const sortedWineSlides = wineSlides.sort((a, b) => a.position - b.position);
    
    // DON'T extract package intro - treat all slides as wine-specific for consistent section math
    wineSpecificSlidesByWine[wineId] = sortedWineSlides;
    
    // Mark package welcome slide if it exists, but keep it in wine flow
    if (wine?.position === 1 && sortedWineSlides[0]) {
      const firstSlide = sortedWineSlides[0];
      if (firstSlide.payloadJson?.title?.includes('Welcome') || 
          firstSlide.payloadJson?.title?.includes('Your Wine Tasting')) {
        firstSlide._isPackageIntro = true;

      }
    }
  });

  // Sort each wine's slides using database section_type (now properly organized)
  const sortedSlidesByWine = Object.keys(wineSpecificSlidesByWine).reduce((acc, wineId) => {
    const wineSlides = wineSpecificSlidesByWine[wineId];
    const wine = wines.find(w => w.id === wineId);
    
    if (wineSlides.length === 0) {
      acc[wineId] = [];
      return acc;
    }
    
    // Separate slides by database section_type
    const introSlides = wineSlides.filter(slide => {
      const sectionType = slide.section_type || slide.payloadJson?.section_type;
      return sectionType === 'intro';
    }).sort((a, b) => a.position - b.position);
    
    const deepDiveSlides = wineSlides.filter(slide => {
      const sectionType = slide.section_type || slide.payloadJson?.section_type;
      return sectionType === 'deep_dive' || sectionType === 'tasting';
    }).sort((a, b) => a.position - b.position);
    
    const endingSlides = wineSlides.filter(slide => {
      const sectionType = slide.section_type || slide.payloadJson?.section_type;
      return sectionType === 'ending' || sectionType === 'conclusion';
    }).sort((a, b) => a.position - b.position);
    

    
    // Combine in proper order: Intro → Deep Dive → Ending
    acc[wineId] = [...introSlides, ...deepDiveSlides, ...endingSlides];
    return acc;
  }, {} as Record<string, any[]>);

  // Create final ordered slides array: Package slides first, then wine slides in order
  const wineSlides = wines
    .sort((a, b) => a.position - b.position)
    .flatMap(wine => sortedSlidesByWine[wine.id] || []);
  
  const slides = [...packageIntroSlides, ...wineSlides];
    
  const currentSlide = slides[currentSlideIndex];
  const currentWine = currentSlide ? wines.find(w => w.id === currentSlide.packageWineId) : null;
  const isPackageLevelSlide = currentSlide && currentSlide.packageId && !currentSlide.packageWineId;

  // Helper function to get section for a slide (defined early to avoid hoisting issues)
  const getSlideSection = (slide: any) => {
    // Use database section_type (now properly organized)
    return slide.section_type || slide.payloadJson?.section_type || 'intro';
  };

  // Helper function to check if current slide is the last slide of its section
  const isLastSlideOfSection = (slideIndex: number, wineSlides: any[], currentSection: string) => {
    const currentSlideInWine = slideIndex - (currentWine ? slides.findIndex(s => s.packageWineId === currentWine.id) : 0);
    
    // Find all slides in current section
    const sectionSlides = wineSlides.filter(slide => getSlideSection(slide) === currentSection);
    const lastSlideInSection = sectionSlides[sectionSlides.length - 1];
    const lastSlideIndexInWine = wineSlides.findIndex(s => s.id === lastSlideInSection?.id);
    
    const isLast = currentSlideInWine === lastSlideIndexInWine;
    
    // Debug logging for section detection
    console.log(`🔍 Section boundary check for "${currentSection}":`, {
      slideIndex,
      currentSlideInWine,
      sectionSlides: sectionSlides.length,
      lastSlideIndexInWine,
      isLastSlide: isLast,
      sectionSlideIds: sectionSlides.map(s => ({ id: s.id, section: getSlideSection(s) }))
    });
    
    return isLast;
  };

  // Calculate section progress based on current wine's slides only (or package context for package-level slides)
  const currentWineSlides = currentWine ? sortedSlidesByWine[currentWine.id] || [] : (isPackageLevelSlide ? packageIntroSlides : []);
  const currentWineStartIndex = currentWine ? slides.findIndex(s => s.packageWineId === currentWine.id) : (isPackageLevelSlide ? 0 : 0);
  const currentSlideInWine = currentSlideIndex - currentWineStartIndex;
  
  const sectionNames = ['Introduction', 'Deep Dive', 'Final Thoughts'];
  const sections = sectionNames.map((sectionName) => {
    // Find section slides within current wine using computed sections
    const sectionSlides = currentWineSlides.filter(slide => {
      const computedSection = getSlideSection(slide);
      if (sectionName === 'Introduction') return computedSection === 'intro';
      if (sectionName === 'Deep Dive') return computedSection === 'deep_dive' || computedSection === 'tasting';
      if (sectionName === 'Final Thoughts') return computedSection === 'ending' || computedSection === 'conclusion';
      return false;
    });
    
    if (sectionSlides.length === 0) {
      // Fallback: divide current wine's slides into three equal sections
      const totalWineSlides = currentWineSlides.length;
      const slidesPerSection = Math.ceil(totalWineSlides / 3);
      let sectionIndex = 0;
      if (sectionName === 'Deep Dive') sectionIndex = 1;
      if (sectionName === 'Final Thoughts') sectionIndex = 2;
      
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
      

      
      // Check if we're leaving package intro or transitioning to a new wine
      const isLeavingPackageIntro = currentSlide?.payloadJson?.is_package_intro === true;
      
      // Check if the next slide is a transition slide
      const nextSlideIsTransition = nextSlide?.type === 'transition';
      
      if (((currentWine && nextWine && currentWine.id !== nextWine.id) || isLeavingPackageIntro) && !nextSlideIsTransition) {
        // Only show automatic transition if there's no manual transition slide
        setIsTransitioningSection(true);
        setTransitionSectionName(nextWine.wineName);
        triggerHaptic('success');
        
        // Show wine transition for 2.5 seconds, then check if wine introduction needed
        setTimeout(() => {
          const nextWinePosition = nextWine.position; // Use the actual position from the wine object
          const isFirstWine = nextWinePosition === 1;
          
          setIsTransitioningSection(false);
          
          // Always show wine introduction when leaving package intro or transitioning wines
          setWineIntroductionData({
            wine: {
              wineName: nextWine.wineName,
              wineDescription: nextWine.wineDescription,
              wineImageUrl: nextWine.wineImageUrl,
              position: nextWinePosition
            },
            isFirstWine
          });
          setShowingWineIntroduction(true);
        }, 0);
      } 
      // Check if we're transitioning to a new section within the same wine
      // ONLY trigger section transition when completing the LAST slide of current section
      else if (currentWine && nextWine && currentWine.id === nextWine.id && 
               currentSection !== nextSection && 
               isLastSlideOfSection(currentSlideIndex, currentWineSlides, currentSection) &&
               !nextSlideIsTransition) {
        
        // Debug logging for section transitions
        console.log('🎯 SECTION TRANSITION DETECTED:');
        console.log(`   From: ${currentSection} → To: ${nextSection}`);
        console.log(`   Wine: ${currentWine.wineName}`);
        console.log(`   Current slide index: ${currentSlideIndex}`);
        console.log(`   Current slide in wine: ${currentSlideIndex - currentWineStartIndex}`);
        console.log(`   Is last slide of section: ${isLastSlideOfSection(currentSlideIndex, currentWineSlides, currentSection)}`);
        
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
        }, TRANSITION_DURATIONS.slideNavigation);
      }
    }
  };

  const handleSectionTransitionComplete = () => {
    setShowSectionTransition(false);
    // Add bounds checking to prevent accessing undefined slides
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
      setCompletedSlides(prev => [...prev, currentSlideIndex]);
    } else {
      // End of slides reached, complete the session
      handleComplete();
    }
    setSectionTransitionData(null);
  };

  const handleWineIntroductionComplete = () => {
    setShowingWineIntroduction(false);
    setWineIntroductionData(null);
    // Add bounds checking to prevent accessing undefined slides
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
      setCompletedSlides(prev => [...prev, currentSlideIndex]);
    } else {
      // End of slides reached, complete the session
      handleComplete();
    }
  };

  const goToPreviousSlide = () => {
    if (currentSlideIndex > 0) {
      setIsNavigating(true);
      triggerHaptic('selection');
      
      setTimeout(() => {
        setCurrentSlideIndex(currentSlideIndex - 1);
        setCompletedSlides(prev => prev.filter(i => i !== currentSlideIndex));
        setIsNavigating(false);
      }, 600);
    }
  };

  const jumpToSlide = (slideIndex: number) => {
    if (slideIndex !== currentSlideIndex) {
      setIsNavigating(true);
      triggerHaptic('selection');
      
      setTimeout(() => {
        setCurrentSlideIndex(slideIndex);
        setIsNavigating(false);
      }, TRANSITION_DURATIONS.slideJump);
    }
    setSidebarOpen(false);
  };

  // Handle answer changes
  const handleAnswerChange = (slideId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [slideId]: answer }));
    if (participantId) {
      saveResponse(participantId, slideId, answer);
    }
  };

  // Handle completion
  const handleComplete = async () => {
    triggerHaptic('success');
    const progress = 100;
    
    // End the session properly
    endSession();
    
    // Navigate to completion page using the actual session ID from currentSession
    const actualSessionId = currentSession?.id || sessionId;
    setLocation(`/completion/${actualSessionId}/${participantId}?progress=${progress}`);
  };

  // Render current slide content
  const renderSlideContent = () => {
    if (!currentSlide) return null;

    switch (currentSlide.type) {
      case 'interlude':
        const isPackageIntro = currentSlide.payloadJson.is_package_intro;
        const isWineIntro = currentSlide.payloadJson.is_wine_intro;
        const wineImage = currentSlide.payloadJson.wine_image || currentSlide.payloadJson.wine_image_url;
        
        return (
          <motion.div
            key={`interlude-${currentSlide.id}`}
            initial={{ opacity: 0, y: isPackageIntro ? 40 : 20, scale: isPackageIntro ? 0.9 : 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={isPackageIntro ? TRANSITION_DURATIONS.packageIntroAnimation : undefined}
            className="bg-gradient-card backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/20 shadow-2xl text-center"
          >
            {isPackageIntro && (
              <div className="mb-3 sm:mb-4">
                {currentSlide.payloadJson.package_image || currentSlide.payloadJson.background_image ? (
                  <img 
                    src={currentSlide.payloadJson.package_image || currentSlide.payloadJson.background_image} 
                    alt={currentSlide.payloadJson.package_name || "Package"} 
                    className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 mx-auto rounded-xl object-cover shadow-2xl border-2 sm:border-4 border-white/20"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLDivElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full items-center justify-center" style={{display: 'none'}}>
                  <Wine className="w-8 h-8 text-white" />
                </div>
              </div>
            )}
            
            {isWineIntro && wineImage && (
              <div className="mb-3 sm:mb-4">
                <img 
                  src={wineImage} 
                  alt={currentSlide.payloadJson.wine_name || "Wine"} 
                  className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mx-auto rounded-lg object-cover shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-3">
              <DynamicTextRenderer text={currentSlide.payloadJson.title} />
            </h2>
            
            {currentSlide.payloadJson.description && (
              <p className="text-white/80 text-sm sm:text-base lg:text-lg leading-relaxed mb-3 sm:mb-4 max-w-2xl mx-auto">
                <DynamicTextRenderer text={currentSlide.payloadJson.description} />
              </p>
            )}
            
            {isWineIntro && (
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3 sm:mt-4 text-xs sm:text-sm">
                {currentSlide.payloadJson.wine_type && (
                  <div className="bg-white/10 rounded-lg p-2 sm:p-3">
                    <p className="text-white/60 text-[10px] sm:text-xs">Type</p>
                    <p className="text-white font-medium text-xs sm:text-sm">{currentSlide.payloadJson.wine_type}</p>
                  </div>
                )}
                {currentSlide.payloadJson.wine_region && (
                  <div className="bg-white/10 rounded-lg p-2 sm:p-3">
                    <p className="text-white/60 text-[10px] sm:text-xs">Region</p>
                    <p className="text-white font-medium text-xs sm:text-sm">{currentSlide.payloadJson.wine_region}</p>
                  </div>
                )}
                {currentSlide.payloadJson.wine_vintage && (
                  <div className="bg-white/10 rounded-lg p-2 sm:p-3">
                    <p className="text-white/60 text-[10px] sm:text-xs">Vintage</p>
                    <p className="text-white font-medium text-xs sm:text-sm">{currentSlide.payloadJson.wine_vintage}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        );

      case 'video_message':
        return (
          <VideoMessageSlide
            payload={currentSlide.payloadJson as VideoMessagePayload}
            key={`video-${currentSlide.id}`}
          />
        );

      case 'audio_message':
        return (
          <AudioMessageSlide
            payload={currentSlide.payloadJson as AudioMessagePayload}
            key={`audio-${currentSlide.id}`}
          />
        );

      case 'question':
        // Check for new generic_questions format first
        if (currentSlide.genericQuestions) {
          const gq = currentSlide.genericQuestions;
          
          switch (gq.format) {
            case 'multiple_choice':
              return (
                <MultipleChoiceQuestion
                  question={{
                    title: gq.config.title,
                    description: gq.config.description || '',
                    category: gq.metadata?.category || 'Question',
                    options: gq.config.options || [],
                    allow_multiple: gq.config.allowMultiple || false,
                    allow_notes: gq.config.allowNotes || false
                  }}
                  value={answers[currentSlide.id] || { selected: [], notes: '' }}
                  onChange={(value) => handleAnswerChange(currentSlide.id, value)}
                />
              );
            
            case 'scale':
              return (
                <ScaleQuestion
                  question={{
                    title: gq.config.title,
                    description: gq.config.description || '',
                    category: gq.metadata?.category || 'Scale',
                    scale_min: gq.config.scaleMin || 1,
                    scale_max: gq.config.scaleMax || 10,
                    scale_labels: gq.config.scaleLabels || ['Low', 'High']
                  }}
                  value={answers[currentSlide.id] ?? Math.floor(((gq.config.scaleMin || 1) + (gq.config.scaleMax || 10)) / 2)}
                  onChange={(value) => handleAnswerChange(currentSlide.id, value)}
                />
              );
            
            case 'text':
              return (
                <TextQuestion
                  question={{
                    title: gq.config.title,
                    description: gq.config.description,
                    placeholder: (gq.config as any).placeholder,
                    maxLength: (gq.config as any).maxLength,
                    minLength: (gq.config as any).minLength,
                    rows: (gq.config as any).rows,
                    category: gq.config.category
                  }}
                  value={answers[currentSlide.id] || ''}
                  onChange={(value) => handleAnswerChange(currentSlide.id, value)}
                />
              );
            
            case 'boolean':
              return (
                <BooleanQuestion
                  question={{
                    title: gq.config.title,
                    description: gq.config.description,
                    category: gq.config.category,
                    trueLabel: (gq.config as any).trueLabel,
                    falseLabel: (gq.config as any).falseLabel,
                    trueIcon: (gq.config as any).trueIcon,
                    falseIcon: (gq.config as any).falseIcon
                  }}
                  value={answers[currentSlide.id] ?? null}
                  onChange={(value) => handleAnswerChange(currentSlide.id, value)}
                />
              );
            
            case 'video_message':
              return (
                <VideoMessageSlide
                  payload={{
                    title: gq.config.title,
                    description: gq.config.description,
                    video_url: (gq.config as any).video_url,
                    autoplay: (gq.config as any).autoplay || false,
                    show_controls: (gq.config as any).controls !== false
                  } as VideoMessagePayload}
                  key={`video-legacy-${currentSlide.id}`}
                />
              );
            
            case 'audio_message':
              return (
                <AudioMessageSlide
                  payload={{
                    title: gq.config.title,
                    description: gq.config.description,
                    audio_url: (gq.config as any).audio_url,
                    autoplay: (gq.config as any).autoplay || false,
                    show_controls: true
                  } as AudioMessagePayload}
                  key={`audio-legacy-${currentSlide.id}`}
                />
              );
            
            default:
              return (
                <div className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    <DynamicTextRenderer text={gq.config.title} />
                  </h3>
                  <p className="text-white/70 text-sm">
                    Unsupported question format: {gq.format}
                  </p>
                </div>
              );
          }
        }

        // Fallback to legacy payloadJson format
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
              value={answers[currentSlide.id] ?? Math.floor(((questionData.scale_min || questionData.scaleMin || 1) + (questionData.scale_max || questionData.scaleMax || 10)) / 2)}
              onChange={(value) => handleAnswerChange(currentSlide.id, value)}
            />
          );
        }

        if (questionData.questionType === 'video_message' || questionData.question_type === 'video_message') {
          return (
            <VideoMessageSlide
              payload={{
                title: questionData.title || questionData.question || '',
                description: questionData.description || '',
                video_url: questionData.video_url || '',
                autoplay: questionData.autoplay || false,
                show_controls: questionData.controls !== false
              } as VideoMessagePayload}
              key={`video-legacy-${currentSlide.id}`}
            />
          );
        }

        if (questionData.questionType === 'text' || questionData.question_type === 'text') {
          return (
            <TextQuestion
              question={{
                title: questionData.title || questionData.question,
                description: questionData.description || '',
                placeholder: questionData.placeholder || '',
                maxLength: questionData.maxLength || questionData.max_length || 500,
                minLength: questionData.minLength || questionData.min_length,
                rows: questionData.rows || 4,
                category: questionData.category || 'Text Response'
              }}
              value={answers[currentSlide.id] || ''}
              onChange={(value) => handleAnswerChange(currentSlide.id, value)}
            />
          );
        }

        if (questionData.questionType === 'boolean' || questionData.question_type === 'boolean') {
          return (
            <BooleanQuestion
              question={{
                title: questionData.title || questionData.question,
                description: questionData.description || '',
                category: questionData.category || 'Yes/No',
                trueLabel: questionData.trueLabel || questionData.true_label,
                falseLabel: questionData.falseLabel || questionData.false_label,
                trueIcon: questionData.trueIcon !== false,
                falseIcon: questionData.falseIcon !== false
              }}
              value={answers[currentSlide.id] ?? null}
              onChange={(value) => handleAnswerChange(currentSlide.id, value)}
            />
          );
        }

        if (questionData.questionType === 'audio_message' || questionData.question_type === 'audio_message') {
          return (
            <AudioMessageSlide
              payload={{
                title: questionData.title || questionData.question || '',
                description: questionData.description || '',
                audio_url: questionData.audio_url || '',
                autoplay: questionData.autoplay || false,
                show_controls: true
              } as AudioMessagePayload}
              key={`audio-legacy-${currentSlide.id}`}
            />
          );
        }

        // Enhanced fallback detection for questions that don't match standard patterns
        console.log('Question fallback triggered for slide:', currentSlide.id, 'questionData:', questionData);
        
        // Try to detect boolean questions by content analysis
        const title = questionData.title || questionData.question || '';
        const isLikelyBoolean = title.toLowerCase().includes('yes') || 
                              title.toLowerCase().includes('no') || 
                              title.toLowerCase().includes('true') || 
                              title.toLowerCase().includes('false') ||
                              (questionData.options && questionData.options.length === 2);
        
        if (isLikelyBoolean) {
          return (
            <BooleanQuestion
              question={{
                title: title,
                description: questionData.description || '',
                category: questionData.category || 'Yes/No',
                trueLabel: questionData.trueLabel || questionData.true_label || 'Yes',
                falseLabel: questionData.falseLabel || questionData.false_label || 'No',
                trueIcon: questionData.trueIcon !== false,
                falseIcon: questionData.falseIcon !== false
              }}
              value={answers[currentSlide.id] ?? null}
              onChange={(value) => handleAnswerChange(currentSlide.id, value)}
            />
          );
        }
        
        // Try to detect multiple choice by options array
        if (questionData.options && Array.isArray(questionData.options) && questionData.options.length > 2) {
          return (
            <MultipleChoiceQuestion
              question={{
                title: title,
                description: questionData.description || '',
                category: questionData.category || 'Multiple Choice',
                options: questionData.options,
                allow_multiple: questionData.allow_multiple || questionData.allowMultiple || false,
                allow_notes: questionData.allow_notes || questionData.allowNotes || false
              }}
              value={answers[currentSlide.id] || { selected: [], notes: '' }}
              onChange={(value) => handleAnswerChange(currentSlide.id, value)}
            />
          );
        }
        
        // Try to detect scale questions
        if (questionData.scale_min !== undefined || questionData.scaleMin !== undefined ||
            questionData.scale_max !== undefined || questionData.scaleMax !== undefined) {
          return (
            <ScaleQuestion
              question={{
                title: title,
                description: questionData.description || '',
                category: questionData.category || 'Scale',
                scale_min: questionData.scale_min || questionData.scaleMin || 1,
                scale_max: questionData.scale_max || questionData.scaleMax || 10,
                scale_labels: questionData.scale_labels || questionData.scaleLabels || ['Low', 'High']
              }}
              value={answers[currentSlide.id] ?? Math.floor(((questionData.scale_min || questionData.scaleMin || 1) + (questionData.scale_max || questionData.scaleMax || 10)) / 2)}
              onChange={(value) => handleAnswerChange(currentSlide.id, value)}
            />
          );
        }
        
        // Fallback to text question for any unidentified question
        return (
          <TextQuestion
            question={{
              title: title,
              description: questionData.description || '',
              placeholder: questionData.placeholder || 'Enter your response...',
              maxLength: questionData.maxLength || questionData.max_length || 500,
              minLength: questionData.minLength || questionData.min_length,
              rows: questionData.rows || 4,
              category: questionData.category || 'Response'
            }}
            value={answers[currentSlide.id] || ''}
            onChange={(value) => handleAnswerChange(currentSlide.id, value)}
          />
        );

      case 'transition':
        const transitionPayload = currentSlide.payloadJson as TransitionPayload;
        return (
          <TransitionSlide
            payload={transitionPayload}
            onContinue={goToNextSlide}
            autoAdvance={!transitionPayload.showContinueButton}
          />
        );

      default:
        return (
          <div className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl text-center">
            <p className="text-white">Unknown slide type: {currentSlide.type}</p>
          </div>
        );
    }
  };

  // Wine introduction for 2nd, 3rd, etc. wines
  if (showingWineIntroduction && wineIntroductionData) {
    return (
      <WineIntroduction
        wine={wineIntroductionData.wine}
        isFirstWine={wineIntroductionData.isFirstWine}
        onContinue={handleWineIntroductionComplete}
      />
    );
  }

  // Wine transition overlay
  if (isTransitioningSection && currentWine) {
    const nextSlide = slides[currentSlideIndex + 1];
    const nextWine = nextSlide ? wines.find(w => w.id === nextSlide.packageWineId) : null;
    const isFromPackageIntro = currentSlide?.payloadJson?.is_package_intro === true;
    
    return (
      <WineTransition
        currentWine={{
          wineName: currentWine.wineName,
          wineDescription: currentWine.wineDescription || '',
          wineImageUrl: currentWine.wineImageUrl || '',
          position: isFromPackageIntro ? 0 : currentWine.position // Use 0 for package intro to hide wine number
        }}
        nextWine={nextWine ? {
          wineName: nextWine.wineName,
          wineDescription: nextWine.wineDescription || '',
          wineImageUrl: nextWine.wineImageUrl || '',
          position: nextWine.position // Use actual position from wine object
        } : undefined}
        sectionType={currentSlide?.section_type}
        onContinue={() => {
          // Add bounds checking to prevent accessing undefined slides
          if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(currentSlideIndex + 1);
            setCompletedSlides(prev => [...prev, currentSlideIndex]);
          } else {
            // End of slides reached, complete the session
            handleComplete();
          }
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
                                  Wine {wineIndex + 1}: <DynamicTextRenderer text={wine.wineName} />
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
                    {currentSlide?._isPackageIntro ? (
                      <DynamicTextRenderer text={slidesData.package.name} />
                    ) : (
                      <DynamicTextRenderer text={currentWine?.wineName || 'Wine Tasting'} />
                    )}
                  </h1>
                  <p className="text-xs text-white/60">
                    {currentSlide?._isPackageIntro ? 
                      "Welcome to your tasting experience" :
                      <DynamicTextRenderer text={slidesData.package.name} />
                    }
                  </p>
                </div>
              </div>
              
              <div className="text-right text-white">
                <p className="text-sm font-medium">{Math.min(currentSlideIndex + 1, slides.length)} of {slides.length}</p>
                <p className="text-xs text-white/60">
                  {Math.round((Math.min(currentSlideIndex + 1, slides.length) / slides.length) * 100)}% complete
                </p>
              </div>
            </div>
            
            {/* Section progress bars */}
            <div className="mt-4">
              <SegmentedProgressBar 
                sections={sections}
                currentWineName={currentSlide?._isPackageIntro ? null : currentWine?.wineName}
                currentOverallProgressInfo={`${Math.min(currentSlideIndex + 1, slides.length)} of ${slides.length} slides`}
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
                initial={{ opacity: 0, x: isNavigating ? (currentSlideIndex > 0 ? 30 : -30) : 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: isNavigating ? (currentSlideIndex < slides.length - 1 ? -30 : 30) : 0, y: -20, scale: 0.95 }}
                transition={TRANSITION_DURATIONS.slideAnimation}
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
                variant={currentSlide?._isPackageIntro || currentSlide?.payloadJson?.is_package_intro ? "default" : "ghost"}
                onClick={currentSlideIndex >= slides.length - 1 ? handleComplete : goToNextSlide}
                disabled={isNavigating}
                className={
                  currentSlide?._isPackageIntro || currentSlide?.payloadJson?.is_package_intro
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 transform hover:scale-105 active:scale-100 text-[14px] sm:text-sm md:text-base min-h-[44px] flex items-center justify-center"
                    : "text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed px-3 sm:px-4 py-1.5 sm:py-2 text-[14px] sm:text-sm min-h-[44px] flex items-center justify-center"
                }
              >
                <span className="hidden sm:inline">
                  {currentSlideIndex >= slides.length - 1 ? 'Complete' : 
                   (currentSlide?._isPackageIntro || currentSlide?.payloadJson?.is_package_intro) ? 'Continue Your Wine Journey' : 'Next'}
                </span>
                <span className="sm:hidden">
                  {currentSlideIndex >= slides.length - 1 ? 'Complete' : 
                   (currentSlide?._isPackageIntro || currentSlide?.payloadJson?.is_package_intro) ? 'Continue' : 'Next'}
                </span>
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
          duration={3000}
        />
      )}
    </>
  );
}