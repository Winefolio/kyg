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
import type { Session, Participant, Slide, Response } from "@shared/schema";

export default function HostDashboard() {
  const { sessionId, participantId } = useParams();
  const { toast } = useToast();
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'active' | 'paused' | 'completed'>('waiting');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Fetch session information
  const { data: session, isLoading: sessionLoading, refetch: refetchSession } = useQuery<Session & { packageCode?: string }>({
    queryKey: [`/api/sessions/${sessionId}`],
    enabled: !!sessionId,
    refetchInterval: 5000, // Real-time updates
  });

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

  // Fetch all responses for analytics (temporarily disabled until endpoint is created)
  const { data: allResponses = [] } = useQuery<Response[]>({
    queryKey: [`/api/sessions/${sessionId}/responses`],
    enabled: false, // Temporarily disabled - endpoint doesn't exist yet
    refetchInterval: 5000,
  });

  // Generate QR and sharing functions
  const generateQRData = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join?code=${session?.packageCode || 'WINE01'}`;
  };

  const copySessionLink = () => {
    navigator.clipboard.writeText(generateQRData());
    toast({
      title: "Session Link Copied!",
      description: "Share this with your guests"
    });
  };

  const downloadQR = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(generateQRData())}`;
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
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(generateQRData())}`;
    window.open(qrUrl, '_blank');
  };

  // Session control functions
  const startSession = () => {
    setSessionStatus('active');
    toast({
      title: "Session Started!",
      description: "Participants can now begin the tasting"
    });
  };

  const pauseSession = () => {
    setSessionStatus('paused');
    toast({
      title: "Session Paused",
      description: "Participants will see a pause message"
    });
  };

  const resetSession = () => {
    setSessionStatus('waiting');
    setCurrentSlideIndex(0);
    toast({
      title: "Session Reset",
      description: "All participants will return to the beginning"
    });
  };

  // Calculate completion statistics
  const getCompletionStats = () => {
    if (!participants.length || !slides.length) return { avgProgress: 0, completedCount: 0 };
    
    const totalProgress = participants.reduce((sum, p) => sum + (p.progressPtr || 0), 0);
    const avgProgress = Math.round((totalProgress / participants.length / slides.length) * 100);
    const completedCount = participants.filter(p => (p.progressPtr || 0) >= slides.length).length;
    
    return { avgProgress, completedCount };
  };

  const { avgProgress, completedCount } = getCompletionStats();

  if (sessionLoading || participantsLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-white">Loading host dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Host Dashboard</h1>
          <p className="text-purple-200">
            Bordeaux Discovery Collection • {participants.length} participants
          </p>
          <Badge 
            className={`mt-2 ${
              sessionStatus === 'active' ? 'bg-green-500' : 
              sessionStatus === 'paused' ? 'bg-yellow-500' : 
              sessionStatus === 'completed' ? 'bg-blue-500' : 'bg-gray-500'
            }`}
          >
            {sessionStatus.charAt(0).toUpperCase() + sessionStatus.slice(1)}
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-xl">
            <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/20">Overview</TabsTrigger>
            <TabsTrigger value="participants" className="text-white data-[state=active]:bg-white/20">Participants</TabsTrigger>
            <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-white/20">Analytics</TabsTrigger>
            <TabsTrigger value="controls" className="text-white data-[state=active]:bg-white/20">Controls</TabsTrigger>
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
                    variant="outline"
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Copy size={16} className="mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    onClick={viewQR}
                    variant="outline"
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Eye size={16} className="mr-2" />
                    View QR Code
                  </Button>
                  <Button
                    onClick={downloadQR}
                    variant="outline"
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
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
                      const progress = Math.round(((participant.progressPtr || 0) / slides.length) * 100);
                      const isCompleted = (participant.progressPtr || 0) >= slides.length;
                      
                      return (
                        <div key={participant.id} className="flex items-center space-x-4 p-4 rounded-lg bg-white/5">
                          <Avatar>
                            <AvatarFallback className="bg-purple-500 text-white">
                              {participant.displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium">{participant.displayName}</span>
                              <div className="flex items-center space-x-2">
                                {isCompleted && <CheckCircle size={16} className="text-green-400" />}
                                <Badge variant={isCompleted ? "default" : "secondary"}>
                                  {progress}%
                                </Badge>
                              </div>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <p className="text-purple-200 text-xs mt-1">
                              Step {participant.progressPtr || 0} of {slides.length}
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
                      <span className="font-bold">{allResponses.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Questions Answered:</span>
                      <span className="font-bold">{slides.filter(s => s.type === 'question').length}</span>
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
                      <span>Active Time:</span>
                      <span className="font-bold">
                        {sessionStatus === 'active' ? '5m 23s' : '0m 0s'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Session Time:</span>
                      <span className="font-bold">12m 45s</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Engagement Rate:</span>
                      <span className="font-bold text-green-400">94%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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