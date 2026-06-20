import { useRef, useEffect } from 'react';
import type { ReactNode } from 'react';

type DropdownMenuProps = {
  isOpen: boolean;
  anchor: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

export const DropdownMenu = ({
  isOpen,
  anchor,
  onClose,
  children,
}: DropdownMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className='absolute top-10 right-0 z-20 min-w-[160px] rounded-xl border border-black/10 bg-white py-1 shadow-lg'
    >
      {children}
    </div>
  );
};
