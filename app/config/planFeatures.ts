export const planFeatureLabels = {
  dashboard: 'Dashboard',
  rfqs: 'RFQ management',
  purchaseOrders: 'Purchase orders',
  vendorPurchaseOrders: 'Vendor purchase orders',
  vendorPurchaseOrderAcknowledgements: 'Vendor PO acknowledgements',
  activities: 'Activity logs',
  llmUsage: 'LLM usage',
  manufacturers: 'Manufacturers',
  addresses: 'Addresses',
  productPricing: 'Product prices',
  customPdfTemplates: 'PDF templates',
  emailAutomation: 'Connected email accounts',
  emailIngestions: 'Email ingestions',
  emailNotifications: 'Email notifications',
  teamManagement: 'Organization users',
} as const;

export type PlanFeature = keyof typeof planFeatureLabels;
