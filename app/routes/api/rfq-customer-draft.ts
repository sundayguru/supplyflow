import { data } from 'react-router';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { logUpdatedActivity } from '~/db/activityLogs';
import { getEmailSourceForRfq } from '~/db/emailIngestion';
import { getOrganizationForUser } from '~/db/organizations';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import { getRfq, updateRfqGeneratedReply } from '~/db/rfqs';
import { createConnectedEmailClient } from '~/services/email-schedule.server';
import { generateRfqReplyDraft } from '~/services/rfq-reply-draft.server';
import { getOpenAICompatibleAiConfig } from '~/utils/organization-ai.server';
import { generateRfqPdf } from '~/utils/rfqPdf.server';
import { getRfqPdfFilename } from '~/utils/rfqPdfFilename';
import { getUserFromRequest } from '~/utils/session.server';
import type { Route } from './+types/rfq-customer-draft';

type DraftIntent = 'regenerate' | 'updatePdf';

const parseDraftIntent = async (request: Request): Promise<DraftIntent> => {
  if (!request.body) {
    return 'regenerate';
  }
  const contentType = request.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) {
    const body = (await request.json()) as unknown;
    return typeof body === 'object' &&
      body !== null &&
      'intent' in body &&
      body.intent === 'updatePdf'
      ? 'updatePdf'
      : 'regenerate';
  }
  const formData = await request.formData();
  return formData.get('intent') === 'updatePdf' ? 'updatePdf' : 'regenerate';
};

export const action = async ({
  request,
  params,
  context,
}: Route.ActionArgs) => {
  if (request.method !== 'POST') {
    return data({ error: 'Method not allowed' }, { status: 405 });
  }
  const user = await getUserFromRequest(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return data({ error: 'Organization required' }, { status: 409 });
  }
  if (!user.planFeatures.llmUsage) {
    return data(
      { error: 'AI drafting is not included in your organization plan.' },
      { status: 403 },
    );
  }

  const rfq = await getRfq(params.rfqId, organization.id, organization.vat);
  if (!rfq) {
    return data({ error: 'RFQ not found' }, { status: 404 });
  }
  const source = await getEmailSourceForRfq(rfq.id, organization.id);
  const recipient = source?.fromAddress ?? rfq.customerEmail;
  if (source && !recipient) {
    return data(
      { error: 'The original email did not include a reply address.' },
      { status: 400 },
    );
  }

  try {
    const { env } = context.get(cloudflareContext);
    if (
      !('AI_API_URL' in env) ||
      !('AI_API_KEY' in env) ||
      !('AI_MODEL' in env)
    ) {
      return data(
        { error: 'Connected email or AI settings are not configured.' },
        { status: 500 },
      );
    }
    const intent = await parseDraftIntent(request);
    if (intent === 'updatePdf' && !rfq.generatedReply) {
      return data(
        { error: 'Generate an email draft before updating only the PDF.' },
        { status: 400 },
      );
    }
    const bodyText =
      intent === 'updatePdf' && rfq.generatedReply
        ? rfq.generatedReply
        : await (async () => {
            const originalMessage = source
              ? await (async () => {
                  const emailClient = await createConnectedEmailClient(
                    source,
                    env as Env,
                  );
                  if (!emailClient.getMessage) {
                    throw new Error(
                      'This email provider cannot load the original message.',
                    );
                  }
                  return emailClient.getMessage(source.externalId);
                })()
              : null;
            return await generateRfqReplyDraft({
              config: {
                ...getOpenAICompatibleAiConfig(env),
                usage: {
                  organizationId: organization.id,
                  userId: user.id,
                  feature: 'rfq-reply-draft',
                },
              },
              rfq,
              organizationName: organization.name,
              customerName: rfq.customerName,
              originalEmail: originalMessage
                ? {
                    subject: originalMessage.subject,
                    fromName: originalMessage.from.name,
                    fromAddress: originalMessage.from.address,
                    text: originalMessage.text,
                  }
                : null,
            });
          })();

    if (!source) {
      const updatedRfq = await updateRfqGeneratedReply(
        rfq.id,
        organization.id,
        bodyText,
        null,
        organization.vat,
      );
      if (!updatedRfq) {
        return data(
          { error: 'Reply text generated, but RFQ could not be updated.' },
          { status: 500 },
        );
      }
      await logUpdatedActivity(
        {
          organizationId: organization.id,
          actorUserId: user.id,
          sourceType: 'rfq',
          sourceId: updatedRfq.id,
          sourceReference: updatedRfq.reference,
        },
        rfq as unknown as Record<string, unknown>,
        updatedRfq as unknown as Record<string, unknown>,
      );
      return data({
        success: true,
        generatedReply: bodyText,
        intent,
        textOnly: true,
      });
    }

    if (!('TOKEN_ENCRYPTION_KEY' in env)) {
      return data(
        { error: 'Connected email settings are not configured.' },
        { status: 500 },
      );
    }
    const emailClient = await createConnectedEmailClient(source, env as Env);
    if (!emailClient.createDraftReply) {
      return data(
        { error: 'This email provider cannot create draft replies yet.' },
        { status: 400 },
      );
    }
    if (!emailClient.getMessage) {
      return data(
        { error: 'This email provider cannot load the original message.' },
        { status: 400 },
      );
    }

    const template = rfq.templateId
      ? await getRfqPdfTemplate(rfq.templateId, organization.id)
      : null;
    const pdf = await generateRfqPdf(rfq, template, organization);
    const draftInput = {
      originalMessageId: source.externalId,
      threadId: source.threadId,
      accountEmail: source.accountEmail,
      to: recipient!,
      subject: source.subject ?? rfq.reference,
      bodyText,
      attachment: {
        filename: getRfqPdfFilename(rfq.reference),
        contentType: 'application/pdf',
        bytes: pdf,
      },
    };
    let draft;
    if (rfq.generatedReplyDraftId && emailClient.updateDraftReply) {
      try {
        draft = await emailClient.updateDraftReply({
          ...draftInput,
          draftId: rfq.generatedReplyDraftId,
        });
      } catch (error) {
        console.warn('Unable to update Gmail draft, creating a new one', error);
        draft = await emailClient.createDraftReply(draftInput);
      }
    } else {
      draft = await emailClient.createDraftReply(draftInput);
    }
    const updatedRfq = await updateRfqGeneratedReply(
      rfq.id,
      organization.id,
      bodyText,
      draft.id,
      organization.vat,
    );
    if (!updatedRfq) {
      return data(
        { error: 'Draft created, but RFQ could not be updated.' },
        { status: 500 },
      );
    }
    await logUpdatedActivity(
      {
        organizationId: organization.id,
        actorUserId: user.id,
        sourceType: 'rfq',
        sourceId: updatedRfq.id,
        sourceReference: updatedRfq.reference,
      },
      rfq as unknown as Record<string, unknown>,
      updatedRfq as unknown as Record<string, unknown>,
    );

    return data({ success: true, draft, generatedReply: bodyText, intent });
  } catch (error) {
    console.error('Unable to create RFQ customer draft', error);
    return data(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to create a customer draft',
      },
      { status: 500 },
    );
  }
};
