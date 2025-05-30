import { useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pause, Share, Users, BarChart3 } from "lucide-react";
import type { Participant, Session } from "@shared/schema";

export default function HostDashboard() {
  const { sessionId, participantId } = useParams();

  // Get session data
  const { data: session } = useQuery<Session>({
    queryKey: [`/api/sessions/${sessionId}`],
    enabled: !!sessionId
  });

  // Get participants
  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: [`/api/sessions/${sessionId}/participants`],
    enabled: !!sessionId
  });

  const handlePauseSession = () => {
    // Implement pause functionality
  };

  const handleShareSession = () => {
    // Implement share functionality
  };

  return (
    <div className="min-h-screen bg-gradient-primary p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Session Control Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Host Dashboard</h2>
              <p className="text-white/70">Bordeaux Discovery Collection</p>
            </div>
            <Badge className="px-4 py-2 bg-purple-600/30 text-purple-200 border-purple-500/30">
              Host Mode
            </Badge>
          </div>

          {/* Session Controls */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handlePauseSession}
              className="p-4 bg-green-600/20 border border-green-500/30 rounded-xl text-green-200 hover:bg-green-600/30 transition-all duration-300"
              variant="outline"
            >
              <Pause className="text-xl mb-2" size={20} />
              <div className="text-sm font-medium">Pause Session</div>
            </Button>
            <Button
              onClick={handleShareSession}
              className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-200 hover:bg-blue-600/30 transition-all duration-300"
              variant="outline"
            >
              <Share className="text-xl mb-2" size={20} />
              <div className="text-sm font-medium">Share Code</div>
            </Button>
          </div>
        </motion.div>

        {/* Participant Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                Participant Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {participants.map((participant, index) => {
                const progress = (participant.progressPtr || 0) / 8 * 100;
                const progressColor = progress >= 75 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-purple-500';
                
                return (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                        participant.isHost ? 'bg-gradient-button' : 'bg-white/20'
                      }`}>
                        {participant.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{participant.displayName}</div>
                        <div className="text-white/60 text-sm">
                          Question {participant.progressPtr || 0} of 8
                          {participant.isHost && " • Host"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-20 bg-white/20 rounded-full h-2">
                        <div className={`h-2 rounded-full ${progressColor}`} style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-white/70 text-sm">{Math.round(progress)}%</span>
                    </div>
                  </motion.div>
                );
              })}
              
              {participants.length === 0 && (
                <div className="text-center text-white/60 py-8">
                  No participants yet. Share the session code to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Real-time Responses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={20} />
                Live Response Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="text-white font-medium mb-2">Q3: What aromas do you detect?</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Dark fruits</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-white/20 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{ width: '100%' }} />
                        </div>
                        <span className="text-white/70 text-sm">3/3</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Vanilla and oak</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-white/20 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{ width: '66%' }} />
                        </div>
                        <span className="text-white/70 text-sm">2/3</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
