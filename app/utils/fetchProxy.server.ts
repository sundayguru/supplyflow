import { HTTPError } from './HTTPError';
import { logError } from './logger';
import { removeTrailingSlashes } from './removeTrailingSlashes';
import { removeLeadingSlashes } from './removeLeadingSlashes';

// Make it a build time env var in vite.

export type TokenData = {
  accessToken: string;
  refreshToken: string;
};

export const fetchProxy = async <T = unknown>(
  accessToken: string,
  path: string,
  init: RequestInit = { headers: {} },
  baseUrl: string = import.meta.env.VITE_AI_BASE_API_URL,
) => {
  const endpoint = `${removeTrailingSlashes(baseUrl)}/${removeLeadingSlashes(path)}`;
  const normalizedHeaders = new Headers(init?.headers);
  const acceptHeader = normalizedHeaders.get('Accept') || 'application/json';
  normalizedHeaders.set('Authorization', `Bearer ${accessToken}`);
  normalizedHeaders.set('Accept', acceptHeader);
  normalizedHeaders.set(
    'Content-Type',
    normalizedHeaders.get('Content-Type') || 'application/json',
  );

  const response = await fetch(endpoint, {
    ...init,
    headers: normalizedHeaders,
  });

  // TODO: handle 401
  if (!response.ok) {
    const err = {
      name: 'HTTP Error',
      url: path,
      code: response.status,
      text: response.statusText,
      body: 'unknown',
    };
    const contentType = response.headers.get('Content-Type') ?? '';

    if (contentType.includes('application/json')) {
      err.body = await response.json();
    }

    if (contentType.includes('text/')) {
      err.body = await response.text();
    }

    logError(err);
    throw new HTTPError(response.status, response.statusText, response);
  }

  const contentType = response.headers.get('Content-Type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  if (contentType.includes('text/')) {
    return response.text() as unknown as T;
  }

  if (contentType.includes('application/octet-stream')) {
    return response.blob() as unknown as T;
  }

  if (contentType.includes('video/') || contentType.includes('audio/')) {
    return response as T;
  }

  throw new Error(`Unsupported content type: ${contentType}`);
};
