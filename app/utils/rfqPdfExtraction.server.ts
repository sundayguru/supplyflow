import { extractText } from 'unpdf';

const MAX_RFQ_PDF_SIZE = 10 * 1024 * 1024;
const MAX_EXTRACTED_TEXT_LENGTH = 30000;

export const extractRfqPdfText = async (file: File, bytes?: ArrayBuffer) => {
  if (file.type !== 'application/pdf') {
    throw new Error('Upload a PDF file');
  }
  if (file.size > MAX_RFQ_PDF_SIZE) {
    throw new Error('PDF must be 10 MB or smaller');
  }

  const buffer = bytes ?? (await file.arrayBuffer());
  const { text } = await extractText(new Uint8Array(buffer), {
    mergePages: true,
  });
  const normalizedText = text.replace(/\s+\n/g, '\n').trim();
  if (!normalizedText) {
    throw new Error('No readable text was found in this PDF');
  }

  return normalizedText.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
};
