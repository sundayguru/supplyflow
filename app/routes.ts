import {
  type RouteConfig,
  layout,
  route,
  index,
} from '@react-router/dev/routes';

export default [
  // Public auth routes
  layout('./routes/layouts/PublicLayout.ts', [
    index('routes/home.tsx'),
    route('privacy', 'routes/privacy.tsx'),
    route('terms', 'routes/terms.tsx'),
    route('auth/login', 'routes/auth/login.tsx'),
    route('auth/register', 'routes/auth/register.tsx'),
    route('auth/forgot-password', 'routes/auth/forgot-password.tsx'),
    route('auth/reset-password', 'routes/auth/reset-password.tsx'),
  ]),
  // OAuth callback route
  route('api/auth/google', 'routes/api/auth/google.tsx'),

  // Protected routes
  layout('./routes/layouts/ProtectedLayout.tsx', [
    route('dashboard', 'routes/dashboard.tsx'),
    route('rfqs', 'routes/rfqs.tsx'),
    route('purchase-orders', 'routes/purchase-orders.tsx'),
    route('vendor-purchase-orders', 'routes/vendor-purchase-orders.tsx'),
    route(
      'vendor-purchase-order-acknowledgements',
      'routes/vendor-purchase-order-acknowledgements.tsx',
    ),
    route('manufacturers', 'routes/manufacturers.tsx'),
    route('product-prices', 'routes/product-prices.tsx'),
    route('rfq-pdf-templates', 'routes/rfq-pdf-templates.tsx'),
    route('connected-accounts', 'routes/connected-accounts.tsx'),
    route('email-ingestions', 'routes/email-ingestions.tsx'),
    route('settings', 'routes/settings.tsx'),
    route('organization', 'routes/organization.tsx'),
    route('organization/users', 'routes/organization-users.tsx'),
    route(
      'organization/invitations/:token',
      'routes/organization-invitation.tsx',
    ),
    route('notifications', 'routes/notifications.tsx'),
    route('auth/logout', 'routes/auth/logout.tsx'),
    route('api/user', 'routes/api/user.ts'),
    route('api/user/avatar', 'routes/api/user.avatar.tsx'),
    route('api/rfqs', 'routes/api/rfqs.ts'),
    route('api/purchase-orders', 'routes/api/purchase-orders.ts'),
    route('api/purchase-order-items', 'routes/api/purchase-order-items.ts'),
    route(
      'api/purchase-order-payments',
      'routes/api/purchase-order-payments.ts',
    ),
    route('api/vendor-purchase-orders', 'routes/api/vendor-purchase-orders.ts'),
    route(
      'api/vendor-purchase-order-acknowledgements',
      'routes/api/vendor-purchase-order-acknowledgements.ts',
    ),
    route(
      'api/vendor-purchase-orders/:vendorPurchaseOrderId/pdf',
      'routes/api/vendor-purchase-order-pdf.ts',
    ),
    route(
      'api/vendor-purchase-orders/:vendorPurchaseOrderId/draft',
      'routes/api/vendor-purchase-order-draft.ts',
    ),
    route(
      'api/purchase-orders/:purchaseOrderId/proforma-invoice',
      'routes/api/purchase-order-proforma-invoice.ts',
    ),
    route(
      'api/purchase-orders/:purchaseOrderId/proforma-draft',
      'routes/api/purchase-order-proforma-draft.ts',
    ),
    route('api/rfqs/:rfqId/customer-draft', 'routes/api/rfq-customer-draft.ts'),
    route('api/rfqs/:rfqId/source-pdf', 'routes/api/rfq-source-pdf.ts'),
    route('api/rfq-items', 'routes/api/rfq-items.ts'),
    route(
      'api/rfq-pdf-templates/:templateId/banner/:position',
      'routes/api/rfq-pdf-template-banner.ts',
    ),
    route(
      'api/rfq-pdf-templates/:templateId/sample',
      'routes/api/rfq-pdf-template-sample.ts',
    ),
    route(
      'api/email-ingestion/trigger',
      'routes/api/email-ingestion.trigger.ts',
    ),
    route(
      'api/email-accounts/google/start',
      'routes/api/email-accounts.google.start.ts',
    ),
    route(
      'api/email-accounts/google/callback',
      'routes/api/email-accounts.google.callback.ts',
    ),
  ]),
] satisfies RouteConfig;
