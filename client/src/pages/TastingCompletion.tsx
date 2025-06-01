import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useUserProfile } from "@/hooks/useUserProfile";
import { CheckCircle, Star, Trophy, Wine, Home, Repeat } from "lucide-react";
import type { Participant, Response, Session } from "@shared/schema";

export default function TastingCompletion() {
  const { sessionId, participantId } = useParams();
  const [, setLocation] = useLocation();
  const { user, addTastingSession } = useUserProfile();
  const [rating, setRating] = useState(0);
  const [sessionSaved, setSessionSaved] = useState(false);

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const progress = parseInt(urlParams.get('progress') || '100');

  // Get session data
  const { data: session } = useQuery<Session & { packageCode?: string }>({
    queryKey: [`/api/sessions/${sessionId}`],
    enabled: !!sessionId
  });

  // Get participant data
  const { data: participant } = useQuery<Participant>({
    queryKey: [`/api/participants/${participantId}`],
    enabled: !!participantId
  });

  // Get participant responses
  const { data: responses = [] } = useQuery<Response[]>({
    queryKey: [`/api/participants/${participantId}/responses`],
    enabled: !!participantId
  });

  // Save session to user profile
  useEffect(() => {
    if (user && participant && session && !sessionSaved && responses.length > 0) {
      addTastingSession({
        packageName: "Wine Tasting Session",
        packageCode: session.packageCode || "UNKNOWN",
        completedAt: new Date(),
        progress: progress,
        answers: responses.reduce((acc, response) => {
          acc[response.slideId || ''] = response.answerJson;
          return acc;
        }, {} as Record<string, any>),
        rating: rating
      });
      setSessionSaved(true);
    }
  }, [user, participant, session, responses, progress, rating, sessionSaved, addTastingSession]);

  const handleRating = (newRating: number) => {
    setRating(newRating);
  };

  const getTastingInsights = () => {
    const insights = [];
    
    if (progress === 100) {
      insights.push("🎯 Perfect completion! You experienced every aspect of the wine.");
    } else if (progress >= 75) {
      insights.push("🌟 Excellent progress! You've captured most of the wine's character.");
    } else {
      insights.push("👍 Good start! Consider revisiting to complete your tasting journey.");
    }

    if (responses.length >= 5) {
      insights.push("📝 Comprehensive tasting notes recorded.");
    }

    if (responses.some(r => (r.answerJson as any)?.notes)) {
      insights.push("✍️ Great personal notes added to your tasting.");
    }

    return insights;
  };

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-green-500/20 backdrop-blur-xl border border-green-400/30">
            <Trophy className="text-green-400" size={40} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Tasting Complete!</h1>
          <p className="text-purple-200">
            Well done, {participant?.displayName}! Your wine journey is recorded.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Progress Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="text-green-400" size={20} />
                  Session Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-white">
                  <span>Completion:</span>
                  <Badge className="bg-green-500/20 text-green-200">
                    {progress}%
                  </Badge>
                </div>
                
                <div>
                  <div className="flex justify-between text-white mb-2">
                    <span>Progress:</span>
                    <span className="font-semibold">{responses.length} responses recorded</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>

                {/* Insights */}
                <div className="mt-6">
                  <h4 className="text-white font-medium mb-3">Your Tasting Insights:</h4>
                  <div className="space-y-2">
                    {getTastingInsights().map((insight, index) => (
                      <p key={index} className="text-purple-200 text-sm">
                        {insight}
                      </p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Rating Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Star className="text-yellow-400" size={20} />
                  Rate This Experience
                </CardTitle>
                <CardDescription className="text-purple-200">
                  How would you rate this wine overall?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center space-x-2 mb-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRating(star)}
                      className={`w-8 h-8 rounded-full border-2 transition-colors ${
                        star <= rating
                          ? 'bg-yellow-400 border-yellow-400 text-white'
                          : 'border-white/30 text-white/60 hover:border-yellow-400/50'
                      }`}
                    >
                      {star}
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-center text-white">
                    You rated this wine: <span className="font-bold text-yellow-400">{rating}/10</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button
              onClick={() => setLocation('/')}
              variant="outline"
              className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Home size={16} className="mr-2" />
              Back to Home
            </Button>
            
            <Button
              onClick={() => setLocation('/join?code=WINE01')}
              className="flex-1 bg-gradient-button text-white"
            >
              <Repeat size={16} className="mr-2" />
              Try Another Tasting
            </Button>
          </motion.div>

          {/* User Profile Prompt */}
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                <CardContent className="text-center py-6">
                  <Wine size={32} className="mx-auto text-purple-400 mb-3" />
                  <h4 className="text-white font-medium mb-2">Save Your Wine Journey</h4>
                  <p className="text-purple-200 text-sm mb-4">
                    Create a profile to track all your tastings and build your wine knowledge
                  </p>
                  <Button
                    onClick={() => setLocation('/join?code=WINE01')}
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    Create Profile
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}