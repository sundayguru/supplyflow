import type { OrganizationAiProvider } from '~/types/organization';
import type { RfqRecord } from '~/types/rfq';
import {
  OpenAICompatibleService,
  type LlmGenerationResponse,
} from '~/utils/openaiCompatible.server';
import { parseLlmJson } from '~/utils/llmJson';
import type { LlmUsageContext } from '~/utils/llmUsage.server';

type RfqReplyDraftConfig = {
  provider: OrganizationAiProvider;
  apiKey: string;
  apiUrl: string;
  model: string;
  usage?: LlmUsageContext;
};

type GenerateRfqReplyDraftInput = {
  config: RfqReplyDraftConfig;
  rfq: RfqRecord;
  organizationName: string;
  customerName: string;
  originalEmail: {
    subject: string;
    fromName: string | null;
    fromAddress: string;
    text: string;
  } | null;
};

type ReplyDraftEnvelope = {
  bodyText?: unknown;
};

const RFQ_REPLY_SYSTEM_PROMPT = `You draft concise, professional RFQ reply text for a supplier.
Return only JSON with this shape:
{
  "bodyText": "plain text email body"
}

Rules:
- Write only the email body, not the subject.
- Address the customer by name.
- If replying to an email, say the quotation PDF is attached.
- Explicitly ask the customer to mention the RFQ number in their purchase order.
- Use the original email only as context; do not invent promises, availability, lead times, or discounts.
- Keep the tone warm, clear, and businesslike.`;

const buildPrompt = ({
  rfq,
  organizationName,
  customerName,
  originalEmail,
}: Omit<GenerateRfqReplyDraftInput, 'config'>) => `Draft a reply for this RFQ.

Supplier organization:
${organizationName}

Customer name to address:
${customerName}

RFQ:
- Reference: ${rfq.reference}
- Customer: ${rfq.customerName}
- Customer email: ${rfq.customerEmail ?? 'Not provided'}
- Due date: ${rfq.dueDate ?? 'Not specified'}
- Currency: ${rfq.currency}
- Items:
${rfq.items
  .map(
    (item, index) =>
      `${index + 1}. ${item.quantity} ${item.unit} - ${item.description}${
        item.manufacturerPartNumber
          ? ` (part number: ${item.manufacturerPartNumber})`
          : ''
      }`,
  )
  .join('\n')}

Original email context:
${
  originalEmail
    ? `
Subject: ${originalEmail.subject}
From: ${originalEmail.fromName ?? originalEmail.fromAddress} <${originalEmail.fromAddress}>
Body:
${originalEmail.text.slice(0, 12000)}`
    : 'No originating email is available. Draft a standalone reply using the RFQ details.'
}`;

const generate = async (
  config: RfqReplyDraftConfig,
  userPrompt: string,
): Promise<LlmGenerationResponse> => {
  const request = {
    apiKey: config.apiKey,
    apiUrl: config.apiUrl,
    model: config.model,
    systemPrompt: RFQ_REPLY_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.3,
    maxTokens: 1200,
    usage: config.usage,
  };
  return await OpenAICompatibleService.generate(request);
};

export const generateRfqReplyDraft = async ({
  config,
  ...input
}: GenerateRfqReplyDraftInput) => {
  const response = await generate(config, buildPrompt(input));
  const parsed = parseLlmJson(response.text) as ReplyDraftEnvelope;
  if (typeof parsed.bodyText !== 'string' || !parsed.bodyText.trim()) {
    throw new Error('AI reply draft did not include an email body');
  }
  return parsed.bodyText.trim();
};
