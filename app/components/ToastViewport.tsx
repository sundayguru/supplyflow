import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ToastContext,
  type ToastContextValue,
  type ToastInput,
} from '~/utils/useToast';

type ToastRecord = ToastInput & {
  id: string;
};

type ToastProviderProps = {
  children: React.ReactNode;
};

const TOAST_LIFETIME_MS = 4000;

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast: ToastContextValue['dismissToast'] = (id) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    );
  };

  const showToast: ToastContextValue['showToast'] = (toast) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setToasts((currentToasts) => [...currentToasts, { ...toast, id }]);
  };

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timeouts = toasts.map((toast) =>
      window.setTimeout(() => {
        dismissToast(toast.id);
      }, TOAST_LIFETIME_MS),
    );

    return () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className='pointer-events-none fixed top-6 right-6 z-[120] flex max-w-md flex-col gap-3'>
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className='pointer-events-auto'
            >
              <div
                className={`rounded-2xl border px-5 py-4 shadow-xl ${
                  toast.tone === 'success'
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                <div className='flex items-start justify-between gap-4'>
                  <p className='text-sm font-medium'>{toast.message}</p>
                  <button
                    onClick={() => dismissToast(toast.id)}
                    className='text-current/60 transition hover:text-current'
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
