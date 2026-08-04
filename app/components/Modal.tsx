import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from './IconButton';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

type ModalProps = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  size?: ModalSize;
  onClose: () => void;
  isLoading?: boolean;
  children: ReactNode;
  className?: string;
  showCloseButton?: boolean;
};

const sizeMaxWidth: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
};

export const Modal = ({
  isOpen,
  title,
  subtitle,
  icon,
  size = 'md',
  onClose,
  isLoading = false,
  children,
  className = '',
  showCloseButton = true,
}: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen ? (
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8'>
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
            className={`relative w-full ${sizeMaxWidth[size]} rounded-[32px] bg-white p-8 shadow-2xl ${className}`}
          >
            <div className='mb-6 flex items-start justify-between gap-4'>
              <div className='flex items-center gap-4'>
                {icon && (
                  <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#5A5A40]/10 text-[#5A5A40]'>
                    {icon}
                  </div>
                )}
                <div>
                  <h3 className='font-serif text-2xl text-[#1a1a1a]'>
                    {title}
                  </h3>
                  {subtitle && (
                    <p className='mt-2 text-sm text-black/55'>{subtitle}</p>
                  )}
                </div>
              </div>
              {showCloseButton && (
                <IconButton
                  icon={<X size={20} />}
                  ariaLabel='Close modal'
                  onClick={onClose}
                  disabled={isLoading}
                  variant='secondary'
                  size='sm'
                />
              )}
            </div>
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};

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

type EditModalProps = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  isLoading?: boolean;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  charCount?: number;
  saveText?: string;
};

export const EditModal = ({
  isOpen,
  title,
  subtitle,
  onClose,
  isLoading = false,
  value,
  onChange,
  onSave,
  charCount,
  saveText = 'Save',
}: EditModalProps) => {
  return (
    <AnimatePresence>
      {isOpen ? (
        <div className='fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='absolute inset-0 bg-black/80 backdrop-blur-sm'
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            className='relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[40px] bg-white shadow-2xl'
          >
            <div className='flex items-center justify-between border-b border-black/5 bg-white p-6'>
              <div className='flex items-center gap-4 text-[#5A5A40]'>
                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#5A5A40]/10'>
                  <svg
                    className='h-5 w-5'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                    />
                  </svg>
                </div>
                <div>
                  <h3 className='leading-tight font-bold text-[#1a1a1a]'>
                    {title}
                  </h3>
                  {subtitle && (
                    <p className='text-xs font-bold tracking-widest text-black/40 uppercase'>
                      {subtitle}
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
            <div className='flex-1 bg-[#f7f6ef] p-4'>
              <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className='h-full min-h-[24rem] w-full rounded-2xl border border-black/5 bg-white p-6 font-mono text-sm leading-6 text-[#1a1a1a] transition outline-none focus:border-[#5A5A40]'
              />
            </div>
            <div className='flex items-center justify-between border-t border-black/5 bg-white p-6'>
              <p className='text-sm text-black/45'>
                {charCount !== undefined
                  ? `${charCount} characters`
                  : `${value.length} characters`}
              </p>
              <div className='flex items-center gap-3'>
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className='rounded-2xl border border-black/10 px-5 py-3 font-medium text-black/60 transition-all hover:bg-black/5 disabled:opacity-50'
                >
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={isLoading}
                  className='rounded-2xl bg-[#5A5A40] px-5 py-3 font-bold text-white transition-all hover:bg-[#4a4a35] disabled:opacity-50'
                >
                  {isLoading ? 'Saving...' : saveText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};
