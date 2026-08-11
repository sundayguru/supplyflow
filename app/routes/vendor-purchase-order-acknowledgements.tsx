import { useMemo, useState } from 'react';
import { data, redirect, useFetcher, useSearchParams } from 'react-router';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { Route } from './+types/vendor-purchase-order-acknowledgements';
import { ConfirmModal } from '~/components/ConfirmModal';
import { VendorPurchaseOrderAcknowledgementDetailDrawer } from '~/components/vendorPurchaseOrderAcknowledgements/VendorPurchaseOrderAcknowledgementDetailDrawer';
import {
  VendorPurchaseOrderAcknowledgementFormModal,
  type VendorPurchaseOrderAcknowledgementFormValue,
} from '~/components/vendorPurchaseOrderAcknowledgements/VendorPurchaseOrderAcknowledgementFormModal';
import {
  vendorPurchaseOrderAcknowledgementStatusLabels,
  VendorPurchaseOrderAcknowledgementStatusBadge,
} from '~/components/vendorPurchaseOrderAcknowledgements/VendorPurchaseOrderAcknowledgementStatusBadge';
import { VendorPurchaseOrderAcknowledgementPipeline } from '~/components/vendorPurchaseOrderAcknowledgements/VendorPurchaseOrderAcknowledgementPipeline';
import { PipelineViewToggle } from '~/components/pipeline/PipelineViewToggle';
import { getOrganizationForUser } from '~/db/organizations';
import { getVendorPurchaseOrderAcknowledgements } from '~/db/vendorPurchaseOrderAcknowledgements';
import { getVendorPurchaseOrders } from '~/db/vendorPurchaseOrders';
import type {
  VendorPurchaseOrderAcknowledgementRecord,
  VendorPurchaseOrderAcknowledgementStatus,
} from '~/types/vendorPurchaseOrderAcknowledgement';
import { getUserFromRequest } from '~/utils/session.server';

type ApiResponse =
  | {
      success: true;
      vendorPurchaseOrderAcknowledgement?: VendorPurchaseOrderAcknowledgementRecord;
      id?: string;
    }
  | { error: string };

const formatOptionalDate = (value: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString() : 'Not set';

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
    const [vendorPurchaseOrderAcknowledgements, vendorPurchaseOrders] =
      await Promise.all([
        getVendorPurchaseOrderAcknowledgements(organization.id),
        getVendorPurchaseOrders(organization.id),
      ]);
    return data({
      vendorPurchaseOrderAcknowledgements,
      vendorPurchaseOrders,
      loadError: null,
    });
  } catch (error) {
    console.error('Unable to load vendor PO acknowledgements', error);
    return data({
      vendorPurchaseOrderAcknowledgements: [],
      vendorPurchaseOrders: [],
      loadError: 'Unable to load vendor PO acknowledgements',
    });
  }
};

