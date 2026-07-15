import { Eye, EyeOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';

type PasswordFieldProps = {
  label: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
  labelAction?: ReactNode;
};

export const PasswordField = ({
  label,
  name,
  placeholder = '••••••••',
  autoComplete,
  labelAction,
}: PasswordFieldProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputType = isPasswordVisible ? 'text' : 'password';
  const toggleLabel = isPasswordVisible ? 'Hide password' : 'Show password';
  const ToggleIcon = isPasswordVisible ? EyeOff : Eye;

  return (
    <div>
      <div className='mb-1 flex items-center justify-between'>
        <label className='block text-sm font-medium text-black/70'>
          {label}
        </label>
        {labelAction}
      </div>
      <div className='relative'>
        <input
          type={inputType}
          name={name}
          autoComplete={autoComplete}
          className='w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 pr-12 text-sm transition outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10'
          placeholder={placeholder}
          required
        />
        <button
          type='button'
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={() => setIsPasswordVisible((visible) => !visible)}
          className='absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none'
        >
          <ToggleIcon size={18} />
        </button>
      </div>
    </div>
  );
};
