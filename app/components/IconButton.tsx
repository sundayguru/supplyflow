import type { ReactNode, ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type IconButtonProps = {
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  ariaLabel: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

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
