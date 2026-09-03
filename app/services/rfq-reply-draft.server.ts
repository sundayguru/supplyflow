import type { OrganizationAiProvider } from '~/types/organization';
import type { RfqRecord } from '~/types/rfq';
import { GeminiService } from '~/utils/gemini.server';
import { GroqService, type LlmGenerationResponse } from '~/utils/groq.server';
import { parseLlmJson } from '~/utils/llmJson';
import { OllamaService } from '~/utils/ollama.server';
import type { LlmUsageContext } from '~/utils/llmUsage.server';

type RfqReplyDraftConfig = {
  provider: OrganizationAiProvider;
  apiKey: string;
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
  };
};

type ReplyDraftEnvelope = {
  bodyText?: unknown;
};

const RFQ_REPLY_SYSTEM_PROMPT = `You draft concise, professional RFQ email replies for a supplier.
Return only JSON with this shape:
{
  "bodyText": "plain text email body"
}

Rules:
- Write only the email body, not the subject.
- Address the customer by name.
- Say the quotation PDF is attached.
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
Subject: ${originalEmail.subject}
From: ${originalEmail.fromName ?? originalEmail.fromAddress} <${originalEmail.fromAddress}>
Body:
${originalEmail.text.slice(0, 12000)}`;

const generate = async (
  config: RfqReplyDraftConfig,
  userPrompt: string,
): Promise<LlmGenerationResponse> => {
  const request = {
    apiKey: config.apiKey,
    model: config.model,
    systemPrompt: RFQ_REPLY_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.3,
    maxTokens: 1200,
    usage: config.usage,
  };
  switch (config.provider) {
    case 'google':
      return await GeminiService.generate(request);
    case 'ollama':
      return await OllamaService.generate(request);
    case 'groq':
      return await GroqService.generate(request);
  }
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
