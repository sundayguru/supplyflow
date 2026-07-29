import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import {
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clipboard,
  ExternalLink,
  FileText,
  LoaderCircle,
  Mail,
  Package,
  Pencil,
  Send,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import type { ManufacturerRecord } from '~/types/manufacturer';
import type { ProductPriceRecord } from '~/types/productPrice';
import type { RfqItemRecord, RfqRecord } from '~/types/rfq';
import { findManufacturerName } from '~/utils/manufacturers';
import { calculateRfqItemAmounts, formatRfqMoney } from '~/utils/rfq';
import { ConfirmModal } from '../ConfirmModal';
import { RfqItemEditModal } from './RfqItemEditModal';
import type { RfqItemFormValue } from './RfqItemFields';
import { RfqStatusBadge } from './RfqStatusBadge';

type RfqDetailDrawerProps = {
  rfq: RfqRecord;
  vatRate: number;
  productPrices: ProductPriceRecord[];
  manufacturers: ManufacturerRecord[];
  onClose: () => void;
  onEdit: () => void;
};

type ItemMutationResponse =
  | { success: true; rfq: RfqRecord }
  | { error: string };

type CustomerDraftResponse =
  | {
      success: true;
      draft: { id: string; url: string };
      generatedReply: string;
      intent: 'regenerate' | 'updatePdf';
    }
  | { error: string };

const formatDate = (value: string) => new Date(value).toLocaleDateString();

export const RfqDetailDrawer = ({
  rfq,
  vatRate,
  productPrices,
  manufacturers,
  onClose,
  onEdit,
}: RfqDetailDrawerProps) => {
  const itemMutation = useFetcher<ItemMutationResponse>();
  const customerDraft = useFetcher<CustomerDraftResponse>();
  const [editItem, setEditItem] = useState<RfqItemRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<RfqItemRecord | null>(null);
  const [copiedDraft, setCopiedDraft] = useState<string | null>(null);
  const [isDraftMenuOpen, setIsDraftMenuOpen] = useState(false);
  const sourcePdfUrl = rfq.sourcePdfKey
    ? `/api/rfqs/${encodeURIComponent(rfq.id)}/source-pdf`
    : null;
  const canDraftReply = !!rfq.sourceEmail;
  const isDraftingReply = customerDraft.state !== 'idle';
  const draftUrl =
    customerDraft.data && 'success' in customerDraft.data
      ? customerDraft.data.draft.url
      : null;
  const draftAction =
    customerDraft.data && 'success' in customerDraft.data
      ? customerDraft.data.intent === 'updatePdf'
        ? 'updated'
        : 'generated'
      : null;
  const generatedReply =
    customerDraft.data && 'success' in customerDraft.data
      ? customerDraft.data.generatedReply
      : rfq.generatedReply;
  const hasCopiedDraft = !!generatedReply && copiedDraft === generatedReply;

  const submitItem = (value: RfqItemFormValue) => {
    if (!editItem) {
      return;
    }
    itemMutation.submit(
      { id: editItem.id, ...value },
      {
        method: 'patch',
        action: '/api/rfq-items',
        encType: 'application/json',
      },
    );
    setEditItem(null);
  };

  const confirmDeleteItem = () => {
    if (!deleteItem) {
      return;
    }
    itemMutation.submit(
      { id: deleteItem.id },
      {
        method: 'delete',
        action: '/api/rfq-items',
        encType: 'application/json',
      },
    );
    setDeleteItem(null);
  };

  const createCustomerDraft = (intent: 'regenerate' | 'updatePdf') => {
    if (!canDraftReply) {
      return;
    }
    setIsDraftMenuOpen(false);
    customerDraft.submit(
      { intent },
      {
        method: 'post',
        action: `/api/rfqs/${encodeURIComponent(rfq.id)}/customer-draft`,
        encType: 'application/json',
      },
    );
  };

  const handleDraftAction = () => {
    if (generatedReply) {
      setIsDraftMenuOpen((isOpen) => !isOpen);
      return;
    }
    createCustomerDraft('regenerate');
  };

  useEffect(() => {
    if (!isDraftMenuOpen) {
      return;
    }
    const closeDraftMenuOnOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      if (!event.target.closest('[data-rfq-draft-menu]')) {
        setIsDraftMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeDraftMenuOnOutsideClick);
    return () => {
      document.removeEventListener('mousedown', closeDraftMenuOnOutsideClick);
    };
  }, [isDraftMenuOpen]);

  const submitDraftUpdate = (intent: 'regenerate' | 'updatePdf') => {
    createCustomerDraft(intent);
  };

  const copyGeneratedReply = async () => {
    if (!generatedReply) {
      return;
    }
    await navigator.clipboard.writeText(generatedReply);
    setCopiedDraft(generatedReply);
  };

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
          {itemMutation.data && 'error' in itemMutation.data && (
            <p className='mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
              {itemMutation.data.error}
            </p>
          )}
          {customerDraft.data && 'error' in customerDraft.data && (
            <p className='mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
              {customerDraft.data.error}
            </p>
          )}
          {draftUrl && (
            <p className='mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'>
              Draft reply {draftAction} with the RFQ PDF attached.
              <a
                href={draftUrl}
                target='_blank'
                rel='noreferrer'
                className='inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-900'
              >
                <ExternalLink size={14} /> Open draft
              </a>
            </p>
          )}
          {generatedReply && (
            <section className='mb-5 rounded-xl border border-slate-200 bg-white p-4'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <p className='text-xs font-bold tracking-[0.14em] text-emerald-700 uppercase'>
                    Email draft
                  </p>
                  <p className='mt-1 text-sm text-slate-500'>
                    Generated reply saved for this RFQ.
                  </p>
                </div>
                <button
                  type='button'
                  onClick={copyGeneratedReply}
                  className='inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                >
                  {hasCopiedDraft ? (
                    <Check size={16} className='text-emerald-600' />
                  ) : (
                    <Clipboard size={16} />
                  )}
                  {hasCopiedDraft ? 'Copied' : 'Copy draft'}
                </button>
              </div>
            </section>
          )}
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
                <CircleDollarSign size={14} /> Total value
              </p>
              <p className='mt-3 text-2xl font-semibold text-slate-900'>
                {formatRfqMoney(rfq.totalValue, rfq.currency)}
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

          {sourcePdfUrl && (
            <section className='mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
              <div className='flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4'>
                <div>
                  <p className='flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-emerald-700 uppercase'>
                    <FileText size={14} /> Source PDF
                  </p>
                  <h3 className='mt-1 text-lg font-bold text-slate-900'>
                    Original request
                  </h3>
                </div>
                <a
                  href={sourcePdfUrl}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900'
                >
                  <ExternalLink size={14} /> Open
                </a>
              </div>
              <object
                data={sourcePdfUrl}
                type='application/pdf'
                className='h-[520px] w-full bg-slate-100'
                aria-label={`${rfq.reference} source PDF`}
              >
                <div className='flex h-64 flex-col items-center justify-center px-6 text-center'>
                  <p className='text-sm font-semibold text-slate-700'>
                    PDF preview is not available in this browser.
                  </p>
                  <a
                    href={sourcePdfUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white'
                  >
                    <ExternalLink size={14} /> Open PDF
                  </a>
                </div>
              </object>
            </section>
          )}

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
                <RfqDetailItem
                  key={item.id}
                  item={item}
                  index={index}
                  currency={rfq.currency}
                  manufacturers={manufacturers}
                  canDelete={rfq.items.length > 1}
                  onEdit={() => setEditItem(item)}
                  onDelete={() => setDeleteItem(item)}
                />
              ))}
            </div>
          </section>

          <section className='mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5'>
            <h3 className='font-semibold text-slate-900'>Pricing summary</h3>
            <dl className='mt-4 space-y-3 text-sm'>
              <div className='flex items-center justify-between text-slate-600'>
                <dt>Items subtotal</dt>
                <dd>{formatRfqMoney(rfq.subtotal, rfq.currency)}</dd>
              </div>
              <div className='flex items-center justify-between text-slate-600'>
                <dt>Markup</dt>
                <dd>{formatRfqMoney(rfq.markupValue, rfq.currency)}</dd>
              </div>
              {rfq.discountValue > 0 && (
                <div className='flex items-center justify-between text-slate-600'>
                  <dt>Discount</dt>
                  <dd>-{formatRfqMoney(rfq.discountValue, rfq.currency)}</dd>
                </div>
              )}
              {rfq.shippingValue > 0 && (
                <div className='flex items-center justify-between text-slate-600'>
                  <dt>Shipping</dt>
                  <dd>{formatRfqMoney(rfq.shippingValue, rfq.currency)}</dd>
                </div>
              )}
              {rfq.applyVat && (
                <div className='flex items-center justify-between text-slate-600'>
                  <dt>VAT ({vatRate}%)</dt>
                  <dd>{formatRfqMoney(rfq.vatValue, rfq.currency)}</dd>
                </div>
              )}
              <div className='flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-950'>
                <dt>Total</dt>
                <dd>{formatRfqMoney(rfq.totalValue, rfq.currency)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <footer className='border-t border-slate-200 bg-white px-5 py-4 sm:px-7'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='relative' data-rfq-draft-menu>
              <button
                type='button'
                onClick={handleDraftAction}
                disabled={!canDraftReply || isDraftingReply}
                title={
                  canDraftReply
                    ? undefined
                    : 'Only RFQs created from connected email can draft a reply'
                }
                className='inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400'
              >
                {isDraftingReply ? (
                  <LoaderCircle size={17} className='animate-spin' />
                ) : (
                  <Send size={17} />
                )}
                {generatedReply ? 'Update reply' : 'Draft reply'}
                {generatedReply && <ChevronDown size={15} />}
              </button>
              {isDraftMenuOpen && generatedReply && (
                <div className='absolute bottom-full left-0 z-[130] mb-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl'>
                  <button
                    type='button'
                    onClick={() => submitDraftUpdate('regenerate')}
                    className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    <Send size={15} /> Regenerate
                  </button>
                  <button
                    type='button'
                    onClick={() => submitDraftUpdate('updatePdf')}
                    className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    <FileText size={15} /> Update PDF
                  </button>
                </div>
              )}
            </div>
            <button
              type='button'
              onClick={onEdit}
              className='inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500'
            >
              <Pencil size={17} /> Edit RFQ
            </button>
          </div>
        </footer>
      </aside>

      {editItem && (
        <RfqItemEditModal
          key={editItem.id}
          item={editItem}
          currency={rfq.currency}
          productPrices={productPrices}
          manufacturers={manufacturers}
          isSaving={itemMutation.state !== 'idle'}
          onClose={() => setEditItem(null)}
          onSubmit={submitItem}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteItem}
        title='Delete this RFQ item?'
        description='This line item will be permanently removed from the request.'
        onClose={() => setDeleteItem(null)}
        onConfirm={confirmDeleteItem}
        isLoading={itemMutation.state !== 'idle'}
        confirmVariant='danger'
      />
    </div>
  );
};

