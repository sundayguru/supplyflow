import { env } from 'cloudflare:workers';
import type { Route } from './+types/stripe-webhook';
import {
  clearOrganizationStripeSubscription,
  getOrganizationById,
  getOrganizationForStripeCustomer,
  getOrganizationForStripeSubscription,
  updateOrganizationStripeSubscription,
} from '~/db/organizations';
import { getPlan, getPlanByStripePriceId } from '~/db/plans';
import {
  retrieveStripeSubscription,
  verifyStripeSignature,
} from '~/services/stripe.server';

type StripeSubscriptionEvent = {
  id?: string;
  customer?: string;
  status?: string;
  cancel_at_period_end?: boolean;
  cancel_at?: number | null;
  canceled_at?: number | null;
  ended_at?: number | null;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items?: {
    data?: Array<{
      price?: { id?: string };
      current_period_end?: number;
    }>;
  };
};

const resolveOrganization = async (subscription: StripeSubscriptionEvent) => {
  const organizationId = subscription.metadata?.organizationId;
  if (organizationId) {
    const organization = await getOrganizationById(organizationId);
    if (organization) {
      return organization;
    }
  }
  if (subscription.id) {
    const organization = await getOrganizationForStripeSubscription(
      subscription.id,
    );
    if (organization) {
      return organization;
    }
  }
  return subscription.customer
    ? getOrganizationForStripeCustomer(subscription.customer)
    : null;
};

const syncSubscription = async (subscription: StripeSubscriptionEvent) => {
  if (!subscription.id || !subscription.customer || !subscription.status) {
    return;
  }
  const organization = await resolveOrganization(subscription);
  if (!organization) {
    return;
  }

  const eligibleStatuses = ['active', 'trialing', 'past_due'];
  if (
    organization.stripeSubscriptionId &&
    organization.stripeSubscriptionId !== subscription.id &&
    eligibleStatuses.includes(organization.stripeSubscriptionStatus ?? '')
  ) {
    return;
  }
  if (!eligibleStatuses.includes(subscription.status)) {
    const freePlan = await getPlan('free');
    if (!freePlan) {
      throw new Error('Default free plan is missing');
    }
    const effectiveAt =
      subscription.ended_at ??
      subscription.canceled_at ??
      subscription.cancel_at ??
      subscription.current_period_end ??
      subscription.items?.data?.[0]?.current_period_end ??
      null;
    await clearOrganizationStripeSubscription({
      organizationId: organization.id,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      stripeCancelAtPeriodEnd: false,
      stripeCancelEffectiveAt: effectiveAt,
      freePlanId: freePlan.id,
    });
    return;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id;
  if (!priceId) {
    return;
  }
  const plan = await getPlanByStripePriceId(priceId);
  if (!plan) {
    return;
  }

  // Stripe may emit subscription.updated before an upgrade invoice is paid.
  // Keep the existing entitlements until Stripe reports the subscription as
  // active; invoice.paid will retrieve and synchronize it after payment.
  if (subscription.status === 'past_due') {
    return;
  }

  await updateOrganizationStripeSubscription({
    organizationId: organization.id,
    planId: plan.id,
    stripeCustomerId: subscription.customer,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: subscription.status,
    stripeCancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    stripeCancelEffectiveAt:
      subscription.cancel_at_period_end === true
        ? (subscription.cancel_at ??
          subscription.current_period_end ??
          subscription.items?.data?.[0]?.current_period_end ??
          null)
        : null,
  });
};

export const action = async ({ request }: Route.ActionArgs) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Stripe webhook is not configured', { status: 503 });
  }
  const payload = await request.text();
  const validSignature = await verifyStripeSignature(
    payload,
    request.headers.get('stripe-signature'),
    env.STRIPE_WEBHOOK_SECRET,
  );
  if (!validSignature) {
    return new Response('Invalid signature', { status: 400 });
  }

  let event: {
    type?: string;
    data?: {
      object?: StripeSubscriptionEvent & {
        subscription?: string | { id?: string } | null;
      };
    };
  };
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return new Response('Invalid event payload', { status: 400 });
  }

  try {
    const subscriptionEvents = new Set([
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ]);
    if (event.type && subscriptionEvents.has(event.type)) {
      const subscription = event.data?.object;
      if (subscription) {
        await syncSubscription(subscription);
      }
    } else if (event.type === 'checkout.session.completed') {
      const subscriptionValue = event.data?.object?.subscription;
      const subscriptionId =
        typeof subscriptionValue === 'string'
          ? subscriptionValue
          : (subscriptionValue?.id ?? null);
      if (subscriptionId && env.STRIPE_SECRET_KEY) {
        const subscription = await retrieveStripeSubscription(
          env.STRIPE_SECRET_KEY,
          subscriptionId,
        );
        await syncSubscription(subscription);
      }
    } else if (event.type === 'invoice.paid') {
      const subscriptionValue = event.data?.object?.subscription;
      const subscriptionId =
        typeof subscriptionValue === 'string'
          ? subscriptionValue
          : (subscriptionValue?.id ?? null);
      if (subscriptionId && env.STRIPE_SECRET_KEY) {
        const subscription = await retrieveStripeSubscription(
          env.STRIPE_SECRET_KEY,
          subscriptionId,
        );
        await syncSubscription(subscription);
      }
    }
  } catch (error) {
    console.error('Unable to process Stripe webhook', error);
    return new Response('Unable to process event', { status: 500 });
  }
  return new Response('ok', { status: 200 });
};
