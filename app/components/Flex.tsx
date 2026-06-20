import type { ReactNode } from 'react';

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
