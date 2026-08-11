import { useMemo, useState } from 'react';
import { data, redirect, useFetcher, useSearchParams } from 'react-router';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { Route } from './+types/vendor-purchase-orders';
import { ConfirmModal } from '~/components/ConfirmModal';
import { PurchaseOrderDetailDrawer } from '~/components/purchaseOrders/PurchaseOrderDetailDrawer';
import {
  VendorPurchaseOrderFormModal,
  type VendorPurchaseOrderFormValue,
} from '~/components/vendorPurchaseOrders/VendorPurchaseOrderFormModal';
import { VendorPurchaseOrderDetailDrawer } from '~/components/vendorPurchaseOrders/VendorPurchaseOrderDetailDrawer';
import {
  vendorPurchaseOrderStatusLabels,
  VendorPurchaseOrderStatusBadge,
} from '~/components/vendorPurchaseOrders/VendorPurchaseOrderStatusBadge';
import { VendorPurchaseOrderPipeline } from '~/components/vendorPurchaseOrders/VendorPurchaseOrderPipeline';
import { PipelineViewToggle } from '~/components/pipeline/PipelineViewToggle';
import { listManufacturers } from '~/db/manufacturers';
import { getOrganizationForUser } from '~/db/organizations';
import { getPurchaseOrders } from '~/db/purchaseOrders';
import { listRfqPdfTemplates } from '~/db/rfqPdfTemplates';
import { getVendorPurchaseOrders } from '~/db/vendorPurchaseOrders';
import type {
  VendorPurchaseOrderRecord,
  VendorPurchaseOrderStatus,
} from '~/types/vendorPurchaseOrder';
import { findManufacturerName } from '~/utils/manufacturers';
import { formatPurchaseOrderMoney } from '~/utils/purchaseOrder';
import { getUserFromRequest } from '~/utils/session.server';

type ApiResponse =
  | {
      success: true;
      vendorPurchaseOrder?: VendorPurchaseOrderRecord;
      id?: string;
    }
  | { error: string };

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
    const [vendorPurchaseOrders, purchaseOrders, manufacturers, templates] =
      await Promise.all([
        getVendorPurchaseOrders(organization.id),
        getPurchaseOrders(organization.id, organization.vat),
        listManufacturers(organization.id),
        listRfqPdfTemplates(organization.id),
      ]);
    return data({
      vendorPurchaseOrders,
      purchaseOrders,
      manufacturers,
      templates: templates.map(({ id, name }) => ({ id, name })),
      vatRate: organization.vat,
      loadError: null,
    });
  } catch (error) {
    console.error('Unable to load vendor POs', error);
    return data({
      vendorPurchaseOrders: [],
      purchaseOrders: [],
      manufacturers: [],
      templates: [],
      vatRate: organization.vat,
      loadError: 'Unable to load vendor POs',
    });
  }
};

