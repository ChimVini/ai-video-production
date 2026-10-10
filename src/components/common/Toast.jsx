import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  let nextId = 0;

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + (++nextId);
    setToasts(prev => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback({
    info: (msg, dur) => addToast(msg, 'info', dur),
    success: (msg, dur) => addToast(msg, 'success', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    error: (msg, dur) => addToast(msg, 'error', dur ?? 8000),
  }, [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(() => onRemove(toast.id), toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onRemove]);

  const styles = {
    info: { bg: 'bg-accent-500/10 border-accent-500/30', icon: Info, iconColor: 'text-accent-400' },
    success: { bg: 'bg-green-500/10 border-green-500/30', icon: CheckCircle, iconColor: 'text-green-400' },
    warning: { bg: 'bg-amber-500/10 border-amber-500/30', icon: AlertTriangle, iconColor: 'text-amber-400' },
    error: { bg: 'bg-red-500/10 border-red-500/30', icon: XCircle, iconColor: 'text-red-400' },
  };

  const s = styles[toast.type] || styles.info;
  const Icon = s.icon;

  return (
    <div className={`px-3 py-2.5 rounded-lg border ${s.bg} shadow-xl backdrop-blur-sm
      flex items-start gap-2.5 text-xs text-t-2 animate-slide-up`}>
      <Icon className={`w-4 h-4 ${s.iconColor} shrink-0 mt-0.5`} />
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="text-t-4 hover:text-t-2 shrink-0">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
