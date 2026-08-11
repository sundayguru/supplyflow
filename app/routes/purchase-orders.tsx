import { useMemo, useState } from 'react';
import { data, redirect, useFetcher, useSearchParams } from 'react-router';
import { FileText, Plus, Search } from 'lucide-react';
import type { Route } from './+types/purchase-orders';
import { ConfirmModal } from '~/components/ConfirmModal';
import { PurchaseOrderDetailDrawer } from '~/components/purchaseOrders/PurchaseOrderDetailDrawer';
import {
  PurchaseOrderFormModal,
  type PurchaseOrderFormValue,
} from '~/components/purchaseOrders/PurchaseOrderFormModal';
import { purchaseOrderStatusLabels } from '~/components/purchaseOrders/PurchaseOrderStatusBadge';
import { PurchaseOrderPipeline } from '~/components/purchaseOrders/PurchaseOrderPipeline';
import { PurchaseOrderTable } from '~/components/purchaseOrders/PurchaseOrderTable';
import { PipelineViewToggle } from '~/components/pipeline/PipelineViewToggle';
import { listEmailSourcesForPurchaseOrders } from '~/db/emailIngestion';
import { listManufacturers } from '~/db/manufacturers';
import { getOrganizationForUser } from '~/db/organizations';
import { getPurchaseOrders } from '~/db/purchaseOrders';
import { listProductPrices } from '~/db/productPrices';
import { listRfqPdfTemplates } from '~/db/rfqPdfTemplates';
import { getRfqs } from '~/db/rfqs';
import { RfqDetailDrawer } from '~/components/rfqs/RfqDetailDrawer';
import type {
  PurchaseOrderRecord,
  PurchaseOrderStatus,
} from '~/types/purchaseOrder';
import { formatPurchaseOrderMoney } from '~/utils/purchaseOrder';
import { findManufacturerName } from '~/utils/manufacturers';
import { getUserFromRequest } from '~/utils/session.server';

type ApiResponse =
  | { success: true; purchaseOrder?: PurchaseOrderRecord; id?: string }
  | { error: string };

const activeStatuses: PurchaseOrderStatus[] = [
  'draft',
  'sent',
  'validated',
  'exception',
  'review_email',
  'awaiting_payment',
  'partial_payment',
  'acknowledged',
  'partially_received',
];

const formatCombinedValue = (records: PurchaseOrderRecord[]) => {
  const totals = records.reduce<Record<string, number>>(
    (byCurrency, purchaseOrder) => {
      byCurrency[purchaseOrder.currency] =
        (byCurrency[purchaseOrder.currency] ?? 0) + purchaseOrder.totalValue;
      return byCurrency;
    },
    {},
  );
  const values = Object.entries(totals).map(([currency, value]) =>
    formatPurchaseOrderMoney(value, currency),
  );
  return values.length
    ? values.join(' · ')
    : formatPurchaseOrderMoney(0, 'EUR');
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return redirect('/organization');
  }

  try {
    const [purchaseOrders, rfqs, manufacturers, templates, productPrices] =
      await Promise.all([
        getPurchaseOrders(organization.id, organization.vat),
        getRfqs(organization.id, organization.vat),
        listManufacturers(organization.id),
        listRfqPdfTemplates(organization.id),
        listProductPrices(organization.id),
      ]);
    const emailSources = await listEmailSourcesForPurchaseOrders(
      organization.id,
      purchaseOrders.map((purchaseOrder) => purchaseOrder.id),
    );
    return data({
      purchaseOrders: purchaseOrders.map((purchaseOrder) => ({
        ...purchaseOrder,
        sourceEmail: emailSources.get(purchaseOrder.id) ?? null,
      })),
      rfqs,
      productPrices,
      manufacturers,
      templates: templates.map(({ id, name }) => ({ id, name })),
      vatRate: organization.vat,
      loadError: null,
    });
  } catch (error) {
    console.error('Unable to load purchase orders', error);
    return data({
      purchaseOrders: [],
      rfqs: [],
      productPrices: [],
      manufacturers: [],
      templates: [],
      vatRate: organization.vat,
      loadError: 'Unable to load purchase orders',
    });
  }
};

