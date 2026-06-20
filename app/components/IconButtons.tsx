import { useState, useRef, useEffect } from 'react';
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

type DropdownItemProps = {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  isLoading?: boolean;
};

export const DropdownItem = ({
  onClick,
  disabled = false,
  children,
  isLoading = false,
}: DropdownItemProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className='flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#1a1a1a] hover:bg-black/5 disabled:opacity-50'
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
};

type DropdownProps = {
  trigger: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
};

export const Dropdown = ({
  trigger,
  isOpen,
  onToggle,
  onClose,
  children,
}: DropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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

  return (
    <div ref={dropdownRef} className='relative'>
      <div onClick={onToggle}>{trigger}</div>
      {isOpen && (
        <div className='absolute top-10 right-0 z-20 min-w-[160px] rounded-xl border border-black/10 bg-white py-1 shadow-lg'>
          {children}
        </div>
      )}
    </div>
  );
};
