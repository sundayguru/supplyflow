import { createRequestHandler, RouterContextProvider } from 'react-router';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { userDataContext } from '~/contexts.server/userDataContext.server';
import { getUserFromRequest } from '~/utils/session.server';
import { runEmailIngestion } from '~/services/email-ingestion.server';
import { runPurchaseOrderDraftSentStatusSync } from '~/services/purchase-order-draft-status.server';
import { runRfqDraftSentStatusSync } from '~/services/rfq-draft-status.server';
import { runRfqQuoteReminderSync } from '~/services/rfq-quote-reminder.server';
import { runVendorPurchaseOrderDraftSentStatusSync } from '~/services/vendor-purchase-order-draft-status.server';

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
);

export const executeScheduleMethods = async (env: Env) => {
  const errors: unknown[] = [];
  let summary = {};
  try {
    summary = await runEmailIngestion(env);
  } catch (error) {
    errors.push(error);
    console.error(
      JSON.stringify({
        event: 'email_ingestion_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
  }

  try {
    await runRfqDraftSentStatusSync(env);
  } catch (error) {
    errors.push(error);
    console.error(
      JSON.stringify({
        event: 'rfq_draft_sent_status_sync_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
  }

  try {
    await runPurchaseOrderDraftSentStatusSync(env);
  } catch (error) {
    errors.push(error);
    console.error(
      JSON.stringify({
        event: 'po_draft_sent_status_sync_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
  }

  try {
    await runVendorPurchaseOrderDraftSentStatusSync(env);
  } catch (error) {
    errors.push(error);
    console.error(
      JSON.stringify({
        event: 'vendor_po_draft_sent_status_sync_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
  }

  try {
    await runRfqQuoteReminderSync(env);
  } catch (error) {
    errors.push(error);
    console.error(
      JSON.stringify({
        event: 'rfq_quote_reminder_sync_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
  }

  if (errors.length) {
    throw errors[0];
  }
  return summary;
};

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
    await executeScheduleMethods(env);
  },
} satisfies ExportedHandler<Env>;
