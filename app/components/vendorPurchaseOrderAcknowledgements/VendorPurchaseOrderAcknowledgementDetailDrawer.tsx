import { useEffect } from 'react';
import { Link } from 'react-router';
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Package,
  Pencil,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import type { VendorPurchaseOrderAcknowledgementRecord } from '~/types/vendorPurchaseOrderAcknowledgement';
import { formatPurchaseOrderMoney } from '~/utils/purchaseOrder';
import {
  VendorPurchaseOrderAcknowledgementItemStatusBadge,
  VendorPurchaseOrderAcknowledgementStatusBadge,
} from './VendorPurchaseOrderAcknowledgementStatusBadge';

type VendorPurchaseOrderAcknowledgementDetailDrawerProps = {
  acknowledgement: VendorPurchaseOrderAcknowledgementRecord;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const formatDate = (value: string) => new Date(value).toLocaleDateString();

const formatOptionalDate = (value: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString() : 'Not set';

export const VendorPurchaseOrderAcknowledgementDetailDrawer = ({
  acknowledgement,
  onClose,
  onEdit,
  onDelete,
}: VendorPurchaseOrderAcknowledgementDetailDrawerProps) => {
  const totalQuantity = acknowledgement.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const subtotal = acknowledgement.items.reduce(
    (total, item) => total + Math.round(item.price * item.quantity),
    0,
  );
  const currency = acknowledgement.linkedVendorPurchaseOrder.currency;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className='fixed inset-0 z-[90]'>
      <button
        type='button'
        onClick={onClose}
        className='absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]'
        aria-label='Close acknowledgement details'
      />
      <aside
        role='dialog'
        aria-modal='true'
        aria-labelledby='vendor-po-ack-detail-title'
        className='absolute top-0 right-0 flex h-full w-full max-w-2xl flex-col bg-[#f8faf7] shadow-2xl'
      >
        <header className='flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-7'>
          <div>
            <p className='text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase'>
              Vendor PO acknowledgement
            </p>
            <div className='mt-2 flex flex-wrap items-center gap-3'>
              <h2
                id='vendor-po-ack-detail-title'
                className='font-serif text-3xl font-semibold text-slate-950'
              >
                {acknowledgement.reference}
              </h2>
              <VendorPurchaseOrderAcknowledgementStatusBadge
                status={acknowledgement.status}
              />
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700'
            aria-label='Close'
          >
            <X size={21} />
          </button>
        </header>

        <div className='flex-1 overflow-y-auto px-5 py-6 sm:px-7'>
          <section
            className='grid gap-3 sm:grid-cols-2'
            aria-label='Acknowledgement summary'
          >
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <p className='flex items-center gap-2 text-xs font-bold tracking-wide text-slate-400 uppercase'>
                <Truck size={14} /> Vendor
              </p>
              <p className='mt-3 font-semibold text-slate-900'>
                {acknowledgement.linkedVendorPurchaseOrder.vendorName}
              </p>
              <p className='mt-1 text-sm text-slate-500'>
                {acknowledgement.linkedVendorPurchaseOrder.vendorEmail ??
                  'No email'}
              </p>
            </div>
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <p className='flex items-center gap-2 text-xs font-bold tracking-wide text-slate-400 uppercase'>
                <CalendarDays size={14} /> Dates
              </p>
              <p className='mt-3 font-semibold text-slate-900'>
                Acknowledged{' '}
                {formatOptionalDate(acknowledgement.acknowledgedAt)}
              </p>
              <p className='mt-1 text-xs text-slate-400'>
                Created {formatDate(acknowledgement.createdAt)}
              </p>
            </div>
          </section>

          <section className='mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-emerald-700 uppercase'>
              <ClipboardList size={14} /> Linked vendor PO
            </p>
            <Link
              to={`/vendor-purchase-orders?vendorPo=${encodeURIComponent(
                acknowledgement.linkedVendorPurchaseOrder.id,
              )}`}
              className='mt-2 inline-flex font-semibold text-slate-900 hover:text-emerald-700'
            >
              {acknowledgement.linkedVendorPurchaseOrder.reference} ·{' '}
              {acknowledgement.linkedVendorPurchaseOrder.vendorName}
            </Link>
            <p className='mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-500'>
              <FileText size={14} />
              Vendor ack reference:{' '}
              {acknowledgement.acknowledgementReference ?? 'Not provided'}
            </p>
            {acknowledgement.notes && (
              <p className='mt-4 border-t border-slate-100 pt-4 text-sm leading-6 whitespace-pre-wrap text-slate-600'>
                {acknowledgement.notes}
              </p>
            )}
          </section>

          <section className='mt-7'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-xs font-bold tracking-[0.14em] text-emerald-700 uppercase'>
                  Acknowledged items
                </p>
                <h3 className='mt-1 text-lg font-bold text-slate-900'>
                  {acknowledgement.items.length} line item
                  {acknowledgement.items.length === 1 ? '' : 's'}
                </h3>
              </div>
              <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700'>
                <Package size={19} />
              </span>
            </div>

            <div className='mt-4 space-y-4'>
              {acknowledgement.items.map((item, index) => (
                <article
                  key={item.id}
                  className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
                >
                  <div className='flex items-start gap-4'>
                    <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500'>
                      {index + 1}
                    </span>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <p className='font-semibold text-slate-900'>
                          {item.quantity} {item.unit}
                        </p>
                        <div className='text-right'>
                          <p className='text-xs font-bold tracking-wide text-slate-400 uppercase'>
                            Line total
                          </p>
                          <p className='text-sm font-semibold text-emerald-700'>
                            {formatPurchaseOrderMoney(
                              Math.round(item.price * item.quantity),
                              currency,
                            )}
                          </p>
                        </div>
                        <VendorPurchaseOrderAcknowledgementItemStatusBadge
                          status={item.status}
                        />
                      </div>
                      <dl className='mt-3 grid gap-2 text-sm sm:grid-cols-2'>
                        <div className='rounded-xl bg-slate-50 px-3 py-2'>
                          <dt className='text-xs font-bold tracking-wide text-slate-400 uppercase'>
                            Unit price
                          </dt>
                          <dd className='mt-1 font-semibold text-slate-800'>
                            {formatPurchaseOrderMoney(item.price, currency)}
                          </dd>
                        </div>
                        <div className='rounded-xl bg-slate-50 px-3 py-2'>
                          <dt className='text-xs font-bold tracking-wide text-slate-400 uppercase'>
                            Quantity
                          </dt>
                          <dd className='mt-1 font-semibold text-slate-800'>
                            {item.quantity} {item.unit}
                          </dd>
                        </div>
                      </dl>
                      {item.manufacturerPartNumber && (
                        <span className='mt-3 inline-flex rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600'>
                          {item.manufacturerPartNumber}
                        </span>
                      )}
                      <p className='mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-700'>
                        {item.description}
                      </p>
                      <p className='mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500'>
                        Delivery date:{' '}
                        <span className='font-semibold text-slate-800'>
                          {formatOptionalDate(item.deliveryDate)}
                        </span>
                      </p>
                      {item.notes && (
                        <p className='mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-600'>
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className='mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5'>
            <h3 className='flex items-center gap-2 font-semibold text-slate-900'>
              <Truck size={17} /> Acknowledgement summary
            </h3>
            <dl className='mt-4 space-y-3 text-sm'>
              <div className='flex items-center justify-between text-slate-600'>
                <dt>Line items</dt>
                <dd>{acknowledgement.items.length}</dd>
              </div>
              <div className='flex items-center justify-between text-slate-600'>
                <dt>Total quantity</dt>
                <dd>{totalQuantity}</dd>
              </div>
              <div className='flex items-center justify-between text-slate-600'>
                <dt>Items subtotal</dt>
                <dd>{formatPurchaseOrderMoney(subtotal, currency)}</dd>
              </div>
              <div className='flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-950'>
                <dt>Total</dt>
                <dd>{formatPurchaseOrderMoney(subtotal, currency)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <footer className='flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7'>
          <button
            type='button'
            onClick={onDelete}
            className='inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50'
          >
            <Trash2 size={16} /> Delete
          </button>
          <button
            type='button'
            onClick={onEdit}
            className='inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500'
          >
            <Pencil size={16} /> Edit
          </button>
        </footer>
      </aside>
    </div>
  );
};
