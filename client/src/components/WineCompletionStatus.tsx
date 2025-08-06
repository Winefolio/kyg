import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, CheckCircle, ArrowRight } from 'lucide-react';
import { useCompletionPolling } from '@/hooks/useCompletionPolling';

interface WineCompletionStatusProps {
  sessionId: string;
  wineId: string;
  wineName: string;
  participantId: string;
  isParticipantFinished: boolean; // Whether current participant has finished this wine
  onSkipTimer: () => void;
  onAllCompleted: () => void;
  onTimerExpired: () => void;
}

export function WineCompletionStatus({
  sessionId,
  wineId,
  wineName,
  participantId,
  isParticipantFinished,
  onSkipTimer,
  onAllCompleted,
  onTimerExpired,
}: WineCompletionStatusProps) {
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  const [showTimer, setShowTimer] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);

  const {
    completionStatus,
    isLoading,
    allCompleted,
    completionPercentage,
    totalParticipants,
    completedCount,
    pendingCount,
    startPolling,
    stopPolling,
  } = useCompletionPolling({
    sessionId,
    wineId,
    enabled: true,
    pollingInterval: 2000, // Poll every 2 seconds
    onAllCompleted: (status) => {
      console.log('All participants completed!', status);
      setShowTimer(false);
      stopPolling();
      onAllCompleted();
    },
  });

  // Start timer and polling when participant finishes
  useEffect(() => {
    if (isParticipantFinished && !allCompleted) {
      setShowTimer(true);
      setTimeLeft(120); // Reset to 2 minutes
      setTimerExpired(false);
      startPolling();
    }
  }, [isParticipantFinished, allCompleted, startPolling]);

  // Timer countdown
  useEffect(() => {
    if (!showTimer || allCompleted || timerExpired) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerExpired(true);
          setShowTimer(false);
          stopPolling();
          onTimerExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimer, allCompleted, timerExpired, stopPolling, onTimerExpired]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle skip button click
  const handleSkip = useCallback(() => {
    setShowTimer(false);
    setTimerExpired(true);
    stopPolling();
    onSkipTimer();
  }, [stopPolling, onSkipTimer]);

  // Don't show anything if participant hasn't finished or if all completed
  if (!isParticipantFinished || allCompleted) {
    return null;
  }

  return (
    <AnimatePresence>
      {showTimer && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed inset-x-0 top-0 z-50 bg-white shadow-lg border-b"
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Timer Section */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <div className="text-sm font-medium text-gray-700">
                    Waiting for others to finish
                  </div>
                </div>
                <Badge variant="outline" className="text-lg font-mono px-3 py-1">
                  {formatTime(timeLeft)}
                </Badge>
              </div>

              {/* Progress Section */}
              <div className="flex-1 max-w-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {completedCount} of {totalParticipants} completed
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {completionPercentage}%
                  </span>
                </div>
                <Progress 
                  value={completionPercentage} 
                  className="h-2"
                />
                {isLoading && (
                  <div className="text-xs text-gray-500 mt-1">
                    Checking status...
                  </div>
                )}
              </div>

              {/* Action Section */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-800">
                    {wineName}
                  </div>
                  <div className="text-xs text-gray-600">
                    {pendingCount} still tasting
                  </div>
                </div>
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  Skip Wait
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Participant Status Details (collapsible) */}
            {completionStatus && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 pt-3 border-t"
              >
                <div className="flex gap-6 text-xs text-gray-600">
                  {completionStatus.completedParticipants.length > 0 && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Completed: </span>
                      <span>
                        {completionStatus.completedParticipants
                          .map(p => p.displayName)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                  {completionStatus.pendingParticipants.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-amber-600" />
                      <span>Still tasting: </span>
                      <span>
                        {completionStatus.pendingParticipants
                          .map(p => `${p.displayName} (${p.questionsAnswered}/${p.totalQuestions})`)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
