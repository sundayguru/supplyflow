import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { ManufacturerRecord } from '~/types/manufacturer';
import type { PurchaseOrderItemRecord } from '~/types/purchaseOrder';
import { PurchaseOrderItemFields } from './PurchaseOrderItemFields';
import type { PurchaseOrderItemFormValue } from './PurchaseOrderItemFields';

type PurchaseOrderItemEditModalProps = {
  item: PurchaseOrderItemRecord;
  manufacturers: ManufacturerRecord[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (value: PurchaseOrderItemFormValue) => void;
};

export const PurchaseOrderItemEditModal = ({
  item,
  manufacturers,
  isSaving,
  onClose,
  onSubmit,
}: PurchaseOrderItemEditModalProps) => {
  const [value, setValue] = useState<PurchaseOrderItemFormValue>(item);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(value);
  };

  return (
    <div className='fixed inset-0 z-[140] flex items-center justify-center p-4'>
      <button
        type='button'
        onClick={onClose}
        className='absolute inset-0 bg-slate-950/45 backdrop-blur-sm'
        aria-label='Close item editor'
      />
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='po-item-edit-title'
        className='relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8'
      >
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase'>
              Purchase order item
            </p>
            <h2
              id='po-item-edit-title'
              className='mt-2 font-serif text-3xl font-semibold text-slate-950'
            >
              Edit PO item
            </h2>
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
          <PurchaseOrderItemFields
            index={0}
            value={value}
            canRemove={false}
            manufacturers={manufacturers}
            onChange={setValue}
            onRemove={onClose}
          />
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
              disabled={isSaving}
              className='rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60'
            >
              Save item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
