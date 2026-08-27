import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function OfflineBanner() {
  const { isOnline, wasOffline, checkConnection } = useOnlineStatus();
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowRestoredNotice(true);
      const timer = setTimeout(() => {
        setShowRestoredNotice(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  const handleManualCheck = async () => {
    setChecking(true);
    await checkConnection();
    setChecking(false);
  };

  if (isOnline && !showRestoredNotice) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 right-4 max-w-md z-50 transition-all duration-300 transform translate-y-0 shadow-lg rounded-xl border p-4 ${
        !isOnline
          ? 'bg-amber-50 border-amber-300 text-amber-900'
          : 'bg-emerald-50 border-emerald-300 text-emerald-900'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {!isOnline ? (
            <span className="p-2 bg-amber-100 rounded-lg inline-flex">
              <WifiOff className="w-5 h-5 text-amber-700 animate-pulse" />
            </span>
          ) : (
            <span className="p-2 bg-emerald-100 rounded-lg inline-flex">
              <Wifi className="w-5 h-5 text-emerald-700" />
            </span>
          )}
        </div>

        <div className="flex-1 text-xs sm:text-sm">
          {!isOnline ? (
            <>
              <p className="font-semibold text-amber-950">You are currently offline</p>
              <p className="text-amber-800/90 mt-0.5 leading-relaxed">
                Don’t worry! All your answers & actions are securely saved locally on this device and will automatically sync once your connection returns.
              </p>
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={checking}
                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-200/80 hover:bg-amber-200 text-amber-900 font-semibold rounded text-xs transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Checking…' : 'Check connection'}
              </button>
            </>
          ) : (
            <>
              <p className="font-semibold text-emerald-950">Connection Restored</p>
              <p className="text-emerald-800/90 mt-0.5">
                You are back online. All offline progress has been synchronized with the server.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
