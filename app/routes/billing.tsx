import { BadgeCheck, Check, CreditCard, Sparkles } from 'lucide-react';
import {
  data,
  Form,
  redirect,
  useActionData,
  useLoaderData,
} from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { getPlan, getPlans, getSuggestedPlanId } from '~/db/plans';
import { getOrganizationForUser } from '~/db/organizations';
import { getUserFromRequest } from '~/utils/session.server';
import {
  createStripeCheckoutSession,
  createStripePortalSession,
} from '~/services/stripe.server';
import { env } from 'cloudflare:workers';

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
    stripeCustomerId: organization?.stripeCustomerId ?? null,
    stripeSubscriptionStatus: organization?.stripeSubscriptionStatus ?? null,
    isOrganizationOwner: organization?.createdBy === user.id,
    checkoutResult: new URL(request.url).searchParams.get('checkout'),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return redirect('/organization');
  }
  if (organization.createdBy !== user.id) {
    return data(
      { error: 'Only the organization owner can manage billing.' },
      { status: 403 },
    );
  }
  const activeSubscription = ['active', 'trialing', 'past_due'].includes(
    organization.stripeSubscriptionStatus ?? '',
  );
  if (!env.STRIPE_SECRET_KEY) {
    return data(
      { error: 'Stripe billing is not configured yet.' },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const baseUrl = (env.BASE_URL || new URL(request.url).origin).replace(
    /\/$/,
    '',
  );
  try {
    if (intent === 'portal') {
      if (!organization.stripeCustomerId) {
        return data(
          { error: 'No Stripe customer is linked to this organization.' },
          { status: 400 },
        );
      }
      const session = await createStripePortalSession(
        env.STRIPE_SECRET_KEY,
        organization.stripeCustomerId,
        `${baseUrl}/billing`,
      );
      if (!session.url) {
        throw new Error('Stripe did not return a billing portal URL');
      }
      return new Response(null, {
        status: 303,
        headers: { Location: session.url },
      });
    }
    if (intent !== 'checkout') {
      return data({ error: 'Unsupported billing action.' }, { status: 400 });
    }
    if (activeSubscription) {
      return data(
        { error: 'Use Manage billing to change your existing subscription.' },
        { status: 409 },
      );
    }

    const plan = await getPlan(String(form.get('planId') ?? ''));
    if (!plan || !plan.isActive || !plan.stripePriceId) {
      return data(
        { error: 'This plan is not available for online checkout.' },
        { status: 400 },
      );
    }
    const session = await createStripeCheckoutSession(env.STRIPE_SECRET_KEY, {
      organizationId: organization.id,
      ownerEmail: user.email,
      priceId: plan.stripePriceId,
      customerId: organization.stripeCustomerId,
      successUrl: `${baseUrl}/billing?checkout=success`,
      cancelUrl: `${baseUrl}/billing?checkout=cancelled`,
    });
    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }
    return new Response(null, {
      status: 303,
      headers: { Location: session.url },
    });
  } catch (error) {
    console.error('Unable to start Stripe billing session', error);
    return data(
      {
        error: 'Unable to start billing. Please try again or contact support.',
      },
      { status: 502 },
    );
  }
};

export default function BillingPage() {
  const {
    plans,
    suggestedPlanId,
    currentPlanId,
    stripeCustomerId,
    stripeSubscriptionStatus,
    isOrganizationOwner,
    checkoutResult,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const hasActiveSubscription = ['active', 'trialing', 'past_due'].includes(
    stripeSubscriptionStatus ?? '',
  );

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

      {checkoutResult === 'success' && (
        <p className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900'>
          Checkout completed. Your plan will update as soon as  our payment processor confirms
          the subscription.
        </p>
      )}
      {checkoutResult === 'cancelled' && (
        <p className='rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700'>
          Checkout was cancelled. No plan changes were made.
        </p>
      )}
      {'error' in (actionData ?? {}) && actionData?.error && (
        <p
          role='alert'
          className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800'
        >
          {actionData.error}
        </p>
      )}
      {isOrganizationOwner && stripeCustomerId && (
        <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3'>
          <p className='text-sm text-slate-600'>
            Subscription status:{' '}
            <span className='font-semibold text-slate-900 capitalize'>
              {stripeSubscriptionStatus ?? 'active'}
            </span>
          </p>
          <Form method='post'>
            <input type='hidden' name='intent' value='portal' />
            <button className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
              Manage billing
            </button>
          </Form>
        </div>
      )}

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
              {isOrganizationOwner &&
                !hasActiveSubscription &&
                !current &&
                (plan.stripePriceId ? (
                  <Form method='post' className='mt-6'>
                    <input type='hidden' name='intent' value='checkout' />
                    <input type='hidden' name='planId' value={plan.id} />
                    <button className='w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800'>
                      Choose {plan.name}
                    </button>
                  </Form>
                ) : plan.amount > 0 ? (
                  <p className='mt-6 text-center text-xs text-slate-500'>
                    Online checkout is not configured for this plan.
                  </p>
                ) : null)}
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
