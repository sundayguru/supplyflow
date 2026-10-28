import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type {
  VendorPurchaseOrderAcknowledgementItemInput,
  VendorPurchaseOrderAcknowledgementItemRecord,
} from '~/types/vendorPurchaseOrderAcknowledgement';
import { vendorPurchaseOrderAcknowledgementItemStatuses } from '~/types/vendorPurchaseOrderAcknowledgement';

type VendorPurchaseOrderAcknowledgementItemEditModalProps = {
  item: VendorPurchaseOrderAcknowledgementItemRecord;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (value: VendorPurchaseOrderAcknowledgementItemInput) => void;
};

export const VendorPurchaseOrderAcknowledgementItemEditModal = ({
  item,
  isSaving,
  error,
  onClose,
  onSubmit,
}: VendorPurchaseOrderAcknowledgementItemEditModalProps) => {
  const [value, setValue] =
    useState<VendorPurchaseOrderAcknowledgementItemInput>({
      vendorPurchaseOrderItemId: item.vendorPurchaseOrderItemId,
      quantity: item.quantity,
      price: item.price,
      unit: item.unit,
      description: item.description,
      manufacturerPartNumber: item.manufacturerPartNumber,
      deliveryDate: item.deliveryDate,
      status: item.status,
      statusReason: null,
      notes: item.notes,
    });
  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500';
  const update = <
    Key extends keyof VendorPurchaseOrderAcknowledgementItemInput,
  >(
    key: Key,
    next: VendorPurchaseOrderAcknowledgementItemInput[Key],
  ) => setValue((current) => ({ ...current, [key]: next }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(value);
  };

  return (
    <div className='fixed inset-0 z-[150] flex items-center justify-center p-4'>
      <button
        type='button'
        disabled={isSaving}
        onClick={onClose}
        className='absolute inset-0 bg-slate-950/45 backdrop-blur-sm'
        aria-label='Close item editor'
      />
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='vendor-po-ack-item-edit-title'
        className='relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8'
      >
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase'>
              Vendor PO acknowledgement item
            </p>
            <h2
              id='vendor-po-ack-item-edit-title'
              className='mt-2 font-serif text-3xl font-semibold text-slate-950'
            >
              Edit item
            </h2>
          </div>
          <button
            type='button'
            disabled={isSaving}
            onClick={onClose}
            aria-label='Close'
            className='rounded-xl p-2 text-slate-400 hover:bg-slate-100'
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className='mt-6 space-y-4'>
          {error && (
            <p className='rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700'>
              {error}
            </p>
          )}
          <label className='block text-sm font-semibold text-slate-700'>
            Description
            <input
              required
              value={value.description}
              onChange={(event) => update('description', event.target.value)}
              className={inputClass}
            />
          </label>
          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='text-sm font-semibold text-slate-700'>
              Quantity
              <input
                required
                type='number'
                min='0.01'
                step='any'
                value={value.quantity}
                onChange={(event) =>
                  update('quantity', Number(event.target.value))
                }
                className={inputClass}
              />
            </label>
            <label className='text-sm font-semibold text-slate-700'>
              Unit
              <input
                required
                value={value.unit}
                onChange={(event) => update('unit', event.target.value)}
                className={inputClass}
              />
            </label>
            <label className='text-sm font-semibold text-slate-700'>
              Unit price
              <input
                type='number'
                min='0'
                step='0.01'
                value={value.price / 100}
                onChange={(event) =>
                  update(
                    'price',
                    Math.round(Number(event.target.value || 0) * 100),
                  )
                }
                className={inputClass}
              />
            </label>
            <label className='text-sm font-semibold text-slate-700'>
              Status
              <select
                value={value.status}
                onChange={(event) =>
                  update(
                    'status',
                    event.target
                      .value as VendorPurchaseOrderAcknowledgementItemInput['status'],
                  )
                }
                className={inputClass}
              >
                {vendorPurchaseOrderAcknowledgementItemStatuses.map(
                  (status) => (
                    <option key={status} value={status}>
                      {status.replaceAll('_', ' ')}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className='text-sm font-semibold text-slate-700'>
              Manufacturer part number
              <input
                value={value.manufacturerPartNumber ?? ''}
                onChange={(event) =>
                  update('manufacturerPartNumber', event.target.value || null)
                }
                className={inputClass}
              />
            </label>
            <label className='text-sm font-semibold text-slate-700'>
              Delivery date
              <input
                type='date'
                value={value.deliveryDate ?? ''}
                onChange={(event) =>
                  update('deliveryDate', event.target.value || null)
                }
                className={inputClass}
              />
            </label>
          </div>
          <label className='block text-sm font-semibold text-slate-700'>
            Notes
            <textarea
              rows={3}
              value={value.notes ?? ''}
              onChange={(event) => update('notes', event.target.value || null)}
              className={inputClass}
            />
          </label>
          {value.status !== item.status && (
            <label className='block text-sm font-semibold text-slate-700'>
              Status change reason
              <textarea
                required
                rows={3}
                value={value.statusReason ?? ''}
                onChange={(event) => update('statusReason', event.target.value)}
                className={inputClass}
              />
            </label>
          )}
          <div className='flex justify-end gap-3 border-t border-slate-100 pt-5'>
            <button
              type='button'
              disabled={isSaving}
              onClick={onClose}
              className='rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={isSaving}
              className='rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60'
            >
              {isSaving ? 'Saving…' : 'Save item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
