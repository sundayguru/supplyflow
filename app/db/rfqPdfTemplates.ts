import { and, desc, eq } from 'drizzle-orm';
import { getDb } from './connection';
import { rfqPdfTemplates } from './schemas';

export const listRfqPdfTemplates = (organizationId: string) => {
  const db = getDb();
  return db
    .select()
    .from(rfqPdfTemplates)
    .where(eq(rfqPdfTemplates.organizationId, organizationId))
    .orderBy(desc(rfqPdfTemplates.updatedAt));
};

export const getRfqPdfTemplate = async (id: string, organizationId: string) => {
  const db = getDb();
  const [template] = await db
    .select()
    .from(rfqPdfTemplates)
    .where(
      and(
        eq(rfqPdfTemplates.id, id),
        eq(rfqPdfTemplates.organizationId, organizationId),
      ),
    );
  return template ?? null;
};

export const createRfqPdfTemplate = async (input: {
  organizationId: string;
  createdBy: string;
  name: string;
  termsHtml: string;
  headerBannerKey: string | null;
  footerBannerKey: string | null;
}) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const [template] = await db
    .insert(rfqPdfTemplates)
    .values({ id, ...input })
    .returning();
  return template;
};

export const updateRfqPdfTemplate = async (
  id: string,
  organizationId: string,
  input: {
    name: string;
    termsHtml: string;
    headerBannerKey: string | null;
    footerBannerKey: string | null;
  },
) => {
  const db = getDb();
  const [template] = await db
    .update(rfqPdfTemplates)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(rfqPdfTemplates.id, id),
        eq(rfqPdfTemplates.organizationId, organizationId),
      ),
    )
    .returning();
  return template ?? null;
};

export const deleteRfqPdfTemplate = async (
  id: string,
  organizationId: string,
) => {
  const db = getDb();
  const [template] = await db
    .delete(rfqPdfTemplates)
    .where(
      and(
        eq(rfqPdfTemplates.id, id),
        eq(rfqPdfTemplates.organizationId, organizationId),
      ),
    )
    .returning();
  return template ?? null;
};
