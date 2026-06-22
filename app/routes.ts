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
    route('connected-accounts', 'routes/connected-accounts.tsx'),
    route('email-ingestions', 'routes/email-ingestions.tsx'),
    route('settings', 'routes/settings.tsx'),
    route('notifications', 'routes/notifications.tsx'),
    route('auth/logout', 'routes/auth/logout.tsx'),
    route('api/user', 'routes/api/user.ts'),
    route('api/user/avatar', 'routes/api/user.avatar.tsx'),
    route('api/rfqs', 'routes/api/rfqs.ts'),
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
