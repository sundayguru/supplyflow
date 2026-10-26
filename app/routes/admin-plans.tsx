import { useState } from 'react';
import { data, redirect, useFetcher, useLoaderData } from 'react-router';
import type { Route } from './+types/admin-plans';
import {
  getAllPlans,
  getSuggestedPlanId,
  setSuggestedPlanId,
  updatePlan,
} from '~/db/plans';
import { getUserFromRequest } from '~/utils/session.server';

const featureLabels: Record<string, string> = {
  vendorPurchaseOrders: 'Vendor purchase orders',
  emailAutomation: 'Email automation',
  customPdfTemplates: 'Custom PDF templates',
  teamManagement: 'Team management',
  productPricing: 'Product pricing',
};

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
    return data({ success: true });
  }
  const id = String(form.get('id') ?? '');
  const plan = (await getAllPlans()).find((item) => item.id === id);
  if (!plan) {
    return data({ error: 'Plan not found' }, { status: 404 });
  }
  const features = Object.fromEntries(
    Object.keys(featureLabels).map((key) => [
      key,
      form.get(`feature:${key}`) === 'on',
    ]),
  );
  const amount = Number(form.get('amount') ?? 0);
  const inputTokenLimit = Number(form.get('inputTokenLimit') ?? 0);
  const outputTokenLimit = Number(form.get('outputTokenLimit') ?? 0);
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(inputTokenLimit) ||
    inputTokenLimit < 0 ||
    !Number.isSafeInteger(outputTokenLimit) ||
    outputTokenLimit < 0
  ) {
    return data(
      { error: 'Enter a valid amount and non-negative token limits' },
      { status: 400 },
    );
  }
  await updatePlan(id, {
    name: String(form.get('name') ?? '').trim(),
    description: String(form.get('description') ?? '').trim(),
    priceLabel: String(form.get('priceLabel') ?? '').trim(),
    amount,
    inputTokenLimit,
    outputTokenLimit,
    displayOrder: Number(form.get('displayOrder') ?? plan.displayOrder),
    isActive: form.get('isActive') === 'on',
    features,
  });
  return data({ success: true });
};

export default function AdminPlansPage() {
  const { plans, suggestedPlanId } = useLoaderData<typeof loader>();
  const [suggested, setSuggested] = useState(suggestedPlanId);
  const fetcher = useFetcher<typeof action>();
  return (
    <div className='mx-auto max-w-5xl space-y-7'>
      <header>
        <h1 className='text-2xl font-bold text-slate-950'>Plan management</h1>
        <p className='mt-1 text-sm text-slate-600'>
          Manage plan visibility, features, pricing labels, and the suggested
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
        <button className='rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white'>
          Save suggestion
        </button>
      </fetcher.Form>
      <div className='space-y-5'>
        {plans.map((plan) => (
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
                {Object.entries(featureLabels).map(([key, label]) => (
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
            <button className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white'>
              Save {plan.name}
            </button>
          </fetcher.Form>
        ))}
      </div>
    </div>
  );
}
