import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from './IconButton';

type FullScreenModalProps = {
  isOpen: boolean;
  title: string;
  code?: string;
  icon: ReactNode;
  onClose: () => void;
  isLoading?: boolean;
  children: ReactNode;
  footer?: ReactNode;
};

export const FullScreenModal = ({
  isOpen,
  title,
  code,
  icon,
  onClose,
  isLoading = false,
  children,
  footer,
}: FullScreenModalProps) => {
  return (
    <AnimatePresence>
      {isOpen ? (
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='absolute inset-0 bg-black/80 backdrop-blur-sm'
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className='relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[40px] bg-white shadow-2xl'
          >
            <div className='flex items-center justify-between border-b border-black/5 bg-white p-6'>
              <div className='flex items-center gap-4 text-[#5A5A40]'>
                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#5A5A40]/10'>
                  {icon}
                </div>
                <div>
                  <h3 className='leading-tight font-bold text-[#1a1a1a]'>
                    {title}
                  </h3>
                  {code && (
                    <p className='text-xs font-bold tracking-widest text-black/40 uppercase'>
                      {code}
                    </p>
                  )}
                </div>
              </div>
              <IconButton
                icon={<X size={20} />}
                ariaLabel='Close'
                onClick={onClose}
                disabled={isLoading}
                variant='secondary'
                size='sm'
              />
            </div>
            <div className='flex-1 bg-gray-100 p-4'>{children}</div>
            {footer && (
              <div className='flex items-center justify-between border-t border-black/5 bg-white p-6'>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};
