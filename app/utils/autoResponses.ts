import type {
  AutoResponseTemplates,
  AutoResponseValues,
} from '~/types/autoResponse';

export const autoResponseDefinitions = [
  {
    field: 'rfqAcknowledgementTemplate',
    label: 'RFQ received',
    description: 'Sent when an RFQ is received from connected email.',
    defaultValue:
      'Hello,\n\nThank you for your request for quotation. We have received it and it will be processed as soon as possible.\n\nReference: {{reference}}\n\nBest regards,\n{{organizationName}}',
  },
  {
    field: 'purchaseOrderAcknowledgementTemplate',
    label: 'Purchase order received',
    description:
      'Sent when a customer purchase order is received from connected email.',
    defaultValue:
      'Hello,\n\nThank you for your purchase order. We have received it and will process it as soon as possible.\n\nReference: {{reference}}\n\nBest regards,\n{{organizationName}}',
  },
  {
    field: 'quoteReminderTemplate',
    label: 'Quotation follow-up',
    description:
      'Sent five days after a quotation when no customer purchase order has arrived.',
    defaultValue:
      'Hello {{customerName}},\n\nWe are following up on quotation {{reference}}. Please let us know if you have any updates, questions, or feedback when you have a moment.\n\nBest regards,\n{{organizationName}}',
  },
] as const;

const placeholders = [
  'customerName',
  'reference',
  'organizationName',
  'receivedDate',
];

export const validateAutoResponseTemplate = (template: string) => {
  if (template.length > 10_000) {
    return 'Messages must be 10,000 characters or fewer';
  }
  const remaining = template.replace(
    /{{\s*(\w+)\s*}}/g,
    (match, key: string) => (placeholders.includes(key) ? '' : match),
  );
  return remaining.includes('{{') || remaining.includes('}}')
    ? 'Use only {{customerName}}, {{reference}}, {{organizationName}}, and {{receivedDate}} placeholders'
    : null;
};

export const renderAutoResponse = (
  field: keyof AutoResponseTemplates,
  template: string | null,
  values: AutoResponseValues,
) => {
  const definition = autoResponseDefinitions.find(
    (item) => item.field === field,
  )!;
  return (template?.trim() || definition.defaultValue).replace(
    /{{\s*(customerName|reference|organizationName|receivedDate)\s*}}/g,
    (_match, key: keyof AutoResponseValues) => values[key],
  );
};
