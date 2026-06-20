import { createRequestHandler, RouterContextProvider } from 'react-router';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { userDataContext } from '~/contexts.server/userDataContext.server';
import { getUserFromRequest } from '~/utils/session.server';

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    const context = new RouterContextProvider();

    context.set(cloudflareContext, { env, ctx });

    // Extract user from session cookie
    const user = await getUserFromRequest(request);
    context.set(userDataContext, user ?? userDataContext.defaultValue!);

    return requestHandler(request, context);
  },
} satisfies ExportedHandler<Env>;
