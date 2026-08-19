import { data } from 'react-router';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { logUpdatedActivity } from '~/db/activityLogs';
import { getEmailSourceForPurchaseOrder } from '~/db/emailIngestion';
import { getOrganizationForUser } from '~/db/organizations';
import {
  getPurchaseOrder,
  updatePurchaseOrderProformaDraft,
} from '~/db/purchaseOrders';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import { createEmailClient } from '~/services/email/index.server';
import { generateProformaInvoicePdf } from '~/utils/rfqPdf.server';
import { getUserFromRequest } from '~/utils/session.server';
import { decryptToken } from '~/utils/tokenEncryption.server';
import type { Route } from './+types/purchase-order-proforma-draft';

const requireSetting = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required email setting: ${name}`);
  }
  return value;
};

const safeFilename = (value: string) =>
  value.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-|-$/g, '') || 'invoice';

const createDraftBody = ({
  organizationName,
  purchaseOrderReference,
  customerName,
}: {
  organizationName: string;
  purchaseOrderReference: string;
  customerName: string;
}) =>
  [
    `Hello ${customerName},`,
    '',
    `Thank you for your purchase order ${purchaseOrderReference}. Please find the proforma invoice attached for your review.`,
    '',
    'Best regards,',
    organizationName,
  ].join('\n');

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

  const purchaseOrder = await getPurchaseOrder(
    params.purchaseOrderId,
    organization.id,
    organization.vat,
  );
  if (!purchaseOrder) {
    return data({ error: 'PO not found' }, { status: 404 });
  }
  if (
    purchaseOrder.status !== 'validated' &&
    purchaseOrder.status !== 'review_email'
  ) {
    return data(
      { error: 'Generate a proforma invoice after the PO is validated.' },
      { status: 400 },
    );
  }

  const source = await getEmailSourceForPurchaseOrder(
    purchaseOrder.id,
    organization.id,
  );
  if (!source) {
    return data(
      { error: 'This PO was not created from a connected email.' },
      { status: 400 },
    );
  }
  if (source.accountProvider !== 'gmail') {
    return data(
      { error: 'Draft replies are only supported for Gmail accounts.' },
      { status: 400 },
    );
  }

  const recipient = source.fromAddress ?? purchaseOrder.supplierEmail;
  if (!recipient) {
    return data(
      { error: 'The original email did not include a reply address.' },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      templateId?: unknown;
    };
    const templateId =
      typeof body.templateId === 'string' && body.templateId
        ? body.templateId
        : purchaseOrder.templateId;
    const template = templateId
      ? await getRfqPdfTemplate(templateId, organization.id)
      : null;
    if (templateId && !template) {
      return data({ error: 'PDF template not found' }, { status: 404 });
    }

    const { env } = context.get(cloudflareContext);
    if (
      !('GOOGLE_CLIENT_ID' in env) ||
      !('GOOGLE_CLIENT_SECRET' in env) ||
      !('TOKEN_ENCRYPTION_KEY' in env)
    ) {
      return data(
        { error: 'Connected email settings are not configured.' },
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

    const pdf = await generateProformaInvoicePdf(
      purchaseOrder,
      template,
      organization,
    );
    const generatedReply = createDraftBody({
      organizationName: organization.name,
      purchaseOrderReference: purchaseOrder.reference,
      customerName: purchaseOrder.supplierName,
    });
    const draft = await emailClient.createDraftReply({
      originalMessageId: source.externalId,
      threadId: source.threadId,
      accountEmail: source.accountEmail,
      to: recipient,
      subject: source.subject ?? purchaseOrder.reference,
      bodyText: generatedReply,
      attachment: {
        filename: `${safeFilename(`PI-${purchaseOrder.reference}`)}.pdf`,
        contentType: 'application/pdf',
        bytes: pdf,
      },
    });
    const updatedPurchaseOrder = await updatePurchaseOrderProformaDraft(
      purchaseOrder.id,
      organization.id,
      draft.id,
      organization.vat,
    );
    if (!updatedPurchaseOrder) {
      return data(
        { error: 'Draft created, but PO status could not be updated.' },
        { status: 500 },
      );
    }
    await logUpdatedActivity(
      {
        organizationId: organization.id,
        actorUserId: user.id,
        sourceType: 'purchase_order',
        sourceId: updatedPurchaseOrder.id,
        sourceReference: updatedPurchaseOrder.reference,
      },
      purchaseOrder as unknown as Record<string, unknown>,
      updatedPurchaseOrder as unknown as Record<string, unknown>,
    );

    return data({
      success: true,
      draft,
      generatedReply,
      purchaseOrder: updatedPurchaseOrder,
    });
  } catch (error) {
    console.error('Unable to create PO proforma invoice draft', error);
    return data(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to create a proforma invoice draft',
      },
      { status: 500 },
    );
  }
};
