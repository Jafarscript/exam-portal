import { useState, useEffect, useCallback } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  const checkConnection = useCallback(async () => {
    if (typeof window === 'undefined') return true;
    if (!navigator.onLine) {
      setIsOnline(false);
      setWasOffline(true);
      return false;
    }
    try {
      // Fast cache-busted ping to verify active server connectivity
      const res = await fetch(`/api/ping?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      const online = res.ok;
      setIsOnline(online);
      if (!online) setWasOffline(true);
      return online;
    } catch {
      setIsOnline(false);
      setWasOffline(true);
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Double verify via ping
      checkConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic lightweight check every 30 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkConnection();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkConnection]);

  return { isOnline, wasOffline, checkConnection };
}
