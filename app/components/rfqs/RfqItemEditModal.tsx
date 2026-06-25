import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { ProductPriceRecord } from '~/types/productPrice';
import type { RfqItemRecord } from '~/types/rfq';
import { RfqItemFields, type RfqItemFormValue } from './RfqItemFields';

type RfqItemEditModalProps = {
  item: RfqItemRecord;
  currency: string;
  productPrices: ProductPriceRecord[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (value: RfqItemFormValue) => void;
};

export const RfqItemEditModal = ({
  item,
  currency,
  productPrices,
  isSaving,
  onClose,
  onSubmit,
}: RfqItemEditModalProps) => {
  const [value, setValue] = useState<RfqItemFormValue>(item);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(value);
  };

  return (
    <div className='fixed inset-0 z-[110] flex items-center justify-center p-4'>
      <button
        type='button'
        onClick={onClose}
        className='absolute inset-0 bg-slate-950/55 backdrop-blur-sm'
        aria-label='Close item editor'
      />
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='rfq-item-edit-title'
        className='relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8'
      >
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase'>
              Line item
            </p>
            <h2
              id='rfq-item-edit-title'
              className='mt-2 font-serif text-3xl font-semibold text-slate-950'
            >
              Edit RFQ item
            </h2>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700'
            aria-label='Close'
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='mt-6'>
          <RfqItemFields
            index={item.position}
            value={value}
            canRemove={false}
            productPrices={productPrices}
            currency={currency}
            onChange={setValue}
            onRemove={() => undefined}
          />
          <div className='mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5'>
            <button
              type='button'
              onClick={onClose}
              disabled={isSaving}
              className='rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={isSaving}
              className='rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50'
            >
              {isSaving ? 'Saving…' : 'Save item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
