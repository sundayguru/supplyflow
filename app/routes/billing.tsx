import { BadgeCheck, Check, CreditCard, Sparkles } from 'lucide-react';
import { redirect, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { getPlans, getSuggestedPlanId } from '~/db/plans';
import { getOrganizationForUser } from '~/db/organizations';
import { getUserFromRequest } from '~/utils/session.server';

import { planFeatureLabels } from '~/config/planFeatures';

const formatAmount = (amount: number) =>
  amount > 0
    ? `${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(amount)} / month`
    : null;

const formatTokenLimit = (limit: number) =>
  limit > 0 ? new Intl.NumberFormat().format(limit) : 'Unlimited';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const [plans, suggestedPlanId, organization] = await Promise.all([
    getPlans(),
    getSuggestedPlanId(),
    getOrganizationForUser(user.id),
  ]);
  return {
    plans,
    suggestedPlanId,
    currentPlanId: organization?.planId ?? 'free',
  };
};

export default function BillingPage() {
  const { plans, suggestedPlanId, currentPlanId } =
    useLoaderData<typeof loader>();

  return (
    <main className='mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8'>
      <header className='flex items-start gap-4'>
        <span className='flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800'>
          <CreditCard size={23} />
        </span>
        <div>
          <h1 className='text-2xl font-bold text-slate-950'>Billing & plans</h1>
          <p className='mt-1 text-sm text-slate-600'>
            Review your current plan and compare available features.
          </p>
        </div>
      </header>

      <section
        className='grid gap-5 lg:grid-cols-4'
        aria-label='Available plans'
      >
        {plans.map((plan) => {
          const current = plan.id === currentPlanId;
          const suggested = plan.id === suggestedPlanId;
          return (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${suggested ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200'}`}
            >
              {suggested && (
                <span className='absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white'>
                  <Sparkles size={13} /> Suggested
                </span>
              )}
              <div className='flex items-center justify-between gap-2'>
                <h2 className='text-lg font-bold text-slate-950'>
                  {plan.name}
                </h2>
                {current && (
                  <span className='rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700'>
                    Current plan
                  </span>
                )}
              </div>
              <p className='mt-2 min-h-10 text-sm text-slate-600'>
                {plan.description}
              </p>
              <p className='mt-5 text-2xl font-semibold text-slate-950'>
                {formatAmount(plan.amount) ?? plan.priceLabel}
              </p>
              <p className='mt-2 text-xs text-slate-500'>
                Monthly LLM allowance: {formatTokenLimit(plan.inputTokenLimit)}{' '}
                input / {formatTokenLimit(plan.outputTokenLimit)} output tokens
              </p>
              <ul className='mt-6 flex-1 space-y-3 border-t border-slate-100 pt-5'>
                {Object.entries(planFeatureLabels).map(([key, label]) => {
                  const enabled = plan.features[key] === true;
                  return (
                    <li
                      key={key}
                      className={`flex items-start gap-2 text-sm ${enabled ? 'text-slate-700' : 'text-slate-400'}`}
                    >
                      <Check
                        size={16}
                        className={
                          enabled
                            ? 'mt-0.5 text-emerald-700'
                            : 'mt-0.5 text-slate-300'
                        }
                      />
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ul>
              {current && (
                <p className='mt-6 flex items-center gap-2 text-sm font-medium text-emerald-800'>
                  <BadgeCheck size={17} /> Active for your organization
                </p>
              )}
            </article>
          );
        })}
      </section>
      <p className='text-xs text-slate-500'>
        Plan changes are managed by your account administrator.
      </p>
    </main>
  );
}
