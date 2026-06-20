import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

export const Card = ({
  children,
  className = '',
  padding = 'md',
}: CardProps) => {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`rounded-[32px] border border-black/5 bg-white shadow-[0_25px_70px_-35px_rgba(0,0,0,0.18)] ${paddingStyles[padding]} ${className}`}
    >
      {children}
    </div>
  );
};

type SectionProps = {
  children: ReactNode;
  className?: string;
};

export const Section = ({ children, className = '' }: SectionProps) => {
  return <section className={className}>{children}</section>;
};

type AsideProps = {
  children: ReactNode;
  className?: string;
};

export const Aside = ({ children, className = '' }: AsideProps) => {
  return <aside className={className}>{children}</aside>;
};

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

type FlexProps = {
  children: ReactNode;
  direction?: 'row' | 'col';
  justify?: 'start' | 'center' | 'between' | 'end';
  align?: 'start' | 'center' | 'stretch' | 'end';
  gap?: 'none' | 'sm' | 'md' | 'lg';
  wrap?: boolean;
  className?: string;
};

export const Flex = ({
  children,
  direction = 'row',
  justify = 'start',
  align = 'start',
  gap = 'md',
  wrap = false,
  className = '',
}: FlexProps) => {
  const directionStyles = {
    row: 'flex-row',
    col: 'flex-col',
  };

  const justifyStyles = {
    start: 'justify-start',
    center: 'justify-center',
    between: 'justify-between',
    end: 'justify-end',
  };

  const alignStyles = {
    start: 'items-start',
    center: 'items-center',
    stretch: 'items-stretch',
    end: 'items-end',
  };

  const gapStyles = {
    none: '',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-8',
  };

  return (
    <div
      className={`flex ${directionStyles[direction]} ${justifyStyles[justify]} ${alignStyles[align]} ${gapStyles[gap]} ${wrap ? 'flex-wrap' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
