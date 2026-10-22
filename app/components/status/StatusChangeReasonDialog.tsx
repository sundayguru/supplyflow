import { useState } from 'react';

type StatusChangeReasonDialogProps = {
  statusLabel: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

export const StatusChangeReasonDialog = ({
  statusLabel,
  onCancel,
  onConfirm,
}: StatusChangeReasonDialogProps) => {
  const [reason, setReason] = useState('');

  return (
    <div className='fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/40 p-4'>
      <form
        className='w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl'
        onSubmit={(event) => {
          event.preventDefault();
          const trimmedReason = reason.trim();
          if (trimmedReason) {
            onConfirm(trimmedReason);
          }
        }}
      >
        <h2 className='text-lg font-semibold text-slate-900'>
          Change status to {statusLabel}
        </h2>
        <label className='mt-4 block text-sm font-medium text-slate-700'>
          Reason
          <textarea
            autoFocus
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            maxLength={2000}
            className='mt-1.5 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
            placeholder='Enter why the status is changing'
          />
        </label>
        <div className='mt-4 flex justify-end gap-2'>
          <button
            type='button'
            onClick={onCancel}
            className='rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={!reason.trim()}
            className='rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50'
          >
            Update status
          </button>
        </div>
      </form>
    </div>
  );
};
