export type RfqPdfTemplate = {
  id: string;
  organizationId: string;
  name: string;
  headerBannerKey: string | null;
  footerBannerKey: string | null;
  termsHtml: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type RfqPdfTemplateOption = Pick<RfqPdfTemplate, 'id' | 'name'>;
