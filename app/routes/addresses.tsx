import { useEffect, useState } from 'react';
import { data, redirect, useFetcher } from 'react-router';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import type { Route } from './+types/addresses';
import { ConfirmModal } from '~/components/ConfirmModal';
import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
} from '~/db/addresses';
import { getOrganizationForUser } from '~/db/organizations';
import type { AddressRecord } from '~/types/address';
import { getUserFromRequest } from '~/utils/session.server';

type ActionResponse = { success: true } | { error: string };

const formString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
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
  if (!user.planFeatures.addresses) {return redirect('/billing');}
  return data({ addresses: await listAddresses(organization.id) });
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
  if (!user.planFeatures.addresses)
    {return data(
      { error: 'Your plan does not include addresses' },
      { status: 403 },
    );}

  const formData = await request.formData();
  const intent = formString(formData, 'intent');
  const id = formString(formData, 'id');
  if (intent === 'delete') {
    await deleteAddress(id, organization.id);
    return data({ success: true as const });
  }
  const name = formString(formData, 'name');
  const address = formString(formData, 'address');
  if (!name || !address) {
    return data({ error: 'Enter a name and address.' }, { status: 400 });
  }
  if (intent === 'create') {
    await createAddress(organization.id, user.id, { name, address });
    return data({ success: true as const }, { status: 201 });
  }
  if (intent === 'update') {
    const updated = await updateAddress(id, organization.id, { name, address });
    return updated
      ? data({ success: true as const })
      : data({ error: 'Address not found.' }, { status: 404 });
  }
  return data({ error: 'Invalid action.' }, { status: 400 });
};

const AddressForm = ({
  address,
  onSaved,
}: {
  address?: AddressRecord;
  onSaved?: () => void;
}) => {
  const fetcher = useFetcher<ActionResponse>();
  useEffect(() => {
    if (address && fetcher.data && 'success' in fetcher.data) {
      onSaved?.();
    }
  }, [address, fetcher.data, onSaved]);

  return (
    <fetcher.Form method='post' className='space-y-3'>
      {fetcher.data && 'error' in fetcher.data && (
        <p className='rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {fetcher.data.error}
        </p>
      )}
      <input
        type='hidden'
        name='intent'
        value={address ? 'update' : 'create'}
      />
      {address && <input type='hidden' name='id' value={address.id} />}
      <input
        name='name'
        required
        defaultValue={address?.name}
        className='w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm'
        placeholder='Address name, such as Main warehouse'
        aria-label='Address name'
      />
      <textarea
        name='address'
        required
        rows={3}
        defaultValue={address?.address}
        className='w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm'
        placeholder='Street, city, postal code, country'
        aria-label='Address'
      />
      <button
        disabled={fetcher.state !== 'idle'}
        className='rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60'
      >
        {fetcher.state !== 'idle'
          ? 'Saving…'
          : address
            ? 'Save address'
            : 'Add address'}
      </button>
    </fetcher.Form>
  );
};

const AddressesPage = ({ loaderData }: Route.ComponentProps) => {
  const fetcher = useFetcher<ActionResponse>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AddressRecord | null>(null);

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }
    fetcher.submit(
      { intent: 'delete', id: deleteTarget.id },
      { method: 'post' },
    );
    setDeleteTarget(null);
  };

  return (
    <div className='mx-auto max-w-[1100px] font-sans text-slate-950'>
      <p className='text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase'>
        Workspace directory
      </p>
      <h1 className='mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl'>
        Addresses
      </h1>
      <p className='mt-2 text-sm text-slate-500'>
        Manage saved addresses for vendor purchase orders.
      </p>
      {fetcher.data && 'error' in fetcher.data && (
        <p className='mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {fetcher.data.error}
        </p>
      )}
      <section className='mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7'>
        <h2 className='flex items-center gap-2 text-lg font-bold'>
          <Plus size={18} className='text-emerald-700' /> Add a saved address
        </h2>
        <div className='mt-4 max-w-2xl'>
          <AddressForm />
        </div>
      </section>
      <section className='mt-6 space-y-4'>
        {loaderData.addresses.map((address) => (
          <article
            key={address.id}
            className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
          >
            {editingId === address.id ? (
              <AddressForm
                address={address}
                onSaved={() => setEditingId(null)}
              />
            ) : (
              <div className='flex items-start justify-between gap-4'>
                <div className='flex gap-3'>
                  <MapPin
                    size={18}
                    className='mt-1 shrink-0 text-emerald-700'
                  />
                  <div>
                    <h3 className='font-semibold'>{address.name}</h3>
                    <p className='mt-1 text-sm leading-6 whitespace-pre-line text-slate-600'>
                      {address.address}
                    </p>
                  </div>
                </div>
                <div className='flex gap-2'>
                  <button
                    type='button'
                    onClick={() => setEditingId(address.id)}
                    className='rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100'
                  >
                    Edit
                  </button>
                  <button
                    type='button'
                    onClick={() => setDeleteTarget(address)}
                    aria-label={`Delete ${address.name}`}
                    className='rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700'
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
        {loaderData.addresses.length === 0 && (
          <p className='rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500'>
            No saved addresses yet.
          </p>
        )}
      </section>
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title='Delete saved address?'
        description={`Are you sure you want to delete ${deleteTarget?.name ?? 'this address'}? This address will no longer be available when creating vendor purchase orders.`}
        confirmVariant='danger'
        isLoading={fetcher.state !== 'idle'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AddressesPage;
