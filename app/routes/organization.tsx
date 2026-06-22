import { useCallback, useState } from 'react';
import {
  Bot,
  Building2,
  ExternalLink,
  MapPin,
  Pencil,
  Percent,
  Phone,
  Users,
} from 'lucide-react';
import { data, Link, redirect } from 'react-router';
import type { Route } from './+types/organization';
import { Button } from '~/components/Button';
import { OrganizationFormModal } from '~/components/organizations/OrganizationFormModal';
import {
  createOrganization,
  getOrganizationForUser,
  getOrganizationUsers,
  updateOrganization,
} from '~/db/organizations';
import { getUserFromRequest } from '~/utils/session.server';
import {
  isOrganizationAiModel,
  organizationAiModels,
} from '~/types/organization';

const optionalField = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const organization = await getOrganizationForUser(user.id);
  const members = organization
    ? await getOrganizationUsers(organization.id)
    : [];
  return { organization, memberCount: members.length };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }
  const formData = await request.formData();
  const intent = formData.get('intent');
  const name = optionalField(formData, 'name');
  const preferredModel = formData.get('preferredModel');
  const vat = Number(formData.get('vat'));
  const priceMarkup = Number(formData.get('priceMarkup'));
  if (!name) {
    return data({ error: 'Organization name is required' }, { status: 400 });
  }
  if (!isOrganizationAiModel(preferredModel)) {
    return data({ error: 'Select a supported AI model' }, { status: 400 });
  }
  if (!Number.isFinite(vat) || vat < 0 || vat > 100) {
    return data({ error: 'VAT must be between 0 and 100' }, { status: 400 });
  }
  if (!Number.isFinite(priceMarkup) || priceMarkup < 0 || priceMarkup > 1000) {
    return data(
      { error: 'Price markup must be between 0 and 1000' },
      { status: 400 },
    );
  }
  const values = {
    name,
    description: optionalField(formData, 'description'),
    website: optionalField(formData, 'website'),
    phone: optionalField(formData, 'phone'),
    address: optionalField(formData, 'address'),
    preferredModel,
    vat,
    priceMarkup,
  };

  if (values.website) {
    try {
      const website = new URL(values.website);
      if (!['http:', 'https:'].includes(website.protocol)) {
        throw new Error('Unsupported protocol');
      }
    } catch {
      return data(
        { error: 'Website must be a valid HTTP or HTTPS URL' },
        { status: 400 },
      );
    }
  }

  try {
    if (intent === 'create') {
      await createOrganization(user.id, values);
      return data({ success: true as const });
    }
    if (intent !== 'update') {
      return data({ error: 'Invalid action' }, { status: 400 });
    }
    const organization = await getOrganizationForUser(user.id);
    if (!organization || organization.createdBy !== user.id) {
      return data(
        { error: 'Only the organization owner can edit these details' },
        { status: 403 },
      );
    }
    await updateOrganization(organization.id, values);
    return data({ success: true as const });
  } catch (error) {
    return data(
      { error: error instanceof Error ? error.message : 'Unable to save' },
      { status: 400 },
    );
  }
};

export default function OrganizationPage({ loaderData }: Route.ComponentProps) {
  const { organization, memberCount } = loaderData;
  const [isEditing, setIsEditing] = useState(false);
  const closeModal = useCallback(() => setIsEditing(false), []);

  if (!organization) {
    return (
      <div className='mx-auto max-w-4xl'>
        <div className='rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm'>
          <span className='mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700'>
            <Building2 size={30} />
          </span>
          <h1 className='mt-6 font-serif text-4xl text-slate-950'>
            Create your organization
          </h1>
          <p className='mx-auto mt-3 max-w-xl text-slate-600'>
            Add your company details, invite teammates, and manage your shared
            workspace from one place.
          </p>
          <Button className='mt-7' onClick={() => setIsEditing(true)}>
            Create organization
          </Button>
        </div>
        <OrganizationFormModal
          isOpen={isEditing}
          organization={null}
          onClose={closeModal}
        />
      </div>
    );
  }

  const isOwner = organization.role === 'owner';
  const preferredModelLabel =
    organizationAiModels.find(
      (model) => model.value === organization.preferredModel,
    )?.label ?? organization.preferredModel;

  return (
    <div className='mx-auto max-w-5xl space-y-6'>
      <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
        <div>
          <p className='text-sm font-semibold text-emerald-700'>Organization</p>
          <h1 className='mt-1 font-serif text-4xl text-slate-950'>
            {organization.name}
          </h1>
        </div>
        {isOwner && (
          <Button variant='outline' onClick={() => setIsEditing(true)}>
            <Pencil size={17} />
            Edit details
          </Button>
        )}
      </div>

      <div className='grid gap-6 lg:grid-cols-[1fr_20rem]'>
        <section className='rounded-3xl border border-slate-200 bg-white p-7 shadow-sm'>
          <h2 className='text-lg font-semibold text-slate-950'>
            Company details
          </h2>
          <p className='mt-4 whitespace-pre-wrap text-slate-600'>
            {organization.description || 'No description has been added yet.'}
          </p>
          <dl className='mt-7 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2'>
            <div>
              <dt className='flex items-center gap-2 text-xs font-bold tracking-wider text-slate-400 uppercase'>
                <ExternalLink size={14} /> Website
              </dt>
              <dd className='mt-2 text-sm text-slate-700'>
                {organization.website ? (
                  <a
                    className='text-emerald-700 hover:underline'
                    href={organization.website}
                    target='_blank'
                    rel='noreferrer'
                  >
                    {organization.website}
                  </a>
                ) : (
                  'Not provided'
                )}
              </dd>
            </div>
            <div>
              <dt className='flex items-center gap-2 text-xs font-bold tracking-wider text-slate-400 uppercase'>
                <Phone size={14} /> Phone
              </dt>
              <dd className='mt-2 text-sm text-slate-700'>
                {organization.phone || 'Not provided'}
              </dd>
            </div>
            <div className='sm:col-span-2'>
              <dt className='flex items-center gap-2 text-xs font-bold tracking-wider text-slate-400 uppercase'>
                <MapPin size={14} /> Address
              </dt>
              <dd className='mt-2 text-sm text-slate-700'>
                {organization.address || 'Not provided'}
              </dd>
            </div>
            <div>
              <dt className='flex items-center gap-2 text-xs font-bold tracking-wider text-slate-400 uppercase'>
                <Bot size={14} /> Preferred AI model
              </dt>
              <dd className='mt-2 text-sm text-slate-700'>
                {preferredModelLabel}
              </dd>
            </div>
            <div>
              <dt className='flex items-center gap-2 text-xs font-bold tracking-wider text-slate-400 uppercase'>
                <Percent size={14} /> Pricing defaults
              </dt>
              <dd className='mt-2 text-sm text-slate-700'>
                {organization.vat}% VAT · {organization.priceMarkup}% markup
              </dd>
            </div>
          </dl>
        </section>

        <aside className='rounded-3xl border border-slate-200 bg-white p-7 shadow-sm'>
          <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700'>
            <Users size={21} />
          </span>
          <p className='mt-5 text-3xl font-semibold text-slate-950'>
            {memberCount}
          </p>
          <p className='mt-1 text-sm text-slate-500'>Organization users</p>
          <Link
            to='/organization/users'
            className='mt-6 inline-flex text-sm font-semibold text-emerald-700 hover:underline'
          >
            {isOwner ? 'Manage users' : 'View users'}
          </Link>
        </aside>
      </div>

      <OrganizationFormModal
        isOpen={isEditing}
        organization={organization}
        onClose={closeModal}
      />
    </div>
  );
}
