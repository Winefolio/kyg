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
import { ComingSoonOverlay } from "@/components/ui/coming-soon-overlay";
import { WineInsights } from "@/components/WineInsights";
import { apiRequest } from "@/lib/queryClient";
import {
  CheckCircle,
  Trophy,
  Wine,
  Home,
  TrendingUp,
  Users,
  Target,
  PieChart,
  Zap,
  Download,
  Edit,
  Lightbulb
} from "lucide-react";
import type { Participant, Response, Session, WineCharacteristicsData } from "@shared/schema";

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
    wineType?: string;
    region?: string;
    grapeVarietals?: string[];
    expectedCharacteristics?: {
      sweetness?: number;
      acidity?: number;
      tannins?: number;
      body?: number;
      style?: string;
      regionCharacter?: string;
      aroma?: string[];
      taste?: string[];
      color?: string;
      finish?: string;
    };
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
  insights: string[];
  recommendations: string[];
}

// Component to display wine insights for group tastings
// Uses pre-uploaded characteristics when available, falls back to LLM only for user-uploaded wines
function WineInsightsLoader({
  wineName,
  wineDescription,
  expectedCharacteristics,
  questionAnalysis
}: {
  wineName: string;
  wineDescription: string;
  expectedCharacteristics?: {
    sweetness?: number;
    acidity?: number;
    tannins?: number;
    body?: number;
    style?: string;
    regionCharacter?: string;
  };
  questionAnalysis: Array<{
    question: string;
    questionType: string;
    answered: boolean;
    comparison: any;
  }>;
}) {
  // Check if we have pre-uploaded characteristics with the required taste attributes
  const hasPreUploadedCharacteristics = expectedCharacteristics &&
    (typeof expectedCharacteristics.sweetness === 'number' ||
     typeof expectedCharacteristics.acidity === 'number' ||
     typeof expectedCharacteristics.tannins === 'number' ||
     typeof expectedCharacteristics.body === 'number');

  // Only fetch from LLM if no pre-uploaded characteristics exist
  const { data: fetchedCharacteristics, isLoading } = useQuery<{
    found: boolean;
    characteristics?: WineCharacteristicsData;
  }>({
    queryKey: ['wine-characteristics', wineName],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/solo/wines/characteristics', {
        wineName,
        wineRegion: wineDescription
      });
      return response.json();
    },
    staleTime: 1000 * 60 * 30,
    retry: 1,
    enabled: !hasPreUploadedCharacteristics // Only fetch if no pre-uploaded data
  });

  // Use pre-uploaded characteristics or fetched ones
  const characteristics: WineCharacteristicsData | undefined = hasPreUploadedCharacteristics
    ? {
        sweetness: expectedCharacteristics.sweetness ?? 3,
        acidity: expectedCharacteristics.acidity ?? 3,
        tannins: expectedCharacteristics.tannins ?? 3,
        body: expectedCharacteristics.body ?? 3,
        style: expectedCharacteristics.style,
        regionCharacter: expectedCharacteristics.regionCharacter,
        source: 'cache' as const
      }
    : fetchedCharacteristics?.characteristics;

  // Extract user ratings from question analysis
  const extractUserRatings = () => {
    const ratings: { sweetness?: number; acidity?: number; tannins?: number; body?: number } = {};

    const attributePatterns: Record<string, RegExp> = {
      sweetness: /sweet/i,
      acidity: /acid|crisp|tart/i,
      tannins: /tannin|grip|dry/i,
      body: /body|weight|full|light/i
    };

    for (const q of questionAnalysis) {
      if (q.questionType === 'scale' && q.comparison?.yourAnswer) {
        const answer = q.comparison.yourAnswer;
        // Convert 10-point scale to 5-point scale
        const normalizedAnswer = typeof answer === 'number' ? Math.round(answer / 2) : undefined;

        for (const [attr, pattern] of Object.entries(attributePatterns)) {
          if (pattern.test(q.question) && normalizedAnswer) {
            ratings[attr as keyof typeof ratings] = normalizedAnswer;
          }
        }
      }
    }

    return ratings;
  };

  const userRatings = extractUserRatings();
  const hasRatings = Object.keys(userRatings).length > 0;

  // Show loading only if we're fetching (i.e., no pre-uploaded data)
  if (!hasPreUploadedCharacteristics && isLoading) {
    return (
      <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20 animate-pulse">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span className="text-white/60 text-sm">Loading wine intelligence...</span>
        </div>
      </div>
    );
  }

  if (!characteristics || !hasRatings) {
    return null;
  }

  return (
    <WineInsights
      characteristics={characteristics}
      userRatings={userRatings}
      compact={true}
    />
  );
}

