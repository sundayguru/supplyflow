import { uploadToR2 } from './r2.server';

const sanitizeFilename = (filename: string) =>
  filename
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

export const uploadRfqSourcePdf = async (
  organizationId: string,
  bytes: ArrayBuffer,
  filename: string,
) => {
  const safeFilename = sanitizeFilename(filename) || 'rfq-source.pdf';
  const key = `rfqs/${organizationId}/source-pdfs/${crypto.randomUUID()}-${safeFilename}`;
  const uploaded = await uploadToR2(key, bytes, 'application/pdf');
  if (!uploaded) {
    throw new Error('RFQ source PDF could not be uploaded');
  }
  return uploaded.key;
};
