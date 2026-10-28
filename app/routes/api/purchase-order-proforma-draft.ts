import { data } from 'react-router';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { logUpdatedActivity } from '~/db/activityLogs';
import { getEmailSourceForPurchaseOrder } from '~/db/emailIngestion';
import { getOrganizationForUser } from '~/db/organizations';
import {
  getPurchaseOrder,
  updatePurchaseOrderProformaDraft,
  updatePurchaseOrderProformaDraftText,
} from '~/db/purchaseOrders';
import { getRfqPdfTemplate } from '~/db/rfqPdfTemplates';
import { createConnectedEmailClient } from '~/services/email-schedule.server';
import { generateDocumentEmailDraft } from '~/services/document-email-draft.server';
import { generateProformaInvoicePdf } from '~/utils/rfqPdf.server';
import { getOpenAICompatibleAiConfig } from '~/utils/organization-ai.server';
import { getUserFromRequest } from '~/utils/session.server';
import type { Route } from './+types/purchase-order-proforma-draft';

const safeFilename = (value: string) =>
  value.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-|-$/g, '') || 'invoice';

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
  const recipient = source?.fromAddress ?? purchaseOrder.supplierEmail;
  if (source && !recipient) {
    return data(
      { error: 'The original email did not include a reply address.' },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      templateId?: unknown;
      textOnly?: unknown;
    };
    const textOnly = body.textOnly === true || !source;
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
      !('AI_API_URL' in env) ||
      !('AI_API_KEY' in env) ||
      !('AI_MODEL' in env)
    ) {
      return data(
        { error: 'Connected email settings are not configured.' },
        { status: 500 },
      );
    }
    const originalMessage =
      source && !textOnly
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
    const generatedReply = await generateDocumentEmailDraft({
      config: {
        ...getOpenAICompatibleAiConfig(env),
        usage: {
          organizationId: organization.id,
          userId: user.id,
          feature: 'purchase-order-email-draft',
        },
      },
      purpose: originalMessage
        ? 'Reply to the customer about their purchase order and mention that the proforma invoice PDF is attached. Acknowledge receipt without asserting that the order has shipped or been accepted.'
        : 'Draft reply text for the purchase order. Acknowledge receipt without asserting that the order has shipped or been accepted. Do not mention an attachment.',
      context: {
        organizationName: organization.name,
        recipientName: purchaseOrder.supplierName,
        purchaseOrder: {
          reference: purchaseOrder.reference,
          orderDate: purchaseOrder.orderDate,
          expectedDate: purchaseOrder.expectedDate,
          currency: purchaseOrder.currency,
          deliveryTerms: purchaseOrder.deliveryTerms,
          incoterms: purchaseOrder.incoterms,
          notes: purchaseOrder.notes,
          items: purchaseOrder.items.map((item) => ({
            quantity: item.quantity,
            unit: item.unit,
            description: item.description,
            manufacturerPartNumber: item.manufacturerPartNumber,
          })),
        },
        originalEmail: originalMessage
          ? {
              subject: originalMessage.subject,
              fromName: originalMessage.from.name,
              fromAddress: originalMessage.from.address,
              body: originalMessage.text.slice(0, 12000),
            }
          : null,
        attachment: originalMessage ? 'Proforma invoice PDF' : null,
      },
    });
    if (textOnly) {
      const updatedPurchaseOrder = await updatePurchaseOrderProformaDraftText(
        purchaseOrder.id,
        organization.id,
        generatedReply,
        organization.vat,
      );
      if (!updatedPurchaseOrder) {
        return data(
          { error: 'Reply text generated, but PO could not be updated.' },
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
        generatedReply,
        purchaseOrder: updatedPurchaseOrder,
        textOnly: true,
      });
    }

    if (!source || !originalMessage || !('TOKEN_ENCRYPTION_KEY' in env)) {
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
    const pdf = await generateProformaInvoicePdf(
      purchaseOrder,
      template,
      organization,
    );
    const draft = await emailClient.createDraftReply({
      originalMessageId: source.externalId,
      threadId: source.threadId,
      accountEmail: source.accountEmail,
      to: recipient!,
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
      generatedReply,
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
