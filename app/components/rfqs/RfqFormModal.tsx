import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { rfqStatuses, type RfqInput, type RfqStatus } from '~/types/rfq';
import type { ManufacturerRecord } from '~/types/manufacturer';
import type { ProductPriceRecord } from '~/types/productPrice';
import { currencyOptionLabel, supportedCurrencies } from '~/utils/currencies';
import { RfqItemFields, type RfqItemFormValue } from './RfqItemFields';
import type { RfqPdfTemplateOption } from '~/types';

export type RfqFormValue = Omit<RfqInput, 'items'> & {
  id?: string;
  items: RfqItemFormValue[];
};

type RfqFormModalProps = {
  initialValue?: RfqFormValue;
  onClose: () => void;
  onSubmit: (value: RfqFormValue) => void;
  defaultPriceMarkup: number;
  templates: RfqPdfTemplateOption[];
  productPrices: ProductPriceRecord[];
  manufacturers: ManufacturerRecord[];
};

const statusLabels: Record<RfqStatus, string> = {
  new: 'New',
  pricing: 'Pricing',
  quoted: 'Quoted',
  review: 'Review',
  sent: 'Sent',
  won: 'Won',
  lost: 'Lost',
};

const emptyItem = (priceMarkup: number): RfqItemFormValue => ({
  quantity: 1,
  price: 0,
  priceMarkup,
  discountType: 'percentage',
  discountValue: 0,
  shippingCost: 0,
  unit: 'unit',
  description: '',
  manufacturerId: null,
  manufacturerPartNumber: null,
  specifications: null,
});

export const RfqFormModal = ({
  initialValue,
  onClose,
  onSubmit,
  defaultPriceMarkup,
  templates,
  productPrices,
  manufacturers,
}: RfqFormModalProps) => {
  const [customerName, setCustomerName] = useState(
    initialValue?.customerName ?? '',
  );
  const [customerEmail, setCustomerEmail] = useState(
    initialValue?.customerEmail ?? '',
  );
  const [status, setStatus] = useState<RfqStatus>(
    initialValue?.status ?? 'new',
  );
  const [dueDate, setDueDate] = useState(initialValue?.dueDate ?? '');
  const [applyVat, setApplyVat] = useState(initialValue?.applyVat ?? false);
  const [templateId, setTemplateId] = useState(initialValue?.templateId ?? '');
  const [incoterms, setIncoterms] = useState(initialValue?.incoterms ?? '');
  const [deliveryTerms, setDeliveryTerms] = useState(
    initialValue?.deliveryTerms ?? '',
  );
  const [currency, setCurrency] = useState(initialValue?.currency ?? 'EUR');
  const [items, setItems] = useState<RfqItemFormValue[]>(
    initialValue?.items ?? [emptyItem(defaultPriceMarkup)],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      id: initialValue?.id,
      customerName,
      customerEmail: customerEmail || null,
      status,
      dueDate: dueDate || null,
      applyVat,
      templateId: templateId || null,
      sourcePdfKey: initialValue?.sourcePdfKey ?? null,
      incoterms: incoterms || null,
      deliveryTerms: deliveryTerms || null,
      currency,
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
        aria-label='Close RFQ form'
      />
      <div className='relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.16em] text-emerald-700'>
              {initialValue ? 'Update request' : 'New request'}
            </p>
            <h2 className='mt-2 font-serif text-3xl font-semibold text-slate-950'>
              {initialValue ? 'Edit RFQ' : 'Create an RFQ'}
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
              Customer name
              <input
                required
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className={inputClass}
                placeholder='Atlas Industrial'
              />
            </label>
            <label className='text-sm font-semibold text-slate-700'>
              Customer email
              <input
                type='email'
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                className={inputClass}
                placeholder='buyer@example.com'
              />
            </label>
          </div>

          <label className='block text-sm font-semibold text-slate-700'>
            PDF template
            <select
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              className={inputClass}
            >
              <option value=''>No template selected</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <div className='grid gap-5 sm:grid-cols-2'>
            <label className='text-sm font-semibold text-slate-700'>
              Incoterms
              <input
                value={incoterms}
                onChange={(event) => setIncoterms(event.target.value)}
                className={inputClass}
                placeholder='EXW, FOB, DDP'
              />
            </label>
            <label className='text-sm font-semibold text-slate-700'>
              Delivery terms
              <input
                value={deliveryTerms}
                onChange={(event) => setDeliveryTerms(event.target.value)}
                className={inputClass}
                placeholder='4 weeks after order confirmation'
              />
            </label>
          </div>

          <div>
            <div className='mb-3 flex items-end justify-between gap-3'>
              <div>
                <h3 className='text-sm font-bold text-slate-800'>RFQ items</h3>
                <p className='mt-1 text-xs text-slate-400'>
                  Add every requested product as a separate line item.
                </p>
              </div>
              <button
                type='button'
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    emptyItem(defaultPriceMarkup),
                  ])
                }
                className='inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100'
              >
                <Plus size={14} /> Add item
              </button>
            </div>
            <div className='space-y-4'>
              {items.map((item, index) => (
                <RfqItemFields
                  key={index}
                  index={index}
                  value={item}
                  canRemove={items.length > 1}
                  productPrices={productPrices}
                  manufacturers={manufacturers}
                  currency={currency}
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
                onChange={(event) => setStatus(event.target.value as RfqStatus)}
                className={inputClass}
              >
                {rfqStatuses.map((value) => (
                  <option key={value} value={value}>
                    {statusLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className='text-sm font-semibold text-slate-700'>
              Due date
              <input
                type='date'
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <div className='grid gap-5 sm:grid-cols-2'>
            <label className='text-sm font-semibold text-slate-700'>
              Currency
              <select
                required
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className={inputClass}
              >
                {supportedCurrencies.map((option) => (
                  <option key={option.code} value={option.code}>
                    {currencyOptionLabel(option)}
                  </option>
                ))}
              </select>
            </label>
            <label className='flex items-center gap-3 self-end rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-700'>
              <input
                type='checkbox'
                checked={applyVat}
                onChange={(event) => setApplyVat(event.target.checked)}
                className='h-4 w-4 rounded border-slate-300 text-emerald-600'
              />
              Apply organization VAT
            </label>
          </div>

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
              {initialValue ? 'Save changes' : 'Create RFQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
