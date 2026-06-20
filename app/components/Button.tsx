import type { ReactNode, ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

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

export const Button = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
};

type IconButtonProps = {
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  ariaLabel: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export const IconButton = ({
  icon,
  variant = 'outline',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  ariaLabel,
  ...props
}: IconButtonProps) => {
  const baseStyles =
    'inline-flex items-center justify-center rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeIconStyles: Record<ButtonSize, string> = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const variantBgStyles: Record<ButtonVariant, string> = {
    primary: 'bg-[#5A5A40] text-white',
    secondary: 'bg-black/5 text-black/60 hover:bg-black/10',
    outline: 'border border-black/10 text-black/60 hover:bg-black/5',
    danger: 'bg-red-600 text-white',
  };

  return (
    <button
      disabled={disabled || isLoading}
      aria-label={ariaLabel}
      className={`${baseStyles} ${sizeIconStyles[size]} ${variantBgStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
      ) : (
        icon
      )}
    </button>
  );
};

type LinkButtonProps = {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
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