type RfqDetailItemProps = {
  item: RfqItemRecord;
  index: number;
  currency: string;
  manufacturers: ManufacturerRecord[];
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

const RfqDetailItem = ({
  item,
  index,
  currency,
  manufacturers,
  canDelete,
  onEdit,
  onDelete,
}: RfqDetailItemProps) => {
  const amounts = calculateRfqItemAmounts(item);
  const manufacturerName = findManufacturerName(
    manufacturers,
    item.manufacturerId,
  );

  return (
    <article className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
      <div className='flex items-start gap-4'>
        <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500'>
          {index + 1}
        </span>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-start justify-between gap-2'>
            <p className='font-semibold text-slate-900'>
              {item.quantity} {item.unit}
            </p>
            <p className='text-sm font-semibold text-emerald-700'>
              {formatRfqMoney(item.price, currency)} · {item.priceMarkup}%
              markup
            </p>
            <div className='flex items-center gap-1'>
              {item.manufacturerPartNumber && (
                <span className='mr-1 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600'>
                  {item.manufacturerPartNumber}
                </span>
              )}
              <button
                type='button'
                onClick={onEdit}
                className='rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700'
                aria-label={`Edit item ${index + 1}`}
              >
                <Pencil size={15} />
              </button>
              <button
                type='button'
                onClick={onDelete}
                disabled={!canDelete}
                title={
                  !canDelete
                    ? 'An RFQ must contain at least one item'
                    : undefined
                }
                className='rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-30'
                aria-label={`Delete item ${index + 1}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          {amounts.lineDiscount > 0 && (
            <p className='mt-2 text-xs font-semibold text-emerald-700'>
              Discount:{' '}
              {item.discountType === 'percentage'
                ? `${item.discountValue}%`
                : formatRfqMoney(item.discountValue, currency)}{' '}
              (-{formatRfqMoney(amounts.lineDiscount, currency)})
            </p>
          )}
          {amounts.lineShipping > 0 && (
            <p className='mt-2 text-xs font-semibold text-sky-700'>
              Shipping: {formatRfqMoney(amounts.lineShipping, currency)}
            </p>
          )}
          <p className='mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-700'>
            {item.description}
          </p>
          {(manufacturerName || item.specifications) && (
            <div className='mt-4 border-t border-slate-100 pt-4 text-sm'>
              {manufacturerName && (
                <p className='text-slate-600'>
                  <span className='font-semibold text-slate-800'>
                    Manufacturer:
                  </span>{' '}
                  {manufacturerName}
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
  );
};
