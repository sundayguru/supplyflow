import type { RfqItemInput } from '~/types/rfq';
import { calculateRfqTotals } from './rfq';

const mockItems = (priceMarkup: number): RfqItemInput[] =>
  [
    ['Stainless steel pressure relief valve, 1/4 inch NPT', 12, 'pcs', 8450],
    ['Industrial pressure gauge, 0-16 bar, glycerin filled', 8, 'pcs', 6290],
    ['PTFE gasket set for DN50 flange', 40, 'sets', 1275],
    ['316L stainless steel ball valve, DN25', 16, 'pcs', 11300],
    ['High-temperature braided hose assembly, 2 m', 10, 'pcs', 9850],
    ['Digital flow meter with pulse output', 4, 'pcs', 24800],
    ['Galvanized mounting bracket and fastener kit', 24, 'kits', 2350],
    ['Weatherproof junction box, IP67', 6, 'pcs', 7425],
  ].map(([description, quantity, unit, price]) => ({
    description: String(description),
    quantity: Number(quantity),
    unit: String(unit),
    price: Number(price),
    priceMarkup,
    manufacturer: null,
    manufacturerId: null,
    manufacturerPartNumber: null,
    specifications: null,
  }));

export const createMockRfqForTemplate = (organization: {
  vat: number;
  priceMarkup: number;
}) => {
  const items = mockItems(organization.priceMarkup);
  return {
    reference: 'RFQ-SAMPLE-001',
    customerName: 'Atlas Industrial GmbH',
    customerEmail: 'procurement@atlas-industrial.example',
    currency: 'EUR',
    dueDate: '2026-07-15',
    applyVat: true,
    sourcePdfKey: null,
    items,
    ...calculateRfqTotals(items, organization.vat, true),
  };
};
