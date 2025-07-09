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

interface SessionData {
  sessionId: string;
  participantId: string;
  joinedAt: number;
  isActive: boolean;
}

// Initialize IndexedDB - Only when user joins a session
const initDB = async (): Promise<IDBPDatabase | null> => {
  try {
    return await openDB('KnowYourGrapeDB', 2, {
      upgrade(db, oldVersion) {
        // Clear old data on upgrade
        if (oldVersion < 2) {
          const storeNames = Array.from(db.objectStoreNames);
          storeNames.forEach(name => db.deleteObjectStore(name));
        }
        
        const responseStore = db.createObjectStore('offlineResponses', { keyPath: 'id' });
        responseStore.createIndex('by-synced', 'synced');
        responseStore.createIndex('by-timestamp', 'timestamp');
        
        const sessionStore = db.createObjectStore('sessionData', { keyPath: 'sessionId' });
        sessionStore.createIndex('by-active', 'isActive');
      },
    });
  } catch (error) {
    console.warn('IndexedDB initialization failed:', error);
    return null;
  }
};

// Check if session is still active
const checkSessionActive = async (sessionId: string): Promise<boolean> => {
  try {
    const response = await apiRequest('GET', `/api/sessions/${sessionId}`);
    return response && typeof response.status === 'string' && response.status === 'active';
  } catch {
    return false;
  }
};

export function useSessionPersistence() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [offlineQueue, setOfflineQueue] = useState<OfflineResponse[]>([]);
  const [db, setDb] = useState<IDBPDatabase | null>(null);
  const [activeSession, setActiveSession] = useState<SessionData | null>(null);

  // Initialize IndexedDB ONLY when needed, not on mount
  const initializeForSession = async (sessionId: string, participantId: string) => {
    if (db) return db; // Already initialized
    
    const database = await initDB();
    setDb(database);
    
    if (database) {
      // Store session data
      const sessionData: SessionData = {
        sessionId,
        participantId,
        joinedAt: Date.now(),
        isActive: true
      };
      
      try {
        await database.put('sessionData', sessionData);
        setActiveSession(sessionData);
        
        // Check for any existing unsynced responses for this session only
        const tx = database.transaction('offlineResponses', 'readonly');
        const store = tx.objectStore('offlineResponses');
        const all = await store.getAll();
        const unsynced = all.filter(item => 
          !item.synced && item.participantId === participantId
        );
        setOfflineQueue(unsynced);
      } catch (error) {
        console.warn('Failed to store session data:', error);
      }
    }
    
    return database;
  };

  // Clear session data when session ends
  const endSession = async () => {
    if (db && activeSession) {
      try {
        // Mark session as inactive
        await db.put('sessionData', { ...activeSession, isActive: false });
        
        // Clear any remaining unsynced data for this session
        const tx = db.transaction('offlineResponses', 'readwrite');
        const store = tx.objectStore('offlineResponses');
        const all = await store.getAll();
        
        for (const item of all) {
          if (item.participantId === activeSession.participantId) {
            await store.delete(item.id);
          }
        }
        
        setActiveSession(null);
        setOfflineQueue([]);
      } catch (error) {
        console.warn('Failed to end session:', error);
      }
    }
  };

  // Check for existing active sessions on startup
  useEffect(() => {
    const checkExistingSessions = async () => {
      // Only check if there's no active session yet
      if (activeSession) return;
      
      const database = await initDB();
      if (!database) return;
      
      try {
        const tx = database.transaction('sessionData', 'readonly');
        const store = tx.objectStore('sessionData');
        const sessions = await store.getAll();
        
        for (const session of sessions) {
          if (session.isActive) {
            // Check if session is still active on server
            const isStillActive = await checkSessionActive(session.sessionId);
            
            if (isStillActive) {
              // Restore active session
              setActiveSession(session);
              setDb(database);
              
              // Load unsynced responses for this session
              const responseTx = database.transaction('offlineResponses', 'readonly');
              const responseStore = responseTx.objectStore('offlineResponses');
              const all = await responseStore.getAll();
              const unsynced = all.filter(item => 
                !item.synced && item.participantId === session.participantId
              );
              setOfflineQueue(unsynced);
              return; // Found active session, no need to check others
            } else {
              // Session is no longer active, clean it up
              await database.put('sessionData', { ...session, isActive: false });
            }
          }
        }
      } catch (error) {
        console.warn('Failed to check existing sessions:', error);
      }
    };
    
    checkExistingSessions();
  }, []);

  // Save response with offline support - ONLY if session is active
  const saveResponse = async (participantId: string, slideId: string, answerJson: any): Promise<void> => {
    // Only save if we have an active session
    if (!activeSession || activeSession.participantId !== participantId) {
      console.warn('Cannot save response: no active session');
      return;
    }

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
        setOfflineQueue(prev => [...prev, response]);
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
          answerJson
        });
        
        // Remove from IndexedDB after successful sync
        if (db) {
          await db.delete('offlineResponses', response.id);
        }
        setOfflineQueue(prev => prev.filter(item => item.id !== response.id));
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('pending');
        // Don't throw - we've saved offline, so this is recoverable
        console.warn('Failed to sync response, saved offline:', error);
      }
    } else {
      setSyncStatus('offline');
    }
  };

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
            // Removing stale offline response
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

  return { 
    saveResponse, 
    syncStatus, 
    offlineQueue, 
    initializeForSession, 
    endSession, 
    activeSession 
  };
}