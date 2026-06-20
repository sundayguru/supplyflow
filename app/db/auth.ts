import { eq, and } from 'drizzle-orm';
import { getDb } from './connection';
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  passwordResetTokens,
  type InsertUser,
  type InsertAccount,
  type InsertSession,
} from './schemas';
import {
  hashPassword,
  verifyPassword,
  generateResetToken,
  getSessionExpiry,
} from '~/utils/auth.server';
import { v4 as uuidv4 } from 'uuid';
import { logError } from '~/utils/logger';
import { ensureProfileForUser, insertProfile } from './profile';

// User operations
export const createUser = async (
  userData: Omit<InsertUser, 'createdAt' | 'updatedAt'> & { password?: string },
): Promise<InsertUser | null> => {
  try {
    const db = getDb();
    const userWithId = {
      ...userData,
      id: userData.id || uuidv4(),
    };

    await db.insert(users).values(userWithId);
    await ensureProfileForUser(userWithId.id);
    return userWithId;
  } catch (e) {
    logError(e, 'Error creating user');
    return null;
  }
};

export const createUserWithPassword = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<InsertUser | null> => {
  try {
    const hashedPassword = await hashPassword(password);
    const userId = uuidv4();

    const db = getDb();
    const newUser = {
      id: userId,
      email,
      firstName,
      lastName,
      emailVerified: false,
      passwordHash: hashedPassword,
    };

    await db.insert(users).values(newUser);
    await insertProfile({
      id: uuidv4(),
      userId: userId,
      bio: '',
    });
    return newUser;
  } catch (e) {
    logError(e, 'Error creating user with password');
    return null;
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  } catch (e) {
    logError(e, 'Error getting user by email');
    return null;
  }
};

export const getUserById = async (id: string) => {
  try {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  } catch (e) {
    logError(e, 'Error getting user by id');
    return null;
  }
};

export const updateUser = async (id: string, data: Partial<InsertUser>) => {
  try {
    const db = getDb();
    await db
      .update(users)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id));
    return getUserById(id);
  } catch (e) {
    logError(e, 'Error updating user');
    return null;
  }
};

export const verifyUserPassword = async (
  email: string,
  password: string,
): Promise<boolean> => {
  try {
    const user = await getUserByEmail(email);
    if (!user || !user.passwordHash) {
      return false;
    }
    return verifyPassword(password, user.passwordHash);
  } catch (e) {
    logError(e, 'Error verifying password');
    return false;
  }
};

export const updateUserPassword = async (
  userId: string,
  newPassword: string,
): Promise<boolean> => {
  try {
    const hashedPassword = await hashPassword(newPassword);
    await updateUser(userId, { passwordHash: hashedPassword });
    return true;
  } catch (e) {
    logError(e, 'Error updating user password');
    return false;
  }
};

// Account operations (for OAuth providers like Google)
export const createAccount = async (
  accountData: InsertAccount,
): Promise<void> => {
  try {
    const db = getDb();
    await db.insert(accounts).values(accountData);
  } catch (e) {
    logError(e, 'Error creating account');
  }
};

export const getAccountByProvider = async (
  provider: string,
  providerAccountId: string,
) => {
  try {
    const db = getDb();
    const [account] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.provider, provider),
          eq(accounts.providerAccountId, providerAccountId),
        ),
      );
    return account;
  } catch (e) {
    logError(e, 'Error getting account by provider');
    return null;
  }
};

export const getUserByAccount = async (
  provider: string,
  providerAccountId: string,
) => {
  try {
    const db = getDb();
    const [account] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.provider, provider),
          eq(accounts.providerAccountId, providerAccountId),
        ),
      );

    if (!account) {
      return null;
    }

    return getUserById(account.userId);
  } catch (e) {
    logError(e, 'Error getting user by account');
    return null;
  }
};

// Session operations
export const createSession = async (
  sessionData: InsertSession,
): Promise<void> => {
  try {
    const db = getDb();
    await db.insert(sessions).values(sessionData);
  } catch (e) {
    logError(e, 'Error creating session');
  }
};

export const getSessionByToken = async (sessionToken: string) => {
  try {
    const db = getDb();
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, sessionToken));
    return session;
  } catch (e) {
    logError(e, 'Error getting session by token');
    return null;
  }
};

export const deleteSession = async (sessionToken: string): Promise<void> => {
  try {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
  } catch (e) {
    logError(e, 'Error deleting session');
  }
};

export const deleteUserSessions = async (userId: string): Promise<void> => {
  try {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.userId, userId));
  } catch (e) {
    logError(e, 'Error deleting user sessions');
  }
};

// Verification token operations
export const createVerificationToken = async (
  identifier: string,
  token: string,
  expires: string,
): Promise<void> => {
  try {
    const db = getDb();
    await db.insert(verificationTokens).values({ identifier, token, expires });
  } catch (e) {
    logError(e, 'Error creating verification token');
  }
};

export const getVerificationToken = async (token: string) => {
  try {
    const db = getDb();
    const [verificationToken] = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.token, token));
    return verificationToken;
  } catch (e) {
    logError(e, 'Error getting verification token');
    return null;
  }
};

export const deleteVerificationToken = async (token: string): Promise<void> => {
  try {
    const db = getDb();
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.token, token));
  } catch (e) {
    logError(e, 'Error deleting verification token');
  }
};

// Password reset token operations
export const createPasswordResetToken = async (
  userId: string,
  token: string,
  expires: string,
): Promise<void> => {
  try {
    const db = getDb();
    await db.insert(passwordResetTokens).values({ userId, token, expires });
  } catch (e) {
    logError(e, 'Error creating password reset token');
  }
};

export const getPasswordResetToken = async (token: string) => {
  try {
    const db = getDb();
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  } catch (e) {
    logError(e, 'Error getting password reset token');
    return null;
  }
};

export const deletePasswordResetToken = async (
  token: string,
): Promise<void> => {
  try {
    const db = getDb();
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
  } catch (e) {
    logError(e, 'Error deleting password reset token');
  }
};

export const generatePasswordResetTokenForEmail = async (
  email: string,
): Promise<{ token: string; expires: string } | null> => {
  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  const token = generateResetToken();
  const expires = getSessionExpiry();

  await createPasswordResetToken(user.id, token, expires);

  return { token, expires };
};

export const validatePasswordResetToken = async (
  token: string,
): Promise<{ userId: string } | null> => {
  try {
    const resetToken = await getPasswordResetToken(token);
    if (!resetToken) {
      return null;
    }

    // Check if token is expired
    const expires = new Date(resetToken.expires);
    if (expires < new Date()) {
      await deletePasswordResetToken(token);
      return null;
    }

    // Delete the token after validation (one-time use)
    await deletePasswordResetToken(token);

    return { userId: resetToken.userId };
  } catch (e) {
    logError(e, 'Error validating password reset token');
    return null;
  }
};
