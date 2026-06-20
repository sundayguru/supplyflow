import { eq } from 'drizzle-orm';
import { getDb } from './connection';
import { profile, users, type InsertUser } from './schemas';
import { logError } from '../utils/logger';

export const insertUser = async (user: InsertUser) => {
  try {
    const db = getDb();
    return await db.insert(users).values(user).returning();
  } catch (e) {
    logError(e, 'Error inserting user');
  }
};

export const updateUser = async (id: string, user: Partial<InsertUser>) => {
  try {
    const db = getDb();
    return await db.update(users).set(user).where(eq(users.id, id));
  } catch (e) {
    logError(e, 'Error updating user');
  }
};

export const getUserById = async (id: string) => {
  try {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  } catch (e) {
    logError(e, 'Error getting user by id');
  }
};

export const getAllUsers = async () => {
  try {
    const db = getDb();
    return await db
      .select()
      .from(users)
      .innerJoin(profile, eq(users.id, profile.userId));
  } catch (e) {
    logError(e, 'Error getting all users');
  }
};
