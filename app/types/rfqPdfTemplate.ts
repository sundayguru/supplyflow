export type RfqPdfTemplate = {
  id: string;
  organizationId: string;
  name: string;
  headerBannerKey: string | null;
  footerBannerKey: string | null;
  headerBannerFullWidth: boolean;
  footerBannerFullWidth: boolean;
  termsHtml: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type RfqPdfTemplateOption = Pick<RfqPdfTemplate, 'id' | 'name'>;
