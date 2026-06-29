import { Link } from 'react-router';
import type { ReactNode } from 'react';

type LogoProps = {
  to?: string;
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const markSizeClasses = {
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
};

const wordmarkSizeClasses = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
};

export const Logo = ({
  to = '/',
  children,
  size = 'md',
  className = '',
}: LogoProps) => {
  return (
    <Link
      to={to}
      aria-label={children ? undefined : 'Supplyflow home'}
      className={`group flex items-center gap-3 ${className}`}
    >
      <svg
        aria-hidden='true'
        className={`${markSizeClasses[size]} shrink-0 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105`}
        viewBox='0 0 40 40'
        fill='none'
      >
        <rect width='40' height='40' rx='12' fill='#5A5A40' />
        <path
          d='M11 13.5C11 10.462 13.462 8 16.5 8H27'
          stroke='#DDF7A7'
          strokeWidth='3'
          strokeLinecap='round'
        />
        <path
          d='M29 13.5C29 16.538 26.538 19 23.5 19H16.5C13.462 19 11 21.462 11 24.5S13.462 30 16.5 30H27'
          stroke='white'
          strokeWidth='3'
          strokeLinecap='round'
        />
        <path
          d='M24 26.5 27.5 30 24 33.5'
          stroke='#DDF7A7'
          strokeWidth='3'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <circle cx='11' cy='13.5' r='2.5' fill='white' />
        <circle cx='29' cy='13.5' r='2.5' fill='#DDF7A7' />
      </svg>
      {children && (
        <span
          className={`${wordmarkSizeClasses[size]} font-serif font-semibold tracking-tight text-[#1a1a1a]`}
        >
          {children}
        </span>
      )}
    </Link>
  );
};
