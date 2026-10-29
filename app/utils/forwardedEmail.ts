import type { EmailMessage } from '~/services/email/types';

const FORWARDED_MESSAGE_MARKER =
  /-{2,}\s*(?:forwarded|original)\s+message\s*-{0,}|begin forwarded message\s*:|_{2,}\s*original message\s*_{2,}/i;
const EMAIL_ADDRESS =
  /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+/i;

type ForwardedSender =
  | { isForwarded: true; address: string | null }
  | { isForwarded: false; address: string | null };

const parseForwardedSender = (text: string) => {
  const marker = FORWARDED_MESSAGE_MARKER.exec(text);
  if (!marker) {
    return null;
  }

  const forwardedContent = text.slice(marker.index + marker[0].length);
  const fromHeader = /\bFrom\s*:\s*/i.exec(forwardedContent);
  if (!fromHeader) {
    return null;
  }

  const headerValue = forwardedContent.slice(
    fromHeader.index + fromHeader[0].length,
  );
  const headerEnd = /\s+(?:Date|Sent|To|Subject|Cc)\s*:/i.exec(headerValue);
  const fromValue = headerEnd
    ? headerValue.slice(0, headerEnd.index)
    : headerValue.slice(0, 500);
  return EMAIL_ADDRESS.exec(fromValue)?.[0].toLowerCase() ?? null;
};

export const getAutoResponseAddress = (
  message: Pick<EmailMessage, 'subject' | 'text' | 'from'>,
): ForwardedSender => {
  const forwardedSender = parseForwardedSender(message.text);
  const isForwarded =
    /^\s*(?:fwd?|fw)\s*:/i.test(message.subject) ||
    FORWARDED_MESSAGE_MARKER.test(message.text);

  if (isForwarded) {
    return { isForwarded: true, address: forwardedSender };
  }
  return { isForwarded: false, address: message.from.address.trim() || null };
};
