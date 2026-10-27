export type { PlanFeature } from '~/config/planFeatures';

export type PlanRecord = {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  amount: number;
  inputTokenLimit: number;
  outputTokenLimit: number;
  features: Record<string, boolean>;
  displayOrder: number;
  isActive: boolean;
};
