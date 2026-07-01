import { useEffect, useState } from 'react';
import { Link, useFetcher } from 'react-router';
import {
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Mail,
  Package,
  Pencil,
  Trash2,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import type { ManufacturerRecord } from '~/types/manufacturer';
import type {
  PurchaseOrderItemRecord,
  PurchaseOrderRecord,
} from '~/types/purchaseOrder';
import { formatPurchaseOrderMoney } from '~/utils/purchaseOrder';
import { ConfirmModal } from '../ConfirmModal';
import { PurchaseOrderItemEditModal } from './PurchaseOrderItemEditModal';
import { PurchaseOrderItemStatusMenu } from './PurchaseOrderItemStatusMenu';
import type { PurchaseOrderItemFormValue } from './PurchaseOrderItemFields';
import { PurchaseOrderStatusBadge } from './PurchaseOrderStatusBadge';

type PurchaseOrderDetailDrawerProps = {
  purchaseOrder: PurchaseOrderRecord;
  vatRate: number;
  manufacturers: ManufacturerRecord[];
  onClose: () => void;
  onEdit: () => void;
};

type ItemMutationResponse =
  | { success: true; purchaseOrder: PurchaseOrderRecord }
  | { error: string };

const formatDate = (value: string) => new Date(value).toLocaleDateString();

export const PurchaseOrderDetailDrawer = ({
  purchaseOrder,
  vatRate,
  manufacturers,
  onClose,
  onEdit,
}: PurchaseOrderDetailDrawerProps) => {
  const itemMutation = useFetcher<ItemMutationResponse>();
  const [editItem, setEditItem] = useState<PurchaseOrderItemRecord | null>(
    null,
  );
  const [deleteItem, setDeleteItem] = useState<PurchaseOrderItemRecord | null>(
    null,
  );

  const submitItem = (value: PurchaseOrderItemFormValue) => {
    if (!editItem) {
      return;
    }
    itemMutation.submit(
      { id: editItem.id, ...value },
      {
        method: 'patch',
        action: '/api/purchase-order-items',
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
        action: '/api/purchase-order-items',
        encType: 'application/json',
      },
    );
    setDeleteItem(null);
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
        aria-label='Close PO details'
      />
      <aside
        role='dialog'
        aria-modal='true'
        aria-labelledby='po-detail-title'
        className='absolute top-0 right-0 flex h-full w-full max-w-2xl flex-col bg-[#f8faf7] shadow-2xl'
      >
        <header className='flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-7'>
          <div>
            <p className='text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase'>
              Purchase order
            </p>
            <div className='mt-2 flex flex-wrap items-center gap-3'>
              <h2
                id='po-detail-title'
                className='font-serif text-3xl font-semibold text-slate-950'
              >
                {purchaseOrder.reference}
              </h2>
              <PurchaseOrderStatusBadge status={purchaseOrder.status} />
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
          <section
            className='grid gap-3 sm:grid-cols-2'
            aria-label='PO summary'
          >
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <p className='flex items-center gap-2 text-xs font-bold tracking-wide text-slate-400 uppercase'>
                <UserRound size={14} /> Supplier
              </p>
              <p className='mt-3 font-semibold text-slate-900'>
                {purchaseOrder.supplierName}
              </p>
              <p className='mt-1 flex items-center gap-1.5 text-sm text-slate-500'>
                <Mail size={14} />{' '}
                {purchaseOrder.supplierEmail ?? 'No email provided'}
              </p>
            </div>
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <p className='flex items-center gap-2 text-xs font-bold tracking-wide text-slate-400 uppercase'>
                <CircleDollarSign size={14} /> Total value
              </p>
              <p className='mt-3 text-2xl font-semibold text-slate-900'>
                {formatPurchaseOrderMoney(
                  purchaseOrder.totalValue,
                  purchaseOrder.currency,
                )}
              </p>
            </div>
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <p className='flex items-center gap-2 text-xs font-bold tracking-wide text-slate-400 uppercase'>
                <CalendarDays size={14} /> Dates
              </p>
              <p className='mt-3 font-semibold text-slate-900'>
                Ordered{' '}
                {purchaseOrder.orderDate
                  ? new Date(
                      `${purchaseOrder.orderDate}T00:00:00`,
                    ).toLocaleDateString()
                  : 'not set'}
              </p>
              <p className='mt-1 text-sm text-slate-500'>
                Expected{' '}
                {purchaseOrder.expectedDate
                  ? new Date(
                      `${purchaseOrder.expectedDate}T00:00:00`,
                    ).toLocaleDateString()
                  : 'not set'}
              </p>
            </div>
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <p className='text-xs font-bold tracking-wide text-slate-400 uppercase'>
                Created
              </p>
              <p className='mt-3 font-semibold text-slate-900'>
                {formatDate(purchaseOrder.createdAt)}
              </p>
              <p className='mt-1 text-xs text-slate-400'>
                Updated {formatDate(purchaseOrder.updatedAt)}
              </p>
            </div>
          </section>

          {(purchaseOrder.linkedRfq || purchaseOrder.notes) && (
            <section className='mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
              {purchaseOrder.linkedRfq && (
                <div>
                  <p className='flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-emerald-700 uppercase'>
                    <ClipboardList size={14} /> Linked RFQ
                  </p>
                  <Link
                    to={`/rfqs?rfq=${encodeURIComponent(purchaseOrder.linkedRfq.id)}`}
                    className='mt-2 inline-flex font-semibold text-slate-900 hover:text-emerald-700'
                  >
                    {purchaseOrder.linkedRfq.reference} ·{' '}
                    {purchaseOrder.linkedRfq.customerName}
                  </Link>
                </div>
              )}
              {purchaseOrder.notes && (
                <p className='mt-4 border-t border-slate-100 pt-4 text-sm leading-6 whitespace-pre-wrap text-slate-600'>
                  {purchaseOrder.notes}
                </p>
              )}
            </section>
          )}

          <section className='mt-7'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-xs font-bold tracking-[0.14em] text-emerald-700 uppercase'>
                  Ordered items
                </p>
                <h3 className='mt-1 text-lg font-bold text-slate-900'>
                  {purchaseOrder.items.length} line item
                  {purchaseOrder.items.length === 1 ? '' : 's'}
                </h3>
              </div>
              <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700'>
                <Package size={19} />
              </span>
            </div>

            <div className='mt-4 space-y-4'>
              {purchaseOrder.items.map((item, index) => (
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
                            purchaseOrder.currency,
                          )}
                        </p>
                        <div className='flex items-center gap-1'>
                          <PurchaseOrderItemStatusMenu
                            itemId={item.id}
                            status={item.status}
                          />
                          <button
                            type='button'
                            onClick={() => setEditItem(item)}
                            className='rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700'
                            aria-label={`Edit item ${index + 1}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type='button'
                            onClick={() => setDeleteItem(item)}
                            disabled={purchaseOrder.items.length <= 1}
                            title={
                              purchaseOrder.items.length <= 1
                                ? 'A purchase order must contain at least one item'
                                : undefined
                            }
                            className='rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-30'
                            aria-label={`Delete item ${index + 1}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      {item.manufacturerPartNumber && (
                        <span className='mt-3 inline-flex rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600'>
                          {item.manufacturerPartNumber}
                        </span>
                      )}
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

          <section className='mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5'>
            <h3 className='flex items-center gap-2 font-semibold text-slate-900'>
              <Truck size={17} /> Order summary
            </h3>
            <dl className='mt-4 space-y-3 text-sm'>
              <div className='flex items-center justify-between text-slate-600'>
                <dt>Items subtotal</dt>
                <dd>
                  {formatPurchaseOrderMoney(
                    purchaseOrder.subtotal,
                    purchaseOrder.currency,
                  )}
                </dd>
              </div>
              {purchaseOrder.applyVat && (
                <div className='flex items-center justify-between text-slate-600'>
                  <dt>VAT ({vatRate}%)</dt>
                  <dd>
                    {formatPurchaseOrderMoney(
                      purchaseOrder.vatValue,
                      purchaseOrder.currency,
                    )}
                  </dd>
                </div>
              )}
              <div className='flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-950'>
                <dt>Total</dt>
                <dd>
                  {formatPurchaseOrderMoney(
                    purchaseOrder.totalValue,
                    purchaseOrder.currency,
                  )}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <footer className='border-t border-slate-200 bg-white px-5 py-4 sm:px-7'>
          <button
            type='button'
            onClick={onEdit}
            className='inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500'
          >
            <Pencil size={17} /> Edit PO
          </button>
        </footer>
      </aside>

      {editItem && (
        <PurchaseOrderItemEditModal
          key={editItem.id}
          item={editItem}
          manufacturers={manufacturers}
          isSaving={itemMutation.state !== 'idle'}
          onClose={() => setEditItem(null)}
          onSubmit={submitItem}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteItem}
        title='Delete this PO item?'
        description='This line item will be permanently removed from the purchase order.'
        onClose={() => setDeleteItem(null)}
        onConfirm={confirmDeleteItem}
        isLoading={itemMutation.state !== 'idle'}
        confirmVariant='danger'
      />
    </div>
  );
};
