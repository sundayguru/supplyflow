import { beforeEach, expect, it, vi } from 'vitest';
import { getOrCreateManufacturer } from '~/db/manufacturers';
import type { ExtractedRfqItem } from '~/services/rfq-extraction/types';
import { resolveExtractedRfqManufacturers } from './rfqManufacturers.server';

vi.mock('~/db/manufacturers', () => ({ getOrCreateManufacturer: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

const item: ExtractedRfqItem = {
  quantity: 1,
  price: 0,
  priceMarkup: 0,
  discountType: 'percentage',
  discountValue: 0,
  shippingCost: 0,
  unit: 'unit',
  description: 'Motor',
  manufacturerId: null,
  manufacturerName: 'Siemens',
  manufacturerPartNumber: '123',
  specifications: null,
};

it('resolves manufacturer names within the organization and reuses repeated names', async () => {
  vi.mocked(getOrCreateManufacturer).mockResolvedValue({
    id: 'manufacturer-1',
    organizationId: 'org',
    createdBy: 'user',
    name: 'Siemens',
    address: null,
    email: null,
    contactName: null,
    createdAt: '',
    updatedAt: '',
  });
  const result = await resolveExtractedRfqManufacturers('org', 'user', [
    item,
    { ...item, manufacturerName: 'SIEMENS' },
  ]);
  expect(getOrCreateManufacturer).toHaveBeenCalledExactlyOnceWith(
    'org',
    'user',
    'Siemens',
  );
  expect(result.map((value) => value.manufacturerId)).toEqual([
    'manufacturer-1',
    'manufacturer-1',
  ]);
  expect(result[0]).not.toHaveProperty('manufacturerName');
});

it('leaves items without a manufacturer unassigned and ignores model supplied IDs', async () => {
  const result = await resolveExtractedRfqManufacturers('org', 'user', [
    { ...item, manufacturerName: null, manufacturerId: 'invented-id' },
  ]);
  expect(result[0].manufacturerId).toBeNull();
  expect(getOrCreateManufacturer).not.toHaveBeenCalled();
});
