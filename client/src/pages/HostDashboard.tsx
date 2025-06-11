import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, Wine, BarChart3, Settings, QrCode, Copy, Download, 
  Play, Pause, RotateCcw, Eye, Clock, TrendingUp, CheckCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SessionWineSelector } from "@/components/SessionWineSelector";
import type { Session, Participant, Slide, Response } from "@shared/schema";

// Analytics data types
interface SlideAnalytics {
  slideId: string;
  slidePosition: number;
  slideTitle: string;
  slideType: string;
  questionType?: string;
  totalResponses: number;
  aggregatedData: {
    optionsSummary?: Array<{
      optionId: string;
      optionText: string;
      count: number;
      percentage: number;
    }>;
    notesSubmittedCount?: number;
    averageScore?: number;
    minScore?: number;
    maxScore?: number;
    scoreDistribution?: { [key: string]: number };
  };
}

interface SessionAnalyticsData {
  sessionId: string;
  sessionName: string;
  packageName: string;
  packageCode: string;
  totalParticipants: number;
  completedParticipants: number;
  averageProgressPercent: number;
  totalQuestions: number;
  slidesAnalytics: SlideAnalytics[];
}

export default function HostDashboard() {
  const { sessionId, participantId } = useParams();
  const { toast } = useToast();
  const [localSessionStatus, setLocalSessionStatus] = useState<'waiting' | 'active' | 'paused' | 'completed'>('waiting');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Fetch session information
  const { data: session, isLoading: sessionLoading, refetch: refetchSession } = useQuery<Session & { packageCode?: string; short_code?: string | null }>({
    queryKey: [`/api/sessions/${sessionId}`],
    enabled: !!sessionId,
    refetchInterval: 5000, // Real-time updates
  });

  // Use session status from server as source of truth
  const sessionStatus = session?.status || localSessionStatus;

  // Fetch participants
  const { data: participants = [], isLoading: participantsLoading, refetch: refetchParticipants } = useQuery<Participant[]>({
    queryKey: [`/api/sessions/${sessionId}/participants`],
    enabled: !!sessionId,
    refetchInterval: 3000, // Real-time updates
  });

  // Fetch slides for this session (using dynamic package code from session)
  const { data: slideData } = useQuery<{slides: Slide[], totalCount: number}>({
    queryKey: [`/api/packages/${session?.packageCode}/slides?participantId=${participantId}`],
    enabled: !!session?.packageCode && !!participantId,
  });
  const slides = slideData?.slides || [];

  // Fetch analytics data from the new endpoint
  const { 
    data: analyticsData, 
    isLoading: analyticsLoading, 
    error: analyticsError 
  } = useQuery<SessionAnalyticsData>({
    queryKey: [`/api/sessions/${sessionId}/analytics`],
    enabled: !!sessionId,
    refetchInterval: 10000, // Refresh analytics every 10 seconds
  });

  // Generate QR and sharing functions
  const generateQRData = (): string => {
    if (!session?.short_code) {
      return "";
    }
    const baseUrl = window.location.origin;
    return `${baseUrl}/join?sessionId=${session.short_code}`;
  };

  const copySessionLink = () => {
    const qrData = generateQRData();
    if (!qrData) {
      toast({ 
        title: "Error", 
        description: "Session code not available to generate link.", 
        variant: "destructive" 
      });
      return;
    }
    
    navigator.clipboard.writeText(qrData);
    toast({
      title: "Session Link Copied!",
      description: "Share this with your guests"
    });
  };

  const downloadQR = () => {
    const qrData = generateQRData();
    if (!qrData) {
      toast({ 
        title: "Error", 
        description: "Session code not available to generate QR code.", 
        variant: "destructive" 
      });
      return;
    }
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(qrData)}`;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `wine-tasting-session-qr.png`;
    link.click();
    
    toast({
      title: "QR Code Downloaded!",
      description: "Print and display for your guests"
    });
  };

  const viewQR = () => {
    const qrData = generateQRData();
    if (!qrData) {
      toast({ 
        title: "Error", 
        description: "Session code not available to generate QR code.", 
        variant: "destructive" 
      });
      return;
    }
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(qrData)}`;
    window.open(qrUrl, '_blank');
  };

  // Session status update mutation
  const updateSessionStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest('PATCH', `/api/sessions/${sessionId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      // Refetch session data to get updated status
      refetchSession();
    }
  });

  // Session control functions
  const startSession = async () => {
    try {
      await updateSessionStatusMutation.mutateAsync('active');
      setLocalSessionStatus('active');
      toast({
        title: "Session Started!",
        description: "Participants can now begin the tasting"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start session",
        variant: "destructive"
      });
    }
  };

  const pauseSession = async () => {
    try {
      await updateSessionStatusMutation.mutateAsync('paused');
      setLocalSessionStatus('paused');
      toast({
        title: "Session Paused",
        description: "Participants will see a pause message"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pause session",
        variant: "destructive"
      });
    }
  };

  const resetSession = async () => {
    try {
      await updateSessionStatusMutation.mutateAsync('waiting');
      setLocalSessionStatus('waiting');
      setCurrentSlideIndex(0);
      toast({
        title: "Session Reset",
        description: "All participants will return to the beginning"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset session",
        variant: "destructive"
      });
    }
  };

  // Use analytics data for completion statistics when available
  const avgProgress = analyticsData?.averageProgressPercent || 0;
  const completedCount = analyticsData?.completedParticipants || 0;

  // Update local session status when session data changes
  useEffect(() => {
    if (session?.status) {
      setLocalSessionStatus(session.status as 'waiting' | 'active' | 'paused' | 'completed');
    }
  }, [session?.status]);

  if (sessionLoading || participantsLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-white">Loading host dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Improved Header with Better Spacing */}
        <div className="text-center mb-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Host Dashboard
            </h1>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-lg">
              <span className="text-purple-200 font-medium">
                {analyticsData?.packageName || session?.packageCode || 'Wine Collection'}
              </span>
              <span className="hidden sm:block text-purple-300">•</span>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-300" />
                <span className="text-purple-200">{participants.length} participants</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Badge 
              className={`px-4 py-2 text-sm font-medium ${
                sessionStatus === 'active' ? 'bg-green-500/20 text-green-300 border-green-400/50' : 
                sessionStatus === 'paused' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50' : 
                sessionStatus === 'completed' ? 'bg-blue-500/20 text-blue-300 border-blue-400/50' : 
                'bg-gray-500/20 text-gray-300 border-gray-400/50'
              } border`}
            >
              {sessionStatus.charAt(0).toUpperCase() + sessionStatus.slice(1)}
            </Badge>
            
            {/* Session Code with Better Design */}
            {session?.short_code && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-purple-300 text-sm font-medium">Session Code</span>
                <div className="bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl px-6 py-3">
                  <span className="text-white text-2xl font-bold tracking-[0.2em] font-mono">
                    {session.short_code}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-5 bg-white/10 backdrop-blur-xl rounded-2xl p-1 mb-8">
            <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-xl py-3 px-4 text-sm font-medium transition-all">Overview</TabsTrigger>
            <TabsTrigger value="wines" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-xl py-3 px-4 text-sm font-medium transition-all">Selection</TabsTrigger>
            <TabsTrigger value="participants" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-xl py-3 px-4 text-sm font-medium transition-all">Participants</TabsTrigger>
            <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-xl py-3 px-4 text-sm font-medium transition-all">Analytics</TabsTrigger>
            <TabsTrigger value="controls" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-xl py-3 px-4 text-sm font-medium transition-all">Controls</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Session Stats */}
              <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users size={20} />
                    Session Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-white space-y-4">
                  <div className="flex justify-between">
                    <span>Participants:</span>
                    <span className="font-bold">{participants.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed:</span>
                    <span className="font-bold text-green-400">{completedCount}</span>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Average Progress:</span>
                      <span className="font-bold">{avgProgress}%</span>
                    </div>
                    <Progress value={avgProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <QrCode size={20} />
                    Share Session
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={copySessionLink}
                    disabled={!session?.short_code}
                    variant="outline"
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    <Copy size={16} className="mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    onClick={viewQR}
                    disabled={!session?.short_code}
                    variant="outline"
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    <Eye size={16} className="mr-2" />
                    View QR Code
                  </Button>
                  <Button
                    onClick={downloadQR}
                    disabled={!session?.short_code}
                    variant="outline"
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    <Download size={16} className="mr-2" />
                    Download QR
                  </Button>
                </CardContent>
              </Card>

              {/* Session Controls */}
              <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings size={20} />
                    Session Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sessionStatus === 'waiting' ? (
                    <Button
                      onClick={startSession}
                      className="w-full bg-gradient-button text-white"
                    >
                      <Play size={16} className="mr-2" />
                      Start Session
                    </Button>
                  ) : sessionStatus === 'active' ? (
                    <Button
                      onClick={pauseSession}
                      variant="outline"
                      className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Pause size={16} className="mr-2" />
                      Pause Session
                    </Button>
                  ) : (
                    <Button
                      onClick={startSession}
                      className="w-full bg-gradient-button text-white"
                    >
                      <Play size={16} className="mr-2" />
                      Resume Session
                    </Button>
                  )}
                  
                  <Button
                    onClick={resetSession}
                    variant="outline"
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <RotateCcw size={16} className="mr-2" />
                    Reset Session
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="wines" className="space-y-6">
            {session?.packageId && (
              <SessionWineSelector 
                sessionId={session.id}
                packageId={session.packageId}
                onSelectionChange={(selectedCount) => {
                  console.log(`Host selected ${selectedCount} wines for session`);
                }}
              />
            )}
            {!session?.packageId && (
              <Card className="bg-gradient-card backdrop-blur-xl border border-white/20">
                <CardContent className="p-8 text-center">
                  <Wine className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <h3 className="text-white text-lg font-medium mb-2">No Package Selected</h3>
                  <p className="text-white/60">
                    This session doesn't have a wine package assigned. Contact your administrator.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="participants" className="space-y-6">
            <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Participant Progress</CardTitle>
                <CardDescription className="text-purple-200">
                  Real-time tracking of participant completion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {participants.length > 0 ? (
                    participants.map((participant) => {
                      // Calculate the correct total slides count for this participant
                      const participantViewableSlides = slides.filter(slide => !(slide.payloadJson as any)?.for_host);
                      const totalSlidesForThisParticipant = participant.isHost ? slides.length : participantViewableSlides.length;
                      const progressDenominator = totalSlidesForThisParticipant > 0 ? totalSlidesForThisParticipant : 1;
                      
                      const progress = Math.round(((participant.progressPtr || 0) / progressDenominator) * 100);
                      const isCompleted = (participant.progressPtr || 0) >= totalSlidesForThisParticipant;
                      
                      return (
                        <div key={participant.id} className="flex items-center space-x-4 p-4 rounded-lg bg-white/5">
                          <Avatar>
                            <AvatarFallback className="bg-purple-500 text-white">
                              {participant.displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-white font-medium">{participant.displayName}</span>
                                {participant.isHost && (
                                  <Badge variant="outline" className="bg-amber-500/20 border-amber-500 text-amber-300 text-xs">
                                    Host
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                {isCompleted && <CheckCircle size={16} className="text-green-400" />}
                                <Badge variant={isCompleted ? "default" : "secondary"}>
                                  {progress}%
                                </Badge>
                              </div>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <p className="text-purple-200 text-xs mt-1">
                              Step {participant.progressPtr || 0} of {totalSlidesForThisParticipant}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <Users size={48} className="mx-auto text-white/40 mb-4" />
                      <p className="text-white/60">No participants have joined yet</p>
                      <p className="text-purple-200 text-sm mt-2">
                        Share the QR code or session link to invite participants
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 size={20} />
                    Response Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-white">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Responses:</span>
                      <span className="font-bold">
                        {analyticsData?.slidesAnalytics.reduce((total, slide) => total + slide.totalResponses, 0) || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Questions Answered:</span>
                      <span className="font-bold">
                        {analyticsData?.slidesAnalytics.filter(slide => slide.totalResponses > 0).length || 0} / {analyticsData?.totalQuestions || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completion Rate:</span>
                      <span className="font-bold text-green-400">{avgProgress}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp size={20} />
                    Session Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-white">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Package:</span>
                      <span className="font-bold">{analyticsData?.packageName || session?.packageCode || 'Loading...'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Questions:</span>
                      <span className="font-bold">{analyticsData?.totalQuestions || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Participants:</span>
                      <span className="font-bold text-green-400">{analyticsData?.totalParticipants || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Per-Slide Analytics Breakdown */}
            {analyticsLoading ? (
              <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                <CardContent className="text-white text-center py-8">
                  Loading detailed analytics...
                </CardContent>
              </Card>
            ) : analyticsError ? (
              <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                <CardContent className="text-white text-center py-8">
                  <p className="text-red-400">Error loading analytics data</p>
                  <p className="text-sm text-purple-200 mt-2">Please try refreshing the page</p>
                </CardContent>
              </Card>
            ) : analyticsData?.slidesAnalytics && analyticsData.slidesAnalytics.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white text-center">Question Analytics Breakdown</h3>
                {analyticsData.slidesAnalytics.map((slideAnalytic) => (
                  <Card key={slideAnalytic.slideId} className="bg-gradient-card border-white/20 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-white">
                        Q{slideAnalytic.slidePosition}: {slideAnalytic.slideTitle}
                      </CardTitle>
                      <CardDescription className="text-purple-200">
                        {slideAnalytic.totalResponses} response{slideAnalytic.totalResponses !== 1 ? 's' : ''}
                        {slideAnalytic.questionType && ` • ${slideAnalytic.questionType.replace('_', ' ')}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-white">
                      {slideAnalytic.questionType === 'multiple_choice' && slideAnalytic.aggregatedData.optionsSummary ? (
                        <div className="space-y-4">
                          <h4 className="font-semibold">Response Distribution:</h4>
                          <div className="space-y-2">
                            {slideAnalytic.aggregatedData.optionsSummary.map((option) => (
                              <div key={option.optionId} className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm">{option.optionText}</span>
                                  <span className="font-bold">{option.count} ({option.percentage}%)</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2">
                                  <div 
                                    className="bg-gradient-button h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${option.percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {slideAnalytic.aggregatedData.notesSubmittedCount !== undefined && slideAnalytic.aggregatedData.notesSubmittedCount > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/20">
                              <p className="text-sm text-purple-200">
                                {slideAnalytic.aggregatedData.notesSubmittedCount} participant{slideAnalytic.aggregatedData.notesSubmittedCount !== 1 ? 's' : ''} added notes
                              </p>
                            </div>
                          )}
                        </div>
                      ) : slideAnalytic.questionType === 'scale' && slideAnalytic.aggregatedData.averageScore !== undefined ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-400">{slideAnalytic.aggregatedData.averageScore}</div>
                              <div className="text-sm text-purple-200">Average Score</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xl font-bold">{slideAnalytic.aggregatedData.minScore} - {slideAnalytic.aggregatedData.maxScore}</div>
                              <div className="text-sm text-purple-200">Range</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xl font-bold">{slideAnalytic.totalResponses}</div>
                              <div className="text-sm text-purple-200">Total Responses</div>
                            </div>
                          </div>
                          {slideAnalytic.aggregatedData.scoreDistribution && Object.keys(slideAnalytic.aggregatedData.scoreDistribution).length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-semibold mb-2">Score Distribution:</h4>
                              <div className="grid grid-cols-5 gap-2">
                                {Object.entries(slideAnalytic.aggregatedData.scoreDistribution)
                                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                  .map(([score, count]) => (
                                    <div key={score} className="text-center text-sm">
                                      <div className="font-bold">{score}</div>
                                      <div className="text-purple-200">{count} vote{count !== 1 ? 's' : ''}</div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-purple-200">
                          No response data available for this question
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
                <CardContent className="text-white text-center py-8">
                  <p className="text-purple-200">No question analytics available yet</p>
                  <p className="text-sm text-purple-300 mt-2">Analytics will appear once participants start answering questions</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="controls" className="space-y-6">
            <Card className="bg-gradient-card border-white/20 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Advanced Controls</CardTitle>
                <CardDescription className="text-purple-200">
                  Manage your session with precision
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-white font-medium">Session Management</h3>
                    <div className="space-y-2">
                      <Button
                        onClick={startSession}
                        disabled={sessionStatus === 'active'}
                        className="w-full bg-gradient-button text-white disabled:opacity-50"
                      >
                        <Play size={16} className="mr-2" />
                        Start/Resume Session
                      </Button>
                      <Button
                        onClick={pauseSession}
                        disabled={sessionStatus !== 'active'}
                        variant="outline"
                        className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
                      >
                        <Pause size={16} className="mr-2" />
                        Pause Session
                      </Button>
                      <Button
                        onClick={resetSession}
                        variant="outline"
                        className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <RotateCcw size={16} className="mr-2" />
                        Reset All Progress
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-white font-medium">Data Export</h3>
                    <div className="space-y-2">
                      <Button
                        onClick={() => {
                          // Download CSV export
                          const link = document.createElement('a');
                          link.href = `/api/sessions/${sessionId}/export/csv`;
                          link.download = `wine-tasting-session-${sessionId}-analytics.csv`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          
                          toast({
                            title: "Export Started",
                            description: "Your CSV file will download shortly"
                          });
                        }}
                        variant="outline"
                        className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <Download size={16} className="mr-2" />
                        Export Results (CSV)
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <Download size={16} className="mr-2" />
                        Export Analytics
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <Eye size={16} className="mr-2" />
                        Generate Report
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}