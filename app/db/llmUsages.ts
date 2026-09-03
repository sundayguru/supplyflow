import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './connection';
import { llmUsages, type InsertLlmUsage } from './schemas';

export const recordLlmUsage = async (values: Omit<InsertLlmUsage, 'id'>) => {
  await getDb()
    .insert(llmUsages)
    .values({ id: uuidv4(), ...values });
};

export const getLlmUsageSummary = async (
  organizationId: string,
  dateFrom: string,
  dateTo: string,
) => {
  const db = getDb();
  const where = and(
    eq(llmUsages.organizationId, organizationId),
    gte(llmUsages.createdAt, `${dateFrom} 00:00:00`),
    lte(llmUsages.createdAt, `${dateTo} 23:59:59`),
  );
  const [totals] = await db
    .select({
      requests: sql<number>`count(*)`,
      inputTokens: sql<number>`coalesce(sum(${llmUsages.inputTokens}), 0)`,
      outputTokens: sql<number>`coalesce(sum(${llmUsages.outputTokens}), 0)`,
    })
    .from(llmUsages)
    .where(where);
  const daily = await db
    .select({
      date: sql<string>`substr(${llmUsages.createdAt}, 1, 10)`,
      inputTokens: sql<number>`coalesce(sum(${llmUsages.inputTokens}), 0)`,
      outputTokens: sql<number>`coalesce(sum(${llmUsages.outputTokens}), 0)`,
    })
    .from(llmUsages)
    .where(where)
    .groupBy(sql`substr(${llmUsages.createdAt}, 1, 10)`)
    .orderBy(sql`substr(${llmUsages.createdAt}, 1, 10)`);
  return { totals, daily };
};