const VendorPurchaseOrderAcknowledgementsPage = ({
  loaderData,
}: Route.ComponentProps) => {
  const mutation = useFetcher<ApiResponse>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<
    'all' | VendorPurchaseOrderAcknowledgementStatus
  >('all');
  const [view, setView] = useState<'table' | 'pipeline'>('table');
  const [formTarget, setFormTarget] = useState<
    VendorPurchaseOrderAcknowledgementRecord | 'new' | null
  >(null);
  const [deleteTarget, setDeleteTarget] =
    useState<VendorPurchaseOrderAcknowledgementRecord | null>(null);
  const selectedAcknowledgement =
    loaderData.vendorPurchaseOrderAcknowledgements.find(
      (acknowledgement) =>
        acknowledgement.id === searchParams.get('vendorPoAck'),
    );

  const openDetails = (
    acknowledgement: VendorPurchaseOrderAcknowledgementRecord,
  ) => {
    const next = new URLSearchParams(searchParams);
    next.set('vendorPoAck', acknowledgement.id);
    setSearchParams(next);
  };

  const closeDetails = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('vendorPoAck');
    setSearchParams(next, { replace: true });
  };

  const editFromDetails = () => {
    if (!selectedAcknowledgement) {
      return;
    }
    setFormTarget(selectedAcknowledgement);
    closeDetails();
  };

  const deleteFromDetails = () => {
    if (!selectedAcknowledgement) {
      return;
    }
    setDeleteTarget(selectedAcknowledgement);
    closeDetails();
  };

  const filteredAcknowledgements = useMemo(() => {
    const search = query.trim().toLowerCase();
    return loaderData.vendorPurchaseOrderAcknowledgements.filter(
      (acknowledgement) =>
        (status === 'all' || acknowledgement.status === status) &&
        (!search ||
          acknowledgement.reference.toLowerCase().includes(search) ||
          acknowledgement.acknowledgementReference
            ?.toLowerCase()
            .includes(search) ||
          acknowledgement.linkedVendorPurchaseOrder.reference
            .toLowerCase()
            .includes(search) ||
          acknowledgement.linkedVendorPurchaseOrder.vendorName
            .toLowerCase()
            .includes(search) ||
          acknowledgement.items.some(
            (item) =>
              item.description.toLowerCase().includes(search) ||
              item.manufacturerPartNumber?.toLowerCase().includes(search),
          )),
    );
  }, [loaderData.vendorPurchaseOrderAcknowledgements, query, status]);

  const submitAcknowledgement = (
    value: VendorPurchaseOrderAcknowledgementFormValue,
  ) => {
    mutation.submit(value, {
      method: value.id ? 'patch' : 'post',
      action: '/api/vendor-purchase-order-acknowledgements',
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
        action: '/api/vendor-purchase-order-acknowledgements',
        encType: 'application/json',
      },
    );
    setDeleteTarget(null);
  };

  const updateStatus = (
    id: string,
    nextStatus: VendorPurchaseOrderAcknowledgementStatus,
  ) => {
    mutation.submit(
      { id, status: nextStatus, intent: 'updateStatus' },
      {
        method: 'patch',
        action: '/api/vendor-purchase-order-acknowledgements',
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
            Vendor PO acknowledgements
          </h1>
          <p className='mt-2 text-sm text-slate-500'>
            Track vendor confirmations, delivery dates, and item status.
          </p>
        </div>
        <button
          type='button'
          onClick={() => setFormTarget('new')}
          disabled={loaderData.vendorPurchaseOrders.length === 0}
          className='inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60'
        >
          <Plus size={18} /> New acknowledgement
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
              placeholder='Search acknowledgements, vendors, or items'
            />
          </label>
          <div className='flex gap-2'>
            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as
                    | 'all'
                    | VendorPurchaseOrderAcknowledgementStatus,
                )
              }
              className='min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 sm:flex-none'
              aria-label='Filter by status'
            >
              <option value='all'>All statuses</option>
              {Object.entries(
                vendorPurchaseOrderAcknowledgementStatusLabels,
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <PipelineViewToggle value={view} onChange={setView} />
          </div>
        </div>

        {filteredAcknowledgements.length === 0 ? (
          <div className='px-6 py-16 text-center'>
            <span className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700'>
              <Eye size={24} />
            </span>
            <h2 className='mt-4 text-lg font-bold'>
              No acknowledgements found
            </h2>
            <p className='mt-1 text-sm text-slate-500'>
              Create one manually or let the inbox checker capture vendor
              confirmations.
            </p>
          </div>
        ) : view === 'pipeline' ? (
          <VendorPurchaseOrderAcknowledgementPipeline
            acknowledgements={filteredAcknowledgements}
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
                  <th className='px-5 py-3'>Linked vendor PO</th>
                  <th className='px-5 py-3'>Items</th>
                  <th className='px-5 py-3'>Acknowledged</th>
                  <th className='px-5 py-3'>Status</th>
                  <th className='px-5 py-3 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {filteredAcknowledgements.map((acknowledgement) => (
                  <tr
                    key={acknowledgement.id}
                    className='transition hover:bg-slate-50/60'
                  >
                    <td className='px-5 py-4 font-semibold text-slate-900'>
                      {acknowledgement.reference}
                      {acknowledgement.acknowledgementReference && (
                        <p className='mt-0.5 text-xs font-normal text-slate-400'>
                          {acknowledgement.acknowledgementReference}
                        </p>
                      )}
                    </td>
                    <td className='px-5 py-4'>
                      <p className='font-medium text-slate-800'>
                        {acknowledgement.linkedVendorPurchaseOrder.vendorName}
                      </p>
                      <p className='mt-0.5 text-xs text-slate-400'>
                        {acknowledgement.linkedVendorPurchaseOrder
                          .vendorEmail ?? 'No email'}
                      </p>
                    </td>
                    <td className='px-5 py-4 text-slate-600'>
                      {acknowledgement.linkedVendorPurchaseOrder.reference}
                    </td>
                    <td className='max-w-[260px] px-5 py-4'>
                      <p className='truncate text-slate-600'>
                        {acknowledgement.items[0]?.description}
                      </p>
                      <p className='mt-0.5 text-xs text-slate-400'>
                        {acknowledgement.items.length} item
                        {acknowledgement.items.length === 1 ? '' : 's'}
                      </p>
                    </td>
                    <td className='px-5 py-4 text-slate-600'>
                      {formatOptionalDate(acknowledgement.acknowledgedAt)}
                    </td>
                    <td className='px-5 py-4'>
                      <VendorPurchaseOrderAcknowledgementStatusBadge
                        status={acknowledgement.status}
                      />
                    </td>
                    <td className='px-5 py-4'>
                      <div className='flex justify-end gap-1'>
                        <button
                          type='button'
                          onClick={() => openDetails(acknowledgement)}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-sky-50 hover:text-sky-700'
                          aria-label={`View ${acknowledgement.reference}`}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type='button'
                          onClick={() => setFormTarget(acknowledgement)}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700'
                          aria-label={`Edit ${acknowledgement.reference}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type='button'
                          onClick={() => setDeleteTarget(acknowledgement)}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700'
                          aria-label={`Delete ${acknowledgement.reference}`}
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

      {selectedAcknowledgement && (
        <VendorPurchaseOrderAcknowledgementDetailDrawer
          acknowledgement={selectedAcknowledgement}
          onClose={closeDetails}
          onEdit={editFromDetails}
          onDelete={deleteFromDetails}
        />
      )}

      {formTarget && (
        <VendorPurchaseOrderAcknowledgementFormModal
          key={formTarget === 'new' ? 'new' : formTarget.id}
          initialValue={formTarget === 'new' ? undefined : formTarget}
          vendorPurchaseOrders={loaderData.vendorPurchaseOrders}
          onClose={() => setFormTarget(null)}
          onSubmit={submitAcknowledgement}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title='Delete this acknowledgement?'
        description={`${deleteTarget?.reference ?? 'This acknowledgement'} will be permanently removed.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        isLoading={mutation.state !== 'idle'}
        confirmVariant='danger'
      />
    </div>
  );
};

export default VendorPurchaseOrderAcknowledgementsPage;