export default function TastingCompletion() {
  const { sessionId, participantId } = useParams();
  const [, setLocation] = useLocation();
  const { user, addTastingSession } = useUserProfile();
  const { endSession } = useSessionPersistence();
  const [sessionSaved, setSessionSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const [isDownloading, setIsDownloading] = useState(false);

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
    retry: 1,
    refetchOnWindowFocus: false,
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
        rating: 0
      });
      setSessionSaved(true);
    }
  }, [user, participant, session, responses, progress, sessionSaved, addTastingSession]);


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

  const handleDownloadReport = async () => {
    if (!sessionId) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/export/csv`);
      if (!response.ok) throw new Error('Failed to download report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wine-tasting-report-${sessionId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading report:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
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
            <TabsList className="flex w-full overflow-x-auto md:grid md:grid-cols-5 bg-white/10 backdrop-blur-xl border border-white/20 scrollbar-hide">
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
              {/* Tasting Personality */}
              <Card className="bg-gradient-card border-white/20 backdrop-blur-xl max-w-2xl mx-auto">
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

              {/* Key Insights */}
              <ComingSoonOverlay message="Your personalized insights are being analyzed!" compact>
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
              </ComingSoonOverlay>


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
                      {/* Wine Intelligence - uses pre-uploaded characteristics when available */}
                      <div className="mb-4">
                        <WineInsightsLoader
                          wineName={wine.wineName}
                          wineDescription={wine.wineDescription}
                          expectedCharacteristics={wine.expectedCharacteristics}
                          questionAnalysis={wine.questionAnalysis}
                        />
                      </div>
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="questions" className="border-white/20">
                          <AccordionTrigger className="text-white hover:text-purple-200">
                            View Question-by-Question Analysis
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 pt-3">
                              {wine.questionAnalysis.map((question, index) => (
                                <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                                  <div className="flex justify-between items-start mb-2">
                                    <h5 className="text-white font-medium flex-1">{question.question}</h5>
                                    <ComingSoonOverlay compact>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-purple-300 hover:text-white hover:bg-purple-500/20"
                                        onClick={() => {
                                          // TODO: Implement edit functionality
                                          console.log('Edit answer for:', question.question);
                                        }}
                                      >
                                        <Edit size={12} />
                                      </Button>
                                    </ComingSoonOverlay>
                                  </div>
                                  {(question.comparison || question.answered) && (
                                    <div className="text-sm mb-2">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-purple-200">
                                          {!question.comparison ? 'Your Answer:' 
                                           : question.comparison.hasGroupData === false ? 'Your Answer:' 
                                           : 'Alignment:'}
                                        </span>
                                        <span className={`font-medium ${
                                          !question.comparison || question.comparison.alignment === 'no_data'
                                            ? 'text-blue-300'
                                            : question.comparison.alignment === 'perfect' || question.comparison.alignment === 'strong_consensus' 
                                            ? 'text-green-400' 
                                            : question.comparison.alignment === 'close' || question.comparison.alignment === 'agrees'
                                            ? 'text-green-300'
                                            : question.comparison.alignment === 'somewhat' || question.comparison.alignment === 'partial'
                                            ? 'text-yellow-300'
                                            : question.comparison.alignment === 'different'
                                            ? 'text-orange-300'
                                            : 'text-purple-300'
                                        }`}>
                                          {!question.comparison ? 'Answered Only' 
                                           : question.comparison.alignmentLevel || question.comparison.alignment}
                                        </span>
                                      </div>
                                      
                                      {question.questionType === 'scale' && (
                                        <div className="space-y-1 text-purple-200">
                                          {question.comparison ? (
                                            <>
                                              <div className="flex justify-between">
                                                <span>Your answer:</span>
                                                <span className="text-white">{question.comparison.yourAnswer}/10</span>
                                              </div>
                                              {question.comparison.hasGroupData !== false && (
                                                <>
                                                  <div className="flex justify-between">
                                                    <span>Group average:</span>
                                                    <span className="text-white">{question.comparison.groupAverage.toFixed(1)}/10</span>
                                                  </div>
                                                  {question.comparison.percentageMatch && (
                                                    <div className="flex justify-between">
                                                      <span>Match score:</span>
                                                      <span className="text-white">{question.comparison.percentageMatch}%</span>
                                                    </div>
                                                  )}
                                                </>
                                              )}
                                              {question.comparison.hasGroupData === false && (
                                                <div className="text-blue-200 text-xs italic">
                                                  Group data will appear as more people answer this question
                                                </div>
                                              )}
                                            </>
                                          ) : (
                                            <div className="text-blue-200 text-sm">
                                              You answered this question. Analysis pending...
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      {question.questionType === 'multiple_choice' && (
                                        <div className="space-y-1 text-purple-200">
                                          {question.comparison ? (
                                            <>
                                              <div>
                                                <span>Your choice:</span>
                                                <span className="text-white ml-2">
                                                  {question.comparison.yourAnswerText && question.comparison.hasGroupData === false
                                                    ? question.comparison.yourAnswerText.join(', ')
                                                    : Array.isArray(question.comparison.yourAnswer) 
                                                    ? question.comparison.yourAnswer.join(', ') 
                                                    : question.comparison.yourAnswer}
                                                </span>
                                              </div>
                                              {question.comparison.hasGroupData !== false && (
                                                <>
                                                  <div className="flex justify-between">
                                                    <span>Most popular:</span>
                                                    <span className="text-white">{question.comparison.mostPopular} ({question.comparison.mostPopularPercentage}%)</span>
                                                  </div>
                                                  {question.comparison.consensusScore > 0 && (
                                                    <div className="flex justify-between">
                                                      <span>Consensus score:</span>
                                                      <span className="text-white">{question.comparison.consensusScore}%</span>
                                                    </div>
                                                  )}
                                                </>
                                              )}
                                              {question.comparison.hasGroupData === false && (
                                                <div className="text-blue-200 text-xs italic">
                                                  Group data will appear as more people answer this question
                                                </div>
                                              )}
                                            </>
                                          ) : (
                                            <div className="text-blue-200 text-sm">
                                              You answered this question. Analysis pending...
                                            </div>
                                          )}
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
              <ComingSoonOverlay message="We're building your personalized wine profile analysis. Check back soon!">
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
              </ComingSoonOverlay>
            </TabsContent>

            {/* Tab 4: vs Everyone (Group Comparison) */}
            <TabsContent value="comparison" className="space-y-6 mt-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-white mb-2">Your Answers vs Everyone</h2>
                <p className="text-purple-200">
                  {analytics.wineBreakdowns.some(wine => 
                    wine.questionAnalysis.some(q => q.comparison?.hasGroupData !== false)
                  ) ? "See how your taste preferences compare to other participants" 
                     : "Your answers are recorded! Group comparisons will appear as more people join."}
                </p>
              </div>

              <div className="space-y-6">
                {analytics.wineBreakdowns.map((wine) => {
                  const answeredQuestions = wine.questionAnalysis.filter(q => q.answered);
                  if (answeredQuestions.length === 0) return null;
                  
                  return (
                    <Card key={wine.wineId} className="bg-gradient-card border-white/20 backdrop-blur-xl">
                      <CardHeader>
                        <div className="flex items-center gap-4">
                          {wine.wineImageUrl && (
                            <img 
                              src={wine.wineImageUrl} 
                              alt={wine.wineName}
                              className="w-12 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <CardTitle className="text-white">{wine.wineName}</CardTitle>
                            <CardDescription className="text-purple-200">
                              {answeredQuestions.length} question{answeredQuestions.length !== 1 ? 's' : ''} answered
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          {answeredQuestions.map((question, index) => {
                            const hasGroupData = question.comparison?.hasGroupData !== false;
                            const comparison = question.comparison;
                            
                            return (
                              <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <div className="flex justify-between items-start mb-3">
                                  <h5 className="text-white font-medium text-sm flex-1 pr-3">
                                    {question.question}
                                  </h5>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs px-2 py-1 ${
                                      question.questionType === 'scale' 
                                        ? 'border-blue-400/50 text-blue-200'
                                        : 'border-green-400/50 text-green-200'
                                    }`}
                                  >
                                    {question.questionType === 'scale' ? 'Rating' : 'Choice'}
                                  </Badge>
                                </div>
                                
                                {/* User's Answer Display */}
                                <div className="mb-3">
                                  <div className="text-xs text-purple-300 mb-1">Your Answer:</div>
                                  <div className="text-white">
                                    {question.questionType === 'scale' && comparison?.yourAnswer && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg font-semibold">{comparison.yourAnswer}/10</span>
                                        <div className="flex-1 bg-white/10 rounded-full h-2">
                                          <div 
                                            className="h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"
                                            style={{ width: `${(comparison.yourAnswer / 10) * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                    
                                    {question.questionType === 'multiple_choice' && (
                                      <div className="text-sm">
                                        {comparison?.yourAnswerText?.join(', ') || 
                                         (Array.isArray(comparison?.yourAnswer) 
                                           ? comparison.yourAnswer.join(', ') 
                                           : comparison?.yourAnswer || 'No answer recorded')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Comparison Data */}
                                {hasGroupData && comparison ? (
                                  <div className="space-y-2">
                                    <div className="text-xs text-purple-300">Group Comparison:</div>
                                    
                                    {question.questionType === 'scale' && (
                                      <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-purple-200">Group Average:</span>
                                          <span className="text-white">{comparison.groupAverage?.toFixed(1)}/10</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-purple-200">Your Alignment:</span>
                                          <span className={`font-medium ${
                                            comparison.alignment === 'perfect' || comparison.alignment === 'close' 
                                              ? 'text-green-300' 
                                              : comparison.alignment === 'somewhat' 
                                              ? 'text-yellow-300'
                                              : comparison.alignment === 'different'
                                              ? 'text-orange-300'
                                              : 'text-purple-300'
                                          }`}>
                                            {comparison.alignmentLevel} {comparison.percentageMatch && `(${comparison.percentageMatch}%)`}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {question.questionType === 'multiple_choice' && (
                                      <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-purple-200">Most Popular:</span>
                                          <span className="text-white">{comparison.mostPopular} ({comparison.mostPopularPercentage}%)</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-purple-200">Your Alignment:</span>
                                          <span className={`font-medium ${
                                            comparison.alignment === 'strong_consensus' || comparison.alignment === 'agrees' 
                                              ? 'text-green-300' 
                                              : comparison.alignment === 'partial' 
                                              ? 'text-yellow-300'
                                              : 'text-purple-300'
                                          }`}>
                                            {comparison.alignmentLevel}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Users size={16} className="text-blue-400" />
                                      <span className="text-blue-200 text-sm font-medium">Waiting for Others</span>
                                    </div>
                                    <p className="text-blue-200 text-xs">
                                      Your answer is saved! Group comparison data will appear when more participants complete this question.
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Tab 5: Your Journey */}
            <TabsContent value="journey" className="space-y-6 mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <ComingSoonOverlay message="Track your wine journey progress across multiple tastings!">
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
                </ComingSoonOverlay>

                <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="text-yellow-400" size={20} />
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
                <div className="flex flex-col items-center gap-2">
                  <Button
                    disabled={true}
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white/50 hover:bg-white/10 cursor-not-allowed opacity-50"
                  >
                    Create Profile
                  </Button>
                  <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-200 border-purple-400/30">
                    Coming Soon
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 max-w-6xl mx-auto mt-8"
        >
          <Button
            onClick={() => setLocation('/')}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 px-8"
          >
            <Home size={16} className="mr-2" />
            Back to Home
          </Button>
          
          <Button
            onClick={handleDownloadReport}
            disabled={isDownloading}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 px-8"
          >
            <Download size={16} className="mr-2" />
            {isDownloading ? 'Downloading...' : 'Download Report'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}