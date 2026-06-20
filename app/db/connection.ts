import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from './schemas';

export const getDb = () => {
  return drizzle(env.DB, { schema });
};
