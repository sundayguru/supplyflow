import { env } from 'cloudflare:workers';

/**
 * Uploads a file to the R2 course content bucket.
 * Returns the object key that can be stored in the database.
 */
export const uploadToR2 = async (
  key: string,
  data: ReadableStream | ArrayBuffer | Blob | string,
  contentType: string,
): Promise<{ key: string; size: number } | null> => {
  try {
    const bucket = env.MEDIA;

    if (!bucket) {
      console.error('R2 bucket MEDIA is not configured');
      return null;
    }

    await bucket.put(key, data, {
      httpMetadata: { contentType },
    });

    const object = await bucket.head(key);
    return { key, size: object?.size ?? 0 };
  } catch (e) {
    console.error('Error uploading to R2:', e);
    return null;
  }
};

/**
 * Deletes a file from the R2 course content bucket.
 */
export const deleteFromR2 = async (key: string): Promise<boolean> => {
  try {
    const bucket = env.MEDIA;

    if (!bucket) {
      console.error('R2 bucket MEDIA is not configured');
      return false;
    }

    await bucket.delete(key);
    return true;
  } catch (e) {
    console.error('Error deleting from R2:', e);
    return false;
  }
};

/**
 * Gets a file from the R2 course content bucket.
 */
export const getFromR2 = async (key: string, options?: R2GetOptions) => {
  try {
    const bucket = env.MEDIA;

    if (!bucket) {
      console.error('R2 bucket MEDIA is not configured');
      return null;
    }

    return await bucket.get(key, options);
  } catch (e) {
    console.error('Error getting from R2:', e);
    return null;
  }
};

/**
 * Generates a unique key for course content in R2.
 */
export const generateContentKey = (
  courseId: string,
  filename: string,
): string => {
  const timestamp = Date.now();
  return `courses/${courseId}/${timestamp}-${filename}`;
};

const COURSE_SERVE_PREFIX = '/api/course/serve/';

/**
 * Extracts an R2 object key from an app-served media URL.
 */
export const getR2KeyFromServeUrl = (url?: string | null): string | null => {
  if (!url?.startsWith(COURSE_SERVE_PREFIX)) {
    return null;
  }

  return decodeURIComponent(url.slice(COURSE_SERVE_PREFIX.length));
};
