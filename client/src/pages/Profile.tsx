import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  Wine, 
  Calendar, 
  Star, 
  ArrowLeft, 
  Trophy,
  Clock,
  CheckCircle,
  BarChart3
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface TastingSession {
  id: string;
  packageName: string;
  packageCode: string;
  completedAt: string;
  progress: number;
  totalSlides: number;
  completedSlides: number;
  rating?: number;
  wineName: string;
  answers: Record<string, any>;
}

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  tastingSessions: TastingSession[];
  totalSessions: number;
  completedSessions: number;
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'stats'>('overview');

  // Get user profile data from localStorage and API
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentSession, setRecentSession] = useState<TastingSession | null>(null);

  useEffect(() => {
    // Load completed sessions from localStorage
    const completedSessions = JSON.parse(localStorage.getItem('completedSessions') || '[]');
    
    const profileData: UserProfile = {
      id: "user-123",
      email: "wine.lover@example.com", 
      displayName: "Wine Enthusiast",
      tastingSessions: completedSessions.map((session: any) => ({
        id: session.sessionId,
        packageName: session.packageName || session.packageCode,
        packageCode: session.packageCode,
        completedAt: session.completedAt,
        progress: session.progress,
        totalSlides: session.totalSlides,
        completedSlides: session.completedSlides,
        wineName: session.packageCode, // Will be enhanced with actual wine data
        answers: session.answers
      })),
      totalSessions: completedSessions.length,
      completedSessions: completedSessions.filter((s: any) => s.progress === 100).length
    };

    // Check for recent session (completed in last 30 minutes)
    const recentSessionData = completedSessions.find((session: any) => {
      const completedTime = new Date(session.completedAt).getTime();
      const now = new Date().getTime();
      return (now - completedTime) < 30 * 60 * 1000; // 30 minutes
    });

    setProfile(profileData);
    setRecentSession(recentSessionData ? {
      id: recentSessionData.sessionId,
      packageName: recentSessionData.packageName || recentSessionData.packageCode,
      packageCode: recentSessionData.packageCode,
      completedAt: recentSessionData.completedAt,
      progress: recentSessionData.progress,
      totalSlides: recentSessionData.totalSlides,
      completedSlides: recentSessionData.completedSlides,
      wineName: recentSessionData.packageCode,
      answers: recentSessionData.answers
    } : null);
    
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
        />
      </div>
    );
  }

  const completionRate = profile?.totalSessions ? 
    (profile.completedSessions / profile.totalSessions) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 bg-gradient-primary/95 backdrop-blur-xl border-b border-white/10 z-40"
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setLocation('/')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-white">
                <User className="w-5 h-5" />
                <span className="font-medium">{profile?.displayName || 'Wine Enthusiast'}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Recent Session Completion */}
        {recentSession && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg">Session Completed!</h3>
                  <p className="text-white/70">You just finished tasting {recentSession.wineName}</p>
                </div>
                {recentSession.rating && (
                  <div className="flex items-center space-x-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="text-white font-medium">{recentSession.rating}/5</span>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex space-x-1 mb-6 bg-white/10 rounded-2xl p-1"
        >
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'history', label: 'Tasting History', icon: Wine },
            { id: 'stats', label: 'Statistics', icon: BarChart3 }
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 ${
                activeTab === tab.id 
                  ? 'bg-white text-purple-900' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Profile Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6 text-center">
                  <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{profile?.completedSessions || 0}</div>
                  <div className="text-white/70 text-sm">Completed Sessions</div>
                </Card>
                
                <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6 text-center">
                  <Wine className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{profile?.totalSessions || 0}</div>
                  <div className="text-white/70 text-sm">Total Sessions</div>
                </Card>
                
                <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6 text-center">
                  <Star className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{completionRate.toFixed(0)}%</div>
                  <div className="text-white/70 text-sm">Completion Rate</div>
                </Card>
              </div>

              {/* Progress Overview */}
              <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Your Wine Journey</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-white/70 mb-2">
                      <span>Overall Progress</span>
                      <span>{completionRate.toFixed(0)}%</span>
                    </div>
                    <Progress value={completionRate} className="h-2" />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {profile?.tastingSessions?.length ? (
                profile.tastingSessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-white font-semibold">{session.wineName}</h4>
                            <Badge variant="secondary" className="bg-purple-500/20 text-purple-200">
                              {session.packageCode}
                            </Badge>
                            {session.progress === 100 && (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                          
                          <p className="text-white/70 text-sm mb-3">{session.packageName}</p>
                          
                          <div className="flex items-center space-x-4 text-sm text-white/60">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(session.completedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{session.completedSlides}/{session.totalSlides} slides</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {session.rating && (
                            <div className="flex items-center space-x-1 mb-2">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-white font-medium">{session.rating}/5</span>
                            </div>
                          )}
                          <div className="text-sm text-white/70">{session.progress}% complete</div>
                          <Progress value={session.progress} className="w-20 h-1 mt-1" />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-12 text-center">
                  <Wine className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <h3 className="text-white font-semibold text-lg mb-2">No Tastings Yet</h3>
                  <p className="text-white/70 mb-6">Start your first wine tasting session to see your history here.</p>
                  <Button onClick={() => setLocation('/')} className="bg-white text-purple-900 hover:bg-white/90">
                    Start Tasting
                  </Button>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <Card className="bg-gradient-card backdrop-blur-xl border-white/20 p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Detailed Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-white/70 text-sm font-medium mb-2">Session Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-white">
                        <span>Completed</span>
                        <span className="font-medium">{profile?.completedSessions || 0}</span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>In Progress</span>
                        <span>{(profile?.totalSessions || 0) - (profile?.completedSessions || 0)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-white/70 text-sm font-medium mb-2">Average Rating</h4>
                    <div className="flex items-center space-x-2">
                      <Star className="w-5 h-5 text-yellow-400 fill-current" />
                      <span className="text-white font-medium text-lg">
                        {profile?.tastingSessions?.length ? 
                          (profile.tastingSessions
                            .filter(s => s.rating)
                            .reduce((acc, s) => acc + (s.rating || 0), 0) / 
                           profile.tastingSessions.filter(s => s.rating).length
                          ).toFixed(1) : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}