import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  id?: string;
  error?: string;
};

export const Input = ({
  label,
  id,
  error,
  className = '',
  ...props
}: InputProps) => {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className='mb-2 block text-xs font-bold tracking-widest text-black/50 uppercase'
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className='w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[#1a1a1a] transition outline-none focus:border-[#5A5A40]'
        {...props}
      />
      {error && <p className='mt-2 text-sm text-red-600'>{error}</p>}
    </div>
  );
};
