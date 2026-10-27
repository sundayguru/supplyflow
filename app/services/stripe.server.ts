const STRIPE_API = 'https://api.stripe.com/v1';

const stripeRequest = async (
  path: string,
  secretKey: string,
  body?: URLSearchParams,
) => {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  });
  const result = (await response.json()) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(result.error?.message ?? 'Stripe request failed');
  }
  return result;
};

export const createStripeCheckoutSession = (
  secretKey: string,
  values: {
    organizationId: string;
    ownerEmail: string;
    priceId: string;
    customerId: string | null;
    successUrl: string;
    cancelUrl: string;
  },
) => {
  const body = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': values.priceId,
    'line_items[0][quantity]': '1',
    client_reference_id: values.organizationId,
    'metadata[organizationId]': values.organizationId,
    'subscription_data[metadata][organizationId]': values.organizationId,
    success_url: values.successUrl,
    cancel_url: values.cancelUrl,
    ...(values.customerId
      ? { customer: values.customerId }
      : { customer_email: values.ownerEmail }),
  });
  return stripeRequest('/checkout/sessions', secretKey, body);
};

export const createStripePortalSession = (
  secretKey: string,
  customerId: string,
  returnUrl: string,
  configurationId?: string,
) =>
  stripeRequest(
    '/billing_portal/sessions',
    secretKey,
    new URLSearchParams({
      customer: customerId,
      return_url: returnUrl,
      ...(configurationId ? { configuration: configurationId } : {}),
    }),
  );

export const retrieveStripeSubscription = async (
  secretKey: string,
  subscriptionId: string,
) => {
  const subscriptionIdPath = encodeURIComponent(subscriptionId);
  const response = await fetch(
    `${STRIPE_API}/subscriptions/${subscriptionIdPath}?expand%5B%5D=items.data.price`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  const result = (await response.json()) as {
    error?: { message?: string };
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
  if (!response.ok) {
    throw new Error(result.error?.message ?? 'Unable to retrieve subscription');
  }
  return result;
};

export const verifyStripeSignature = async (
  payload: string,
  signatureHeader: string | null,
  secret: string,
) => {
  if (!signatureHeader) {
    return false;
  }
  const values = new Map<string, string[]>();
  for (const part of signatureHeader.split(',')) {
    const separator = part.indexOf('=');
    if (separator < 0) {
      continue;
    }
    const key = part.slice(0, separator);
    values.set(key, [...(values.get(key) ?? []), part.slice(separator + 1)]);
  }
  const timestamp = values.get('t')?.[0];
  const signatures = values.get('v1') ?? [];
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) {
    return false;
  }
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const expected = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return signatures.some((signature) => {
    if (signature.length !== expected.length) {
      return false;
    }
    let mismatch = false;
    for (let index = 0; index < expected.length; index += 1) {
      mismatch =
        mismatch || signature.charCodeAt(index) !== expected.charCodeAt(index);
    }
    return !mismatch;
  });
};
