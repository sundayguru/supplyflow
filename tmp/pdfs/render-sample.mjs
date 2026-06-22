import { writeFile } from 'node:fs/promises';
import { generateRfqTemplateSamplePdf } from './rfq-pdf-generator.mjs';

const timestamp = new Date().toISOString();
const organization = {
  id: 'org-sample',
  name: 'SupplyFlow Industrial',
  description: null,
  website: 'https://supplyflow.com',
  phone: null,
  address: 'Berlin, Germany',
  preferredModel: 'gemini-2.5-flash',
  vat: 19,
  priceMarkup: 18,
  createdBy: 'user-sample',
  createdAt: timestamp,
  updatedAt: timestamp,
};
const template = {
  id: 'template-sample',
  organizationId: organization.id,
  name: 'Standard Industrial Quotation',
  headerBannerKey: null,
  footerBannerKey: null,
  termsHtml:
    '<p><strong>Payment:</strong> Net 30 days from invoice date.</p><p><strong>Delivery:</strong> Lead times begin after written order confirmation.</p><ul><li>Prices remain valid for 30 days.</li><li>Shipping and handling are quoted separately.</li><li>Goods remain our property until paid in full.</li></ul>',
  createdBy: 'user-sample',
  createdAt: timestamp,
  updatedAt: timestamp,
};

const bytes = await generateRfqTemplateSamplePdf(template, organization);
await writeFile('output/pdf/rfq-template-sample.pdf', bytes);
