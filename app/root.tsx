import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from 'react-router';

import type { Route } from './+types/root';
import './app.css';
import { CurrentUserProvider } from './providers/CurrentUserProvider';
import { userDataContext } from './contexts.server/userDataContext.server';
import { cloudflareContext } from './contexts.server/cloudflareContext.server';
import { ToastProvider } from './components/ToastViewport';
import { useEffect } from 'react';
import * as analytics from './utils/analytics';

type AnalyticsEnv = {
  GA_TRACKING_ID?: string;
};

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap',
  },
];

export const meta = () => {
  return [
    { title: 'Suploop' },
    { name: 'description', content: `Supply chain automation` },
  ];
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};

export default function App({ loaderData }: Route.ComponentProps) {
  const location = useLocation();

  useEffect(() => {
    if (loaderData.gaId) {
      analytics.pageview(location.pathname + location.search);
    }
  }, [location, loaderData.gaId]);

  return (
    <ToastProvider>
      <CurrentUserProvider user={loaderData.user}>
        {loaderData.gaId && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${loaderData.gaId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${loaderData.gaId}', {
                  page_path: window.location.pathname,
                });
                window.GA_TRACKING_ID = '${loaderData.gaId}';
              `,
              }}
            />
          </>
        )}
        <Outlet />
      </CurrentUserProvider>
    </ToastProvider>
  );
}

export const loader = ({ context }: Route.LoaderArgs) => {
  const cf = context.get(cloudflareContext);
  const env = cf.env as AnalyticsEnv;
  return {
    user: context.get(userDataContext),
    gaId: env.GA_TRACKING_ID || 'G-XXXXXXXXXX', // Fallback to placeholder
  };
};

export const ErrorBoundary = ({ error }: Route.ErrorBoundaryProps) => {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    console.error(error.stack);
  }

  return (
    <main className='flex min-h-screen items-center justify-center'>
      <div
        className={`mx-4 w-full max-w-lg rounded-lg bg-white/80 p-8 text-center shadow-lg`}
      >
        <h1 className='mb-4 text-6xl font-bold text-gray-800'>{message}</h1>
        <p className='mb-8 text-xl text-gray-600'>{details}</p>
        <Link
          to='/'
          className={`bg-primary hover:bg-primary/80 inline-block rounded-lg px-6 py-3 text-white transition-colors`}
        >
          Return Home
        </Link>
      </div>
    </main>
  );
};
