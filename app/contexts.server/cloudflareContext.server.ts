import { createContext } from 'react-router';
import type { EmptyObject } from '~/types';

type CloudflareContext = {
  env: Env | EmptyObject;
  ctx: ExecutionContext | EmptyObject;
};

export const cloudflareContext = createContext<CloudflareContext>({
  env: {},
  ctx: {},
});
