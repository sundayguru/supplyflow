import { getOrCreateManufacturer } from '~/db/manufacturers';
import type { ExtractedRfqItem } from '~/services/rfq-extraction/types';
import type { RfqItemInput } from '~/types/rfq';

export const resolveExtractedRfqManufacturers = async (
  organizationId: string,
  userId: string,
  items: ExtractedRfqItem[],
): Promise<RfqItemInput[]> => {
  const manufacturerIds = new Map<string, string>();
  const resolvedItems: RfqItemInput[] = [];
  for (const { manufacturerName, ...item } of items) {
    let manufacturerId: string | null = null;
    if (manufacturerName) {
      const key = manufacturerName.toLowerCase();
      manufacturerId = manufacturerIds.get(key) ?? null;
      if (!manufacturerId) {
        const manufacturer = await getOrCreateManufacturer(
          organizationId,
          userId,
          manufacturerName,
        );
        manufacturerId = manufacturer?.id ?? null;
        if (manufacturerId) {
          manufacturerIds.set(key, manufacturerId);
        }
      }
    }
    resolvedItems.push({ ...item, manufacturerId });
  }
  return resolvedItems;
};
