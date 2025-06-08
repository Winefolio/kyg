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

  const slides = slidesData.slides || [];
  const currentSlide = slides[currentSlideIndex];

  // Handle slide navigation
  const goToNextSlide = async () => {
    if (currentSlideIndex < slides.length - 1) {
      setIsNavigating(true);
      triggerHaptic('success');
      
      setTimeout(() => {
        setCurrentSlideIndex(currentSlideIndex + 1);
        setIsNavigating(false);
      }, 150);
    }
  };

  const goToPreviousSlide = () => {
    if (currentSlideIndex > 0) {
      setIsNavigating(true);
      triggerHaptic('selection');
      
      setTimeout(() => {
        setCurrentSlideIndex(currentSlideIndex - 1);
        setIsNavigating(false);
      }, 150);
    }
  };

  // Handle answer changes
  const handleAnswerChange = (slideId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [slideId]: answer }));
    saveResponse(slideId, answer);
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
        
        if (questionData.questionType === 'multiple_choice') {
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

        if (questionData.questionType === 'scale') {
          return (
            <ScaleQuestion
              question={{
                title: questionData.title || questionData.question,
                description: questionData.description || '',
                category: questionData.category || 'Scale',
                scale_min: questionData.scaleMin || questionData.scale_min || 1,
                scale_max: questionData.scaleMax || questionData.scale_max || 10,
                scale_labels: questionData.scaleLabels || questionData.scale_labels || ['Low', 'High']
              }}
              value={answers[currentSlide.id] || questionData.scaleMin || questionData.scale_min || 1}
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

  return (
    <div className="min-h-screen bg-gradient-primary flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Wine className="w-6 h-6 text-purple-300" />
            <div className="text-white">
              <h1 className="font-semibold">Wine Tasting</h1>
              <p className="text-xs text-white/60">{slidesData.package.name}</p>
            </div>
          </div>
          
          <div className="text-right text-white">
            <p className="text-sm font-medium">{currentSlideIndex + 1} of {slides.length}</p>
            <p className="text-xs text-white/60">
              {Math.round(((currentSlideIndex + 1) / slides.length) * 100)}% complete
            </p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3">
          <Progress 
            value={((currentSlideIndex + 1) / slides.length) * 100}
            className="h-2"
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-grow flex flex-col p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide?.id || currentSlideIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-grow flex flex-col justify-center"
          >
            {renderSlideContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={goToPreviousSlide}
            disabled={currentSlideIndex === 0 || isNavigating}
            className="text-white hover:bg-white/10 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex space-x-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlideIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentSlideIndex 
                    ? 'bg-purple-400' 
                    : index < currentSlideIndex 
                      ? 'bg-purple-600' 
                      : 'bg-white/30'
                }`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            onClick={goToNextSlide}
            disabled={currentSlideIndex >= slides.length - 1 || isNavigating}
            className="text-white hover:bg-white/10 disabled:opacity-50"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}