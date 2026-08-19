import { data } from 'react-router';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { listActiveConnectedEmailAccounts } from '~/db/connectedEmailAccounts';
import { logUpdatedActivity } from '~/db/activityLogs';
import { getOrganizationForUser } from '~/db/organizations';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import {
  getVendorPurchaseOrder,
  updateVendorPurchaseOrderEmailDraft,
} from '~/db/vendorPurchaseOrders';
import { createEmailClient } from '~/services/email/index.server';
import { generateVendorPurchaseOrderPdf } from '~/utils/rfqPdf.server';
import { getUserFromRequest } from '~/utils/session.server';
import { decryptToken } from '~/utils/tokenEncryption.server';
import type { Route } from './+types/vendor-purchase-order-draft';

const requireSetting = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required email setting: ${name}`);
  }
  return value;
};

const safeFilename = (value: string) =>
  value.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-|-$/g, '') || 'vendor-po';

const createDraftBody = ({
  organizationName,
  vendorName,
  vendorPurchaseOrderReference,
}: {
  organizationName: string;
  vendorName: string;
  vendorPurchaseOrderReference: string;
}) =>
  [
    `Hello ${vendorName},`,
    '',
    `Please find our purchase order ${vendorPurchaseOrderReference} attached for your review.`,
    '',
    'Kindly confirm receipt and advise the expected delivery date.',
    '',
    'Best regards,',
    organizationName,
  ].join('\n');

export const action = async ({
  params,
  context,
  request,
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

  const vendorPurchaseOrder = await getVendorPurchaseOrder(
    params.vendorPurchaseOrderId,
    organization.id,
  );
  if (!vendorPurchaseOrder) {
    return data({ error: 'Vendor PO not found' }, { status: 404 });
  }
  if (!vendorPurchaseOrder.vendorEmail) {
    return data(
      { error: 'Add a vendor email before drafting the PO email.' },
      { status: 400 },
    );
  }

  const template = vendorPurchaseOrder.templateId
    ? await getRfqPdfTemplate(vendorPurchaseOrder.templateId, organization.id)
    : null;
  if (vendorPurchaseOrder.templateId && !template) {
    return data({ error: 'PDF template not found' }, { status: 404 });
  }

  const [account] = (await listActiveConnectedEmailAccounts(organization.id))
    .filter((candidate) => candidate.provider === 'gmail')
    .sort((left, right) =>
      left.userId === user.id ? -1 : right.userId === user.id ? 1 : 0,
    );
  if (!account) {
    return data(
      {
        error: 'Connect an active Gmail account before drafting vendor emails.',
      },
      { status: 400 },
    );
  }

  try {
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
      account.encryptedRefreshToken,
      requireSetting('TOKEN_ENCRYPTION_KEY', env.TOKEN_ENCRYPTION_KEY),
    );
    const emailClient = createEmailClient({
      provider: account.provider,
      clientId: requireSetting('GOOGLE_CLIENT_ID', env.GOOGLE_CLIENT_ID),
      clientSecret: requireSetting(
        'GOOGLE_CLIENT_SECRET',
        env.GOOGLE_CLIENT_SECRET,
      ),
      refreshToken,
    });
    if (!emailClient.createDraftEmail) {
      return data(
        { error: 'This email provider cannot create draft emails yet.' },
        { status: 400 },
      );
    }

    const pdf = await generateVendorPurchaseOrderPdf(
      vendorPurchaseOrder,
      template,
      organization,
    );
    const generatedReply = createDraftBody({
      organizationName: organization.name,
      vendorName:
        vendorPurchaseOrder.vendorContactName ?? vendorPurchaseOrder.vendorName,
      vendorPurchaseOrderReference: vendorPurchaseOrder.reference,
    });
    const draft = await emailClient.createDraftEmail({
      accountEmail: account.email,
      to: vendorPurchaseOrder.vendorEmail,
      subject: `Purchase order ${vendorPurchaseOrder.reference}`,
      bodyText: generatedReply,
      attachment: {
        filename: `${safeFilename(vendorPurchaseOrder.reference)}.pdf`,
        contentType: 'application/pdf',
        bytes: pdf,
      },
    });
    const updatedVendorPurchaseOrder =
      await updateVendorPurchaseOrderEmailDraft(
        vendorPurchaseOrder.id,
        organization.id,
        draft.id,
        account.id,
        draft.threadId ?? null,
      );
    if (!updatedVendorPurchaseOrder) {
      return data(
        { error: 'Draft created, but vendor PO status could not be updated.' },
        { status: 500 },
      );
    }
    await logUpdatedActivity(
      {
        organizationId: organization.id,
        actorUserId: user.id,
        sourceType: 'vendor_purchase_order',
        sourceId: updatedVendorPurchaseOrder.id,
        sourceReference: updatedVendorPurchaseOrder.reference,
      },
      vendorPurchaseOrder as unknown as Record<string, unknown>,
      updatedVendorPurchaseOrder as unknown as Record<string, unknown>,
    );

    return data({
      success: true,
      draft,
      generatedReply,
      vendorPurchaseOrder: updatedVendorPurchaseOrder,
    });
  } catch (error) {
    console.error('Unable to create vendor PO email draft', error);
    return data(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to create a vendor PO email draft',
      },
      { status: 500 },
    );
  }
};
