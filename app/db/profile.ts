import { eq } from 'drizzle-orm';
import { getDb } from './connection';
import { profile } from './schemas';
import type { InsertProfile } from './schemas';
import { logError } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const insertProfile = async (data: InsertProfile) => {
  try {
    const db = getDb();
    return await db.insert(profile).values(data);
  } catch (e) {
    logError(e, 'Error inserting profile');
  }
};

export const updateProfile = async (
  id: string,
  data: Partial<InsertProfile>,
) => {
  try {
    const db = getDb();
    return await db.update(profile).set(data).where(eq(profile.id, id));
  } catch (e) {
    logError(e, 'Error updating profile');
  }
};

export const getProfileById = async (id: string) => {
  try {
    const db = getDb();
    const [user] = await db.select().from(profile).where(eq(profile.id, id));
    return user;
  } catch (e) {
    logError(e, 'Error getting profile by id');
  }
};

export const getProfileByUserId = async (userId: string) => {
  try {
    const db = getDb();
    const [userProfile] = await db
      .select()
      .from(profile)
      .where(eq(profile.userId, userId));
    return userProfile;
  } catch (e) {
    logError(e, 'Error getting profile by user id');
  }
};

export const getAllProfiles = async () => {
  try {
    const db = getDb();
    return await db.select().from(profile);
  } catch (e) {
    logError(e, 'Error getting all profiles');
  }
};

export const ensureProfileForUser = async (userId: string) => {
  try {
    const existingProfile = await getProfileByUserId(userId);

    if (existingProfile) {
      return existingProfile;
    }

    await insertProfile({
      id: uuidv4(),
      userId,
      bio: '',
      isPrivate: false,
    });

    return await getProfileByUserId(userId);
  } catch (e) {
    logError(e, 'Error ensuring profile for user');
    return null;
  }
};
