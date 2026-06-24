import {
  PDFDocument,
  PDFImage,
  PDFPage,
  PDFFont,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import type { SelectOrganization, SelectRfqPdfTemplate } from '~/db/schemas';
import type { RfqItemInput, RfqRecord } from '~/types/rfq';
import { richTextToPlainText } from './richText';
import { createMockRfqForTemplate } from './rfqPdfMock';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const SIDE_MARGIN = 42;
const HEADER_HEIGHT = 58;
const FOOTER_HEIGHT = 36;

const safePdfText = (value: string) =>
  value
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E\n]/g, '?');

const formatMoney = (value: number, currency: string) =>
  `${currency} ${(value / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const wrapText = (
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
) => {
  const lines: string[] = [];
  for (const paragraph of safePdfText(text).split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, fontSize) <= maxWidth || !line) {
        line = next;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) {
      lines.push(line);
    }
  }
  return lines;
};

export type RfqPdfBannerAsset = {
  bytes: ArrayBuffer;
  contentType: 'image/png' | 'image/jpeg';
};

type RfqPdfTemplateContent = Pick<
  SelectRfqPdfTemplate,
  'termsHtml' | 'headerBannerKey' | 'footerBannerKey'
>;

type RfqPdfData = Omit<
  Pick<
    RfqRecord,
    | 'reference'
    | 'dueDate'
    | 'customerName'
    | 'customerEmail'
    | 'items'
    | 'currency'
    | 'subtotal'
    | 'markupValue'
    | 'vatValue'
    | 'totalValue'
    | 'applyVat'
  >,
  'items'
> & {
  items: RfqItemInput[];
};

const loadBanner = async (
  document: PDFDocument,
  asset: RfqPdfBannerAsset | null,
): Promise<PDFImage | null> => {
  if (!asset) {
    return null;
  }
  if (asset.contentType === 'image/png') {
    return await document.embedPng(asset.bytes);
  }
  if (asset.contentType === 'image/jpeg') {
    return await document.embedJpg(asset.bytes);
  }
  return null;
};

const drawFullWidthBanner = (
  page: PDFPage,
  banner: PDFImage,
  y: number,
  height: number,
) => {
  page.drawImage(banner, {
    x: 0,
    y,
    width: PAGE_WIDTH,
    height,
  });
};

export const generateRfqPdf = async (
  rfq: RfqPdfData,
  template: RfqPdfTemplateContent | null,
  organization: SelectOrganization,
  banners: {
    header: RfqPdfBannerAsset | null;
    footer: RfqPdfBannerAsset | null;
  } = { header: null, footer: null },
) => {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const [headerBanner, footerBanner] = await Promise.all([
    loadBanner(document, banners.header),
    loadBanner(document, banners.footer),
  ]);

  const addPage = () => {
    const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    if (headerBanner) {
      drawFullWidthBanner(
        page,
        headerBanner,
        PAGE_HEIGHT - HEADER_HEIGHT,
        HEADER_HEIGHT,
      );
    } else {
      page.drawText(safePdfText(organization.name), {
        x: SIDE_MARGIN,
        y: PAGE_HEIGHT - 48,
        font: bold,
        size: 18,
        color: rgb(0.06, 0.36, 0.27),
      });
    }
    if (footerBanner) {
      drawFullWidthBanner(page, footerBanner, 0, FOOTER_HEIGHT);
    } else {
      page.drawText('SupplyFlow quotation sample', {
        x: SIDE_MARGIN,
        y: 24,
        font: regular,
        size: 8,
        color: rgb(0.45, 0.48, 0.52),
      });
    }
    return page;
  };

  let page = addPage();
  let y = PAGE_HEIGHT - (headerBanner ? 112 : 80);
  page.drawText('REQUEST FOR QUOTATION', {
    x: SIDE_MARGIN,
    y,
    font: bold,
    size: 22,
    color: rgb(0.08, 0.11, 0.15),
  });
  y -= 30;
  page.drawText(`Reference: ${rfq.reference}`, {
    x: SIDE_MARGIN,
    y,
    font: bold,
    size: 10,
  });
  page.drawText(`Due: ${rfq.dueDate ?? 'Not specified'}`, {
    x: 410,
    y,
    font: regular,
    size: 10,
  });
  y -= 28;
  page.drawText(`Customer: ${safePdfText(rfq.customerName)}`, {
    x: SIDE_MARGIN,
    y,
    font: regular,
    size: 10,
  });
  y -= 16;
  page.drawText(`Email: ${rfq.customerEmail ?? 'Not provided'}`, {
    x: SIDE_MARGIN,
    y,
    font: regular,
    size: 10,
  });
  y -= 34;

  const columns = [SIDE_MARGIN, 65, 300, 350, 430, 510];
  const drawTableHeader = () => {
    page.drawRectangle({
      x: SIDE_MARGIN,
      y: y - 6,
      width: PAGE_WIDTH - SIDE_MARGIN * 2,
      height: 24,
      color: rgb(0.91, 0.96, 0.94),
    });
    ['#', 'Description', 'Qty', 'Unit price', 'Markup', 'Line total'].forEach(
      (label, index) =>
        page.drawText(label, {
          x: columns[index],
          y,
          font: bold,
          size: 8,
          color: rgb(0.1, 0.28, 0.22),
        }),
    );
    y -= 30;
  };
  drawTableHeader();
  rfq.items.forEach((item, index) => {
    if (y < 100) {
      page = addPage();
      y = PAGE_HEIGHT - (headerBanner ? 112 : 80);
      drawTableHeader();
    }
    const lineBase = Math.round(item.price * item.quantity);
    const lineMarkup = Math.round((lineBase * item.priceMarkup) / 100);
    const values = [
      String(index + 1),
      safePdfText(item.description).slice(0, 43),
      String(item.quantity),
      formatMoney(item.price, rfq.currency),
      `${item.priceMarkup}%`,
      formatMoney(lineBase + lineMarkup, rfq.currency),
    ];
    values.forEach((value, columnIndex) =>
      page.drawText(value, {
        x: columns[columnIndex],
        y,
        font: regular,
        size: columnIndex === 1 ? 7.5 : 8,
      }),
    );
    page.drawLine({
      start: { x: SIDE_MARGIN, y: y - 7 },
      end: { x: PAGE_WIDTH - SIDE_MARGIN, y: y - 7 },
      thickness: 0.5,
      color: rgb(0.86, 0.88, 0.9),
    });
    y -= 27;
  });

  y -= 15;
  const summary = [
    ['Items subtotal', formatMoney(rfq.subtotal, rfq.currency)],
    ['Markup', formatMoney(rfq.markupValue, rfq.currency)],
    ...(rfq.applyVat
      ? [
          [
            `VAT (${organization.vat}%)`,
            formatMoney(rfq.vatValue, rfq.currency),
          ],
        ]
      : []),
    ['Total', formatMoney(rfq.totalValue, rfq.currency)],
  ];
  summary.forEach(([label, value], index) => {
    page.drawText(label, {
      x: 350,
      y,
      font: index === summary.length - 1 ? bold : regular,
      size: index === summary.length - 1 ? 11 : 9,
    });
    page.drawText(value, {
      x: 445,
      y,
      font: index === summary.length - 1 ? bold : regular,
      size: index === summary.length - 1 ? 11 : 9,
    });
    y -= 18;
  });

  page = addPage();
  y = PAGE_HEIGHT - (headerBanner ? 112 : 80);
  page.drawText('TERMS AND CONDITIONS', {
    x: SIDE_MARGIN,
    y,
    font: bold,
    size: 18,
    color: rgb(0.08, 0.11, 0.15),
  });
  y -= 28;
  const terms =
    richTextToPlainText(template?.termsHtml ?? '') ||
    'No terms and conditions have been added to this template.';
  for (const line of wrapText(
    terms,
    regular,
    10,
    PAGE_WIDTH - SIDE_MARGIN * 2,
  )) {
    if (y < 75) {
      page = addPage();
      y = PAGE_HEIGHT - (headerBanner ? 112 : 80);
    }
    page.drawText(line, { x: SIDE_MARGIN, y, font: regular, size: 10 });
    y -= 15;
  }

  document.getPages().forEach((pdfPage, index, pages) => {
    pdfPage.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: PAGE_WIDTH - 92,
      y: 24,
      font: regular,
      size: 8,
      color: rgb(0.45, 0.48, 0.52),
    });
  });

  return document.save();
};

export const generateRfqTemplateSamplePdf = (
  template: SelectRfqPdfTemplate,
  organization: SelectOrganization,
  banners: {
    header: RfqPdfBannerAsset | null;
    footer: RfqPdfBannerAsset | null;
  } = { header: null, footer: null },
) =>
  generateRfqPdf(
    createMockRfqForTemplate(organization),
    template,
    organization,
    banners,
  );
