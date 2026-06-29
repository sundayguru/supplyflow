import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import type { ManufacturerRecord } from '~/types/manufacturer';
import {
  purchaseOrderStatuses,
  type LinkedRfqSummary,
  type PurchaseOrderInput,
  type PurchaseOrderStatus,
} from '~/types/purchaseOrder';
import {
  PurchaseOrderItemFields,
  type PurchaseOrderItemFormValue,
} from './PurchaseOrderItemFields';
import { purchaseOrderStatusLabels } from './PurchaseOrderStatusBadge';

export type PurchaseOrderFormValue = Omit<PurchaseOrderInput, 'items'> & {
  id?: string;
  items: PurchaseOrderItemFormValue[];
};

type PurchaseOrderFormModalProps = {
  initialValue?: PurchaseOrderFormValue;
  rfqs: LinkedRfqSummary[];
  manufacturers: ManufacturerRecord[];
  onClose: () => void;
  onSubmit: (value: PurchaseOrderFormValue) => void;
};

const emptyItem = (): PurchaseOrderItemFormValue => ({
  quantity: 1,
  price: 0,
  unit: 'unit',
  description: '',
  status: 'pending',
  manufacturer: null,
  manufacturerId: null,
  manufacturerPartNumber: null,
  specifications: null,
});

export const PurchaseOrderFormModal = ({
  initialValue,
  rfqs,
  manufacturers,
  onClose,
  onSubmit,
}: PurchaseOrderFormModalProps) => {
  const [supplierName, setSupplierName] = useState(
    initialValue?.supplierName ?? '',
  );
  const [supplierEmail, setSupplierEmail] = useState(
    initialValue?.supplierEmail ?? '',
  );
  const [status, setStatus] = useState<PurchaseOrderStatus>(
    initialValue?.status ?? 'draft',
  );
  const [orderDate, setOrderDate] = useState(initialValue?.orderDate ?? '');
  const [expectedDate, setExpectedDate] = useState(
    initialValue?.expectedDate ?? '',
  );
  const [applyVat, setApplyVat] = useState(initialValue?.applyVat ?? false);
  const [currency, setCurrency] = useState(initialValue?.currency ?? 'EUR');
  const [rfqId, setRfqId] = useState(initialValue?.rfqId ?? '');
  const [notes, setNotes] = useState(initialValue?.notes ?? '');
  const [items, setItems] = useState<PurchaseOrderItemFormValue[]>(
    initialValue?.items ?? [emptyItem()],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      id: initialValue?.id,
      supplierName,
      supplierEmail: supplierEmail || null,
      status,
      orderDate: orderDate || null,
      expectedDate: expectedDate || null,
      applyVat,
      currency,
      rfqId: rfqId || null,
      notes: notes || null,
      items,
    });
  };

  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center p-4'>
      <button
        type='button'
        onClick={onClose}
        className='absolute inset-0 bg-slate-950/45 backdrop-blur-sm'
        aria-label='Close PO form'
      />
      <div className='relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.16em] text-emerald-700'>
              {initialValue ? 'Update purchase order' : 'New purchase order'}
            </p>
            <h2 className='mt-2 font-serif text-3xl font-semibold text-slate-950'>
              {initialValue ? 'Edit PO' : 'Create a PO'}
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
          <div className='grid gap-5 sm:grid-cols-2'>
            <label className='text-sm font-semibold text-slate-700'>
              Supplier name
              <input
                required
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                className={inputClass}
                placeholder='Atlas Industrial Supply'
              />
            </label>
            <label className='text-sm font-semibold text-slate-700'>
              Supplier email
              <input
                type='email'
                value={supplierEmail}
                onChange={(event) => setSupplierEmail(event.target.value)}
                className={inputClass}
                placeholder='sales@example.com'
              />
            </label>
          </div>

          <label className='block text-sm font-semibold text-slate-700'>
            Linked RFQ
            <select
              value={rfqId}
              onChange={(event) => setRfqId(event.target.value)}
              className={inputClass}
            >
              <option value=''>No RFQ linked</option>
              {rfqs.map((rfq) => (
                <option key={rfq.id} value={rfq.id}>
                  {rfq.reference} · {rfq.customerName}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div className='mb-3 flex items-end justify-between gap-3'>
              <div>
                <h3 className='text-sm font-bold text-slate-800'>PO items</h3>
                <p className='mt-1 text-xs text-slate-400'>
                  Track every ordered product as a separate line item.
                </p>
              </div>
              <button
                type='button'
                onClick={() => setItems((current) => [...current, emptyItem()])}
                className='inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100'
              >
                <Plus size={14} /> Add item
              </button>
            </div>
            <div className='space-y-4'>
              {items.map((item, index) => (
                <PurchaseOrderItemFields
                  key={index}
                  index={index}
                  value={item}
                  canRemove={items.length > 1}
                  manufacturers={manufacturers}
                  onChange={(nextItem) =>
                    setItems((current) =>
                      current.map((currentItem, currentIndex) =>
                        currentIndex === index ? nextItem : currentItem,
                      ),
                    )
                  }
                  onRemove={() =>
                    setItems((current) =>
                      current.filter(
                        (_, currentIndex) => currentIndex !== index,
                      ),
                    )
                  }
                />
              ))}
            </div>
          </div>

          <div className='grid gap-5 sm:grid-cols-2'>
            <label className='text-sm font-semibold text-slate-700'>
              Status
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as PurchaseOrderStatus)
                }
                className={inputClass}
              >
                {purchaseOrderStatuses.map((value) => (
                  <option key={value} value={value}>
                    {purchaseOrderStatusLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className='text-sm font-semibold text-slate-700'>
              Currency
              <input
                required
                maxLength={3}
                value={currency}
                onChange={(event) =>
                  setCurrency(event.target.value.toUpperCase())
                }
                className={inputClass}
              />
            </label>
          </div>

          <div className='grid gap-5 sm:grid-cols-2'>
            <label className='text-sm font-semibold text-slate-700'>
              Order date
              <input
                type='date'
                value={orderDate}
                onChange={(event) => setOrderDate(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className='text-sm font-semibold text-slate-700'>
              Expected date
              <input
                type='date'
                value={expectedDate}
                onChange={(event) => setExpectedDate(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className='block text-sm font-semibold text-slate-700'>
            Notes
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={inputClass}
              placeholder='Supplier terms, shipping notes, or internal context'
            />
          </label>

          <label className='flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-700'>
            <input
              type='checkbox'
              checked={applyVat}
              onChange={(event) => setApplyVat(event.target.checked)}
              className='h-4 w-4 rounded border-slate-300 text-emerald-600'
            />
            Apply organization VAT
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
              {initialValue ? 'Save changes' : 'Create PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
