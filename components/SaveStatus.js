import { CloudOff, Check, RefreshCw, AlertCircle } from 'lucide-react';

const LABELS = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  syncing: 'Syncing…',
  offline: 'Saved locally (Offline)',
  error: 'Save failed — will retry',
};

export default function SaveStatus({ status, pendingCount = 0 }) {
  if (!status || status === 'idle') return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shadow-xs">
      {status === 'saving' && (
        <span className="flex items-center gap-1 text-primary-700 bg-primary-50 border-primary-200">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-600" />
          <span>{LABELS.saving}</span>
        </span>
      )}

      {status === 'saved' && (
        <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border-emerald-200 px-2 py-0.5 rounded-full">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>{LABELS.saved}</span>
        </span>
      )}

      {status === 'syncing' && (
        <span className="flex items-center gap-1 text-blue-700 bg-blue-50 border-blue-200 px-2 py-0.5 rounded-full">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span>Syncing ({pendingCount})...</span>
        </span>
      )}

      {status === 'offline' && (
        <span className="flex items-center gap-1 text-amber-800 bg-amber-50 border-amber-300 px-2 py-0.5 rounded-full">
          <CloudOff className="w-3.5 h-3.5 text-amber-600" />
          <span>
            Saved on device {pendingCount > 0 ? `(${pendingCount} pending)` : ''}
          </span>
        </span>
      )}

      {status === 'error' && (
        <span className="flex items-center gap-1 text-red-700 bg-red-50 border-red-200 px-2 py-0.5 rounded-full">
          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          <span>{LABELS.error}</span>
        </span>
      )}
    </div>
  );
}
