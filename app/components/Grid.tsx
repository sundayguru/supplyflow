import type { ReactNode } from 'react';

type GridProps = {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
};

export const Grid = ({
  children,
  columns = 2,
  gap = 'md',
  className = '',
}: GridProps) => {
  const columnStyles = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4',
  };

  const gapStyles = {
    none: '',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-8',
  };

  return (
    <div
      className={`grid ${columnStyles[columns]} ${gapStyles[gap]} ${className}`}
    >
      {children}
    </div>
  );
};
