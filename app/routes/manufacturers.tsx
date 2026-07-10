import { useMemo, useState } from 'react';
import { data, redirect, useFetcher } from 'react-router';
import {
  Factory,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';
import type { Route } from './+types/manufacturers';
import { ConfirmModal } from '~/components/ConfirmModal';
import { ManufacturerFormModal } from '~/components/manufacturers/ManufacturerFormModal';
import {
  createManufacturer,
  deleteManufacturer,
  getManufacturerByName,
  listManufacturers,
  updateManufacturer,
} from '~/db/manufacturers';
import { getOrganizationForUser } from '~/db/organizations';
import type {
  ManufacturerInput,
  ManufacturerRecord,
} from '~/types/manufacturer';
import { getUserFromRequest } from '~/utils/session.server';

type ActionResponse = { success: true } | { error: string };

const optionalString = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
};

const parseManufacturerFormData = (
  formData: FormData,
):
  | { success: true; value: ManufacturerInput }
  | { success: false; error: string } => {
  const name = optionalString(formData.get('name'));
  const email = optionalString(formData.get('email'));
  const contactName = optionalString(formData.get('contactName'));

  if (!name) {
    return { success: false, error: 'Manufacturer name is required' };
  }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return { success: false, error: 'Enter a valid vendor email' };
  }
  return { success: true, value: { name, email, contactName } };
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
  return data({
    manufacturers: await listManufacturers(organization.id),
  });
};

export const action = async ({ request }: Route.ActionArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return data({ error: 'Organization required' }, { status: 403 });
  }

  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? '');
  const id = String(formData.get('id') ?? '');

  if (intent === 'delete') {
    const result = await deleteManufacturer(id, organization.id);
    if (result.success) {
      return data({ success: true as const });
    }
    return data(
      {
        error:
          result.reason === 'in_use'
            ? 'This manufacturer is already used and cannot be deleted.'
            : 'Manufacturer not found',
      },
      { status: result.reason === 'in_use' ? 409 : 404 },
    );
  }

  const parsed = parseManufacturerFormData(formData);
  if (!parsed.success) {
    return data({ error: parsed.error }, { status: 400 });
  }

  const existing = await getManufacturerByName(
    organization.id,
    parsed.value.name,
  );
  if (existing && (intent === 'create' || existing.id !== id)) {
    return data(
      { error: 'A manufacturer with this name already exists.' },
      { status: 409 },
    );
  }

  if (intent === 'create') {
    await createManufacturer(organization.id, user.id, parsed.value);
    return data({ success: true as const }, { status: 201 });
  }

  if (intent === 'update') {
    const updated = await updateManufacturer(id, organization.id, parsed.value);
    if (!updated) {
      return data({ error: 'Manufacturer not found' }, { status: 404 });
    }
    return data({ success: true as const });
  }

  return data({ error: 'Invalid action' }, { status: 400 });
};

const ManufacturersPage = ({ loaderData }: Route.ComponentProps) => {
  const manufacturers = loaderData.manufacturers;
  const deleteFetcher = useFetcher<ActionResponse>();
  const [search, setSearch] = useState('');
  const [editingManufacturer, setEditingManufacturer] =
    useState<ManufacturerRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManufacturerRecord | null>(
    null,
  );

  const filteredManufacturers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return manufacturers.filter(
      (manufacturer) =>
        !query ||
        [manufacturer.name, manufacturer.email, manufacturer.contactName].some(
          (value) => value?.toLowerCase().includes(query),
        ),
    );
  }, [manufacturers, search]);

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }
    deleteFetcher.submit(
      { intent: 'delete', id: deleteTarget.id },
      { method: 'post' },
    );
    setDeleteTarget(null);
  };

  return (
    <div className='mx-auto max-w-[1320px] font-sans text-slate-950'>
      <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-bold uppercase tracking-[0.18em] text-emerald-700'>
            Vendor directory
          </p>
          <h1 className='mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl'>
            Manufacturers
          </h1>
          <p className='mt-2 text-sm text-slate-500'>
            Manage manufacturer and vendor contact details for purchasing.
          </p>
        </div>
        <button
          type='button'
          onClick={() => setIsCreating(true)}
          className='inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500'
        >
          <Plus size={18} /> New manufacturer
        </button>
      </div>

      {deleteFetcher.data && 'error' in deleteFetcher.data && (
        <p className='mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {deleteFetcher.data.error}
        </p>
      )}

      <section className='mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between'>
          <label className='relative block w-full sm:max-w-md'>
            <Search
              className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400'
              size={17}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className='w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
              placeholder='Search manufacturers or contacts'
            />
          </label>
          <p className='text-sm font-medium text-slate-500'>
            {filteredManufacturers.length} manufacturer
            {filteredManufacturers.length === 1 ? '' : 's'}
          </p>
        </div>

        {filteredManufacturers.length === 0 ? (
          <div className='px-6 py-16 text-center'>
            <span className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700'>
              <Factory size={24} />
            </span>
            <h2 className='mt-4 text-lg font-bold'>No manufacturers found</h2>
            <p className='mt-1 text-sm text-slate-500'>
              {manufacturers.length === 0
                ? 'Create the first manufacturer to start building your vendor directory.'
                : 'Try a different search.'}
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[800px] text-left text-sm'>
              <thead className='bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400'>
                <tr>
                  <th className='px-5 py-3'>Manufacturer</th>
                  <th className='px-5 py-3'>Contact</th>
                  <th className='px-5 py-3'>Email</th>
                  <th className='px-5 py-3'>Updated</th>
                  <th className='px-5 py-3 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {filteredManufacturers.map((manufacturer) => (
                  <tr
                    key={manufacturer.id}
                    className='transition hover:bg-slate-50/60'
                  >
                    <td className='px-5 py-4'>
                      <p className='font-semibold text-slate-900'>
                        {manufacturer.name}
                      </p>
                    </td>
                    <td className='px-5 py-4 text-slate-600'>
                      <span className='flex items-center gap-1.5'>
                        <UserRound size={14} />
                        {manufacturer.contactName ?? '—'}
                      </span>
                    </td>
                    <td className='px-5 py-4 text-slate-600'>
                      <span className='flex items-center gap-1.5'>
                        <Mail size={14} />
                        {manufacturer.email ?? '—'}
                      </span>
                    </td>
                    <td className='px-5 py-4 text-slate-500'>
                      {new Date(manufacturer.updatedAt).toLocaleDateString()}
                    </td>
                    <td className='px-5 py-4'>
                      <div className='flex justify-end gap-1'>
                        <button
                          type='button'
                          onClick={() => setEditingManufacturer(manufacturer)}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700'
                          aria-label={`Edit ${manufacturer.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type='button'
                          onClick={() => setDeleteTarget(manufacturer)}
                          className='rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700'
                          aria-label={`Delete ${manufacturer.name}`}
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

      {isCreating && (
        <ManufacturerFormModal
          manufacturer={null}
          onClose={() => setIsCreating(false)}
        />
      )}
      {editingManufacturer && (
        <ManufacturerFormModal
          key={editingManufacturer.id}
          manufacturer={editingManufacturer}
          onClose={() => setEditingManufacturer(null)}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title='Delete this manufacturer?'
        description={`${deleteTarget?.name ?? 'This manufacturer'} will be permanently removed if it is not used by existing records.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        isLoading={deleteFetcher.state !== 'idle'}
        confirmVariant='danger'
      />
    </div>
  );
};

export default ManufacturersPage;
