import { Link } from 'react-router';
import type { ReactNode } from 'react';

type LogoProps = {
  to?: string;
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};


export const Logo = ({
  to = '/',
  children,
  className = '',
}: LogoProps) => {
  return (
    <Link
      to={to}
      aria-label={children ? undefined : 'Supplyflow home'}
      className={`group flex items-center gap-3 ${className}`}
    >
      <img src="/logo.svg" alt="Supplyflow" className="w-40" />
    </Link>
  );
};
