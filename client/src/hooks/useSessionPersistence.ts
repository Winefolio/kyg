import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

type SyncStatus = 'synced' | 'pending' | 'offline' | 'syncing' | 'partial';

interface OfflineResponse {
  participantId: string;
  slideId: string;
  answerJson: any;
  timestamp: number;
  synced: boolean;
}

export function useSessionPersistence() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [offlineQueue, setOfflineQueue] = useState<OfflineResponse[]>([]);

  // Save response with offline support
  const saveResponse = async (participantId: string, slideId: string, answerJson: any) => {
    const response: OfflineResponse = {
      participantId,
      slideId,
      answerJson,
      timestamp: Date.now(),
      synced: navigator.onLine
    };
    
    // Always save locally first (in a real implementation, this would use IndexedDB)
    const localResponses = JSON.parse(localStorage.getItem('wineResponses') || '[]');
    localResponses.push(response);
    localStorage.setItem('wineResponses', JSON.stringify(localResponses));
    
    if (navigator.onLine) {
      try {
        await apiRequest('POST', '/api/responses', {
          participantId,
          slideId,
          answerJson,
          synced: true
        });
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('pending');
        queueForSync(response);
      }
    } else {
      setSyncStatus('offline');
      queueForSync(response);
    }
  };

  const queueForSync = (response: OfflineResponse) => {
    setOfflineQueue(prev => [...prev, response]);
  };

  // Background sync when online
  useEffect(() => {
    const syncOfflineData = async () => {
      if (!navigator.onLine || offlineQueue.length === 0) return;
      
      setSyncStatus('syncing');
      const failed: OfflineResponse[] = [];
      
      for (const item of offlineQueue) {
        try {
          await apiRequest('POST', '/api/responses', {
            participantId: item.participantId,
            slideId: item.slideId,
            answerJson: item.answerJson,
            synced: true
          });
        } catch (error) {
          failed.push(item);
        }
      }
      
      setOfflineQueue(failed);
      setSyncStatus(failed.length > 0 ? 'partial' : 'synced');
    };
    
    window.addEventListener('online', syncOfflineData);
    const interval = setInterval(syncOfflineData, 30000); // Try every 30s
    
    return () => {
      window.removeEventListener('online', syncOfflineData);
      clearInterval(interval);
    };
  }, [offlineQueue]);

  return { saveResponse, syncStatus, offlineQueue };
}
