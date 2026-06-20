import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  confirmVariant?: 'primary' | 'danger';
};

export const ConfirmModal = ({
  isOpen,
  title,
  description,
  onClose,
  onConfirm,
  isLoading = false,
  confirmVariant = 'primary',
}: ConfirmModalProps) => {
  const buttonClass =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-[#5A5A40] hover:bg-[#4a4a35]';

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className='fixed inset-0 z-[105] flex items-center justify-center p-4 md:p-8'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='absolute inset-0 bg-black/70 backdrop-blur-sm'
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className='relative w-full max-w-xl rounded-[32px] bg-white p-8 shadow-2xl'
          >
            <div className='mb-6 flex items-start gap-4'>
              <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600'>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className='font-serif text-2xl text-[#1a1a1a]'>{title}</h3>
                <p className='mt-2 text-sm leading-6 text-black/55'>
                  {description}
                </p>
              </div>
            </div>
            <div className='flex items-center justify-end gap-3'>
              <button
                onClick={onClose}
                disabled={isLoading}
                className='rounded-2xl border border-black/10 px-5 py-3 font-medium text-black/60 transition-all hover:bg-black/5 disabled:opacity-50'
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`rounded-2xl px-5 py-3 font-bold text-white transition-all ${buttonClass} disabled:opacity-50`}
              >
                {isLoading ? 'Loading...' : 'Continue'}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};
