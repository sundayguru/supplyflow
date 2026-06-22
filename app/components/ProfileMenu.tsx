import { Link, Form } from 'react-router';
import { motion } from 'motion/react';
import { Building2, LogOut, Settings } from 'lucide-react';

type ProfileMenuProps = {
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  onClose: () => void;
  placement?: 'above' | 'below';
};

export const ProfileMenu = ({
  userName,
  userEmail,
  avatarUrl,
  onClose,
  placement = 'below',
}: ProfileMenuProps) => {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Backdrop to close menu */}
      <div className='fixed inset-0 z-40' onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`absolute right-0 z-50 w-56 rounded-xl border border-black/5 bg-white py-2 shadow-lg ${
          placement === 'above' ? 'bottom-full mb-2' : 'mt-2'
        }`}
      >
        {/* User Info */}
        <div className='flex items-center gap-3 border-b border-black/5 px-4 py-3'>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              className='h-8 w-8 rounded-full object-cover'
            />
          ) : (
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-[#5A5A40] text-xs font-semibold text-white'>
              {initials}
            </div>
          )}
          <div className='min-w-0'>
            <p className='truncate text-sm font-medium text-[#1a1a1a]'>
              {userName}
            </p>
            <p className='truncate text-xs text-black/50'>{userEmail}</p>
          </div>
        </div>

        {/* Menu Items */}
        <div className='py-1'>
          <Link
            to='/organization'
            onClick={onClose}
            className='flex items-center gap-3 px-4 py-2.5 text-sm text-black/70 transition-colors hover:bg-black/5'
          >
            <Building2 size={16} />
            Organization
          </Link>
          <Link
            to='/settings'
            onClick={onClose}
            className='flex items-center gap-3 px-4 py-2.5 text-sm text-black/70 transition-colors hover:bg-black/5'
          >
            <Settings size={16} />
            Settings
          </Link>
          <div className='my-1 border-t border-black/5' />
          <Form method='post' action='/auth/logout'>
            <button
              type='submit'
              className='flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50'
            >
              <LogOut size={16} />
              Sign out
            </button>
          </Form>
        </div>
      </motion.div>
    </>
  );
};
