import type { SelectOrganization, SelectRfqPdfTemplate } from '~/db/schemas';
import type { RfqRecord } from '~/types/rfq';
import { getFromR2 } from './r2.server';
import {
  generateProformaInvoicePdf as generateCurrentProformaInvoicePdf,
  generateRfqPdf as generateCurrentPdf,
  generateRfqTemplateSamplePdf as generatePdf,
  generateVendorPurchaseOrderPdf as generateCurrentVendorPurchaseOrderPdf,
  type RfqPdfBannerAsset,
} from './rfqPdfGenerator';
import type { PurchaseOrderRecord } from '~/types/purchaseOrder';
import type { VendorPurchaseOrderRecord } from '~/types/vendorPurchaseOrder';
import { getManufacturer } from '~/db/manufacturers';

const loadAsset = async (
  key: string | null,
): Promise<RfqPdfBannerAsset | null> => {
  if (!key) {
    return null;
  }
  const object = await getFromR2(key);
  const contentType = object?.httpMetadata?.contentType;
  if (
    !object ||
    (contentType !== 'image/png' && contentType !== 'image/jpeg')
  ) {
    return null;
  }
  return { bytes: await object.arrayBuffer(), contentType };
};

export const generateRfqTemplateSamplePdf = async (
  template: SelectRfqPdfTemplate,
  organization: SelectOrganization,
) => {
  const [header, footer] = await Promise.all([
    loadAsset(template.headerBannerKey),
    loadAsset(template.footerBannerKey),
  ]);
  return generatePdf(template, organization, { header, footer });
};

export const generateRfqPdf = async (
  rfq: RfqRecord,
  template: SelectRfqPdfTemplate | null,
  organization: SelectOrganization,
) => {
  const [header, footer] = await Promise.all([
    loadAsset(template?.headerBannerKey ?? null),
    loadAsset(template?.footerBannerKey ?? null),
  ]);
  return generateCurrentPdf(rfq, template, organization, { header, footer });
};

export const generateProformaInvoicePdf = async (
  purchaseOrder: PurchaseOrderRecord,
  template: SelectRfqPdfTemplate | null,
  organization: SelectOrganization,
  options: { statusReport?: boolean; includeTermsPage?: boolean } = {},
) => {
  const [header, footer] = await Promise.all([
    loadAsset(template?.headerBannerKey ?? null),
    loadAsset(template?.footerBannerKey ?? null),
  ]);
  return generateCurrentProformaInvoicePdf(
    purchaseOrder,
    template,
    organization,
    {
      header,
      footer,
    },
    options,
  );
};

export const generatePurchaseOrderStatusReportPdf = (
  purchaseOrder: PurchaseOrderRecord,
  template: SelectRfqPdfTemplate | null,
  organization: SelectOrganization,
) =>
  generateProformaInvoicePdf(purchaseOrder, template, organization, {
    statusReport: true,
    includeTermsPage: false,
  });

export const generateVendorPurchaseOrderPdf = async (
  vendorPurchaseOrder: VendorPurchaseOrderRecord,
  template: SelectRfqPdfTemplate | null,
  organization: SelectOrganization,
) => {
  const [header, footer, vendorManufacturer] = await Promise.all([
    loadAsset(template?.headerBannerKey ?? null),
    loadAsset(template?.footerBannerKey ?? null),
    vendorPurchaseOrder.vendorManufacturerId
      ? getManufacturer(
          vendorPurchaseOrder.vendorManufacturerId,
          organization.id,
        )
      : Promise.resolve(null),
  ]);
  return generateCurrentVendorPurchaseOrderPdf(
    {
      ...vendorPurchaseOrder,
      vendorAddress: vendorManufacturer?.address ?? null,
    },
    template,
    organization,
    {
      header,
      footer,
    },
  );
};
