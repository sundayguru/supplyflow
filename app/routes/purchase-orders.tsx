import { useMemo, useState } from 'react';
import {
  data,
  Link,
  redirect,
  useFetcher,
  useSearchParams,
} from 'react-router';
import {
  CalendarDays,
  Eye,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type { Route } from './+types/purchase-orders';
import { ConfirmModal } from '~/components/ConfirmModal';
import { PurchaseOrderDetailDrawer } from '~/components/purchaseOrders/PurchaseOrderDetailDrawer';
import {
  PurchaseOrderFormModal,
  type PurchaseOrderFormValue,
} from '~/components/purchaseOrders/PurchaseOrderFormModal';
import { purchaseOrderStatusLabels } from '~/components/purchaseOrders/PurchaseOrderStatusBadge';
import { PurchaseOrderStatusMenu } from '~/components/purchaseOrders/PurchaseOrderStatusMenu';
import { listManufacturers } from '~/db/manufacturers';
import { getOrganizationForUser } from '~/db/organizations';
import { getPurchaseOrders } from '~/db/purchaseOrders';
import { getRfqs } from '~/db/rfqs';
import type {
  PurchaseOrderRecord,
  PurchaseOrderStatus,
} from '~/types/purchaseOrder';
import { formatPurchaseOrderMoney } from '~/utils/purchaseOrder';
import { getUserFromRequest } from '~/utils/session.server';

type ApiResponse =
  | { success: true; purchaseOrder?: PurchaseOrderRecord; id?: string }
  | { error: string };

const activeStatuses: PurchaseOrderStatus[] = [
  'draft',
  'sent',
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
    const [purchaseOrders, rfqs, manufacturers] = await Promise.all([
      getPurchaseOrders(organization.id, organization.vat),
      getRfqs(organization.id, organization.vat),
      listManufacturers(organization.id),
    ]);
    return data({
      purchaseOrders,
      rfqs: rfqs.map(({ id, reference, customerName }) => ({
        id,
        reference,
        customerName,
      })),
      manufacturers,
      vatRate: organization.vat,
      loadError: null,
    });
  } catch (error) {
    console.error('Unable to load purchase orders', error);
    return data({
      purchaseOrders: [],
      rfqs: [],
      manufacturers: [],
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
  const [formPurchaseOrder, setFormPurchaseOrder] = useState<
    PurchaseOrderRecord | 'new' | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrderRecord | null>(
    null,
  );
  const selectedPurchaseOrder = purchaseOrders.find(
    (purchaseOrder) => purchaseOrder.id === searchParams.get('po'),
  );

  const closeDetails = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('po');
    setSearchParams(next, { replace: true });
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
          purchaseOrder.items.some(
            (item) =>
              item.description.toLowerCase().includes(query) ||
              item.manufacturer?.toLowerCase().includes(query) ||
              item.manufacturerPartNumber?.toLowerCase().includes(query),
          )),
    );
  }, [purchaseOrders, search, status]);

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
          <p className='text-xs font-bold uppercase tracking-[0.18em] text-emerald-700'>
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
        <div className='flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5'>
          <label className='relative block w-full sm:max-w-sm'>
            <Search
              className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400'
              size={17}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className='w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
              placeholder='Search POs, suppliers, or RFQs'
            />
          </label>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as 'all' | PurchaseOrderStatus)
            }
            className='rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-emerald-500'
            aria-label='Filter by status'
          >
            <option value='all'>All statuses</option>
            {Object.entries(purchaseOrderStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[900px] text-left text-sm'>
              <thead className='bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400'>
                <tr>
                  <th className='px-5 py-3'>Reference</th>
                  <th className='px-5 py-3'>Supplier</th>
                  <th className='px-5 py-3'>Items</th>
                  <th className='px-5 py-3'>Expected</th>
                  <th className='px-5 py-3'>Value</th>
                  <th className='px-5 py-3'>Status</th>
                  <th className='px-5 py-3 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {filteredPurchaseOrders.map((purchaseOrder) => (
                  <tr
                    key={purchaseOrder.id}
                    className='transition hover:bg-slate-50/60'
                  >
                    <td className='px-5 py-4 font-semibold'>
                      <Link
                        to={`?po=${encodeURIComponent(purchaseOrder.id)}`}
                        className='text-slate-900 hover:text-emerald-700'
                      >
                        {purchaseOrder.reference}
                      </Link>
                      {purchaseOrder.linkedRfq && (
                        <p className='mt-0.5 text-xs font-normal text-slate-400'>
                          {purchaseOrder.linkedRfq.reference}
                        </p>
                      )}
                    </td>
                    <td className='px-5 py-4'>
                      <p className='font-medium text-slate-800'>
                        {purchaseOrder.supplierName}
                      </p>
                      <p className='mt-0.5 text-xs text-slate-400'>
                        {purchaseOrder.supplierEmail ?? 'No email'}
                      </p>
                    </td>
                    <td className='max-w-[280px] px-5 py-4'>
                      <p className='truncate text-slate-600'>
                        {purchaseOrder.items[0]?.description}
                      </p>
                      <p className='mt-0.5 text-xs text-slate-400'>
                        {purchaseOrder.items.length} item
                        {purchaseOrder.items.length === 1 ? '' : 's'}
                      </p>
                    </td>
                    <td className='px-5 py-4 text-slate-600'>
                      {purchaseOrder.expectedDate ? (
                        <span className='flex items-center gap-1.5'>
                          <CalendarDays size={14} />
                          {new Date(
                            `${purchaseOrder.expectedDate}T00:00:00`,
                          ).toLocaleDateString()}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className='px-5 py-4 font-medium'>
                      {formatPurchaseOrderMoney(
                        purchaseOrder.totalValue,
                        purchaseOrder.currency,
                      )}
                    </td>
                    <td className='px-5 py-4'>
                      <PurchaseOrderStatusMenu
                        purchaseOrderId={purchaseOrder.id}
                        status={purchaseOrder.status}
                      />
                    </td>
                    <td className='px-5 py-4'>
                      <div className='flex justify-end gap-1'>
                        <Link
                          to={`?po=${encodeURIComponent(purchaseOrder.id)}`}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-sky-50 hover:text-sky-700'
                          aria-label={`View ${purchaseOrder.reference}`}
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          type='button'
                          onClick={() => setFormPurchaseOrder(purchaseOrder)}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700'
                          aria-label={`Edit ${purchaseOrder.reference}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type='button'
                          onClick={() => setDeleteTarget(purchaseOrder)}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700'
                          aria-label={`Delete ${purchaseOrder.reference}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedPurchaseOrder && (
        <PurchaseOrderDetailDrawer
          purchaseOrder={selectedPurchaseOrder}
          vatRate={loaderData.vatRate}
          manufacturers={loaderData.manufacturers}
          onClose={closeDetails}
          onEdit={editFromDetails}
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
