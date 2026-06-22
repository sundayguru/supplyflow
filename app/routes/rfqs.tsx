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
import type { Route } from './+types/rfqs';
import { ConfirmModal } from '~/components/ConfirmModal';
import { RfqDetailDrawer } from '~/components/rfqs/RfqDetailDrawer';
import {
  RfqFormModal,
  type RfqFormValue,
} from '~/components/rfqs/RfqFormModal';
import {
  RfqStatusBadge,
  rfqStatusLabels,
} from '~/components/rfqs/RfqStatusBadge';
import { getRfqs } from '~/db/rfqs';
import { getUserFromRequest } from '~/utils/session.server';
import type { RfqRecord, RfqStatus } from '~/types/rfq';
import { formatRfqMoney } from '~/utils/rfq';
import { getOrganizationForUser } from '~/db/organizations';

type ApiResponse =
  | { success: true; rfq?: RfqRecord; id?: string }
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
    return data({
      rfqs: await getRfqs(organization.id),
      loadError: null,
    });
  } catch (error) {
    console.error('Unable to load RFQs', error);
    return data({ rfqs: [], loadError: 'Unable to load RFQs' });
  }
};

const RfqsPage = ({ loaderData }: Route.ComponentProps) => {
  const { rfqs } = loaderData;
  const mutation = useFetcher<ApiResponse>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | RfqStatus>('all');
  const [formRfq, setFormRfq] = useState<RfqRecord | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RfqRecord | null>(null);
  const selectedRfq = rfqs.find((rfq) => rfq.id === searchParams.get('rfq'));

  const closeDetails = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('rfq');
    setSearchParams(next, { replace: true });
  };

  const editFromDetails = () => {
    if (!selectedRfq) {
      return;
    }
    setFormRfq(selectedRfq);
    closeDetails();
  };

  const filteredRfqs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rfqs.filter(
      (rfq) =>
        (status === 'all' || rfq.status === status) &&
        (!query ||
          rfq.reference.toLowerCase().includes(query) ||
          rfq.customerName.toLowerCase().includes(query) ||
          rfq.items.some(
            (item) =>
              item.description.toLowerCase().includes(query) ||
              item.manufacturer?.toLowerCase().includes(query) ||
              item.manufacturerPartNumber?.toLowerCase().includes(query),
          )),
    );
  }, [rfqs, search, status]);

  const submitRfq = (value: RfqFormValue) => {
    const method = value.id ? 'patch' : 'post';
    mutation.submit(value, {
      method,
      action: '/api/rfqs',
      encType: 'application/json',
    });
    setFormRfq(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }
    mutation.submit(
      { id: deleteTarget.id },
      { method: 'delete', action: '/api/rfqs', encType: 'application/json' },
    );
    setDeleteTarget(null);
  };

  const wonValue = rfqs
    .filter((rfq) => rfq.status === 'won')
    .reduce((sum, rfq) => sum + rfq.estimatedValue, 0);
  const activeCount = rfqs.filter(
    (rfq) => !['won', 'lost'].includes(rfq.status),
  ).length;

  return (
    <div className='mx-auto max-w-[1440px] font-sans text-slate-950'>
      <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase'>
            Quotation workspace
          </p>
          <h1 className='mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl'>
            RFQ management
          </h1>
          <p className='mt-2 text-sm text-slate-500'>
            Create, track, and update every customer request in one place.
          </p>
        </div>
        <button
          type='button'
          onClick={() => setFormRfq('new')}
          className='inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500'
        >
          <Plus size={18} /> New RFQ
        </button>
      </div>

      <section
        className='mt-8 grid gap-4 sm:grid-cols-3'
        aria-label='RFQ summary'
      >
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm text-slate-500'>Total requests</p>
          <p className='mt-2 text-3xl font-bold'>{rfqs.length}</p>
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm text-slate-500'>Active pipeline</p>
          <p className='mt-2 text-3xl font-bold'>{activeCount}</p>
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm text-slate-500'>Won value</p>
          <p className='mt-2 text-3xl font-bold'>
            {formatRfqMoney(wonValue, 'EUR')}
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
              className='absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400'
              size={17}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className='w-full rounded-xl border border-slate-200 py-2.5 pr-3 pl-10 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
              placeholder='Search RFQs or customers'
            />
          </label>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as 'all' | RfqStatus)
            }
            className='rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-emerald-500'
            aria-label='Filter by status'
          >
            <option value='all'>All statuses</option>
            {Object.entries(rfqStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {filteredRfqs.length === 0 ? (
          <div className='px-6 py-16 text-center'>
            <span className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700'>
              <FileText size={24} />
            </span>
            <h2 className='mt-4 text-lg font-bold'>No RFQs found</h2>
            <p className='mt-1 text-sm text-slate-500'>
              {rfqs.length === 0
                ? 'Create your first request to start the pipeline.'
                : 'Try a different search or status.'}
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[860px] text-left text-sm'>
              <thead className='bg-slate-50/70 text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                <tr>
                  <th className='px-5 py-3'>Reference</th>
                  <th className='px-5 py-3'>Customer</th>
                  <th className='px-5 py-3'>Request</th>
                  <th className='px-5 py-3'>Due date</th>
                  <th className='px-5 py-3'>Value</th>
                  <th className='px-5 py-3'>Status</th>
                  <th className='px-5 py-3 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {filteredRfqs.map((rfq) => (
                  <tr key={rfq.id} className='transition hover:bg-slate-50/60'>
                    <td className='px-5 py-4 font-semibold'>
                      <Link
                        to={`?rfq=${encodeURIComponent(rfq.id)}`}
                        className='text-slate-900 hover:text-emerald-700'
                      >
                        {rfq.reference}
                      </Link>
                    </td>
                    <td className='px-5 py-4'>
                      <p className='font-medium text-slate-800'>
                        {rfq.customerName}
                      </p>
                      <p className='mt-0.5 text-xs text-slate-400'>
                        {rfq.customerEmail ?? 'No email'}
                      </p>
                    </td>
                    <td className='max-w-[280px] px-5 py-4'>
                      <p className='truncate text-slate-600'>
                        {rfq.items[0]?.description}
                      </p>
                      <p className='mt-0.5 text-xs text-slate-400'>
                        {rfq.items.length} item
                        {rfq.items.length === 1 ? '' : 's'}
                      </p>
                    </td>
                    <td className='px-5 py-4 text-slate-600'>
                      {rfq.dueDate ? (
                        <span className='flex items-center gap-1.5'>
                          <CalendarDays size={14} />
                          {new Date(
                            `${rfq.dueDate}T00:00:00`,
                          ).toLocaleDateString()}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className='px-5 py-4 font-medium'>
                      {formatRfqMoney(rfq.estimatedValue, rfq.currency)}
                    </td>
                    <td className='px-5 py-4'>
                      <RfqStatusBadge status={rfq.status} />
                    </td>
                    <td className='px-5 py-4'>
                      <div className='flex justify-end gap-1'>
                        <Link
                          to={`?rfq=${encodeURIComponent(rfq.id)}`}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-sky-50 hover:text-sky-700'
                          aria-label={`View ${rfq.reference}`}
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          type='button'
                          onClick={() => setFormRfq(rfq)}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700'
                          aria-label={`Edit ${rfq.reference}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type='button'
                          onClick={() => setDeleteTarget(rfq)}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700'
                          aria-label={`Delete ${rfq.reference}`}
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

      {selectedRfq && (
        <RfqDetailDrawer
          rfq={selectedRfq}
          onClose={closeDetails}
          onEdit={editFromDetails}
        />
      )}

      {formRfq && (
        <RfqFormModal
          key={formRfq === 'new' ? 'new' : formRfq.id}
          initialValue={formRfq === 'new' ? undefined : formRfq}
          onClose={() => setFormRfq(null)}
          onSubmit={submitRfq}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title='Delete this RFQ?'
        description={`${deleteTarget?.reference ?? 'This RFQ'} will be permanently removed from your quotation workspace.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        isLoading={mutation.state !== 'idle'}
        confirmVariant='danger'
      />
    </div>
  );
};

export default RfqsPage;
