export const getYouTubeVideoId = (url: string) => {
  if (!url.trim()) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = parsedUrl.pathname.slice(1).trim();
      return id || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsedUrl.pathname === '/watch') {
        return parsedUrl.searchParams.get('v');
      }

      if (
        parsedUrl.pathname.startsWith('/embed/') ||
        parsedUrl.pathname.startsWith('/shorts/')
      ) {
        const [, , id] = parsedUrl.pathname.split('/');
        return id || null;
      }
    }
  } catch {
    return null;
  }

  return null;
};

export const isYouTubeUrl = (url: string) => Boolean(getYouTubeVideoId(url));

export const getYouTubeEmbedUrl = (url: string) => {
  const videoId = getYouTubeVideoId(url);

  if (!videoId) {
    return null;
  }

  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
};
