import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MultipleChoiceQuestion } from "@/components/questions/MultipleChoiceQuestion";
import { ScaleQuestion } from "@/components/questions/ScaleQuestion";
import { useSessionPersistence } from "@/hooks/useSessionPersistence";
import { useHaptics } from "@/hooks/useHaptics";
import { apiRequest } from "@/lib/queryClient";
import { Menu, Users, BadgeCheck, CloudOff, ArrowLeft, ArrowRight, X, CheckCircle } from "lucide-react";
import type { Slide, Participant } from "@shared/schema";

export default function TastingSession() {
  const { sessionId, participantId } = useParams();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completedSlides, setCompletedSlides] = useState<number[]>([]);
  const { saveResponse, syncStatus } = useSessionPersistence();
  const { triggerHaptic } = useHaptics();
  const queryClient = useQueryClient();

  // Get participant data
  const { data: participant } = useQuery<Participant>({
    queryKey: [`/api/participants/${participantId}`],
    enabled: !!participantId
  });

  // Get session slides
  const { data: slidesData, isLoading } = useQuery<{ slides: Slide[]; totalCount: number }>({
    queryKey: [`/api/packages/WINE01/slides`],
    queryFn: async () => {
      const response = await fetch(`/api/packages/WINE01/slides?participantId=${participantId}`);
      return response.json();
    },
    enabled: !!participantId
  });

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

  const slides = slidesData?.slides || [];
  const currentSlide = slides[currentSlideIndex];
  const progress = slides.length > 0 ? ((currentSlideIndex + 1) / slides.length) * 100 : 0;

  const handleAnswerChange = (slideId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [slideId]: answer }));
    // Auto-save response
    saveResponseMutation.mutate({ slideId, answerJson: answer });
  };

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      triggerHaptic('navigation');
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlideIndex > 0) {
      triggerHaptic('navigation');
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const renderQuestion = (slide: Slide) => {
    const payload = slide.payloadJson as any;
    const answer = answers[slide.id] || {};

    switch (payload.question_type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            question={payload}
            value={{ selected: answer.selected || [], notes: answer.notes }}
            onChange={(value) => handleAnswerChange(slide.id, value)}
          />
        );
      case 'scale':
        return (
          <ScaleQuestion
            question={payload}
            value={answer.value || payload.scale_min}
            onChange={(value) => handleAnswerChange(slide.id, { value })}
          />
        );
      default:
        return null;
    }
  };

  const renderSlideContent = (slide: Slide) => {
    const payload = slide.payloadJson as any;

    if (slide.type === 'interlude') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          {/* Wine Image */}
          {payload.wine_image && (
            <div className="mb-8">
              <img
                src={payload.wine_image}
                alt={payload.wine_name || "Wine"}
                className="w-48 h-72 mx-auto rounded-2xl shadow-2xl object-cover"
              />
            </div>
          )}

          <div className="bg-gradient-card backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-3xl font-bold text-white mb-4">{payload.title}</h2>
            {payload.wine_name && (
              <h3 className="text-xl text-purple-200 mb-4">{payload.wine_name}</h3>
            )}
            <p className="text-white/70 text-lg">{payload.description}</p>
          </div>
        </motion.div>
      );
    }

    if (slide.type === 'question') {
      return renderQuestion(slide);
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-white">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Progress Header */}
      <div className="sticky top-0 z-50 bg-gradient-primary/90 backdrop-blur-xl border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" className="p-2 hover:bg-white/10 text-white">
                <Menu size={20} />
              </Button>
              <div>
                <h2 className="text-white font-semibold">
                  {currentSlide?.type === 'interlude' 
                    ? (currentSlide.payloadJson as any).wine_name || "Wine Tasting"
                    : `Question ${currentSlideIndex + 1}`
                  }
                </h2>
                <p className="text-white/60 text-sm">
                  {currentSlideIndex + 1} of {slides.length}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Sync Status */}
              <div className="flex items-center space-x-1 text-white/60 text-sm">
                {syncStatus === 'synced' ? (
                  <>
                    <BadgeCheck className="text-green-400" size={16} />
                    <span>Synced</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="text-yellow-400" size={16} />
                    <span>Syncing...</span>
                  </>
                )}
              </div>
              {/* Participants Count */}
              <div className="flex items-center space-x-1 text-white/60 text-sm">
                <Users size={16} />
                <span>1</span>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <Progress value={progress} className="h-2 bg-white/20" />
        </div>
      </div>

      {/* Question Content */}
      <div className="p-6 pb-32">
        <div className="max-w-md mx-auto">
          {currentSlide && renderSlideContent(currentSlide)}
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-primary/95 backdrop-blur-xl border-t border-white/10 p-6">
        <div className="max-w-md mx-auto flex space-x-4">
          <Button
            onClick={handlePrevious}
            disabled={currentSlideIndex === 0}
            variant="outline"
            className="flex-1 py-4 px-6 bg-white/20 border-white/20 text-white hover:bg-white/30 disabled:opacity-50"
          >
            <ArrowLeft className="mr-2" size={16} />
            Previous
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1 py-4 px-6 bg-gradient-button text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300"
          >
            {currentSlideIndex === slides.length - 1 ? 'Finish' : 'Next'}
            <ArrowRight className="ml-2" size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
