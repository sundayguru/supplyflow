import type { SelectHTMLAttributes, ReactNode } from 'react';

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  label?: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
};

export const Select = ({
  label,
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  error,
  className = '',
}: SelectProps) => {
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
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className='w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[#1a1a1a] transition outline-none focus:border-[#5A5A40] disabled:opacity-50'
      >
        {placeholder && (
          <option value='' disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className='mt-2 text-sm text-red-600'>{error}</p>}
    </div>
  );
};

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
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
          className='mb-2 block text-xs font-bold tracking-widest text-black/50 uppercase'
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        className='h-full min-h-[24rem] w-full rounded-2xl border border-black/5 bg-white p-6 font-mono text-sm leading-6 text-[#1a1a1a] transition outline-none focus:border-[#5A5A40]'
        {...props}
      />
      {error && <p className='mt-2 text-sm text-red-600'>{error}</p>}
    </div>
  );
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
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
