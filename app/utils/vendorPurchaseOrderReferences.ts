import type { EmailMessage } from '~/services/email/types';

const VPO_REFERENCE_PATTERN = /VPO-\d{4}-[A-Z0-9]{6}/gi;

export const normalizeVendorPurchaseOrderReference = (reference: string) =>
  reference.trim().toUpperCase();

export const extractVendorPurchaseOrderReferences = (message: EmailMessage) => {
  const haystack = `${message.subject}\n${message.text}`;
  const references = new Set<string>();
  for (const match of haystack.matchAll(VPO_REFERENCE_PATTERN)) {
    references.add(normalizeVendorPurchaseOrderReference(match[0]));
  }
  return [...references];
};
