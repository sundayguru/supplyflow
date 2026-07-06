import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './app/db/schemas/index.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: './.wrangler/state/v3/d1/miniflare-D1DatabaseObject/bbcdbd8014b202d1d97ede3757eeb13c3600f9b0a1150270e6d922047d28224c.sqlite',
  },
});
