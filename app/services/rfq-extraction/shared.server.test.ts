import { expect, it } from 'vitest';
import type { EmailMessage } from '~/services/email/types';
import { parseRfqExtractionResponse } from './shared.server';

const message: EmailMessage = {
  id: 'email',
  threadId: null,
  subject: 'RFQ',
  from: { name: 'Buyer', address: 'buyer@example.com' },
  to: [],
  receivedAt: new Date(),
  text: 'Siemens motor and ABB drive',
  attachments: [],
};

it('preserves per-item OEM names while rejecting model supplied manufacturer IDs', () => {
  const result = parseRfqExtractionResponse(
    JSON.stringify({
      isRfq: true,
      confidence: 1,
      rfq: {
        customerName: 'Buyer',
        items: [
          {
            quantity: 1,
            price: 0,
            unit: 'unit',
            description: 'Motor',
            manufacturerName: ' Siemens  ',
            manufacturerId: 'invented-id',
          },
          {
            quantity: 2,
            price: 0,
            unit: 'unit',
            description: 'Drive',
            manufacturerName: 'ABB',
          },
          { quantity: 1, price: 0, unit: 'unit', description: 'Unknown part' },
        ],
      },
    }),
    message,
    0,
    'EUR',
  );
  expect(result.isRfq).toBe(true);
  if (result.isRfq) {
    expect(result.rfq.items.map((item) => item.manufacturerName)).toEqual([
      'Siemens',
      'ABB',
      null,
    ]);
    expect(result.rfq.items.every((item) => item.manufacturerId === null)).toBe(
      true,
    );
  }
});
