import type { ReactNode } from 'react';

type AsideProps = {
  children: ReactNode;
  className?: string;
};

export const Aside = ({ children, className = '' }: AsideProps) => {
  return <aside className={className}>{children}</aside>;
};
