import { data } from 'react-router';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { getEmailSourceForRfq } from '~/db/emailIngestion';
import { getOrganizationForUser } from '~/db/organizations';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import { getRfq } from '~/db/rfqs';
import { createEmailClient } from '~/services/email/index.server';
import { generateRfqReplyDraft } from '~/services/rfq-reply-draft.server';
import { organizationAiModels } from '~/types/organization';
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
      !('GROQ_API_KEY' in env)
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
      provider: source.accountProvider,
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

    const model = organizationAiModels.find(
      (candidate) => candidate.value === organization.preferredModel,
    );
    if (!model) {
      return data(
        { error: 'Organization AI model is not supported.' },
        { status: 400 },
      );
    }
    const originalMessage = await emailClient.getMessage(source.externalId);
    const bodyText = await generateRfqReplyDraft({
      config: {
        provider: model.provider,
        apiKey: requireSetting(
          model.provider === 'gemini' ? 'GEMINI_API_KEY' : 'GROQ_API_KEY',
          model.provider === 'gemini' ? env.GEMINI_API_KEY : env.GROQ_API_KEY,
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

    const template = rfq.templateId
      ? await getRfqPdfTemplate(rfq.templateId, organization.id)
      : null;
    const pdf = await generateRfqPdf(rfq, template, organization);
    const draft = await emailClient.createDraftReply({
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
    });

    return data({ success: true, draft });
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
