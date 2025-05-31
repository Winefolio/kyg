import { useState, useEffect } from "react";
import { openDB, IDBPDatabase } from 'idb';
import { apiRequest } from "@/lib/queryClient";

type SyncStatus = 'synced' | 'pending' | 'offline' | 'syncing' | 'partial';

interface OfflineResponse {
  id: string;
  participantId: string;
  slideId: string;
  answerJson: any;
  timestamp: number;
  synced: boolean;
}

// Initialize IndexedDB
const initDB = async (): Promise<IDBPDatabase | null> => {
  try {
    return await openDB('KnowYourGrapeDB', 1, {
      upgrade(db) {
        const store = db.createObjectStore('offlineResponses', { keyPath: 'id' });
        store.createIndex('by-synced', 'synced');
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  } catch (error) {
    console.warn('IndexedDB initialization failed:', error);
    return null;
  }
};

export function useSessionPersistence() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [offlineQueue, setOfflineQueue] = useState<OfflineResponse[]>([]);
  const [db, setDb] = useState<IDBPDatabase | null>(null);

  // Initialize IndexedDB on mount
  useEffect(() => {
    const setupDB = async () => {
      const database = await initDB();
      setDb(database);
      
      // Load any existing unsynced responses from IndexedDB
      if (database) {
        try {
          const tx = database.transaction('offlineResponses', 'readonly');
          const store = tx.objectStore('offlineResponses');
          const all = await store.getAll();
          const unsynced = all.filter(item => !item.synced);
          setOfflineQueue(unsynced);
        } catch (error) {
          console.warn('Failed to load unsynced responses:', error);
        }
      }
    };
    
    setupDB();
  }, []);

  // Save response with offline support using IndexedDB
  const saveResponse = async (participantId: string, slideId: string, answerJson: any) => {
    const response: OfflineResponse = {
      id: crypto.randomUUID(),
      participantId,
      slideId,
      answerJson,
      timestamp: Date.now(),
      synced: false
    };
    
    // Save to IndexedDB first for offline persistence
    if (db) {
      try {
        await db.add('offlineResponses', response);
      } catch (error) {
        console.warn('Failed to save to IndexedDB:', error);
        // Fallback to memory queue if IndexedDB fails
        setOfflineQueue(prev => [...prev, response]);
      }
    } else {
      // Fallback if IndexedDB is not available
      setOfflineQueue(prev => [...prev, response]);
    }
    
    if (navigator.onLine) {
      try {
        await apiRequest('POST', '/api/responses', {
          participantId,
          slideId,
          answerJson,
          synced: true
        });
        
        // Remove from IndexedDB after successful sync
        if (db) {
          await db.delete('offlineResponses', response.id);
        }
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('pending');
      }
    } else {
      setSyncStatus('offline');
    }
  };

  // Clear stale offline data on startup
  useEffect(() => {
    const clearStaleData = async () => {
      if (db) {
        try {
          // Clear all offline responses to prevent stale participant data from causing errors
          const tx = db.transaction('offlineResponses', 'readwrite');
          const store = tx.objectStore('offlineResponses');
          await store.clear();
          console.log('Cleared stale offline responses');
        } catch (error) {
          console.warn('Failed to clear stale offline data:', error);
        }
      }
    };
    
    clearStaleData();
  }, [db]);

  // Background sync when online
  useEffect(() => {
    const syncOfflineData = async () => {
      if (!navigator.onLine) return;
      
      let unsyncedResponses: OfflineResponse[] = [];
      
      // Get unsynced responses from IndexedDB
      if (db) {
        try {
          const tx = db.transaction('offlineResponses', 'readonly');
          const store = tx.objectStore('offlineResponses');
          const all = await store.getAll();
          unsyncedResponses = all.filter(item => !item.synced);
        } catch (error) {
          console.warn('Failed to get unsynced responses from IndexedDB:', error);
          // Fall back to memory queue
          unsyncedResponses = offlineQueue.filter(item => !item.synced);
        }
      } else {
        // Use memory queue if IndexedDB not available
        unsyncedResponses = offlineQueue.filter(item => !item.synced);
      }
      
      if (unsyncedResponses.length === 0) return;
      
      setSyncStatus('syncing');
      const failed: OfflineResponse[] = [];
      
      for (const item of unsyncedResponses) {
        try {
          await apiRequest('POST', '/api/responses', {
            participantId: item.participantId,
            slideId: item.slideId,
            answerJson: item.answerJson,
            synced: true
          });
          
          // Remove successfully synced item from IndexedDB
          if (db) {
            await db.delete('offlineResponses', item.id);
          }
        } catch (error: any) {
          // If participant not found (404), remove the stale offline response
          if (error.status === 404 || error.message?.includes('Participant not found')) {
            console.log('Removing stale offline response for non-existent participant:', item.participantId);
            if (db) {
              await db.delete('offlineResponses', item.id);
            }
          } else {
            // For other errors, keep trying to sync
            failed.push(item);
          }
        }
      }
      
      setOfflineQueue(failed);
      setSyncStatus(failed.length > 0 ? 'partial' : 'synced');
    };
    
    // Sync when coming online
    window.addEventListener('online', syncOfflineData);
    
    // Try syncing every 30 seconds if there are items to sync
    const interval = setInterval(() => {
      if (offlineQueue.length > 0) {
        syncOfflineData();
      }
    }, 30000);
    
    return () => {
      window.removeEventListener('online', syncOfflineData);
      clearInterval(interval);
    };
  }, [db, offlineQueue]);

  return { saveResponse, syncStatus, offlineQueue };
}