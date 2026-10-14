export type AutoResponseTemplates = {
  rfqAcknowledgementTemplate: string | null;
  purchaseOrderAcknowledgementTemplate: string | null;
  quoteReminderTemplate: string | null;
};

export type AutoResponseValues = {
  customerName: string;
  reference: string;
  organizationName: string;
  receivedDate: string;
};
