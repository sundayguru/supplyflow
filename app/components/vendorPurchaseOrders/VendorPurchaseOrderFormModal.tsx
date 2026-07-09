import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import type { ManufacturerRecord } from '~/types/manufacturer';
import type { RfqPdfTemplateOption } from '~/types/rfqPdfTemplate';
import {
  vendorPurchaseOrderStatuses,
  type LinkedPurchaseOrderSummary,
  type VendorPurchaseOrderInput,
  type VendorPurchaseOrderStatus,
} from '~/types/vendorPurchaseOrder';
import { currencyOptionLabel, supportedCurrencies } from '~/utils/currencies';
import {
  PurchaseOrderItemFields,
  type PurchaseOrderItemFormValue,
} from '../purchaseOrders/PurchaseOrderItemFields';
import { vendorPurchaseOrderStatusLabels } from './VendorPurchaseOrderStatusBadge';

export type VendorPurchaseOrderFormValue = Omit<
  VendorPurchaseOrderInput,
  'items'
> & {
  id?: string;
  items: PurchaseOrderItemFormValue[];
};

type VendorPurchaseOrderFormModalProps = {
  initialValue?: VendorPurchaseOrderFormValue;
  purchaseOrders: LinkedPurchaseOrderSummary[];
  manufacturers: ManufacturerRecord[];
  templates: RfqPdfTemplateOption[];
  onClose: () => void;
  onSubmit: (value: VendorPurchaseOrderFormValue) => void;
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

export const VendorPurchaseOrderFormModal = ({
  initialValue,
  purchaseOrders,
  manufacturers,
  templates,
  onClose,
  onSubmit,
}: VendorPurchaseOrderFormModalProps) => {
  const [purchaseOrderId, setPurchaseOrderId] = useState(
    initialValue?.purchaseOrderId ?? purchaseOrders[0]?.id ?? '',
  );
  const [templateId, setTemplateId] = useState(initialValue?.templateId ?? '');
  const [vendorManufacturerId, setVendorManufacturerId] = useState(
    initialValue?.vendorManufacturerId ?? '',
  );
  const [vendorName, setVendorName] = useState(initialValue?.vendorName ?? '');
  const [vendorEmail, setVendorEmail] = useState(
    initialValue?.vendorEmail ?? '',
  );
  const [vendorContactName, setVendorContactName] = useState(
    initialValue?.vendorContactName ?? '',
  );
  const [status, setStatus] = useState<VendorPurchaseOrderStatus>(
    initialValue?.status ?? 'draft',
  );
  const [orderDate, setOrderDate] = useState(initialValue?.orderDate ?? '');
  const [expectedDate, setExpectedDate] = useState(
    initialValue?.expectedDate ?? '',
  );
  const [currency, setCurrency] = useState(initialValue?.currency ?? 'EUR');
  const [notes, setNotes] = useState(initialValue?.notes ?? '');
  const [items, setItems] = useState<PurchaseOrderItemFormValue[]>(
    initialValue?.items ?? [emptyItem()],
  );
  const updateVendorManufacturer = (manufacturerName: string) => {
    const normalizedName = manufacturerName.trim();
    const manufacturer = manufacturers.find(
      (candidate) =>
        candidate.name.toLowerCase() === normalizedName.toLowerCase(),
    );
    setVendorName(manufacturerName);
    setVendorManufacturerId(manufacturer?.id ?? '');
    if (manufacturer) {
      setVendorEmail(manufacturer.email ?? '');
      setVendorContactName(manufacturer.contactName ?? '');
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      id: initialValue?.id,
      purchaseOrderId,
      templateId: templateId || null,
      vendorManufacturerId: vendorManufacturerId || null,
      vendorName,
      vendorEmail: vendorEmail || null,
      vendorContactName: vendorContactName || null,
      status,
      orderDate: orderDate || null,
      expectedDate: expectedDate || null,
      currency,
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
        aria-label='Close vendor PO form'
      />
      <div className='relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase'>
              Vendor purchase order
            </p>
            <h2 className='mt-2 font-serif text-3xl font-semibold text-slate-950'>
              {initialValue ? 'Edit vendor PO' : 'Create vendor PO'}
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
          <label className='block text-sm font-semibold text-slate-700'>
            Linked customer PO
            <select
              required
              value={purchaseOrderId}
              onChange={(event) => setPurchaseOrderId(event.target.value)}
              className={inputClass}
            >
              {purchaseOrders.map((purchaseOrder) => (
                <option key={purchaseOrder.id} value={purchaseOrder.id}>
                  {purchaseOrder.reference} · {purchaseOrder.supplierName}
                </option>
              ))}
            </select>
          </label>

          <label className='block text-sm font-semibold text-slate-700'>
            PDF template
            <select
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              className={inputClass}
            >
              <option value=''>Default vendor PO template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <div className='grid gap-5 sm:grid-cols-2'>
            <label className='text-sm font-semibold text-slate-700'>
              Vendor manufacturer
              <input
                required
                list='vendor-po-manufacturers'
                value={vendorName}
                onChange={(event) =>
                  updateVendorManufacturer(event.target.value)
                }
                className={inputClass}
                placeholder='Acme Manufacturing'
              />
              <datalist id='vendor-po-manufacturers'>
                {manufacturers.map((manufacturer) => (
                  <option key={manufacturer.id} value={manufacturer.name} />
                ))}
              </datalist>
            </label>
            <label className='text-sm font-semibold text-slate-700'>
              Vendor email
              <input
                type='email'
                value={vendorEmail}
                onChange={(event) => setVendorEmail(event.target.value)}
                className={inputClass}
                placeholder='orders@example.com'
              />
            </label>
          </div>

          <div className='grid gap-5 sm:grid-cols-2'>
            <label className='text-sm font-semibold text-slate-700'>
              Contact name
              <input
                value={vendorContactName}
                onChange={(event) => setVendorContactName(event.target.value)}
                className={inputClass}
                placeholder='Jordan Lee'
              />
            </label>
            <label className='text-sm font-semibold text-slate-700'>
              Status
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as VendorPurchaseOrderStatus)
                }
                className={inputClass}
              >
                {vendorPurchaseOrderStatuses.map((value) => (
                  <option key={value} value={value}>
                    {vendorPurchaseOrderStatusLabels[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <div className='mb-3 flex items-end justify-between gap-3'>
              <div>
                <h3 className='text-sm font-bold text-slate-800'>
                  Vendor PO items
                </h3>
                <p className='mt-1 text-xs text-slate-400'>
                  Items to send to this vendor.
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

          <div className='grid gap-5 sm:grid-cols-3'>
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
              placeholder='Vendor terms, production notes, or internal context'
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
              {initialValue ? 'Save changes' : 'Create vendor PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
