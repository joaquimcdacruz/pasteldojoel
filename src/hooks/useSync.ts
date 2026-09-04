import { useEffect, useState } from 'react';
import { StorageService } from '@/services/storageService';

export const useSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      performSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const performSync = async () => {
      if (navigator.onLine) {
        setIsSyncing(true);
        try {
          await StorageService.syncPendingData();
        } catch (error) {
          console.error("Sync failed:", error);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check
    performSync();

    // Periodic sync check every 30 seconds if online
    const interval = setInterval(performSync, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, isSyncing };
};