const PurchaseOrdersPage = ({ loaderData }: Route.ComponentProps) => {
  const { purchaseOrders } = loaderData;
  const mutation = useFetcher<ApiResponse>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | PurchaseOrderStatus>('all');
  const [view, setView] = useState<'table' | 'pipeline'>('table');
  const [formPurchaseOrder, setFormPurchaseOrder] = useState<
    PurchaseOrderRecord | 'new' | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrderRecord | null>(
    null,
  );
  const selectedPurchaseOrder = purchaseOrders.find(
    (purchaseOrder) => purchaseOrder.id === searchParams.get('po'),
  );
  const selectedRfq = loaderData.rfqs.find(
    (rfq) => rfq.id === searchParams.get('rfq'),
  );

  const closeDetails = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('po');
    setSearchParams(next, { replace: true });
  };

  const closeRfqDetails = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('rfq');
    setSearchParams(next, { replace: true });
  };

  const openRfqDetails = (rfqId: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete('po');
    next.set('rfq', rfqId);
    setSearchParams(next);
  };

  const editFromDetails = () => {
    if (!selectedPurchaseOrder) {
      return;
    }
    setFormPurchaseOrder(selectedPurchaseOrder);
    closeDetails();
  };

  const filteredPurchaseOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return purchaseOrders.filter(
      (purchaseOrder) =>
        (status === 'all' || purchaseOrder.status === status) &&
        (!query ||
          purchaseOrder.reference.toLowerCase().includes(query) ||
          purchaseOrder.supplierName.toLowerCase().includes(query) ||
          purchaseOrder.linkedRfq?.reference.toLowerCase().includes(query) ||
          purchaseOrder.items.some((item) => {
            const manufacturerName = findManufacturerName(
              loaderData.manufacturers,
              item.manufacturerId,
            );
            return (
              item.description.toLowerCase().includes(query) ||
              manufacturerName?.toLowerCase().includes(query) ||
              item.manufacturerPartNumber?.toLowerCase().includes(query)
            );
          })),
    );
  }, [loaderData.manufacturers, purchaseOrders, search, status]);

  const submitPurchaseOrder = (value: PurchaseOrderFormValue) => {
    const method = value.id ? 'patch' : 'post';
    mutation.submit(value, {
      method,
      action: '/api/purchase-orders',
      encType: 'application/json',
    });
    setFormPurchaseOrder(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }
    mutation.submit(
      { id: deleteTarget.id },
      {
        method: 'delete',
        action: '/api/purchase-orders',
        encType: 'application/json',
      },
    );
    setDeleteTarget(null);
  };

  const updateStatus = (id: string, nextStatus: PurchaseOrderStatus) => {
    mutation.submit(
      { id, status: nextStatus, intent: 'updateStatus' },
      {
        method: 'patch',
        action: '/api/purchase-orders',
        encType: 'application/json',
      },
    );
  };

  const activePurchaseOrders = purchaseOrders.filter((purchaseOrder) =>
    activeStatuses.includes(purchaseOrder.status),
  );
  const receivedPurchaseOrders = purchaseOrders.filter(
    (purchaseOrder) => purchaseOrder.status === 'received',
  );
  const activeCount = activePurchaseOrders.length;

  return (
    <div className='mx-auto max-w-[1440px] font-sans text-slate-950'>
      <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase'>
            Purchasing workspace
          </p>
          <h1 className='mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl'>
            PO management
          </h1>
          <p className='mt-2 text-sm text-slate-500'>
            Create, track, and update supplier purchase orders in one place.
          </p>
        </div>
        <button
          type='button'
          onClick={() => setFormPurchaseOrder('new')}
          className='inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500'
        >
          <Plus size={18} /> New PO
        </button>
      </div>

      <section
        className='mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'
        aria-label='PO summary'
      >
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm text-slate-500'>Total orders</p>
          <p className='mt-2 text-3xl font-bold'>{purchaseOrders.length}</p>
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm text-slate-500'>Active orders</p>
          <p className='mt-2 text-3xl font-bold'>{activeCount}</p>
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm text-slate-500'>Open value</p>
          <p className='mt-2 text-2xl font-bold'>
            {formatCombinedValue(activePurchaseOrders)}
          </p>
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm text-slate-500'>Received value</p>
          <p className='mt-2 text-2xl font-bold'>
            {formatCombinedValue(receivedPurchaseOrders)}
          </p>
        </div>
      </section>

      {loaderData.loadError && (
        <p className='mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {loaderData.loadError}. Apply the latest database migration and retry.
        </p>
      )}
      {mutation.data && 'error' in mutation.data && (
        <p className='mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {mutation.data.error}
        </p>
      )}

      <section className='mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between'>
          <label className='relative block w-full sm:max-w-sm'>
            <Search
              className='absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400'
              size={17}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className='w-full rounded-xl border border-slate-200 py-2.5 pr-3 pl-10 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
              placeholder='Search POs, suppliers, or RFQs'
            />
          </label>
          <div className='flex gap-2'>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as 'all' | PurchaseOrderStatus)
              }
              className='min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-emerald-500 sm:flex-none'
              aria-label='Filter by status'
            >
              <option value='all'>All statuses</option>
              {Object.entries(purchaseOrderStatusLabels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
            <PipelineViewToggle value={view} onChange={setView} />
          </div>
        </div>

        {filteredPurchaseOrders.length === 0 ? (
          <div className='px-6 py-16 text-center'>
            <span className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700'>
              <FileText size={24} />
            </span>
            <h2 className='mt-4 text-lg font-bold'>No POs found</h2>
            <p className='mt-1 text-sm text-slate-500'>
              {purchaseOrders.length === 0
                ? 'Create your first purchase order to start tracking supplier fulfillment.'
                : 'Try a different search or status.'}
            </p>
          </div>
        ) : view === 'pipeline' ? (
          <PurchaseOrderPipeline
            purchaseOrders={filteredPurchaseOrders}
            onStatusChange={updateStatus}
          />
        ) : (
          <PurchaseOrderTable
            purchaseOrders={filteredPurchaseOrders}
            onOpenRfq={openRfqDetails}
            onEdit={setFormPurchaseOrder}
            onDelete={setDeleteTarget}
          />
        )}
      </section>

      {selectedPurchaseOrder && (
        <PurchaseOrderDetailDrawer
          purchaseOrder={selectedPurchaseOrder}
          vatRate={loaderData.vatRate}
          manufacturers={loaderData.manufacturers}
          templates={loaderData.templates}
          onClose={closeDetails}
          onEdit={editFromDetails}
        />
      )}

      {selectedRfq && (
        <RfqDetailDrawer
          rfq={selectedRfq}
          vatRate={loaderData.vatRate}
          productPrices={loaderData.productPrices}
          manufacturers={loaderData.manufacturers}
          onClose={closeRfqDetails}
          onEdit={() => {
            window.location.href = `/rfqs?rfq=${encodeURIComponent(selectedRfq.id)}`;
          }}
        />
      )}

      {formPurchaseOrder && (
        <PurchaseOrderFormModal
          key={formPurchaseOrder === 'new' ? 'new' : formPurchaseOrder.id}
          initialValue={
            formPurchaseOrder === 'new' ? undefined : formPurchaseOrder
          }
          rfqs={loaderData.rfqs}
          manufacturers={loaderData.manufacturers}
          templates={loaderData.templates}
          onClose={() => setFormPurchaseOrder(null)}
          onSubmit={submitPurchaseOrder}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title='Delete this PO?'
        description={`${deleteTarget?.reference ?? 'This PO'} will be permanently removed from your purchasing workspace.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        isLoading={mutation.state !== 'idle'}
        confirmVariant='danger'
      />
    </div>
  );
};

export default PurchaseOrdersPage;
