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

  // Save response mutation
  const saveResponseMutation = useMutation({
    mutationFn: async ({ slideId, answerJson }: { slideId: string; answerJson: any }) => {
      await saveResponse(participantId!, slideId, answerJson);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/participants/${participantId}/responses`] });
    }
  });

  // Process slides and inject wine transitions after overall ratings
  const processedSlides = () => {
    const originalSlides = slidesData?.slides || [];
    
    // Sort slides properly by wine position and slide position
    const sortedSlides = [...originalSlides].sort((a, b) => {
      // First sort by wine position, then by slide position
      const aWine = packageData?.wines?.find((w: any) => w.id === a.packageWineId);
      const bWine = packageData?.wines?.find((w: any) => w.id === b.packageWineId);
      
      if (aWine && bWine && aWine.position !== bWine.position) {
        return aWine.position - bWine.position;
      }
      
      return a.position - b.position;
    });
    
    const result: any[] = [];
    
    for (let i = 0; i < sortedSlides.length; i++) {
      const slide = sortedSlides[i];
      result.push(slide);
      
      // Check if this is an overall rating slide
      const payload = (slide as any).payloadJson || {};
      const isOverallRating = payload.title?.toLowerCase().includes('overall') && 
                             payload.category?.toLowerCase().includes('overall');
      
      // If this is an overall rating slide, add transition to next wine
      if (isOverallRating) {
        // Find the next wine by looking at subsequent slides
        const nextSlides = sortedSlides.slice(i + 1);
        const nextWineSlide = nextSlides.find(s => s.packageWineId !== slide.packageWineId);
        
        if (nextWineSlide && packageData) {
          const nextWine = packageData.wines?.find((w: any) => w.id === nextWineSlide.packageWineId);
          
          if (nextWine) {
            const transition = {
              id: `transition-${nextWine.id}-${Date.now()}`,
              type: 'wine_transition' as any,
              title: `Moving to ${nextWine.wineName || nextWine.wine_name}`,
              description: `Preparing for the next wine in your tasting journey`,
              payloadJson: {
                wineName: nextWine.wineName || nextWine.wine_name,
                wineDescription: nextWine.wineDescription || nextWine.wine_description,
                wineImageUrl: nextWine.wineImageUrl || nextWine.wine_image_url || 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600',
                position: nextWine.position,
                isFirstWine: false
              },
              packageWineId: nextWine.id,
              position: -1,
              sectionType: 'deep_dive',
              createdAt: null
            };
            
            result.push(transition);
          }
        }
      }
    }
    
    return result;
  };

  const slides = processedSlides();
  const currentSlide = slides[currentSlideIndex];
  
  // Calculate wine-specific progress with clickable wine sections
  const calculateSectionProgress = () => {
    if (slides.length === 0 || !packageData?.wines) {
      return { sections: [], currentWineName: "", progressInfo: "" };
    }
    
    const wines = packageData.wines.sort((a: any, b: any) => a.position - b.position);
    
    // Create sections for each wine (clickable wine headers)
    const sections = wines.slice(0, 3).map((wine: any, index: number) => {
      const wineSlides = slides.filter(slide => slide.packageWineId === wine.id);
      const completedWineSlides = wineSlides.filter(slide => {
        const slideIndex = slides.findIndex(s => s.id === slide.id);
        return completedSlides.includes(slideIndex);
      });
      
      const isCurrentWine = wineSlides.some(slide => slide.id === currentSlide?.id);
      const progress = wineSlides.length > 0 ? Math.round((completedWineSlides.length / wineSlides.length) * 100) : 0;
      
      return {
        name: wine.wineName || wine.wine_name || `Wine ${index + 1}`,
        progress: progress,
        isActive: isCurrentWine,
        isCompleted: progress === 100,
        wineId: wine.id,
        firstSlideIndex: slides.findIndex(s => s.packageWineId === wine.id)
      };
    });
    
    const currentWine = wines.find((wine: any) => {
      return slides.some(slide => slide.packageWineId === wine.id && slide.id === currentSlide?.id);
    });
    
    const currentWineName = currentWine?.wineName || currentWine?.wine_name || "Wine Tasting";
    const progressInfo = `Slide ${currentSlideIndex + 1} of ${slides.length}`;
    
    return { sections, currentWineName, progressInfo };
  };
  
  const { sections, currentWineName, progressInfo } = calculateSectionProgress();

  // Handle section clicks to jump to first slide of that wine
  const handleSectionClick = (sectionName: string) => {
    const section = sections.find(s => s.name === sectionName);
    if (section && section.firstSlideIndex !== -1) {
      setCurrentSlideIndex(section.firstSlideIndex);
      triggerHaptic('navigation');
    }
  };

  const handleAnswerChange = (slideId: string, answer: any, questionType?: string) => {
    let answerJson = answer;
    
    // CRITICAL FIX: If the question is a scale, we only want to store the numeric value
    // to ensure our analytics can aggregate it properly.
    if (questionType === 'scale' && typeof answer === 'object' && answer !== null && 'value' in answer) {
      answerJson = answer.value;
    } else if (questionType === 'scale' && typeof answer !== 'number') {
      // Handle the case where the initial value might be an object
      answerJson = answer?.value ?? answer;
    }

    setAnswers(prev => ({ ...prev, [slideId]: answerJson }));
    // Auto-save response with potentially modified answer
    saveResponseMutation.mutate({ slideId, answerJson });
  };

  const handleNext = () => {
    if (isNavigating || isTransitioningSection) return; // Prevent multiple clicks
    
    setIsNavigating(true);
    
    // Mark current slide as completed
    if (!completedSlides.includes(currentSlideIndex)) {
      setCompletedSlides(prev => [...prev, currentSlideIndex]);
    }
    
    if (currentSlideIndex < slides.length - 1) {
      const currentSectionType = currentSlide?.sectionType;
      const nextSlide = slides[currentSlideIndex + 1];
      const nextSectionType = nextSlide?.sectionType;
      
      // Check for section transition
      if (currentSectionType && nextSectionType && currentSectionType !== nextSectionType) {
        triggerHaptic('milestone');
        
        // Set transition state
        const sectionNames = {
          'intro': 'Introduction',
          'deep_dive': 'Deep Dive',
          'ending': 'Final Thoughts'
        };
        
        setTransitionSectionName(sectionNames[nextSectionType as keyof typeof sectionNames] || 'Next Section');
        setIsTransitioningSection(true);
        
        // Auto-advance after transition animation
        setTimeout(() => {
          setIsTransitioningSection(false);
          setCurrentSlideIndex(prev => prev + 1);
          setIsNavigating(false);
        }, 1500);
      } else {
        triggerHaptic('navigation');
        setCurrentSlideIndex(prev => prev + 1);
        // Small delay to prevent rapid clicking
        setTimeout(() => setIsNavigating(false), 300);
      }
    } else {
      // Session completed
      triggerHaptic('success');
      completeSession();
      setIsNavigating(false);
    }
  };

  const handlePrevious = () => {
    if (currentSlideIndex > 0) {
      triggerHaptic('navigation');
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const completeSession = () => {
    // Mark final slide as completed
    if (!completedSlides.includes(currentSlideIndex)) {
      setCompletedSlides(prev => [...prev, currentSlideIndex]);
    }

    // Calculate final progress and session data
    const finalProgress = Math.round(((completedSlides.length + 1) / slides.length) * 100);
    
    // Save session completion to local storage for profile display
    const sessionSummary = {
      sessionId,
      participantId,
      packageCode: currentSession?.packageCode,
      packageName: currentSession?.packageCode, // Will be enhanced with actual package data
      completedAt: new Date().toISOString(),
      progress: finalProgress,
      answers: answers,
      totalSlides: slides.length,
      completedSlides: completedSlides.length + 1
    };
    
    // Store in localStorage for profile page
    const existingSessions = JSON.parse(localStorage.getItem('completedSessions') || '[]');
    existingSessions.push(sessionSummary);
    localStorage.setItem('completedSessions', JSON.stringify(existingSessions));
    
    // Redirect to profile page instead of broken completion page
    setLocation('/profile');
  };

  const renderQuestion = (slide: Slide) => {
    const payload = slide.payloadJson as any;
    const answer = answers[slide.id] || {};

    switch (payload.question_type) {
      case 'multiple_choice':
        return (
          <EnhancedMultipleChoice
            slideId={slide.id}
            question={payload}
            value={{ selected: answer.selected || [], notes: answer.notes }}
            onChange={(value) => handleAnswerChange(slide.id, value)}
          />
        );
      case 'scale':
        return (
          <ScaleQuestion
            question={payload}
            value={answer || payload.scale_min}
            onChange={(value) => handleAnswerChange(slide.id, value, 'scale')}
          />
        );
      default:
        return null;
    }
  };

  const renderSlideContent = (slide: Slide) => {
    const payload = slide.payloadJson as any;

    // Helper function to get section badge styling
    const getSectionBadge = (sectionType: string) => {
      const sectionConfig = {
        intro: { label: 'Introduction', color: 'bg-blue-500/20 text-blue-200 border-blue-400/30' },
        deep_dive: { label: 'Deep Dive', color: 'bg-purple-500/20 text-purple-200 border-purple-400/30' },
        ending: { label: 'Conclusion', color: 'bg-green-500/20 text-green-200 border-green-400/30' }
      };
      
      const config = sectionConfig[sectionType as keyof typeof sectionConfig];
      if (!config) return null;
      
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${config.color} mb-4`}
        >
          {config.label}
        </motion.div>
      );
    };

    if (slide.type === 'interlude') {
      return (
        <motion.div
          key={slide.id + '-interlude'}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center space-y-4 sm:space-y-6 flex flex-col justify-center items-center h-full max-w-lg mx-auto"
        >
          {/* Section Badge */}
          {slide.section_type && (
            <div className="text-center mb-4">
              {getSectionBadge(slide.section_type)}
            </div>
          )}
          
          {(payload.wine_image || payload.wineImageUrl) && (
            <div className="flex-shrink-0">
              <img
                src={payload.wine_image || payload.wineImageUrl}
                alt={payload.wine_name || payload.wineName || "Wine"}
                className="w-32 h-48 sm:w-40 sm:h-60 mx-auto rounded-xl shadow-2xl object-cover border-4 border-white/10"
              />
            </div>
          )}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              <DynamicTextRenderer text={payload.title} />
            </h2>
            {(payload.wine_name || payload.wineName) && (
              <h3 className="text-lg sm:text-xl text-purple-300">
                <DynamicTextRenderer text={payload.wine_name || payload.wineName} />
              </h3>
            )}
            {payload.description && (
              <p className="text-white/70 text-base sm:text-lg leading-relaxed max-w-md mx-auto">
                <DynamicTextRenderer text={payload.description} />
              </p>
            )}
          </div>
        </motion.div>
      );
    }

    if (slide.type === 'question') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          {/* Section Badge for Questions */}
          {slide.section_type && (
            <div className="text-center mb-4">
              {getSectionBadge(slide.section_type)}
            </div>
          )}
          {renderQuestion(slide)}
        </motion.div>
      );
    }

    // Handle wine transitions - use same style as section transitions
    if ((slide as any).type === 'wine_transition') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl text-center flex flex-col justify-center h-full"
        >
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mx-auto w-24 h-24 bg-purple-600/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-purple-400/30"
            >
              <Wine className="w-12 h-12 text-purple-300" />
            </motion.div>
            
            <motion.h2 
              className="text-2xl md:text-3xl font-bold text-white"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Moving to {payload.wineName}
            </motion.h2>
            
            <motion.p 
              className="text-white/70 text-lg max-w-2xl mx-auto"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              {payload.isFirstWine ? 
                "Welcome to your wine tasting journey. Let's begin with our first wine." :
                "Take a moment to cleanse your palate before we explore the next wine."
              }
            </motion.p>

            {payload.wineImageUrl && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="mx-auto w-32 h-48 rounded-lg overflow-hidden shadow-2xl"
              >
                <img 
                  src={payload.wineImageUrl} 
                  alt={payload.wineName}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            )}
          </div>
        </motion.div>
      );
    }

    // Handle video messages from sommeliers
    if (slide.type === 'video_message') {
      if (!payload.video_url) {
        return <div className="text-white text-center p-4">Video URL missing for this slide.</div>;
      }
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 bg-gradient-card backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/20 shadow-xl flex flex-col justify-center h-full"
        >
          {payload.title && <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center">{payload.title}</h2>}
          {payload.description && <p className="text-white/70 text-center text-sm sm:text-base">{payload.description}</p>}
          <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg mx-auto max-w-full flex-grow flex items-center">
            <video
              src={payload.video_url}
              controls={payload.show_controls !== undefined ? payload.show_controls : true}
              autoPlay={payload.autoplay || false}
              poster={payload.poster_url}
              className="w-full h-full object-contain"
              playsInline
            />
          </div>
        </motion.div>
      );
    }

    // Handle audio messages from sommeliers
    if (slide.type === 'audio_message') {
      if (!payload.audio_url) {
        return <div className="text-white text-center p-4">Audio URL missing for this slide.</div>;
      }
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 bg-gradient-card backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/20 shadow-xl flex flex-col justify-center h-full"
        >
          {payload.title && <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center">{payload.title}</h2>}
          {payload.description && <p className="text-white/70 text-center text-sm sm:text-base">{payload.description}</p>}
          <div className="flex justify-center flex-grow items-center">
            <audio
              src={payload.audio_url}
              controls={payload.show_controls !== undefined ? payload.show_controls : true}
              autoPlay={payload.autoplay || false}
              className="w-full max-w-md rounded-lg"
            />
          </div>
        </motion.div>
      );
    }

    // Handle media slides (images)
    if (slide.type === 'media' && payload.image_url) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center bg-gradient-card backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/20 shadow-xl flex flex-col justify-center h-full"
        >
          {payload.title && <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-4">{payload.title}</h2>}
          <div className="flex-grow flex items-center justify-center">
            <img 
              src={payload.image_url} 
              alt={payload.alt_text || 'Media content'} 
              className="w-full max-w-md mx-auto rounded-lg shadow-lg max-h-80 object-contain"
            />
          </div>
        </motion.div>
      );
    }

    console.warn("Unsupported slide type or missing media URL for slide:", slide);
    return <div className="text-white text-center p-4">Unsupported slide type: {slide.type} or missing media content.</div>;
  };

  if (isLoading || sessionDetailsLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-white">Loading session...</div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center text-white p-8">
        <X size={48} className="mb-4 text-red-300" />
        <h2 className="text-2xl font-semibold mb-2">Session Not Found</h2>
        <p className="text-purple-200 text-center">This session does not exist or has been removed.</p>
      </div>
    );
  }

  // Check session status and display appropriate messages for non-active states
  if (currentSession.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center text-white p-8">
        <Clock size={48} className="mb-4 text-purple-300" />
        <h2 className="text-2xl font-semibold mb-2">Session Starting Soon</h2>
        <p className="text-purple-200 text-center">Please wait for the host to begin the tasting.</p>
      </div>
    );
  }

  if (currentSession.status === 'paused') {
    return (
      <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center text-white p-8">
        <Pause size={48} className="mb-4 text-yellow-300" />
        <h2 className="text-2xl font-semibold mb-2">Session Paused</h2>
        <p className="text-purple-200 text-center">The host has currently paused the tasting. Please wait.</p>
      </div>
    );
  }

  if (currentSession.status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center text-white p-8">
        <CheckCircle size={48} className="mb-4 text-green-300" />
        <h2 className="text-2xl font-semibold mb-2">Session Completed</h2>
        <p className="text-purple-200 text-center">This tasting session has ended. Thank you!</p>
      </div>
    );
  }

  if (currentSession.status !== 'active') {
    return (
      <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center text-white p-8">
        <Clock size={48} className="mb-4 text-purple-300" />
        <h2 className="text-2xl font-semibold mb-2">Waiting for Session</h2>
        <p className="text-purple-200 text-center">Waiting for session to become active...</p>
      </div>
    );
  }

  // Only render tasting content if session is active
  return (
    <div className="min-h-screen bg-gradient-primary flex flex-col">
      {/* Progress Header */}
      <div className="sticky top-0 z-50 bg-gradient-primary/90 backdrop-blur-xl border-b border-white/10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1.5 hover:bg-white/10 text-white"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu size={18} />
              </Button>
              <div>
                <h2 className="text-white font-semibold text-sm truncate">
                  {slidesData?.package?.name || 'Wine Tasting'}
                </h2>
                {currentSlide && packageData?.wines && (
                  <p className="text-white/60 text-xs truncate">
                    {(() => {
                      const currentWine = packageData.wines.find((w: any) => w.id === currentSlide.packageWineId);
                      return currentWine?.wineName || currentWine?.wine_name || `Slide ${currentSlideIndex + 1} of ${slides.length}`;
                    })()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Sync Status */}
              <div className="flex items-center space-x-1 text-white/60 text-xs">
                {syncStatus === 'synced' ? (
                  <>
                    <BadgeCheck className="text-green-400" size={14} />
                    <span className="hidden sm:inline">Synced</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="text-yellow-400" size={14} />
                    <span className="hidden sm:inline">Syncing...</span>
                  </>
                )}
              </div>
              {/* Participants Count */}
              <div className="flex items-center space-x-1 text-white/60 text-xs">
                <Users size={14} />
                <span>1</span>
              </div>
            </div>
          </div>
          
          {/* Segmented Progress Bar */}
          <SegmentedProgressBar 
            sections={sections}
            currentWineName={currentWineName}
            currentOverallProgressInfo={progressInfo}
            onSectionClick={handleSectionClick}
          />
        </div>
      </div>

      {/* Sidebar Navigation */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-gradient-primary/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 z-50 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-lg">Progress Overview</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 hover:bg-white/10 text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={16} />
            </Button>
          </div>

          {/* Wine-organized sections */}
          <div className="space-y-4">
            {packageData?.wines?.sort((a: any, b: any) => a.position - b.position).map((wine: any, wineIndex: number) => {
              const wineSlides = slides.filter(slide => slide.packageWineId === wine.id);
              const hasCurrentSlide = wineSlides.some(slide => slide.id === currentSlide?.id);
              const isExpanded = expandedWines[wine.id] ?? hasCurrentSlide;
              
              const completedWineSlides = wineSlides.filter(slide => {
                const slideIndex = slides.findIndex(s => s.id === slide.id);
                return completedSlides.includes(slideIndex);
              });
              
              const wineProgress = wineSlides.length > 0 ? Math.round((completedWineSlides.length / wineSlides.length) * 100) : 0;
              
              return (
                <div key={wine.id} className="space-y-2">
                  {/* Wine Header */}
                  <button
                    onClick={() => setExpandedWines(prev => ({ ...prev, [wine.id]: !isExpanded }))}
                    className={`w-full p-3 rounded-lg border transition-all text-left ${
                      hasCurrentSlide
                        ? 'bg-purple-500/20 border-purple-400/40 text-white'
                        : wineProgress === 100
                          ? 'bg-green-500/20 border-green-400/30 text-green-200'
                          : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Wine className="w-5 h-5" />
                        <div>
                          <p className="font-medium text-sm">
                            {wine.wineName || wine.wine_name || `Wine ${wineIndex + 1}`}
                          </p>
                          <div className="flex items-center space-x-2 text-xs opacity-75">
                            <span>{completedWineSlides.length}/{wineSlides.length} slides</span>
                            <span>•</span>
                            <span>{wineProgress}% complete</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {wineProgress === 100 && <CheckCircle className="w-4 h-4 text-green-400" />}
                        <ArrowRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </button>
                  
                  {/* Progress Bar */}
                  <div className="px-3">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${wineProgress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                  
                  {/* Slides List */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1 ml-4 overflow-hidden"
                      >
                        {wineSlides.map((slide, slideIndex) => {
                          const globalIndex = slides.findIndex(s => s.id === slide.id);
                          const isCompleted = completedSlides.includes(globalIndex);
                          const isCurrent = globalIndex === currentSlideIndex;
                          const isAccessible = globalIndex <= currentSlideIndex || isCompleted;
                          
                          return (
                            <motion.div
                              key={slide.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: slideIndex * 0.05 }}
                              className={`p-2 rounded border transition-all cursor-pointer text-sm ${
                                isCurrent 
                                  ? 'bg-white/15 border-white/25 text-white' 
                                  : isCompleted
                                    ? 'bg-green-500/10 border-green-400/20 text-green-200 hover:bg-green-500/20'
                                    : isAccessible
                                      ? 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                                      : 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed'
                              }`}
                              onClick={() => {
                                if (isAccessible) {
                                  setCurrentSlideIndex(globalIndex);
                                  setSidebarOpen(false);
                                  triggerHaptic('navigation');
                                }
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                                    isCompleted ? 'bg-green-500 text-white' : 'bg-white/20 text-white'
                                  }`}>
                                    {isCompleted ? '✓' : slideIndex + 1}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="truncate">
                                      {slide.type === 'interlude' ? 'Introduction' : 
                                       (slide.payloadJson as any)?.title || `Question ${slideIndex + 1}`}
                                    </span>
                                    {slide.section_type && (
                                      <span className="text-xs opacity-60 capitalize">
                                        {slide.section_type.replace('_', ' ')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isCurrent && (
                                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <div className="mt-6 p-4 bg-white/5 rounded-lg">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-white">
                <span>Completed:</span>
                <span className="font-semibold">{completedSlides.length}/{slides.length}</span>
              </div>
              <div className="flex justify-between text-white">
                <span>Progress:</span>
                <span className="font-semibold">{Math.round((completedSlides.length / slides.length) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Section Transition Overlay */}
      <AnimatePresence>
        {isTransitioningSection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-primary/95 backdrop-blur-xl z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="text-center space-y-6"
            >
              {/* Wine Glass Filling Animation */}
              <div className="relative w-24 h-24 mx-auto">
                {/* Glow Effect Background */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 0.3 }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                  className="absolute inset-0 bg-gradient-to-br from-red-500 via-purple-600 to-red-700 rounded-full blur-xl"
                />
                
                {/* Wine Glass Container */}
                <div className="relative w-full h-full overflow-hidden">
                  {/* Wine Glass SVG with Mask Definition */}
                  <svg 
                    width="96" 
                    height="96" 
                    viewBox="0 0 100 100" 
                    className="relative z-10 text-white/90 drop-shadow-lg"
                    fill="currentColor"
                  >
                    <defs>
                      {/* Create a mask that defines the wine glass bowl area */}
                      <mask id="wine-glass-mask">
                        <rect width="100" height="100" fill="black" />
                        {/* Wine glass bowl area in white - this is where wine can be visible */}
                        <circle cx="50" cy="37.3" r="20.44" fill="white" />
                      </mask>
                      
                      {/* Gradient for wine fill */}
                      <linearGradient id="wine-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#7f1d1d" />
                        <stop offset="30%" stopColor="#991b1b" />
                        <stop offset="70%" stopColor="#dc2626" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                    
                    {/* Wine Fill Animation - masked to only show inside glass bowl */}
                    <motion.circle
                      cx="50"
                      cy="37.3"
                      r="20.44"
                      fill="url(#wine-gradient)"
                      mask="url(#wine-glass-mask)"
                      initial={{ 
                        clipPath: "circle(0% at 50% 100%)"
                      }}
                      animate={{ 
                        clipPath: "circle(20.44px at 50% 37.3%)"
                      }}
                      transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
                      opacity="0.95"
                    />
                    
                    {/* Wine Glass Outline */}
                    <path d="M75.44,35.78l-.09-.48c-.14-1.73-.44-3.41-.91-5.02l-4.01-18.23H29.57l-4.01,18.23c-.46,1.61-.77,3.29-.91,5.02l-.09,.48h.05c-.03,.51-.05,1.02-.05,1.53,0,13.2,10.06,24.06,22.94,25.31v20.61h-12.4v5h29.81v-5h-12.4v-20.61c12.87-1.26,22.94-12.11,22.94-25.31,0-.51-.02-1.02-.05-1.53h.05Zm-25.44,21.96c-11.27,0-20.44-9.17-20.44-20.44,0-.36,.01-.77,.04-1.23v-.11s.01-.03,.01-.03l.02-.25c.11-1.37,.35-2.73,.73-4.03l.04-.15,.03-.15,3.14-14.3h32.83l3.14,14.3,.03,.15,.04,.15c.38,1.31,.62,2.66,.73,4.03l.02,.25v.02s.01,.11,.01,.11c.03,.47,.04,.87,.04,1.23,0,11.27-9.17,20.44-20.44,20.44Z"/>
                    
                    {/* Wine Shimmer Effect - also masked to glass bowl */}
                    <motion.circle
                      cx="50"
                      cy="37.3"
                      r="20.44"
                      fill="url(#shimmer-gradient)"
                      mask="url(#wine-glass-mask)"
                      initial={{ opacity: 0, transform: "translateX(-40px)" }}
                      animate={{ opacity: [0, 0.3, 0], transform: "translateX(40px)" }}
                      transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
                    />
                  </svg>
                  
                  {/* Additional shimmer gradient definition */}
                  <svg width="0" height="0" className="absolute">
                    <defs>
                      <linearGradient id="shimmer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                
                {/* Floating Wine Particles */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: -20, opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="absolute top-4 left-1/2 transform -translate-x-1/2"
                >
                  <div className="w-1 h-1 bg-red-400 rounded-full opacity-60" />
                </motion.div>
                
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: -25, opacity: [0, 1, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: 0.8 }}
                  className="absolute top-6 left-1/3 transform -translate-x-1/2"
                >
                  <div className="w-0.5 h-0.5 bg-purple-300 rounded-full opacity-70" />
                </motion.div>
                
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: -18, opacity: [0, 1, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: 1.1 }}
                  className="absolute top-5 right-1/3 transform translate-x-1/2"
                >
                  <div className="w-0.5 h-0.5 bg-red-300 rounded-full opacity-80" />
                </motion.div>
              </div>
              
              {/* Text Content */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="space-y-2"
              >
                <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">Moving to:</h2>
                <motion.h3 
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                  className="text-xl text-gradient bg-gradient-to-r from-purple-200 via-pink-200 to-red-200 bg-clip-text text-transparent font-semibold"
                >
                  {transitionSectionName}
                </motion.h3>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question Content */}
      <div className="flex-grow flex flex-col items-center justify-center p-3 pb-20">
        <div className="w-full max-w-md mx-auto min-h-[50vh] flex flex-col justify-center">
          {currentSlide && renderSlideContent(currentSlide)}
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 bg-gradient-primary/95 backdrop-blur-xl border-t border-white/10 p-4"
      >
        <div className="max-w-md mx-auto flex space-x-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1"
          >
            <Button
              onClick={handlePrevious}
              disabled={currentSlideIndex === 0}
              variant="outline"
              className="w-full py-3 px-4 bg-white/20 border-white/20 text-white hover:bg-white/30 disabled:opacity-50 text-sm transition-all duration-300 hover:shadow-lg"
            >
              <motion.div
                animate={{ x: currentSlideIndex === 0 ? 0 : [-2, 0] }}
                transition={{ duration: 0.3 }}
                className="flex items-center"
              >
                <ArrowLeft className="mr-1" size={14} />
                Previous
              </motion.div>
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1"
          >
            <Button
              onClick={handleNext}
              disabled={isNavigating || isTransitioningSection}
              className="w-full py-3 px-4 bg-gradient-button text-white font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 text-sm relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <motion.div
                animate={{ x: isNavigating ? 0 : [0, 2, 0] }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center"
              >
                {isNavigating ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                    />
                    Loading...
                  </>
                ) : (
                  <>
                    {currentSlideIndex === slides.length - 1 ? 'Finish' : 'Next'}
                    <ArrowRight className="ml-1" size={14} />
                  </>
                )}
              </motion.div>
              
              {/* Subtle shimmer effect - only when not loading */}
              {!isNavigating && (
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform skew-x-12"
                />
              )}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
