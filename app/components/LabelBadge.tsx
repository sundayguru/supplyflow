import type { ReactNode } from 'react';

type LabelBadgeProps = {
  children: ReactNode;
  className?: string;
};

export const LabelBadge = ({ children, className = '' }: LabelBadgeProps) => {
  return (
    <span
      className={`text-[11px] font-bold uppercase tracking-[0.18em] text-black/35 ${className}`}
    >
      {children}
    </span>
  );
};
