import type { ReactNode } from 'react';

type SectionProps = {
  children: ReactNode;
  className?: string;
};

export const Section = ({ children, className = '' }: SectionProps) => {
  return <section className={className}>{children}</section>;
};
