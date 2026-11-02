import type { EmailAttachment, EmailMessage } from '~/services/email/types';
import { extractPdfText } from './rfqPdfExtraction.server';

export type EmailPdfContext = {
  message: EmailMessage;
  text: string;
  truncated: boolean;
};

export type EmailPdfContextLoader = (
  attachment: EmailAttachment,
) => Promise<EmailPdfContext>;

export const isPdfAttachment = (attachment: EmailAttachment) =>
  attachment.contentType === 'application/pdf' ||
  attachment.filename.toLowerCase().endsWith('.pdf');

export const buildPdfContextMessage = (
  message: EmailMessage,
  attachment: EmailAttachment,
  text: string,
): EmailMessage => ({
  ...message,
  id: `${message.id}:${attachment.id}`,
  subject: message.subject,
  text: [
    `PDF attachment: ${attachment.filename}`,
    `Email subject: ${message.subject}`,
    `Email body:`,
    message.text,
    '',
    `PDF filename: ${attachment.filename}`,
    `PDF text:`,
    text,
  ].join('\n'),
  attachments: [],
});

export const createEmailPdfContextLoader = (
  message: EmailMessage,
): EmailPdfContextLoader => {
  const contexts = new Map<EmailAttachment, Promise<EmailPdfContext>>();
  return (attachment) => {
    let context = contexts.get(attachment);
    if (!context) {
      context = (async () => {
        const file = new File([attachment.bytes], attachment.filename, {
          type: 'application/pdf',
        });
        const { text, truncated } = await extractPdfText(
          file,
          attachment.bytes,
        );
        return {
          message: buildPdfContextMessage(message, attachment, text),
          text,
          truncated,
        };
      })();
      contexts.set(attachment, context);
    }
    return context;
  };
};
