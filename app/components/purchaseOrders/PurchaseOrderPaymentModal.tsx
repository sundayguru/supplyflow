import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { formatPurchaseOrderMoney } from '~/utils/purchaseOrder';

export type PurchaseOrderPaymentFormValue = {
  amountPaid: number;
  paymentDate: string;
  paymentReference: string;
};

type PurchaseOrderPaymentModalProps = {
  currency: string;
  outstandingValue: number;
  onClose: () => void;
  onSubmit: (value: PurchaseOrderPaymentFormValue) => void;
};

export const PurchaseOrderPaymentModal = ({
  currency,
  outstandingValue,
  onClose,
  onSubmit,
}: PurchaseOrderPaymentModalProps) => {
  const [amountPaid, setAmountPaid] = useState(
    (outstandingValue / 100).toFixed(2),
  );
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [paymentReference, setPaymentReference] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      amountPaid: Math.round(Number(amountPaid) * 100),
      paymentDate,
      paymentReference,
    });
  };

  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

  return (
    <div className='fixed inset-0 z-[110] flex items-center justify-center p-4'>
      <button
        type='button'
        onClick={onClose}
        className='absolute inset-0 bg-slate-950/45 backdrop-blur-sm'
        aria-label='Close payment form'
      />
      <div className='relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase'>
              Payment confirmation
            </p>
            <h2 className='mt-2 font-serif text-3xl font-semibold text-slate-950'>
              Confirm payment
            </h2>
            <p className='mt-2 text-sm text-slate-500'>
              Outstanding:{' '}
              {formatPurchaseOrderMoney(outstandingValue, currency)}
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700'
            aria-label='Close'
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='mt-7 space-y-5'>
          <label className='block text-sm font-semibold text-slate-700'>
            Amount paid
            <input
              required
              type='number'
              min='0.01'
              step='0.01'
              value={amountPaid}
              onChange={(event) => setAmountPaid(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className='block text-sm font-semibold text-slate-700'>
            Date
            <input
              required
              type='date'
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className='block text-sm font-semibold text-slate-700'>
            Payment reference
            <input
              required
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              className={inputClass}
              placeholder='Bank transfer, receipt, or transaction reference'
            />
          </label>

          <div className='flex justify-end gap-3 border-t border-slate-100 pt-5'>
            <button
              type='button'
              onClick={onClose}
              className='rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500'
            >
              Confirm payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
