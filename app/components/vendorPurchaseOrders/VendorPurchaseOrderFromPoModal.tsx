import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { ManufacturerRecord } from '~/types/manufacturer';
import type { PurchaseOrderRecord } from '~/types/purchaseOrder';
import type { RfqPdfTemplateOption } from '~/types/rfqPdfTemplate';
import type { VendorPurchaseOrderInput } from '~/types/vendorPurchaseOrder';
import { currencyOptionLabel, supportedCurrencies } from '~/utils/currencies';
import { formatPurchaseOrderMoney } from '~/utils/purchaseOrder';
import { getUnmarkedRfqPriceForPurchaseOrderItem } from '~/utils/vendorPurchaseOrderPricing';

export type VendorPurchaseOrderFromPoValue = VendorPurchaseOrderInput;

type VendorPurchaseOrderFromPoModalProps = {
  purchaseOrder: PurchaseOrderRecord;
  manufacturers: ManufacturerRecord[];
  templates: RfqPdfTemplateOption[];
  onClose: () => void;
  onSubmit: (value: VendorPurchaseOrderFromPoValue) => void;
};

export const VendorPurchaseOrderFromPoModal = ({
  purchaseOrder,
  manufacturers,
  templates,
  onClose,
  onSubmit,
}: VendorPurchaseOrderFromPoModalProps) => {
  const initialTemplateId =
    purchaseOrder.templateId &&
    templates.some((template) => template.id === purchaseOrder.templateId)
      ? purchaseOrder.templateId
      : '';
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [vendorManufacturerId, setVendorManufacturerId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorContactName, setVendorContactName] = useState('');
  const [currency, setCurrency] = useState(purchaseOrder.currency);
  const orderDate = new Date().toISOString().slice(0, 10);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState(
    new Set(purchaseOrder.items.map((item) => item.id)),
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

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      purchaseOrderId: purchaseOrder.id,
      templateId: templateId || null,
      vendorManufacturerId: vendorManufacturerId || null,
      vendorName,
      vendorEmail: vendorEmail || null,
      vendorContactName: vendorContactName || null,
      status: 'draft',
      orderDate: orderDate || null,
      expectedDate: expectedDate || null,
      currency,
      notes: notes || null,
      items: purchaseOrder.items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => selectedItemIds.has(item.id))
        .map(({ item, index }) => ({
          quantity: item.quantity,
          price: getUnmarkedRfqPriceForPurchaseOrderItem(
            item,
            purchaseOrder.linkedRfq?.items,
            index,
          ),
          unit: item.unit,
          description: item.description,
          status: 'pending',
          manufacturerId: item.manufacturerId,
          manufacturerPartNumber: item.manufacturerPartNumber,
          specifications: item.specifications,
        })),
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
        aria-label='Close vendor PO form'
      />
      <div className='relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase'>
              Vendor purchase order
            </p>
            <h2 className='mt-2 font-serif text-3xl font-semibold text-slate-950'>
              Generate vendor PO
            </h2>
            <p className='mt-2 text-sm text-slate-500'>
              Linked to {purchaseOrder.reference}
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

          <div className='grid gap-5 sm:grid-cols-3'>
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

          <input type='hidden' value={orderDate} readOnly />

          <section>
            <p className='text-sm font-bold text-slate-800'>
              Select items to include
            </p>
            <div className='mt-3 space-y-3'>
              {purchaseOrder.items.map((item, index) => {
                const vendorPrice = getUnmarkedRfqPriceForPurchaseOrderItem(
                  item,
                  purchaseOrder.linkedRfq?.items,
                  index,
                );
                return (
                  <label
                    key={item.id}
                    className='flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4'
                  >
                    <input
                      type='checkbox'
                      checked={selectedItemIds.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className='mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600'
                    />
                    <span className='min-w-0 flex-1'>
                      <span className='block font-semibold text-slate-900'>
                        {item.quantity} {item.unit} ·{' '}
                        {formatPurchaseOrderMoney(
                          vendorPrice,
                          purchaseOrder.currency,
                        )}
                      </span>
                      {vendorPrice !== item.price && (
                        <span className='mt-1 block text-xs text-slate-400'>
                          Using RFQ price before markup
                        </span>
                      )}
                      <span className='mt-1 block text-sm text-slate-600'>
                        {item.description}
                      </span>
                      {item.manufacturerPartNumber && (
                        <span className='mt-2 inline-flex rounded-lg bg-white px-2 py-1 font-mono text-xs text-slate-500'>
                          {item.manufacturerPartNumber}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

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
              disabled={selectedItemIds.size === 0}
              className='rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60'
            >
              Create vendor PO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
