import type { ReactNode } from 'react';

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
