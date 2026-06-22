import { useEffect } from 'react';
import {
  CalendarDays,
  CircleDollarSign,
  Mail,
  Package,
  Pencil,
  UserRound,
  X,
} from 'lucide-react';
import type { RfqRecord } from '~/types/rfq';
import { formatRfqMoney } from '~/utils/rfq';
import { RfqStatusBadge } from './RfqStatusBadge';

type RfqDetailDrawerProps = {
  rfq: RfqRecord;
  onClose: () => void;
  onEdit: () => void;
};

const formatDate = (value: string) => new Date(value).toLocaleDateString();

export const RfqDetailDrawer = ({
  rfq,
  onClose,
  onEdit,
}: RfqDetailDrawerProps) => {
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
        aria-label='Close RFQ details'
      />
      <aside
        role='dialog'
        aria-modal='true'
        aria-labelledby='rfq-detail-title'
        className='absolute top-0 right-0 flex h-full w-full max-w-2xl flex-col bg-[#f8faf7] shadow-2xl'
      >
        <header className='flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-7'>
          <div>
            <p className='text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase'>
              Request for quotation
            </p>
            <div className='mt-2 flex flex-wrap items-center gap-3'>
              <h2
                id='rfq-detail-title'
                className='font-serif text-3xl font-semibold text-slate-950'
              >
                {rfq.reference}
              </h2>
              <RfqStatusBadge status={rfq.status} />
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
            aria-label='RFQ summary'
          >
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <p className='flex items-center gap-2 text-xs font-bold tracking-wide text-slate-400 uppercase'>
                <UserRound size={14} /> Customer
              </p>
              <p className='mt-3 font-semibold text-slate-900'>
                {rfq.customerName}
              </p>
              <p className='mt-1 flex items-center gap-1.5 text-sm text-slate-500'>
                <Mail size={14} /> {rfq.customerEmail ?? 'No email provided'}
              </p>
            </div>
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <p className='flex items-center gap-2 text-xs font-bold tracking-wide text-slate-400 uppercase'>
                <CircleDollarSign size={14} /> Estimated value
              </p>
              <p className='mt-3 text-2xl font-semibold text-slate-900'>
                {formatRfqMoney(rfq.estimatedValue, rfq.currency)}
              </p>
            </div>
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <p className='flex items-center gap-2 text-xs font-bold tracking-wide text-slate-400 uppercase'>
                <CalendarDays size={14} /> Due date
              </p>
              <p className='mt-3 font-semibold text-slate-900'>
                {rfq.dueDate
                  ? new Date(`${rfq.dueDate}T00:00:00`).toLocaleDateString()
                  : 'Not specified'}
              </p>
            </div>
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <p className='text-xs font-bold tracking-wide text-slate-400 uppercase'>
                Created
              </p>
              <p className='mt-3 font-semibold text-slate-900'>
                {formatDate(rfq.createdAt)}
              </p>
              <p className='mt-1 text-xs text-slate-400'>
                Updated {formatDate(rfq.updatedAt)}
              </p>
            </div>
          </section>

          <section className='mt-7'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-xs font-bold tracking-[0.14em] text-emerald-700 uppercase'>
                  Requested items
                </p>
                <h3 className='mt-1 text-lg font-bold text-slate-900'>
                  {rfq.items.length} line item
                  {rfq.items.length === 1 ? '' : 's'}
                </h3>
              </div>
              <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700'>
                <Package size={19} />
              </span>
            </div>

            <div className='mt-4 space-y-4'>
              {rfq.items.map((item, index) => (
                <article
                  key={item.id}
                  className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
                >
                  <div className='flex items-start gap-4'>
                    <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500'>
                      {index + 1}
                    </span>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <p className='font-semibold text-slate-900'>
                          {item.quantity} {item.unit}
                        </p>
                        {item.manufacturerPartNumber && (
                          <span className='rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600'>
                            {item.manufacturerPartNumber}
                          </span>
                        )}
                      </div>
                      <p className='mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-700'>
                        {item.description}
                      </p>
                      {(item.manufacturer || item.specifications) && (
                        <div className='mt-4 border-t border-slate-100 pt-4 text-sm'>
                          {item.manufacturer && (
                            <p className='text-slate-600'>
                              <span className='font-semibold text-slate-800'>
                                Manufacturer:
                              </span>{' '}
                              {item.manufacturer}
                            </p>
                          )}
                          {item.specifications && (
                            <p className='mt-2 leading-6 whitespace-pre-wrap text-slate-500'>
                              {item.specifications}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <footer className='border-t border-slate-200 bg-white px-5 py-4 sm:px-7'>
          <button
            type='button'
            onClick={onEdit}
            className='inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500'
          >
            <Pencil size={17} /> Edit RFQ
          </button>
        </footer>
      </aside>
    </div>
  );
};
