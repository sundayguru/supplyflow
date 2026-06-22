const allowedTags = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  'p',
  'br',
  'ul',
  'ol',
  'li',
]);

export const sanitizeRichText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (tag, name: string) => {
      const normalizedName = name.toLowerCase();
      if (!allowedTags.has(normalizedName)) {
        return '';
      }
      return tag.startsWith('</')
        ? `</${normalizedName}>`
        : `<${normalizedName}>`;
    })
    .slice(0, 50_000);

const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

export const richTextToPlainText = (html: string) =>
  decodeEntities(
    sanitizeRichText(html)
      .replace(/<li>/gi, '\n- ')
      .replace(/<\/(p|li|ul|ol)>/gi, '\n')
      .replace(/<br>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
