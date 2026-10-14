import { expect, it } from 'vitest';
import {
  autoResponseDefinitions,
  renderAutoResponse,
  validateAutoResponseTemplate,
} from './autoResponses';

const values = {
  customerName: 'Atlas',
  reference: 'RFQ-123',
  organizationName: 'Supplyflow',
  receivedDate: '2026-10-14',
};

it.each(autoResponseDefinitions)(
  'renders custom messages for $label',
  ({ field }) => {
    expect(
      renderAutoResponse(
        field,
        'Hi {{ customerName }}, {{reference}} from {{organizationName}}, received {{ receivedDate }}.',
        values,
      ),
    ).toBe('Hi Atlas, RFQ-123 from Supplyflow, received 2026-10-14.');
  },
);

it.each(autoResponseDefinitions)(
  'keeps the default for $label when blank',
  ({ field, defaultValue }) => {
    const expected = defaultValue
      .replace('{{customerName}}', 'Atlas')
      .replace('{{reference}}', 'RFQ-123')
      .replace('{{organizationName}}', 'Supplyflow');
    expect(renderAutoResponse(field, null, values)).toBe(expected);
    expect(renderAutoResponse(field, '   ', values)).toBe(expected);
  },
);

it('does not interpret placeholders inside substituted customer data', () => {
  expect(
    renderAutoResponse('quoteReminderTemplate', 'Hello {{customerName}}', {
      ...values,
      customerName: '{{organizationName}} $&',
    }),
  ).toBe('Hello {{organizationName}} $&');
});

it('validates supported placeholders and message limits', () => {
  expect(
    validateAutoResponseTemplate(
      'Hi {{customerName}}, {{ reference }} from {{organizationName}} on {{receivedDate}}',
    ),
  ).toBeNull();
  expect(validateAutoResponseTemplate('Plain text')).toBeNull();
  expect(validateAutoResponseTemplate('')).toBeNull();
  expect(validateAutoResponseTemplate('{{unsupported}}')).not.toBeNull();
  expect(validateAutoResponseTemplate('{{reference')).not.toBeNull();
  expect(validateAutoResponseTemplate('x'.repeat(10_001))).not.toBeNull();
});
