import type { ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type LinkButtonProps = {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[#5A5A40] text-white hover:bg-[#4a4a35]',
  secondary: 'bg-[#f5f5f0] text-black/60 hover:bg-black/5',
  outline: 'border border-black/10 text-black/60 hover:bg-black/5',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm rounded-xl',
  md: 'px-5 py-3 text-base rounded-2xl',
  lg: 'px-6 py-4 text-lg rounded-2xl',
};

export const LinkButton = ({
  to,
  variant = 'primary',
  size = 'md',
  children,
  className = '',
}: LinkButtonProps) => {
  return (
    <a
      href={to}
      className={`inline-flex items-center justify-center gap-2 font-bold transition-all ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </a>
  );
};
