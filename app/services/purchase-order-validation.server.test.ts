import { describe, expect, it } from 'vitest';
import type { PurchaseOrderInput } from '~/types/purchaseOrder';
import type { RfqRecord } from '~/types/rfq';
import { validatePurchaseOrderAgainstRfq } from './purchase-order-validation.server';

describe('purchase order quotation validation', () => {
  const item = {
    quantity: 5,
    price: 150000,
    priceMarkup: 120,
    discountType: 'percentage',
    discountValue: 2,
    shippingCost: 10000,
    unit: 'units',
    description: 'Valve',
    manufacturerPartNumber: 'PT-123',
  } as RfqRecord['items'][number];
  const rfq = {
    customerName: 'Customer',
    customerEmail: null,
    currency: 'USD',
    incoterms: null,
    deliveryTerms: null,
    applyVat: true,
    items: [item],
  } as RfqRecord;
  const po = {
    supplierName: 'Customer',
    supplierEmail: null,
    currency: 'USD',
    incoterms: null,
    deliveryTerms: null,
    applyVat: true,
    items: [
      {
        quantity: 5,
        price: 320000,
        unit: 'units',
        description: 'Valve',
        manufacturerPartNumber: 'PT-123',
      },
    ],
  } as PurchaseOrderInput;

  it('reports the quoted line amount with discount and shipping', () => {
    const result = validatePurchaseOrderAgainstRfq(po, rfq);
    expect(result.status).toBe('exception');
    expect(result.summary).toContain('$16,270.00');
    expect(result.summary).toContain('$330.00 discount');
    expect(result.summary).toContain('$100.00 shipping');
    expect(result.summary).toContain('$16,000.00');
  });

  it('validates when the PO line amount matches the adjusted quotation', () => {
    const result = validatePurchaseOrderAgainstRfq(
      { ...po, items: [{ ...po.items[0], price: 325400 }] },
      rfq,
    );
    expect(result.status).toBe('validated');
  });

  it('detects a VAT treatment mismatch', () => {
    const result = validatePurchaseOrderAgainstRfq(
      { ...po, applyVat: false },
      rfq,
    );
    expect(result.summary).toContain('VAT treatment mismatch');
  });
});
