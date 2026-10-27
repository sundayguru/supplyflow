import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { data, redirect, useFetcher, useLoaderData } from 'react-router';
import type { Route } from './+types/admin-plans';
import {
  getAllPlans,
  getSuggestedPlanId,
  setSuggestedPlanId,
  updatePlan,
} from '~/db/plans';
import {
  getOrganizationsForAdmin,
  updateOrganizationPlan,
} from '~/db/organizations';
import { getUserFromRequest } from '~/utils/session.server';
import { useToast } from '~/utils/useToast';
import { planFeatureLabels } from '~/config/planFeatures';

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  if (!user.isAdmin) {
    throw new Response('Forbidden', { status: 403 });
  }
  return {
    plans: await getAllPlans(),
    suggestedPlanId: await getSuggestedPlanId(),
    organizations: await getOrganizationsForAdmin(),
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user.isAdmin) {
    return data({ error: 'Forbidden' }, { status: 403 });
  }
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  if (intent === 'suggested') {
    const planId = String(form.get('planId') ?? '');
    const plan = (await getAllPlans()).find(
      (item) => item.id === planId && item.isActive,
    );
    if (!plan) {
      return data({ error: 'Choose an active plan' }, { status: 400 });
    }
    await setSuggestedPlanId(planId);
    return data({ success: true, intent: 'suggested' as const });
  }
  if (intent === 'organization-plan') {
    const organizationId = String(form.get('organizationId') ?? '');
    const planId = String(form.get('planId') ?? '');
    const [organization, plan] = await Promise.all([
      getOrganizationsForAdmin().then((items) =>
        items.find((item) => item.id === organizationId),
      ),
      getAllPlans().then((items) =>
        items.find((item) => item.id === planId && item.isActive),
      ),
    ]);
    if (!organization) {
      return data({ error: 'Organization not found' }, { status: 404 });
    }
    if (!plan) {
      return data({ error: 'Choose an active plan' }, { status: 400 });
    }
    await updateOrganizationPlan(organizationId, planId);
    return data({ success: true, intent: 'organization-plan' as const });
  }
  const id = String(form.get('id') ?? '');
  const plan = (await getAllPlans()).find((item) => item.id === id);
  if (!plan) {
    return data({ error: 'Plan not found' }, { status: 404 });
  }
  const features = Object.fromEntries(
    Object.keys(planFeatureLabels).map((key) => [
      key,
      form.get(`feature:${key}`) === 'on',
    ]),
  );
  const amount = Number(form.get('amount') ?? 0);
  const stripePriceId = String(form.get('stripePriceId') ?? '').trim() || null;
  const inputTokenLimit = Number(form.get('inputTokenLimit') ?? 0);
  const outputTokenLimit = Number(form.get('outputTokenLimit') ?? 0);
  if (
    (stripePriceId !== null && !/^price_[a-zA-Z0-9]+$/.test(stripePriceId)) ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(inputTokenLimit) ||
    inputTokenLimit < 0 ||
    !Number.isSafeInteger(outputTokenLimit) ||
    outputTokenLimit < 0
  ) {
    return data(
      {
        error:
          stripePriceId !== null && !/^price_[a-zA-Z0-9]+$/.test(stripePriceId)
            ? 'Enter a valid Stripe Price ID (starts with price_)'
            : 'Enter a valid amount and non-negative token limits',
      },
      { status: 400 },
    );
  }
  await updatePlan(id, {
    name: String(form.get('name') ?? '').trim(),
    description: String(form.get('description') ?? '').trim(),
    priceLabel: String(form.get('priceLabel') ?? '').trim(),
    amount,
    stripePriceId,
    inputTokenLimit,
    outputTokenLimit,
    displayOrder: Number(form.get('displayOrder') ?? plan.displayOrder),
    isActive: form.get('isActive') === 'on',
    features,
  });
  return data({ success: true, intent: 'plan' as const });
};

