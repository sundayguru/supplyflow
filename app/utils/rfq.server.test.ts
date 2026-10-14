import { expect, it } from 'vitest';
import { parseRfqInput } from './rfq.server';

const input = {
  customerName: 'Customer',
  status: 'new',
  items: [{ quantity: 1, price: 100, unit: 'unit', description: 'Product' }],
};

it('defaults new RFQs to the organization currency', () => {
  const result = parseRfqInput(input, 0, 'USD');
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.value.currency).toBe('USD');
  }
});

it('preserves a currency selected by the user', () => {
  const result = parseRfqInput({ ...input, currency: 'gbp' }, 0, 'USD');
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.value.currency).toBe('GBP');
  }
});

it('rejects unsupported currencies', () => {
  expect(parseRfqInput({ ...input, currency: 'INVALID' }, 0, 'USD')).toEqual({
    success: false,
    error: 'Select a supported currency',
  });
});
