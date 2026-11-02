import type { EmailAttachment, EmailMessage } from '~/services/email/types';

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
