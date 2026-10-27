import { eq } from 'drizzle-orm';
import { getDb } from './connection';
import { billingSettings, plans } from './schemas';

export const getPlans = () => {
  const db = getDb();
  return db
    .select()
    .from(plans)
    .where(eq(plans.isActive, true))
    .orderBy(plans.displayOrder);
};

export const getAllPlans = () =>
  getDb().select().from(plans).orderBy(plans.displayOrder);

export const updatePlan = (
  planId: string,
  values: {
    name: string;
    description: string;
    priceLabel: string;
    amount: number;
    stripePriceId: string | null;
    inputTokenLimit: number;
    outputTokenLimit: number;
    features: Record<string, boolean>;
    isActive: boolean;
    displayOrder: number;
  },
) =>
  getDb()
    .update(plans)
    .set({ ...values, updatedAt: new Date().toISOString() })
    .where(eq(plans.id, planId));

export const getPlan = async (planId: string) => {
  const db = getDb();
  const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
  return plan ?? null;
};

export const getPlanByStripePriceId = async (stripePriceId: string) => {
  const db = getDb();
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.stripePriceId, stripePriceId));
  return plan ?? null;
};

export const getSuggestedPlanId = async () => {
  const db = getDb();
  const [settings] = await db.select().from(billingSettings).limit(1);
  return settings?.suggestedPlanId ?? 'business';
};

export const setSuggestedPlanId = async (planId: string) => {
  const db = getDb();
  await db
    .insert(billingSettings)
    .values({
      id: 1,
      suggestedPlanId: planId,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: billingSettings.id,
      set: { suggestedPlanId: planId, updatedAt: new Date().toISOString() },
    });
};

export const planHasFeature = async (planId: string, feature: string) => {
  const plan = await getPlan(planId);
  return plan?.features[feature] === true;
};

export const getEnabledPlanFeatures = async (planId: string) => {
  const plan = await getPlan(planId);
  return plan?.features ?? {};
};
