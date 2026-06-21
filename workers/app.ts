import { createRequestHandler, RouterContextProvider } from 'react-router';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { userDataContext } from '~/contexts.server/userDataContext.server';
import { getUserFromRequest } from '~/utils/session.server';
import { runEmailIngestion } from '~/services/email-ingestion.server';

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
  async scheduled(_controller, env) {
    try {
      await runEmailIngestion(env);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'email_ingestion_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
      throw error;
    }
  },
} satisfies ExportedHandler<Env>;
