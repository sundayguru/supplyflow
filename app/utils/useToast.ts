import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error';

export type ToastInput = {
  tone: ToastTone;
  message: string;
};

export type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
  dismissToast: (id: string) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
};
