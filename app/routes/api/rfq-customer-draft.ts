import { data } from 'react-router';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { logUpdatedActivity } from '~/db/activityLogs';
import { getEmailSourceForRfq } from '~/db/emailIngestion';
import { getOrganizationForUser } from '~/db/organizations';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import { getRfq, updateRfqGeneratedReply } from '~/db/rfqs';
import { createEmailClient } from '~/services/email/index.server';
import { generateRfqReplyDraft } from '~/services/rfq-reply-draft.server';
import { organizationAiModels } from '~/types/organization';
import { getProviderApiKey } from '~/utils/organization-ai.server';
import { generateRfqPdf } from '~/utils/rfqPdf.server';
import { getUserFromRequest } from '~/utils/session.server';
import { decryptToken } from '~/utils/tokenEncryption.server';
import type { Route } from './+types/rfq-customer-draft';

const requireSetting = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required email setting: ${name}`);
  }
  return value;
};

const safeFilename = (value: string) =>
  value.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-|-$/g, '') || 'rfq';

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

  const rfq = await getRfq(params.rfqId, organization.id, organization.vat);
  if (!rfq) {
    return data({ error: 'RFQ not found' }, { status: 404 });
  }
  const source = await getEmailSourceForRfq(rfq.id, organization.id);
  if (!source) {
    return data(
      { error: 'This RFQ was not created from a connected email.' },
      { status: 400 },
    );
  }
  if (source.accountProvider !== 'gmail') {
    return data(
      { error: 'Draft replies are only supported for Gmail accounts.' },
      { status: 400 },
    );
  }
  const recipient = source.fromAddress ?? rfq.customerEmail;
  if (!recipient) {
    return data(
      { error: 'The original email did not include a reply address.' },
      { status: 400 },
    );
  }

  try {
    const { env } = context.get(cloudflareContext);
    if (
      !('GOOGLE_CLIENT_ID' in env) ||
      !('GOOGLE_CLIENT_SECRET' in env) ||
      !('TOKEN_ENCRYPTION_KEY' in env) ||
      !('GEMINI_API_KEY' in env) ||
      !('GROQ_API_KEY' in env) ||
      !('OLLAMA_API_KEY' in env)
    ) {
      return data(
        { error: 'Connected email or AI settings are not configured.' },
        { status: 500 },
      );
    }
    const refreshToken = await decryptToken(
      source.encryptedRefreshToken,
      requireSetting('TOKEN_ENCRYPTION_KEY', env.TOKEN_ENCRYPTION_KEY),
    );
    const emailClient = createEmailClient({
      provider: 'gmail',
      clientId: requireSetting('GOOGLE_CLIENT_ID', env.GOOGLE_CLIENT_ID),
      clientSecret: requireSetting(
        'GOOGLE_CLIENT_SECRET',
        env.GOOGLE_CLIENT_SECRET,
      ),
      refreshToken,
    });
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
    const getOriginalMessage = emailClient.getMessage;

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
            const model = organizationAiModels.find(
              (candidate) => candidate.value === organization.preferredModel,
            );
            if (!model) {
              throw new Error('Organization AI model is not supported.');
            }
            const originalMessage = await getOriginalMessage(source.externalId);
            const providerApiKey = getProviderApiKey(model.provider, env);
            return await generateRfqReplyDraft({
              config: {
                provider: model.provider,
                apiKey: requireSetting(
                  providerApiKey.name,
                  providerApiKey.value,
                ),
                model: model.value,
              },
              rfq,
              organizationName: organization.name,
              customerName: rfq.customerName,
              originalEmail: {
                subject: originalMessage.subject,
                fromName: originalMessage.from.name,
                fromAddress: originalMessage.from.address,
                text: originalMessage.text,
              },
            });
          })();

    const template = rfq.templateId
      ? await getRfqPdfTemplate(rfq.templateId, organization.id)
      : null;
    const pdf = await generateRfqPdf(rfq, template, organization);
    const draftInput = {
      originalMessageId: source.externalId,
      threadId: source.threadId,
      accountEmail: source.accountEmail,
      to: recipient,
      subject: source.subject ?? rfq.reference,
      bodyText,
      attachment: {
        filename: `${safeFilename(rfq.reference)}.pdf`,
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
