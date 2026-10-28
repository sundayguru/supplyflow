import { data } from 'react-router';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { listActiveConnectedEmailAccounts } from '~/db/connectedEmailAccounts';
import { logUpdatedActivity } from '~/db/activityLogs';
import { getOrganizationForUser } from '~/db/organizations';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import {
  getVendorPurchaseOrder,
  updateVendorPurchaseOrderDraftText,
  updateVendorPurchaseOrderEmailDraft,
} from '~/db/vendorPurchaseOrders';
import { createConnectedEmailClient } from '~/services/email-schedule.server';
import { generateDocumentEmailDraft } from '~/services/document-email-draft.server';
import { generateVendorPurchaseOrderPdf } from '~/utils/rfqPdf.server';
import { getOpenAICompatibleAiConfig } from '~/utils/organization-ai.server';
import { getUserFromRequest } from '~/utils/session.server';
import type { Route } from './+types/vendor-purchase-order-draft';

const safeFilename = (value: string) =>
  value.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-|-$/g, '') || 'vendor-po';

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
  if (!user.planFeatures.llmUsage) {
    return data(
      { error: 'AI drafting is not included in your organization plan.' },
      { status: 403 },
    );
  }

  const vendorPurchaseOrder = await getVendorPurchaseOrder(
    params.vendorPurchaseOrderId,
    organization.id,
  );
  if (!vendorPurchaseOrder) {
    return data({ error: 'Vendor PO not found' }, { status: 404 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    textOnly?: unknown;
  };
  const textOnly = body.textOnly === true;
  if (!textOnly && !vendorPurchaseOrder.vendorEmail) {
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
    .filter(
      (candidate) =>
        candidate.authType === 'app_password' || candidate.provider === 'gmail',
    )
    .sort((left, right) =>
      left.userId === user.id ? -1 : right.userId === user.id ? 1 : 0,
    );
  if (!account && !textOnly) {
    return data(
      {
        error: 'Connect an active email account before drafting vendor emails.',
      },
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
    const generatedReply = await generateDocumentEmailDraft({
      config: {
        ...getOpenAICompatibleAiConfig(env),
        usage: {
          organizationId: organization.id,
          userId: user.id,
          feature: 'vendor-purchase-order-email-draft',
        },
      },
      purpose: textOnly
        ? 'Write concise reply text to accompany this vendor purchase order. Ask the vendor to confirm receipt and advise their expected delivery date. Do not claim that the vendor has accepted the order. Do not mention an attachment.'
        : 'Write an email to the vendor sending the attached purchase order. Ask them to confirm receipt and advise their expected delivery date. Do not claim that the vendor has accepted the order.',
      context: {
        organizationName: organization.name,
        recipientName:
          vendorPurchaseOrder.vendorContactName ??
          vendorPurchaseOrder.vendorName,
        vendorName: vendorPurchaseOrder.vendorName,
        vendorPurchaseOrder: {
          reference: vendorPurchaseOrder.reference,
          vendorReference: vendorPurchaseOrder.vendorReference,
          orderDate: vendorPurchaseOrder.orderDate,
          expectedDate: vendorPurchaseOrder.expectedDate,
          currency: vendorPurchaseOrder.currency,
          shipTo: vendorPurchaseOrder.shipTo,
          notes: vendorPurchaseOrder.notes,
          items: vendorPurchaseOrder.items.map((item) => ({
            quantity: item.quantity,
            unit: item.unit,
            description: item.description,
            manufacturerPartNumber: item.manufacturerPartNumber,
          })),
        },
        attachment: textOnly ? null : 'Vendor purchase order PDF',
      },
    });
    if (textOnly) {
      const updatedVendorPurchaseOrder =
        await updateVendorPurchaseOrderDraftText(
          vendorPurchaseOrder.id,
          organization.id,
          generatedReply,
        );
      if (!updatedVendorPurchaseOrder) {
        return data(
          {
            error: 'Reply text generated, but vendor PO could not be updated.',
          },
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
        generatedReply,
        vendorPurchaseOrder: updatedVendorPurchaseOrder,
        textOnly: true,
      });
    }

    if (!account || !('TOKEN_ENCRYPTION_KEY' in env)) {
      return data(
        { error: 'Connected email settings are not configured.' },
        { status: 500 },
      );
    }
    const emailClient = await createConnectedEmailClient(account, env as Env);
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
    const draft = await emailClient.createDraftEmail({
      accountEmail: account.email,
      to: vendorPurchaseOrder.vendorEmail!,
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
        generatedReply,
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
