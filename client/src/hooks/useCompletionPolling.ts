import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

interface ParticipantCompletion {
  id: string;
  displayName: string;
  email: string;
  questionsAnswered: number;
  totalQuestions: number;
  completedAt?: string | null;
}

interface CompletionStatus {
  sessionId: string;
  wineId: string;
  totalParticipants: number;
  completedParticipants: ParticipantCompletion[];
  pendingParticipants: ParticipantCompletion[];
  allCompleted: boolean;
  completionPercentage: number;
  wineQuestions: {
    totalQuestions: number;
    questionSlides: Array<{
      id: string;
      position: number;
      globalPosition: number;
    }>;
  };
}

interface UseCompletionPollingOptions {
  sessionId: string;
  wineId: string;
  enabled?: boolean;
  pollingInterval?: number; // milliseconds
  onAllCompleted?: (status: CompletionStatus) => void;
  onCompletionChange?: (status: CompletionStatus) => void;
}

export function useCompletionPolling({
  sessionId,
  wineId,
  enabled = true,
  pollingInterval = 3000, // 3 seconds default
  onAllCompleted,
  onCompletionChange,
}: UseCompletionPollingOptions) {
  const [isPolling, setIsPolling] = useState(false);
  const [lastCompletionPercentage, setLastCompletionPercentage] = useState(0);
  const previousAllCompletedRef = useRef(false);
  const onAllCompletedRef = useRef(onAllCompleted);
  const onCompletionChangeRef = useRef(onCompletionChange);

  // Update refs when callbacks change
  useEffect(() => {
    onAllCompletedRef.current = onAllCompleted;
  }, [onAllCompleted]);

  useEffect(() => {
    onCompletionChangeRef.current = onCompletionChange;
  }, [onCompletionChange]);

  // Query for completion status
  const {
    data: completionStatus,
    isLoading,
    error,
    refetch,
  } = useQuery<CompletionStatus>({
    queryKey: [`/api/sessions/${sessionId}/completion-status`, { wineId }],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${sessionId}/completion-status?wineId=${wineId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch completion status: ${response.status}`);
      }
      return response.json();
    },
    enabled: enabled && !!sessionId && !!wineId,
    refetchInterval: enabled && isPolling ? pollingInterval : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  // Handle completion status changes
  useEffect(() => {
    if (completionStatus) {
      const { allCompleted, completionPercentage } = completionStatus;
      
      // Call onCompletionChange callback if completion percentage changed
      if (completionPercentage !== lastCompletionPercentage) {
        onCompletionChangeRef.current?.(completionStatus);
        setLastCompletionPercentage(completionPercentage);
      }
      
      // Call onAllCompleted callback when all participants complete
      if (allCompleted && !previousAllCompletedRef.current) {
        onAllCompletedRef.current?.(completionStatus);
        setIsPolling(false); // Stop polling when all completed
      }
      
      previousAllCompletedRef.current = allCompleted;
    }
  }, [completionStatus, lastCompletionPercentage]);

  // Start polling
  const startPolling = useCallback(() => {
    setIsPolling(true);
  }, []);

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  // Manual refresh
  const refresh = useCallback(() => {
    return refetch();
  }, [refetch]);

  // Reset state (useful when switching wines)
  const reset = useCallback(() => {
    setIsPolling(false);
    setLastCompletionPercentage(0);
    previousAllCompletedRef.current = false;
  }, []);

  return {
    completionStatus,
    isLoading,
    error,
    isPolling,
    startPolling,
    stopPolling,
    refresh,
    reset,
    // Convenience computed values
    allCompleted: completionStatus?.allCompleted ?? false,
    completionPercentage: completionStatus?.completionPercentage ?? 0,
    totalParticipants: completionStatus?.totalParticipants ?? 0,
    completedCount: completionStatus?.completedParticipants?.length ?? 0,
    pendingCount: completionStatus?.pendingParticipants?.length ?? 0,
  };
}
