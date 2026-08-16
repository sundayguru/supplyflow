import { createRequestHandler, RouterContextProvider } from 'react-router';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { userDataContext } from '~/contexts.server/userDataContext.server';
import { getUserFromRequest } from '~/utils/session.server';
import { runEmailIngestion } from '~/services/email-ingestion.server';
import {
  classifyScheduledMailboxes,
  loadScheduledMailboxes,
} from '~/services/email-schedule.server';
import { runPurchaseOrderDraftSentStatusSync } from '~/services/purchase-order-draft-status.server';
import { runRfqDraftSentStatusSync } from '~/services/rfq-draft-status.server';
import { runRfqQuoteReminderSync } from '~/services/rfq-quote-reminder.server';
import { runVendorPurchaseOrderAcknowledgementSync } from '~/services/vendor-purchase-order-acknowledgement-ingestion.server';
import { runVendorPurchaseOrderDraftSentStatusSync } from '~/services/vendor-purchase-order-draft-status.server';

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
);

export const executeScheduleMethods = async (env: Env) => {
  const errors: unknown[] = [];
  let summary = {};
  let mailboxes: Awaited<ReturnType<typeof loadScheduledMailboxes>> = [];

  try {
    mailboxes = await loadScheduledMailboxes(env);
  } catch (error) {
    errors.push(error);
    console.error(
      JSON.stringify({
        event: 'scheduled_mailbox_load_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
  }

  try {
    mailboxes = await classifyScheduledMailboxes(env, mailboxes);
  } catch (error) {
    errors.push(error);
    console.error(
      JSON.stringify({
        event: 'email_classification_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
  }

  try {
    summary = await runEmailIngestion(mailboxes);
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
    await runRfqDraftSentStatusSync(mailboxes);
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
    await runPurchaseOrderDraftSentStatusSync(mailboxes);
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
    await runVendorPurchaseOrderDraftSentStatusSync(mailboxes);
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
    await runVendorPurchaseOrderAcknowledgementSync(mailboxes);
  } catch (error) {
    errors.push(error);
    console.error(
      JSON.stringify({
        event: 'vendor_po_acknowledgement_sync_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
  }

  try {
    await runRfqQuoteReminderSync(mailboxes);
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
