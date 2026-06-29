import type { TextareaHTMLAttributes } from 'react';

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  id?: string;
  error?: string;
};

export const TextArea = ({
  label,
  id,
  error,
  className = '',
  ...props
}: TextAreaProps) => {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className='mb-2 block text-xs font-bold uppercase tracking-widest text-black/50'
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        className='h-full min-h-[24rem] w-full rounded-2xl border border-black/5 bg-white p-6 font-mono text-sm leading-6 text-[#1a1a1a] outline-none transition focus:border-[#5A5A40]'
        {...props}
      />
      {error && <p className='mt-2 text-sm text-red-600'>{error}</p>}
    </div>
  );
};