export default function AdminPlansPage() {
  const { plans, suggestedPlanId, organizations } =
    useLoaderData<typeof loader>();
  const [suggested, setSuggested] = useState(suggestedPlanId);
  const fetcher = useFetcher<typeof action>();
  const { showToast } = useToast();
  const lastHandledResponse = useRef(fetcher.data);
  const isSavingSuggestion =
    fetcher.state !== 'idle' && fetcher.formData?.get('intent') === 'suggested';

  useEffect(() => {
    if (
      fetcher.state !== 'idle' ||
      !fetcher.data ||
      fetcher.data === lastHandledResponse.current
    ) {
      return;
    }
    lastHandledResponse.current = fetcher.data;
    if ('success' in fetcher.data && fetcher.data.success) {
      showToast({
        tone: 'success',
        message:
          fetcher.data.intent === 'suggested'
            ? 'Suggested plan saved.'
            : fetcher.data.intent === 'organization-plan'
              ? 'Organization plan updated.'
              : 'Plan saved.',
      });
      return;
    }
    if ('error' in fetcher.data) {
      showToast({ tone: 'error', message: fetcher.data.error });
    }
  }, [fetcher.data, fetcher.state, showToast]);

  return (
    <div className='mx-auto max-w-5xl space-y-7'>
      <header>
        <h1 className='text-2xl font-bold text-slate-950'>Plan management</h1>
        <p className='mt-1 text-sm text-slate-600'>
          Manage plan visibility, features, Stripe prices, and the suggested
          plan.
        </p>
      </header>
      <fetcher.Form
        method='post'
        className='flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5'
      >
        <input type='hidden' name='intent' value='suggested' />
        <label className='min-w-56 flex-1 text-sm font-medium text-slate-700'>
          Suggested plan
          <select
            name='planId'
            value={suggested}
            onChange={(event) => setSuggested(event.target.value)}
            className='mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
          >
            {plans
              .filter((plan) => plan.isActive)
              .map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
          </select>
        </label>
        <button
          disabled={isSavingSuggestion}
          className='inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70'
        >
          {isSavingSuggestion && (
            <LoaderCircle size={16} className='animate-spin' />
          )}
          {isSavingSuggestion ? 'Saving…' : 'Save suggestion'}
        </button>
      </fetcher.Form>
      <section className='space-y-4 rounded-2xl border border-slate-200 bg-white p-6'>
        <div>
          <h2 className='text-lg font-semibold text-slate-950'>
            Organization plans
          </h2>
          <p className='mt-1 text-sm text-slate-600'>
            Assign or change an organization’s current plan.
          </p>
        </div>
        {organizations.map((organization) => {
          const isSavingOrganization =
            fetcher.state !== 'idle' &&
            fetcher.formData?.get('organizationId') === organization.id;
          return (
            <fetcher.Form
              key={organization.id}
              method='post'
              className='flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end'
            >
              <input type='hidden' name='intent' value='organization-plan' />
              <input
                type='hidden'
                name='organizationId'
                value={organization.id}
              />
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-semibold text-slate-900'>
                  {organization.name}
                </p>
                <p className='truncate text-xs text-slate-500'>
                  {organization.ownerEmail}
                </p>
              </div>
              <label className='text-sm font-medium text-slate-700'>
                Plan
                <select
                  name='planId'
                  defaultValue={organization.planId}
                  className='mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:min-w-48'
                >
                  {plans
                    .filter((plan) => plan.isActive)
                    .map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                </select>
              </label>
              <button
                disabled={isSavingOrganization}
                className='inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70'
              >
                {isSavingOrganization && (
                  <LoaderCircle size={16} className='animate-spin' />
                )}
                {isSavingOrganization ? 'Saving…' : 'Save plan'}
              </button>
            </fetcher.Form>
          );
        })}
        {organizations.length === 0 && (
          <p className='text-sm text-slate-500'>No organizations yet.</p>
        )}
      </section>
      <div className='space-y-5'>
        {plans.map((plan) =>
          (() => {
            const isSavingPlan =
              fetcher.state !== 'idle' &&
              fetcher.formData?.get('id') === plan.id;
            return (
              <fetcher.Form
                key={plan.id}
                method='post'
                className='space-y-5 rounded-2xl border border-slate-200 bg-white p-6'
              >
                <input type='hidden' name='id' value={plan.id} />
                <div className='grid gap-4 sm:grid-cols-2'>
                  <label className='text-sm font-medium text-slate-700'>
                    Plan name
                    <input
                      name='name'
                      defaultValue={plan.name}
                      required
                      className='mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2'
                    />
                  </label>
                  <label className='text-sm font-medium text-slate-700'>
                    Price label
                    <input
                      name='priceLabel'
                      defaultValue={plan.priceLabel}
                      required
                      className='mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2'
                    />
                  </label>
                  <label className='text-sm font-medium text-slate-700'>
                    Monthly amount (EUR)
                    <input
                      name='amount'
                      type='number'
                      min='0'
                      step='0.01'
                      defaultValue={plan.amount}
                      className='mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2'
                    />
                  </label>
                  <label className='text-sm font-medium text-slate-700'>
                    Stripe Price ID
                    <input
                      name='stripePriceId'
                      defaultValue={plan.stripePriceId ?? ''}
                      placeholder='price_...'
                      className='mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2'
                    />
                    <span className='mt-1 block text-xs font-normal text-slate-500'>
                      Enter a recurring Stripe Price ID. Leave blank for free or
                      manually assigned plans.
                    </span>
                  </label>
                  <label className='text-sm font-medium text-slate-700'>
                    Monthly input token allowance
                    <input
                      name='inputTokenLimit'
                      type='number'
                      min='0'
                      step='1'
                      defaultValue={plan.inputTokenLimit}
                      className='mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2'
                    />
                  </label>
                  <label className='text-sm font-medium text-slate-700'>
                    Monthly output token allowance
                    <input
                      name='outputTokenLimit'
                      type='number'
                      min='0'
                      step='1'
                      defaultValue={plan.outputTokenLimit}
                      className='mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2'
                    />
                  </label>
                  <p className='text-xs text-slate-500 sm:col-span-2'>
                    Set a token allowance to 0 for unlimited usage.
                  </p>
                  <label className='text-sm font-medium text-slate-700 sm:col-span-2'>
                    Description
                    <textarea
                      name='description'
                      defaultValue={plan.description}
                      className='mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2'
                    />
                  </label>
                </div>
                <label className='flex items-center gap-2 text-sm text-slate-700'>
                  <input
                    type='checkbox'
                    name='isActive'
                    defaultChecked={plan.isActive}
                  />{' '}
                  Show plan on billing page
                </label>
                <fieldset>
                  <legend className='mb-3 text-sm font-semibold text-slate-800'>
                    Enabled features
                  </legend>
                  <div className='grid gap-3 sm:grid-cols-2'>
                    {Object.entries(planFeatureLabels).map(([key, label]) => (
                      <label
                        key={key}
                        className='flex items-center gap-2 text-sm text-slate-700'
                      >
                        <input
                          type='checkbox'
                          name={`feature:${key}`}
                          defaultChecked={plan.features[key] === true}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button
                  disabled={isSavingPlan}
                  className='inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70'
                >
                  {isSavingPlan && (
                    <LoaderCircle size={16} className='animate-spin' />
                  )}
                  {isSavingPlan ? 'Saving…' : `Save ${plan.name}`}
                </button>
              </fetcher.Form>
            );
          })(),
        )}
      </div>
    </div>
  );
}