const VendorPurchaseOrdersPage = ({ loaderData }: Route.ComponentProps) => {
  const mutation = useFetcher<ApiResponse>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | VendorPurchaseOrderStatus>(
    'all',
  );
  const [view, setView] = useState<'table' | 'pipeline'>('table');
  const [formTarget, setFormTarget] = useState<
    VendorPurchaseOrderRecord | 'new' | null
  >(null);
  const [deleteTarget, setDeleteTarget] =
    useState<VendorPurchaseOrderRecord | null>(null);
  const selectedVendorPurchaseOrder = loaderData.vendorPurchaseOrders.find(
    (vendorPurchaseOrder) =>
      vendorPurchaseOrder.id === searchParams.get('vendorPo'),
  );
  const selectedPurchaseOrder = loaderData.purchaseOrders.find(
    (purchaseOrder) => purchaseOrder.id === searchParams.get('po'),
  );

  const openDetails = (vendorPurchaseOrder: VendorPurchaseOrderRecord) => {
    const next = new URLSearchParams(searchParams);
    next.delete('po');
    next.set('vendorPo', vendorPurchaseOrder.id);
    setSearchParams(next);
  };

  const openPurchaseOrderDetails = (purchaseOrderId: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete('vendorPo');
    next.set('po', purchaseOrderId);
    setSearchParams(next);
  };

  const closeDetails = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('vendorPo');
    setSearchParams(next, { replace: true });
  };

  const closePurchaseOrderDetails = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('po');
    setSearchParams(next, { replace: true });
  };

  const editFromDetails = () => {
    if (!selectedVendorPurchaseOrder) {
      return;
    }
    setFormTarget(selectedVendorPurchaseOrder);
    closeDetails();
  };

  const deleteFromDetails = () => {
    if (!selectedVendorPurchaseOrder) {
      return;
    }
    setDeleteTarget(selectedVendorPurchaseOrder);
    closeDetails();
  };

  const filteredVendorPurchaseOrders = useMemo(() => {
    const search = query.trim().toLowerCase();
    return loaderData.vendorPurchaseOrders.filter(
      (vendorPurchaseOrder) =>
        (status === 'all' || vendorPurchaseOrder.status === status) &&
        (!search ||
          vendorPurchaseOrder.reference.toLowerCase().includes(search) ||
          vendorPurchaseOrder.vendorName.toLowerCase().includes(search) ||
          vendorPurchaseOrder.linkedPurchaseOrder.reference
            .toLowerCase()
            .includes(search) ||
          vendorPurchaseOrder.items.some((item) => {
            const manufacturerName = findManufacturerName(
              loaderData.manufacturers,
              item.manufacturerId,
            );
            return (
              item.description.toLowerCase().includes(search) ||
              manufacturerName?.toLowerCase().includes(search) ||
              item.manufacturerPartNumber?.toLowerCase().includes(search)
            );
          })),
    );
  }, [
    loaderData.manufacturers,
    loaderData.vendorPurchaseOrders,
    query,
    status,
  ]);

  const submitVendorPurchaseOrder = (value: VendorPurchaseOrderFormValue) => {
    mutation.submit(value, {
      method: value.id ? 'patch' : 'post',
      action: '/api/vendor-purchase-orders',
      encType: 'application/json',
    });
    setFormTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }
    mutation.submit(
      { id: deleteTarget.id },
      {
        method: 'delete',
        action: '/api/vendor-purchase-orders',
        encType: 'application/json',
      },
    );
    setDeleteTarget(null);
  };

  const updateStatus = (id: string, nextStatus: VendorPurchaseOrderStatus) => {
    mutation.submit(
      { id, status: nextStatus, intent: 'updateStatus' },
      {
        method: 'patch',
        action: '/api/vendor-purchase-orders',
        encType: 'application/json',
      },
    );
  };

  return (
    <div className='mx-auto max-w-[1440px] font-sans text-slate-950'>
      <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase'>
            Vendor purchasing
          </p>
          <h1 className='mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl'>
            Vendor POs
          </h1>
          <p className='mt-2 text-sm text-slate-500'>
            Create and track purchase orders sent to vendors.
          </p>
        </div>
        <button
          type='button'
          onClick={() => setFormTarget('new')}
          disabled={loaderData.purchaseOrders.length === 0}
          className='inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60'
        >
          <Plus size={18} /> New vendor PO
        </button>
      </div>

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

      <section className='mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between'>
          <label className='relative block w-full sm:max-w-sm'>
            <Search
              className='absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400'
              size={17}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className='w-full rounded-xl border border-slate-200 py-2.5 pr-3 pl-10 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
              placeholder='Search vendor POs, vendors, or items'
            />
          </label>
          <div className='flex gap-2'>
            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as 'all' | VendorPurchaseOrderStatus,
                )
              }
              className='min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 sm:flex-none'
              aria-label='Filter by status'
            >
              <option value='all'>All statuses</option>
              {Object.entries(vendorPurchaseOrderStatusLabels).map(
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

        {filteredVendorPurchaseOrders.length === 0 ? (
          <div className='px-6 py-16 text-center'>
            <span className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700'>
              <Eye size={24} />
            </span>
            <h2 className='mt-4 text-lg font-bold'>No vendor POs found</h2>
            <p className='mt-1 text-sm text-slate-500'>
              Generate a vendor PO from a customer PO or create one here.
            </p>
          </div>
        ) : view === 'pipeline' ? (
          <VendorPurchaseOrderPipeline
            vendorPurchaseOrders={filteredVendorPurchaseOrders}
            onOpen={openDetails}
            onStatusChange={updateStatus}
          />
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[900px] text-left text-sm'>
              <thead className='bg-slate-50/70 text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                <tr>
                  <th className='px-5 py-3'>Reference</th>
                  <th className='px-5 py-3'>Vendor</th>
                  <th className='px-5 py-3'>Linked PO</th>
                  <th className='px-5 py-3'>Items</th>
                  <th className='px-5 py-3'>Value</th>
                  <th className='px-5 py-3'>Status</th>
                  <th className='px-5 py-3 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {filteredVendorPurchaseOrders.map((vendorPurchaseOrder) => (
                  <tr
                    key={vendorPurchaseOrder.id}
                    className='transition hover:bg-slate-50/60'
                  >
                    <td className='px-5 py-4 font-semibold'>
                      <button
                        type='button'
                        onClick={() => openDetails(vendorPurchaseOrder)}
                        className='text-slate-900 transition hover:text-emerald-700'
                      >
                        {vendorPurchaseOrder.reference}
                      </button>
                    </td>
                    <td className='px-5 py-4'>
                      <p className='font-medium text-slate-800'>
                        {vendorPurchaseOrder.vendorName}
                      </p>
                      <p className='mt-0.5 text-xs text-slate-400'>
                        {vendorPurchaseOrder.vendorEmail ?? 'No email'}
                      </p>
                    </td>
                    <td className='px-5 py-4'>
                      <button
                        type='button'
                        onClick={() =>
                          openPurchaseOrderDetails(
                            vendorPurchaseOrder.linkedPurchaseOrder.id,
                          )
                        }
                        className='font-semibold text-emerald-700 transition hover:text-emerald-500 hover:underline'
                      >
                        {vendorPurchaseOrder.linkedPurchaseOrder.reference}
                      </button>
                    </td>
                    <td className='max-w-[260px] px-5 py-4'>
                      <p className='truncate text-slate-600'>
                        {vendorPurchaseOrder.items[0]?.description}
                      </p>
                      <p className='mt-0.5 text-xs text-slate-400'>
                        {vendorPurchaseOrder.items.length} item
                        {vendorPurchaseOrder.items.length === 1 ? '' : 's'}
                      </p>
                    </td>
                    <td className='px-5 py-4 font-medium'>
                      {formatPurchaseOrderMoney(
                        vendorPurchaseOrder.totalValue,
                        vendorPurchaseOrder.currency,
                      )}
                    </td>
                    <td className='px-5 py-4'>
                      <VendorPurchaseOrderStatusBadge
                        status={vendorPurchaseOrder.status}
                      />
                    </td>
                    <td className='px-5 py-4'>
                      <div className='flex justify-end gap-1'>
                        <button
                          type='button'
                          onClick={() => openDetails(vendorPurchaseOrder)}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-sky-50 hover:text-sky-700'
                          aria-label={`View ${vendorPurchaseOrder.reference}`}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type='button'
                          onClick={() => setFormTarget(vendorPurchaseOrder)}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700'
                          aria-label={`Edit ${vendorPurchaseOrder.reference}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type='button'
                          onClick={() => setDeleteTarget(vendorPurchaseOrder)}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700'
                          aria-label={`Delete ${vendorPurchaseOrder.reference}`}
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

      {selectedVendorPurchaseOrder && (
        <VendorPurchaseOrderDetailDrawer
          vendorPurchaseOrder={selectedVendorPurchaseOrder}
          templates={loaderData.templates}
          manufacturers={loaderData.manufacturers}
          onClose={closeDetails}
          onEdit={editFromDetails}
          onDelete={deleteFromDetails}
        />
      )}

      {selectedPurchaseOrder && (
        <PurchaseOrderDetailDrawer
          purchaseOrder={selectedPurchaseOrder}
          vatRate={loaderData.vatRate}
          manufacturers={loaderData.manufacturers}
          templates={loaderData.templates}
          onClose={closePurchaseOrderDetails}
          onEdit={() => {
            window.location.href = `/purchase-orders?po=${encodeURIComponent(selectedPurchaseOrder.id)}`;
          }}
        />
      )}

      {formTarget && (
        <VendorPurchaseOrderFormModal
          key={formTarget === 'new' ? 'new' : formTarget.id}
          initialValue={formTarget === 'new' ? undefined : formTarget}
          purchaseOrders={loaderData.purchaseOrders}
          manufacturers={loaderData.manufacturers}
          templates={loaderData.templates}
          onClose={() => setFormTarget(null)}
          onSubmit={submitVendorPurchaseOrder}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title='Delete this vendor PO?'
        description={`${deleteTarget?.reference ?? 'This vendor PO'} will be permanently removed.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        isLoading={mutation.state !== 'idle'}
        confirmVariant='danger'
      />
    </div>
  );
};

export default VendorPurchaseOrdersPage;
