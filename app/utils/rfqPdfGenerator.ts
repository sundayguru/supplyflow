import {
  PDFDocument,
  PDFImage,
  PDFPage,
  PDFFont,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import type { SelectOrganization, SelectRfqPdfTemplate } from '~/db/schemas';
import type {
  PurchaseOrderItemInput,
  PurchaseOrderRecord,
} from '~/types/purchaseOrder';
import type { RfqItemInput, RfqRecord } from '~/types/rfq';
import type {
  VendorPurchaseOrderItemInput,
  VendorPurchaseOrderRecord,
} from '~/types/vendorPurchaseOrder';
import { calculateRfqItemAmounts } from './rfq';
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
    | 'discountValue'
    | 'shippingValue'
    | 'vatValue'
    | 'totalValue'
    | 'applyVat'
  >,
  'items'
> & {
  items: RfqItemInput[];
};

type ProformaInvoiceData = Omit<
  Pick<
    PurchaseOrderRecord,
    | 'reference'
    | 'status'
    | 'orderDate'
    | 'expectedDate'
    | 'supplierName'
    | 'supplierEmail'
    | 'items'
    | 'currency'
    | 'subtotal'
    | 'vatValue'
    | 'totalValue'
    | 'applyVat'
    | 'incoterms'
    | 'deliveryTerms'
  >,
  'items'
> & {
  items: PurchaseOrderItemInput[];
  linkedRfq: { reference: string } | null;
};

type VendorPurchaseOrderPdfData = Omit<
  Pick<
    VendorPurchaseOrderRecord,
    | 'reference'
    | 'vendorReference'
    | 'shipTo'
    | 'notes'
    | 'orderDate'
    | 'expectedDate'
    | 'vendorName'
    | 'vendorEmail'
    | 'vendorContactName'
    | 'createdAt'
    | 'items'
    | 'currency'
    | 'subtotal'
    | 'totalValue'
    | 'linkedPurchaseOrder'
  >,
  'items'
> & {
  items: VendorPurchaseOrderItemInput[];
  vendorAddress: string | null;
};

type VendorPurchaseOrderPdfSource = Omit<
  VendorPurchaseOrderPdfData,
  'vendorAddress'
>;

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
    }
    if (footerBanner) {
      drawFullWidthBanner(page, footerBanner, 0, FOOTER_HEIGHT);
    } else {
      page.drawText('Suploop quotation sample', {
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

  const columns = [SIDE_MARGIN, 63, 128, 270, 312, 376, 432, 492];
  const drawTableHeader = () => {
    page.drawRectangle({
      x: SIDE_MARGIN,
      y: y - 6,
      width: PAGE_WIDTH - SIDE_MARGIN * 2,
      height: 24,
      color: rgb(0.91, 0.96, 0.94),
    });
    [
      '#',
      'Part no.',
      'Description',
      'Qty',
      'Unit price',
      'Discount',
      'Shipping',
      'Line total',
    ].forEach((label, index) =>
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
    const amounts = calculateRfqItemAmounts(item);
    const unitMarkup = Math.round((item.price * item.priceMarkup) / 100);
    const unitPriceWithMarkup = item.price + unitMarkup;
    const discountLabel =
      amounts.lineDiscount > 0
        ? item.discountType === 'percentage'
          ? `${item.discountValue}%`
          : formatMoney(amounts.lineDiscount, rfq.currency)
        : '-';
    const shippingLabel =
      amounts.lineShipping > 0
        ? formatMoney(amounts.lineShipping, rfq.currency)
        : '-';
    const values = [
      String(index + 1),
      safePdfText(item.manufacturerPartNumber ?? '-').slice(0, 18),
      safePdfText(item.description).slice(0, 22),
      String(item.quantity),
      formatMoney(unitPriceWithMarkup, rfq.currency),
      discountLabel,
      shippingLabel,
      formatMoney(amounts.lineTotal, rfq.currency),
    ];
    values.forEach((value, columnIndex) =>
      page.drawText(value, {
        x: columns[columnIndex],
        y,
        font: regular,
        size: columnIndex === 2 ? 7.5 : 8,
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
    [
      'Items subtotal',
      formatMoney(rfq.subtotal + rfq.markupValue, rfq.currency),
    ],
    ...(rfq.discountValue > 0
      ? [['Discount', `-${formatMoney(rfq.discountValue, rfq.currency)}`]]
      : []),
    ...(rfq.shippingValue > 0
      ? [['Shipping', formatMoney(rfq.shippingValue, rfq.currency)]]
      : []),
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

export const generateProformaInvoicePdf = async (
  purchaseOrder: ProformaInvoiceData,
  template: RfqPdfTemplateContent | null,
  organization: SelectOrganization,
  banners: {
    header: RfqPdfBannerAsset | null;
    footer: RfqPdfBannerAsset | null;
  } = { header: null, footer: null },
  options: { statusReport?: boolean; includeTermsPage?: boolean } = {},
) => {
  const isStatusReport = options.statusReport ?? false;
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
      page.drawText(
        isStatusReport
          ? 'Suploop purchase order status report'
          : 'Suploop proforma invoice',
        {
          x: SIDE_MARGIN,
          y: 24,
          font: regular,
          size: 8,
          color: rgb(0.45, 0.48, 0.52),
        },
      );
    }
    return page;
  };

  let page = addPage();
  let y = PAGE_HEIGHT - (headerBanner ? 112 : 80);
  page.drawText(
    isStatusReport ? 'PURCHASE ORDER STATUS REPORT' : 'PROFORMA INVOICE',
    {
      x: SIDE_MARGIN,
      y,
      font: bold,
      size: 22,
      color: rgb(0.08, 0.11, 0.15),
    },
  );
  y -= 30;
  page.drawText(
    isStatusReport
      ? `Purchase order: ${purchaseOrder.reference}`
      : `Invoice reference: PI-${purchaseOrder.reference}`,
    {
      x: SIDE_MARGIN,
      y,
      font: bold,
      size: 10,
    },
  );
  page.drawText(
    isStatusReport
      ? `Status: ${purchaseOrder.status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}`
      : `PO: ${purchaseOrder.reference}`,
    {
      x: 410,
      y,
      font: regular,
      size: 10,
    },
  );
  y -= 16;
  page.drawText(`Order date: ${purchaseOrder.orderDate ?? 'Not specified'}`, {
    x: SIDE_MARGIN,
    y,
    font: regular,
    size: 10,
  });
  if (purchaseOrder.expectedDate) {
    page.drawText(
      `Expected: ${purchaseOrder.expectedDate ?? 'Not specified'}`,
      {
        x: 410,
        y,
        font: regular,
        size: 10,
      },
    );
  }

  y -= 24;
  page.drawText(`Bill to: ${safePdfText(purchaseOrder.supplierName)}`, {
    x: SIDE_MARGIN,
    y,
    font: regular,
    size: 10,
  });
  y -= 16;
  page.drawText(`Email: ${purchaseOrder.supplierEmail ?? 'Not provided'}`, {
    x: SIDE_MARGIN,
    y,
    font: regular,
    size: 10,
  });
  if (purchaseOrder.linkedRfq) {
    page.drawText(`Quotation: ${purchaseOrder.linkedRfq.reference}`, {
      x: 410,
      y,
      font: regular,
      size: 10,
    });
  }
  y -= 18;
  if (purchaseOrder.incoterms || purchaseOrder.deliveryTerms) {
    page.drawText(`Incoterms: ${purchaseOrder.incoterms ?? 'Not provided'}`, {
      x: SIDE_MARGIN,
      y,
      font: regular,
      size: 9,
    });
    page.drawText(
      `Delivery: ${safePdfText(purchaseOrder.deliveryTerms ?? 'Not provided')}`,
      {
        x: 300,
        y,
        font: regular,
        size: 9,
      },
    );
    y -= 28;
  } else {
    y -= 12;
  }

  const columns = [SIDE_MARGIN, 70, 154, 318, 364, 436, 504];
  const drawTableHeader = () => {
    page.drawRectangle({
      x: SIDE_MARGIN,
      y: y - 6,
      width: PAGE_WIDTH - SIDE_MARGIN * 2,
      height: 24,
      color: rgb(0.91, 0.96, 0.94),
    });
    [
      '#',
      'Part no.',
      'Description',
      'Qty',
      'Unit price',
      'VAT',
      'Line total',
    ].forEach((label, index) =>
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
  purchaseOrder.items.forEach((item, index) => {
    if (y < 100) {
      page = addPage();
      y = PAGE_HEIGHT - (headerBanner ? 112 : 80);
      drawTableHeader();
    }
    const lineTotal = item.quantity * item.price;
    const vatLabel = purchaseOrder.applyVat ? `${organization.vat}%` : '-';
    const values = [
      String(index + 1),
      safePdfText(item.manufacturerPartNumber ?? '-').slice(0, 18),
      safePdfText(item.description).slice(0, 26),
      `${item.quantity} ${safePdfText(item.unit)}`,
      formatMoney(item.price, purchaseOrder.currency),
      vatLabel,
      formatMoney(lineTotal, purchaseOrder.currency),
    ];
    values.forEach((value, columnIndex) =>
      page.drawText(value, {
        x: columns[columnIndex],
        y,
        font: regular,
        size: columnIndex === 2 ? 7.5 : 8,
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
    ['Subtotal', formatMoney(purchaseOrder.subtotal, purchaseOrder.currency)],
    ...(purchaseOrder.applyVat
      ? [
          [
            `VAT (${organization.vat}%)`,
            formatMoney(purchaseOrder.vatValue, purchaseOrder.currency),
          ],
        ]
      : []),
    [
      'Total due',
      formatMoney(purchaseOrder.totalValue, purchaseOrder.currency),
    ],
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

  if (options.includeTermsPage ?? true) {
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

export const generateVendorPurchaseOrderPdf = async (
  vendorPurchaseOrder: VendorPurchaseOrderPdfSource & {
    vendorAddress?: string | null;
  },
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
      page.drawText('Suploop purchase order', {
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
  const titleY = PAGE_HEIGHT - (headerBanner ? 82 : 54);
  page.drawText('PURCHASE ORDER', {
    x:
      PAGE_WIDTH -
      SIDE_MARGIN -
      regular.widthOfTextAtSize('PURCHASE ORDER', 24),
    y: titleY,
    font: regular,
    size: 24,
    color: rgb(0.43, 0.45, 0.47),
  });
  let organizationAddressY = titleY - 29;
  for (const line of wrapText(
    organization.address ?? '',
    regular,
    9,
    260,
  ).slice(0, 3)) {
    page.drawText(line, {
      x: SIDE_MARGIN,
      y: organizationAddressY,
      font: regular,
      size: 9,
      color: rgb(0.22, 0.24, 0.26),
    });
    organizationAddressY -= 13;
  }

  const metadataX = 390;
  const metadataY = titleY - 30;
  page.drawText('PO No:', {
    x: metadataX,
    y: metadataY,
    font: bold,
    size: 9,
  });
  page.drawText(safePdfText(vendorPurchaseOrder.reference), {
    x: metadataX + 58,
    y: metadataY,
    font: regular,
    size: 9,
  });
  page.drawText('PO Date:', {
    x: metadataX,
    y: metadataY - 16,
    font: bold,
    size: 9,
  });
  const orderDate = vendorPurchaseOrder.orderDate
    ? new Date(`${vendorPurchaseOrder.orderDate}T00:00:00`).toLocaleDateString()
    : new Date(vendorPurchaseOrder.createdAt).toLocaleDateString();
  page.drawText(orderDate, {
    x: metadataX + 58,
    y: metadataY - 16,
    font: regular,
    size: 9,
  });

  const panelGap = 24;
  const panelWidth = (PAGE_WIDTH - SIDE_MARGIN * 2 - panelGap) / 2;
  const panelTop = titleY - 92;
  const panelRows = (
    rows: { label: string; value: string | null | undefined }[],
  ) =>
    rows
      .filter((row) => row.value?.trim())
      .map((row) =>
        wrapText(
          `${row.label ? `${row.label}: ` : ''}${row.value}`,
          regular,
          9,
          panelWidth - 24,
        ),
      );
  const vendorRows = panelRows([
    { label: 'Supplier Name', value: vendorPurchaseOrder.vendorName },
    { label: 'Address', value: vendorPurchaseOrder.vendorAddress },
    { label: 'Vendor Reference', value: vendorPurchaseOrder.vendorReference },
    { label: 'Contact', value: vendorPurchaseOrder.vendorContactName },
    { label: 'Email', value: vendorPurchaseOrder.vendorEmail },
  ]);
  const shipToRows = panelRows([
    { label: '', value: organization.name },
    { label: '', value: vendorPurchaseOrder.shipTo ?? organization.address },
    { label: 'Contact', value: organization.phone },
  ]);
  const panelContentHeight = (rows: string[][]) =>
    rows.reduce((height, lines) => height + lines.length * 15 + 3, 0);
  const panelHeight =
    24 +
    Math.max(panelContentHeight(vendorRows), panelContentHeight(shipToRows)) +
    16;
  const drawPanel = (x: number, title: string, rows: string[][]) => {
    page.drawRectangle({
      x,
      y: panelTop - panelHeight,
      width: panelWidth,
      height: panelHeight,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.82, 0.83, 0.84),
      borderWidth: 0.7,
    });
    page.drawRectangle({
      x,
      y: panelTop - 22,
      width: panelWidth,
      height: 22,
      color: rgb(0.91, 0.96, 0.94),
    });
    page.drawText(title, {
      x: x + 12,
      y: panelTop - 15,
      font: bold,
      size: 10,
      color: rgb(0.1, 0.11, 0.12),
    });
    let rowY = panelTop - 39;
    for (const lines of rows) {
      for (const line of lines) {
        page.drawText(line, {
          x: x + 12,
          y: rowY,
          font: regular,
          size: 9,
          color: rgb(0.1, 0.11, 0.12),
        });
        rowY -= 15;
      }
      rowY -= 3;
    }
  };
  drawPanel(SIDE_MARGIN, 'Vendor', vendorRows);
  drawPanel(SIDE_MARGIN + panelWidth + panelGap, 'Ship To:', shipToRows);

  let y = panelTop - panelHeight - 26;
  if (vendorPurchaseOrder.notes) {
    for (const line of wrapText(
      `Notes: ${vendorPurchaseOrder.notes}`,
      regular,
      9,
      PAGE_WIDTH - SIDE_MARGIN * 2,
    )) {
      page.drawText(line, { x: SIDE_MARGIN, y, font: regular, size: 9 });
      y -= 13;
    }
    y -= 8;
  }

  const columns = [SIDE_MARGIN, 65, 142, 286, 350, 418, 500];
  const drawTableHeader = () => {
    page.drawRectangle({
      x: SIDE_MARGIN,
      y: y - 6,
      width: PAGE_WIDTH - SIDE_MARGIN * 2,
      height: 24,
      color: rgb(0.91, 0.96, 0.94),
    });
    [
      '#',
      'Part no.',
      'Description',
      'Qty',
      'Unit price',
      'Discount',
      'Line total',
    ].forEach((label, index) =>
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
  vendorPurchaseOrder.items.forEach((item, index) => {
    if (y < 100) {
      page = addPage();
      y = PAGE_HEIGHT - (headerBanner ? 112 : 80);
      drawTableHeader();
    }
    const grossLineTotal = Math.round(item.quantity * item.price);
    const discountValue =
      item.discountType === 'fixed'
        ? (item.discountValue ?? 0)
        : Math.round((grossLineTotal * (item.discountValue ?? 0)) / 100);
    const discount = Math.min(grossLineTotal, discountValue);
    const lineTotal = grossLineTotal - discount;
    const values = [
      String(index + 1),
      safePdfText(item.manufacturerPartNumber ?? '-').slice(0, 18),
      safePdfText(item.description).slice(0, 24),
      `${item.quantity} ${safePdfText(item.unit)}`,
      formatMoney(item.price, vendorPurchaseOrder.currency),
      discount > 0 ? formatMoney(discount, vendorPurchaseOrder.currency) : '-',
      formatMoney(lineTotal, vendorPurchaseOrder.currency),
    ];
    values.forEach((value, columnIndex) =>
      page.drawText(value, {
        x: columns[columnIndex],
        y,
        font: regular,
        size: columnIndex === 2 ? 7 : 7.5,
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
  [
    [
      'Subtotal',
      formatMoney(vendorPurchaseOrder.subtotal, vendorPurchaseOrder.currency),
    ],
    [
      'Total',
      formatMoney(vendorPurchaseOrder.totalValue, vendorPurchaseOrder.currency),
    ],
  ].forEach(([label, value], index, summary) => {
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

  const terms = richTextToPlainText(template?.termsHtml ?? '') || '';
  if (terms) {
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
