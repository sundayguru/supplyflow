import { Link } from 'react-router';
import type { ReactNode } from 'react';

type LogoProps = {
  to?: string;
  children?: ReactNode;
};

export const Logo = ({ to = '/', children }: LogoProps) => {
  return (
    <Link to={to} className='flex items-center gap-3'>
      <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#5A5A40]'>
        <svg
          className='h-6 w-6 text-white'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 14l9-5-9-5-9 5 9 5z'
          />
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z'
          />
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.5'
          />
        </svg>
      </div>
      {children && (
        <span className='font-serif text-xl text-[#1a1a1a]'>{children}</span>
      )}
    </Link>
  );
};
