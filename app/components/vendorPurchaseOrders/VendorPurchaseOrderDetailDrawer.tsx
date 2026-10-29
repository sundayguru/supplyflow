import { useEffect, useState } from 'react';
import { Link, useFetcher } from 'react-router';
import {
  CalendarDays,
  ChevronDown,
  Check,
  Clipboard,
  ClipboardList,
  CircleDollarSign,
  Download,
  ExternalLink,
  FileText,
  History,
  LoaderCircle,
  Mail,
  MailPlus,
  Package,
  Pencil,
  Plus,
  Trash2,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import type { ManufacturerRecord } from '~/types/manufacturer';
import type { RfqPdfTemplateOption } from '~/types/rfqPdfTemplate';
import type {
  VendorPurchaseOrderItemInput,
  VendorPurchaseOrderItemRecord,
  VendorPurchaseOrderRecord,
} from '~/types/vendorPurchaseOrder';
import { VendorPurchaseOrderItemEditModal } from './VendorPurchaseOrderItemEditModal';
import { findManufacturerName } from '~/utils/manufacturers';
import { formatPurchaseOrderMoney } from '~/utils/purchaseOrder';
import { StatusChangeReasonDetails } from '~/components/status/StatusChangeReasonDetails';
import { VendorPurchaseOrderStatusBadge } from './VendorPurchaseOrderStatusBadge';

type VendorPurchaseOrderDetailDrawerProps = {
  vendorPurchaseOrder: VendorPurchaseOrderRecord;
  templates: RfqPdfTemplateOption[];
  manufacturers: ManufacturerRecord[];
  llmUsageEnabled: boolean;
  canCreateAcknowledgement: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

type DraftVendorPurchaseOrderResponse =
  | {
      success: true;
      draft?: { id: string; url: string };
      generatedReply: string;
      vendorPurchaseOrder: VendorPurchaseOrderRecord;
      textOnly?: boolean;
    }
  | { error: string };

type ItemUpdateResponse = { success: true } | { error: string };

type CreateAcknowledgementResponse =
  | {
      success: true;
      vendorPurchaseOrderAcknowledgement: { id: string; reference: string };
    }
  | { error: string };

const formatDate = (value: string) => new Date(value).toLocaleDateString();

export const VendorPurchaseOrderDetailDrawer = ({
  vendorPurchaseOrder,
  templates,
  manufacturers,
  llmUsageEnabled,
  canCreateAcknowledgement,
  onClose,
  onEdit,
  onDelete,
}: VendorPurchaseOrderDetailDrawerProps) => {
  const draftEmail = useFetcher<DraftVendorPurchaseOrderResponse>();
  const itemMutation = useFetcher<ItemUpdateResponse>();
  const acknowledgementMutation = useFetcher<CreateAcknowledgementResponse>();
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [editItem, setEditItem] =
    useState<VendorPurchaseOrderItemRecord | null>(null);
  const currentVendorPurchaseOrder =
    draftEmail.data &&
    'success' in draftEmail.data &&
    draftEmail.data.vendorPurchaseOrder
      ? draftEmail.data.vendorPurchaseOrder
      : vendorPurchaseOrder;
  const downloadPdfUrl = `/api/vendor-purchase-orders/${encodeURIComponent(
    currentVendorPurchaseOrder.id,
  )}/pdf?download=1`;
  const templateName = currentVendorPurchaseOrder.templateId
    ? templates.find(
        (template) => template.id === currentVendorPurchaseOrder.templateId,
      )?.name
    : null;
  const draftUrl =
    draftEmail.data && 'success' in draftEmail.data
      ? (draftEmail.data.draft?.url ?? null)
      : null;
  const generatedReply =
    draftEmail.data && 'success' in draftEmail.data
      ? draftEmail.data.generatedReply
      : currentVendorPurchaseOrder.generatedEmailDraftText;

  const createDraftEmail = () => {
    draftEmail.submit(
      {},
      {
        method: 'post',
        action: `/api/vendor-purchase-orders/${encodeURIComponent(
          currentVendorPurchaseOrder.id,
        )}/draft`,
        encType: 'application/json',
      },
    );
  };

  const createDraftText = () => {
    draftEmail.submit(
      { textOnly: true },
      {
        method: 'post',
        action: `/api/vendor-purchase-orders/${encodeURIComponent(currentVendorPurchaseOrder.id)}/draft`,
        encType: 'application/json',
      },
    );
  };

  const createAcknowledgement = () => {
    acknowledgementMutation.submit(
      {
        intent: 'generateFromVendorPurchaseOrder',
        vendorPurchaseOrderId: currentVendorPurchaseOrder.id,
      },
      {
        method: 'post',
        action: '/api/vendor-purchase-order-acknowledgements',
        encType: 'application/json',
      },
    );
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

  const saveItem = (value: VendorPurchaseOrderItemInput) => {
    if (!editItem) {
      return;
    }
    itemMutation.submit(
      {
        ...value,
        id: editItem.id,
        vendorPurchaseOrderId: currentVendorPurchaseOrder.id,
      },
      {
        method: 'patch',
        action: '/api/vendor-purchase-order-items',
        encType: 'application/json',
      },
    );
  };

  return (
    <div className='fixed inset-0 z-[90]'>
      <button
        type='button'
        onClick={onClose}
        className='absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]'
        aria-label='Close vendor PO details'
      />
      <aside
        role='dialog'
        aria-modal='true'
        aria-labelledby='vendor-po-detail-title'
        className='absolute top-0 right-0 flex h-full w-full max-w-2xl flex-col bg-[#f8faf7] shadow-2xl'
      >
        <header className='flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-7'>
          <div>
            <p className='text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase'>
              Vendor purchase order
            </p>
            <div className='mt-2 flex flex-wrap items-center gap-3'>
              <h2
                id='vendor-po-detail-title'
                className='font-serif text-3xl font-semibold text-slate-950'
              >
                {currentVendorPurchaseOrder.reference}
              </h2>
              <VendorPurchaseOrderStatusBadge
                status={currentVendorPurchaseOrder.status}
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
            aria-label='Vendor PO summary'
          >
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <p className='flex items-center gap-2 text-xs font-bold tracking-wide text-slate-400 uppercase'>
                <UserRound size={14} /> Vendor
              </p>
              <p className='mt-3 font-semibold text-slate-900'>
                {currentVendorPurchaseOrder.vendorName}
              </p>
              <p className='mt-1 flex items-center gap-1.5 text-sm text-slate-500'>
                <Mail size={14} />{' '}
                {currentVendorPurchaseOrder.vendorEmail ?? 'No email provided'}
              </p>
              {currentVendorPurchaseOrder.vendorContactName && (
                <p className='mt-1 text-sm text-slate-500'>
                  Contact: {currentVendorPurchaseOrder.vendorContactName}
                </p>
              )}
            </div>
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <p className='flex items-center gap-2 text-xs font-bold tracking-wide text-slate-400 uppercase'>
                <CircleDollarSign size={14} /> Total value
              </p>
              <p className='mt-3 text-2xl font-semibold text-slate-900'>
                {formatPurchaseOrderMoney(
                  currentVendorPurchaseOrder.totalValue,
                  currentVendorPurchaseOrder.currency,
                )}
              </p>
            </div>
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <p className='flex items-center gap-2 text-xs font-bold tracking-wide text-slate-400 uppercase'>
                <CalendarDays size={14} /> Dates
              </p>
              <p className='mt-3 font-semibold text-slate-900'>
                Ordered{' '}
                {currentVendorPurchaseOrder.orderDate
                  ? new Date(
                      `${currentVendorPurchaseOrder.orderDate}T00:00:00`,
                    ).toLocaleDateString()
                  : 'not set'}
              </p>
              <p className='mt-1 text-sm text-slate-500'>
                Expected{' '}
                {currentVendorPurchaseOrder.expectedDate
                  ? new Date(
                      `${currentVendorPurchaseOrder.expectedDate}T00:00:00`,
                    ).toLocaleDateString()
                  : 'not set'}
              </p>
            </div>
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <p className='text-xs font-bold tracking-wide text-slate-400 uppercase'>
                Created
              </p>
              <p className='mt-3 font-semibold text-slate-900'>
                {formatDate(currentVendorPurchaseOrder.createdAt)}
              </p>
              <p className='mt-1 text-xs text-slate-500'>
                Created by{' '}
                {currentVendorPurchaseOrder.creator
                  ? `${currentVendorPurchaseOrder.creator.firstName} ${currentVendorPurchaseOrder.creator.lastName}`.trim()
                  : 'Unknown'}
              </p>
              <p className='mt-1 text-xs text-slate-400'>
                Updated {formatDate(currentVendorPurchaseOrder.updatedAt)}
              </p>
            </div>
          </section>

          <section className='mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-emerald-700 uppercase'>
              <ClipboardList size={14} /> Linked customer PO
            </p>
            <Link
              to={`/purchase-orders?id=${encodeURIComponent(currentVendorPurchaseOrder.linkedPurchaseOrder.id)}`}
              className='mt-2 inline-flex font-semibold text-slate-900 hover:text-emerald-700'
            >
              {currentVendorPurchaseOrder.linkedPurchaseOrder.reference} ·{' '}
              {currentVendorPurchaseOrder.linkedPurchaseOrder.supplierName}
            </Link>
            {currentVendorPurchaseOrder.linkedAcknowledgements.length > 0 && (
              <div className='mt-4 border-t border-slate-100 pt-4'>
                <p className='flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-emerald-700 uppercase'>
                  <FileText size={14} /> Linked Vendor PO ack
                </p>
                <div className='mt-3 space-y-2'>
                  {currentVendorPurchaseOrder.linkedAcknowledgements.map(
                    (acknowledgement) => (
                      <Link
                        key={acknowledgement.id}
                        to={`/vendor-purchase-order-acknowledgements?id=${encodeURIComponent(acknowledgement.id)}`}
                        className='flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 font-semibold text-slate-900 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700'
                      >
                        <span>
                          {acknowledgement.reference}
                          {acknowledgement.acknowledgementReference
                            ? ` · ${acknowledgement.acknowledgementReference}`
                            : ''}
                        </span>
                        <ExternalLink size={15} className='shrink-0' />
                      </Link>
                    ),
                  )}
                </div>
              </div>
            )}
            <p className='mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-500'>
              <FileText size={14} />
              PDF template: {templateName ?? 'Default vendor PO template'}
            </p>
            {vendorPurchaseOrder.notes && (
              <p className='mt-4 border-t border-slate-100 pt-4 text-sm leading-6 whitespace-pre-wrap text-slate-600'>
                {vendorPurchaseOrder.notes}
              </p>
            )}
            {vendorPurchaseOrder.shipTo && (
              <p className='mt-4 border-t border-slate-100 pt-4 text-sm leading-6 whitespace-pre-wrap text-slate-600'>
                <span className='font-semibold text-slate-800'>Ship to:</span>{' '}
                {vendorPurchaseOrder.shipTo}
              </p>
            )}
          </section>

          <section className='mt-7'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-xs font-bold tracking-[0.14em] text-emerald-700 uppercase'>
                  Vendor PO items
                </p>
                <h3 className='mt-1 text-lg font-bold text-slate-900'>
                  {currentVendorPurchaseOrder.items.length} line item
                  {currentVendorPurchaseOrder.items.length === 1 ? '' : 's'}
                </h3>
              </div>
              <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700'>
                <Package size={19} />
              </span>
            </div>

            <div className='mt-4 space-y-4'>
              {currentVendorPurchaseOrder.items.map((item, index) => (
                <article
                  key={item.id}
                  className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
                >
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
                          {formatPurchaseOrderMoney(
                            item.price,
                            currentVendorPurchaseOrder.currency,
                          )}
                        </p>
                        <button
                          type='button'
                          onClick={() => {
                            itemMutation.reset();
                            setEditItem(item);
                          }}
                          className='inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50'
                        >
                          <Pencil size={13} /> Edit item
                        </button>
                      </div>
                      {item.manufacturerPartNumber && (
                        <span className='mt-3 inline-flex rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600'>
                          {item.manufacturerPartNumber}
                        </span>
                      )}
                      <p className='mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-700'>
                        {item.description}
                      </p>
                      {(item.discountValue ?? 0) > 0 && (
                        <p className='mt-2 text-sm text-slate-500'>
                          Discount:{' '}
                          {item.discountType === 'fixed'
                            ? formatPurchaseOrderMoney(
                                item.discountValue ?? 0,
                                currentVendorPurchaseOrder.currency,
                              )
                            : `${item.discountValue}%`}
                        </p>
                      )}
                      {(() => {
                        const manufacturerName = findManufacturerName(
                          manufacturers,
                          item.manufacturerId,
                        );
                        return manufacturerName || item.specifications ? (
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
                        ) : null;
                      })()}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className='mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5'>
            <h3 className='flex items-center gap-2 font-semibold text-slate-900'>
              <Truck size={17} /> Vendor PO summary
            </h3>
            <dl className='mt-4 space-y-3 text-sm'>
              <div className='flex items-center justify-between text-slate-600'>
                <dt>Items subtotal</dt>
                <dd>
                  {formatPurchaseOrderMoney(
                    currentVendorPurchaseOrder.subtotal,
                    currentVendorPurchaseOrder.currency,
                  )}
                </dd>
              </div>
              <div className='flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-950'>
                <dt>Total</dt>
                <dd>
                  {formatPurchaseOrderMoney(
                    currentVendorPurchaseOrder.totalValue,
                    currentVendorPurchaseOrder.currency,
                  )}
                </dd>
              </div>
            </dl>
          </section>
          <StatusChangeReasonDetails
            reason={currentVendorPurchaseOrder.statusReason}
            className='mt-5'
          />
          {generatedReply && (
            <details className='mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white'>
              <summary className='cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800'>
                Reply draft
              </summary>
              <div className='border-t border-slate-100 p-4'>
                <div className='flex justify-end'>
                  <button
                    type='button'
                    onClick={async () => {
                      await navigator.clipboard.writeText(generatedReply);
                      setCopiedDraft(true);
                    }}
                    className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'
                  >
                    {copiedDraft ? (
                      <Check size={15} />
                    ) : (
                      <Clipboard size={15} />
                    )}
                    {copiedDraft ? 'Copied' : 'Copy draft'}
                  </button>
                </div>
                <p className='mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-700'>
                  {generatedReply}
                </p>
              </div>
            </details>
          )}
        </div>

        <footer className='space-y-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7'>
          <details className='group'>
            <summary className='cursor-pointer list-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700'>
              <span className='flex items-center justify-between gap-3'>
                <span>Actions</span>
                <span className='flex items-center gap-2 text-xs font-medium text-slate-500'>
                  <span className='group-open:hidden'>Open action list</span>
                  <span className='hidden group-open:inline'>
                    Close action list
                  </span>
                  <ChevronDown
                    size={16}
                    className='transition-transform group-open:rotate-180'
                  />
                </span>
              </span>
            </summary>
            <div className='mt-3 flex flex-wrap gap-2'>
              <Link
                to={`/activities?sourceType=vendor_purchase_order&sourceId=${encodeURIComponent(currentVendorPurchaseOrder.id)}`}
                className='inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
              >
                <History size={17} /> View activity
              </Link>
              {canCreateAcknowledgement &&
                currentVendorPurchaseOrder.status === 'acknowledged' &&
                currentVendorPurchaseOrder.linkedAcknowledgements.length ===
                  0 && (
                  <>
                    {acknowledgementMutation.data &&
                      'error' in acknowledgementMutation.data && (
                        <p className='w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
                          {acknowledgementMutation.data.error}
                        </p>
                      )}
                    <button
                      type='button'
                      onClick={createAcknowledgement}
                      disabled={acknowledgementMutation.state !== 'idle'}
                      className='inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60'
                    >
                      {acknowledgementMutation.state !== 'idle' ? (
                        <LoaderCircle size={17} className='animate-spin' />
                      ) : (
                        <Plus size={17} />
                      )}
                      {acknowledgementMutation.state !== 'idle'
                        ? 'Generating acknowledgement…'
                        : 'Generate vendor PO acknowledgement'}
                    </button>
                  </>
                )}
              {acknowledgementMutation.data &&
                'success' in acknowledgementMutation.data && (
                  <Link
                    to={`/vendor-purchase-order-acknowledgements?id=${encodeURIComponent(acknowledgementMutation.data.vendorPurchaseOrderAcknowledgement.id)}`}
                    className='inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-800 transition hover:bg-sky-100'
                  >
                    <ExternalLink size={17} /> View generated acknowledgement
                  </Link>
                )}
              {draftEmail.data && 'error' in draftEmail.data && (
                <p className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
                  {draftEmail.data.error}
                </p>
              )}
              {draftUrl && (
                <a
                  href={draftUrl}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100'
                >
                  <ExternalLink size={17} /> Open draft in Gmail
                </a>
              )}
              <button
                type='button'
                onClick={createDraftEmail}
                disabled={
                  draftEmail.state !== 'idle' ||
                  !currentVendorPurchaseOrder.vendorEmail ||
                  !llmUsageEnabled
                }
                className='inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60'
              >
                <MailPlus size={17} />
                {draftEmail.state !== 'idle'
                  ? 'Drafting vendor email'
                  : 'Draft email to vendor'}
              </button>
              <button
                type='button'
                onClick={createDraftText}
                disabled={draftEmail.state !== 'idle' || !llmUsageEnabled}
                title={
                  llmUsageEnabled
                    ? undefined
                    : 'AI drafting is not included in your organization plan.'
                }
                className='inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {draftEmail.state !== 'idle'
                  ? 'Drafting reply text'
                  : 'Draft reply text'}
              </button>
              <a
                href={downloadPdfUrl}
                className='inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100'
              >
                <Download size={17} /> Download vendor PO PDF
              </a>
              <button
                type='button'
                onClick={onEdit}
                className='inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500'
              >
                <Pencil size={17} /> Edit vendor PO
              </button>
              <button
                type='button'
                onClick={onDelete}
                className='inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100'
              >
                <Trash2 size={17} /> Delete vendor PO
              </button>
            </div>
          </details>
        </footer>
      </aside>
      {editItem &&
        !(
          itemMutation.state === 'idle' &&
          itemMutation.data &&
          'success' in itemMutation.data
        ) && (
          <VendorPurchaseOrderItemEditModal
            key={editItem.id}
            item={editItem}
            manufacturers={manufacturers}
            isSaving={itemMutation.state !== 'idle'}
            error={
              itemMutation.data && 'error' in itemMutation.data
                ? itemMutation.data.error
                : null
            }
            onClose={() => setEditItem(null)}
            onSubmit={saveItem}
          />
        )}
    </div>
  );
};
