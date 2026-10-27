import type { Route } from './+types/ProtectedLayout';
import { useState } from 'react';
import { redirect, Outlet } from 'react-router';
import { getUserFromRequest } from '~/utils/session.server';
import { Header } from './Header';

export const middleware: Route.MiddlewareFunction[] = [
  async ({ request }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      const url = new URL(request.url);
      const callbackUrl = url.pathname + url.search;
      return redirect(
        `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
      );
    }

    const pathname = new URL(request.url).pathname;
    const featureRoutes: Array<[string, string[]]> = [
      ['dashboard', ['/dashboard']],
      ['rfqs', ['/rfqs', '/api/rfqs', '/api/rfq-items']],
      ['purchaseOrders', ['/purchase-orders', '/api/purchase-orders']],
      [
        'vendorPurchaseOrders',
        ['/vendor-purchase-orders', '/api/vendor-purchase-orders'],
      ],
      [
        'vendorPurchaseOrderAcknowledgements',
        [
          '/vendor-purchase-order-acknowledgements',
          '/api/vendor-purchase-order-acknowledgements',
        ],
      ],
      ['activities', ['/activities']],
      ['llmUsage', ['/llm-usage']],
      ['manufacturers', ['/manufacturers']],
      ['addresses', ['/addresses']],
      ['productPricing', ['/product-prices']],
      ['customPdfTemplates', ['/rfq-pdf-templates', '/api/rfq-pdf-templates']],
      ['emailAutomation', ['/connected-accounts', '/api/email-accounts']],
      [
        'emailIngestions',
        ['/email-ingestions', '/api/email-ingestion/trigger'],
      ],
      ['teamManagement', ['/organization/users', '/organization/invitations']],
    ];

    const matchedFeature = featureRoutes.find(([, prefixes]) =>
      prefixes.some(
        (prefix) =>
          pathname === prefix ||
          (prefix !== '/organization' && pathname.startsWith(`${prefix}/`)),
      ),
    )?.[0];
    if (matchedFeature && !user.planFeatures[matchedFeature]) {
      return redirect('/billing');
    }
  },
];

export const loader = () => {
  /* empty */
};

export default function ProtectedLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className='min-h-screen bg-[#f6f8f5]'>
      <Header
        isSidebarCollapsed={isSidebarCollapsed}
        onSidebarCollapseToggle={() =>
          setIsSidebarCollapsed((collapsed) => !collapsed)
        }
      />
      <main
        className={`px-4 py-6 transition-[margin] duration-300 sm:px-6 lg:px-8 lg:py-8 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}
      >
        <Outlet />
      </main>
    </div>
  );
}
