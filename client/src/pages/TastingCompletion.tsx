import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSessionPersistence } from "@/hooks/useSessionPersistence";
import { 
  CheckCircle, 
  Star, 
  Trophy, 
  Wine, 
  Home, 
  Repeat, 
  TrendingUp,
  Users,
  Target,
  Award,
  Download,
  Share,
  ChevronDown,
  BarChart3,
  PieChart,
  Zap
} from "lucide-react";
import type { Participant, Response, Session } from "@shared/schema";

interface ParticipantAnalytics {
  participantId: string;
  sessionId: string;
  personalSummary: {
    questionsAnswered: number;
    completionPercentage: number;
    winesExplored: number;
    notesWritten: number;
    sessionDuration: number;
  };
  wineBreakdowns: Array<{
    wineId: string;
    wineName: string;
    wineDescription: string;
    wineImageUrl: string;
    questionsAnswered: number;
    totalQuestions: number;
    questionAnalysis: Array<{
      question: string;
      questionType: string;
      answered: boolean;
      comparison: any;
      insight: string;
    }>;
  }>;
  tastingPersonality: {
    type: string;
    description: string;
    characteristics: string[];
  };
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: string;
  }>;
  insights: string[];
  recommendations: string[];
}

export default function TastingCompletion() {
  const { sessionId, participantId } = useParams();
  const [, setLocation] = useLocation();
  const { user, addTastingSession } = useUserProfile();
  const { endSession } = useSessionPersistence();
  const [rating, setRating] = useState(0);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");

  // Clean up session storage when component mounts (session completed)
  useEffect(() => {
    const cleanupSession = async () => {
      await endSession();
    };
    cleanupSession();
  }, [endSession]);

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

  // Get enhanced participant analytics
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useQuery<ParticipantAnalytics>({
    queryKey: [`/api/sessions/${sessionId}/participant-analytics/${participantId}`],
    enabled: !!sessionId && !!participantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Get participant responses for backward compatibility
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

  if (analyticsLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Analyzing your wine tasting experience...</p>
        </div>
      </div>
    );
  }

  if (analyticsError) {
    console.error("Analytics error:", analyticsError);
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-semibold mb-2">Unable to load analytics</h2>
          <p className="text-purple-200">Error: {analyticsError?.message || "Unknown error"}</p>
          <p className="text-purple-200 mt-2">Session ID: {sessionId}</p>
          <p className="text-purple-200">Participant ID: {participantId}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-semibold mb-2">Unable to load analytics</h2>
          <p className="text-purple-200">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500/20 text-gray-200 border-gray-400/30';
      case 'uncommon': return 'bg-green-500/20 text-green-200 border-green-400/30';
      case 'rare': return 'bg-blue-500/20 text-blue-200 border-blue-400/30';
      case 'epic': return 'bg-purple-500/20 text-purple-200 border-purple-400/30';
      case 'legendary': return 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30';
      default: return 'bg-gray-500/20 text-gray-200 border-gray-400/30';
    }
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
            Congratulations, {participant?.displayName}! Here's your personalized wine journey.
          </p>
        </motion.div>

        {/* Enhanced Tabs Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-6xl mx-auto"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-white/10 backdrop-blur-xl border border-white/20">
              <TabsTrigger value="summary" className="flex items-center gap-2 data-[state=active]:bg-purple-500/30">
                <Trophy size={16} />
                <span className="hidden sm:inline">Your Summary</span>
              </TabsTrigger>
              <TabsTrigger value="wines" className="flex items-center gap-2 data-[state=active]:bg-purple-500/30">
                <Wine size={16} />
                <span className="hidden sm:inline">Wine Details</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-purple-500/30">
                <Target size={16} />
                <span className="hidden sm:inline">Taste Profile</span>
              </TabsTrigger>
              <TabsTrigger value="comparison" className="flex items-center gap-2 data-[state=active]:bg-purple-500/30">
                <Users size={16} />
                <span className="hidden sm:inline">vs Everyone</span>
              </TabsTrigger>
              <TabsTrigger value="journey" className="flex items-center gap-2 data-[state=active]:bg-purple-500/30">
                <TrendingUp size={16} />
                <span className="hidden sm:inline">Your Journey</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Your Summary */}
            <TabsContent value="summary" className="space-y-6 mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Personal Metrics */}
                <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <BarChart3 className="text-purple-400" size={20} />
                      Your Session
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {analytics.personalSummary.completionPercentage}%
                        </div>
                        <div className="text-sm text-white/70">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {analytics.personalSummary.winesExplored}
                        </div>
                        <div className="text-sm text-white/70">Wines Tasted</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {analytics.personalSummary.questionsAnswered}
                        </div>
                        <div className="text-sm text-white/70">Questions Answered</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">
                          {analytics.personalSummary.sessionDuration}m
                        </div>
                        <div className="text-sm text-white/70">Duration</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tasting Personality */}
                <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="text-yellow-400" size={20} />
                      Your Wine Personality
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <Badge className="bg-gradient-button text-white text-lg px-4 py-2 mb-3">
                        {analytics.tastingPersonality.type}
                      </Badge>
                      <p className="text-white/90 text-sm mb-3">
                        {analytics.tastingPersonality.description}
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {analytics.tastingPersonality.characteristics.map((characteristic, index) => (
                          <Badge key={index} variant="outline" className="text-purple-200 border-purple-400/50">
                            {characteristic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Key Insights */}
              <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle className="text-green-400" size={20} />
                    Your Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {analytics.insights.map((insight, index) => (
                      <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <p className="text-white text-sm">{insight}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Achievements */}
              {analytics.achievements.length > 0 && (
                <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Award className="text-yellow-400" size={20} />
                      Achievements Unlocked
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {analytics.achievements.map((achievement) => (
                        <div key={achievement.id} className={`rounded-lg p-4 border ${getRarityColor(achievement.rarity)}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{achievement.icon}</span>
                            <div>
                              <h4 className="font-semibold">{achievement.name}</h4>
                              <p className="text-sm opacity-90">{achievement.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Rating Section */}
              <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Star className="text-yellow-400" size={20} />
                    Rate This Experience
                  </CardTitle>
                  <CardDescription className="text-purple-200">
                    How would you rate this wine tasting overall?
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
                      You rated this experience: <span className="font-bold text-yellow-400">{rating}/10</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Wine Details */}
            <TabsContent value="wines" className="space-y-6 mt-6">
              <div className="space-y-4">
                {analytics.wineBreakdowns.map((wine) => (
                  <Card key={wine.wineId} className="bg-gradient-card border-white/20 backdrop-blur-xl">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        {wine.wineImageUrl && (
                          <img 
                            src={wine.wineImageUrl} 
                            alt={wine.wineName}
                            className="w-16 h-24 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <CardTitle className="text-white">{wine.wineName}</CardTitle>
                          <CardDescription className="text-purple-200">
                            {wine.wineDescription}
                          </CardDescription>
                          <div className="flex gap-4 mt-2">
                            <Badge variant="outline" className="text-green-200 border-green-400/50">
                              {wine.questionsAnswered}/{wine.totalQuestions} Questions
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="questions" className="border-white/20">
                          <AccordionTrigger className="text-white hover:text-purple-200">
                            View Question-by-Question Analysis
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 pt-3">
                              {wine.questionAnalysis.map((question, index) => (
                                <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                                  <h5 className="text-white font-medium mb-2">{question.question}</h5>
                                  {question.comparison && (
                                    <div className="text-sm text-purple-200 mb-2">
                                      {question.questionType === 'scale' && (
                                        <div className="flex justify-between">
                                          <span>Your answer: {question.comparison.yourAnswer}/10</span>
                                          <span>Group average: {question.comparison.groupAverage.toFixed(1)}/10</span>
                                        </div>
                                      )}
                                      {question.questionType === 'multiple_choice' && (
                                        <div>
                                          <div>Your choice: {Array.isArray(question.comparison.yourAnswer) 
                                            ? question.comparison.yourAnswer.join(', ') 
                                            : question.comparison.yourAnswer}</div>
                                          <div>Most popular: {question.comparison.mostPopular}</div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <p className="text-purple-100 text-sm italic">{question.insight}</p>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Tab 3: Taste Profile */}
            <TabsContent value="profile" className="space-y-6 mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <PieChart className="text-purple-400" size={20} />
                      Wine Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center text-white">
                      <p className="text-lg mb-4">Based on your tasting responses:</p>
                      <div className="space-y-3">
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-sm text-purple-200">Personality Type</div>
                          <div className="text-lg font-semibold text-purple-300">
                            {analytics.tastingPersonality.type}
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-sm text-purple-200">Tasting Style</div>
                          <div className="text-lg font-semibold text-purple-300">
                            {analytics.personalSummary.notesWritten > 0 ? "Detail-Oriented" : "Intuitive"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Target className="text-green-400" size={20} />
                      Wine Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.recommendations.map((recommendation, index) => (
                        <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
                          <p className="text-white text-sm">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab 4: vs Everyone (Group Comparison) */}
            <TabsContent value="comparison" className="space-y-6 mt-6">
              <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="text-blue-400" size={20} />
                    How You Compare to Others
                  </CardTitle>
                  <CardDescription className="text-purple-200">
                    See how your wine assessments compare to other participants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.wineBreakdowns.map((wine) => (
                      <div key={wine.wineId} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <h4 className="text-white font-semibold mb-3">{wine.wineName}</h4>
                        <div className="space-y-2">
                          {wine.questionAnalysis
                            .filter(q => q.comparison)
                            .slice(0, 3) // Show top 3 comparisons
                            .map((question, index) => (
                              <div key={index} className="flex justify-between items-center text-sm">
                                <span className="text-purple-200">{question.question.substring(0, 40)}...</span>
                                <span className="text-white">
                                  {question.comparison.alignment === 'close' || question.comparison.alignment === 'agrees' 
                                    ? '✅ Aligned' 
                                    : '🔸 Unique'}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 5: Your Journey */}
            <TabsContent value="journey" className="space-y-6 mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="text-green-400" size={20} />
                      Your Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-white mb-2">
                          <span>Questions Completed:</span>
                          <span className="font-semibold">{analytics.personalSummary.questionsAnswered}</span>
                        </div>
                        <Progress value={analytics.personalSummary.completionPercentage} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-white mb-2">
                          <span>Personal Notes:</span>
                          <span className="font-semibold">{analytics.personalSummary.notesWritten} written</span>
                        </div>
                        <Progress 
                          value={(analytics.personalSummary.notesWritten / analytics.personalSummary.questionsAnswered) * 100} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Award className="text-yellow-400" size={20} />
                      Next Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-white">
                      <p className="text-sm text-purple-200 mb-4">Continue your wine education journey:</p>
                      <div className="space-y-2">
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-sm">📚 Take another tasting to compare your progress</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-sm">🍷 Try the recommended wines based on your profile</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-sm">📱 Share your achievements with friends</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 max-w-6xl mx-auto mt-8"
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

          <Button
            onClick={() => {
              // TODO: Implement export functionality
              console.log('Export analytics:', analytics);
            }}
            variant="outline"
            className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Download size={16} className="mr-2" />
            Download Report
          </Button>
        </motion.div>

        {/* User Profile Prompt */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="max-w-6xl mx-auto mt-6"
          >
            <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
              <CardContent className="text-center py-6">
                <Wine size={32} className="mx-auto text-purple-400 mb-3" />
                <h4 className="text-white font-medium mb-2">Save Your Wine Journey</h4>
                <p className="text-purple-200 text-sm mb-4">
                  Create a profile to track all your tastings and build your wine knowledge over time
                </p>
                <Button
                  onClick={() => setLocation('/profile')}
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
  );
}