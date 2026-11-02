export const splitMimeMultipart = (body: Uint8Array, boundary: string) => {
  const marker = new TextEncoder().encode(`--${boundary}`);
  const parts: Uint8Array[] = [];
  let partStart: number | null = null;
  let searchFrom = 0;

  while (searchFrom < body.length) {
    const index = body.indexOf(marker[0], searchFrom);
    if (index < 0) {
      break;
    }
    searchFrom = index + 1;
    if (
      (index > 0 && body[index - 1] !== 10) ||
      !marker.every((byte, offset) => body[index + offset] === byte)
    ) {
      continue;
    }

    let cursor = index + marker.length;
    const closing = body[cursor] === 45 && body[cursor + 1] === 45;
    if (closing) {
      cursor += 2;
    }
    while (body[cursor] === 32 || body[cursor] === 9) {
      cursor += 1;
    }
    if (body[cursor] === 13 && body[cursor + 1] === 10) {
      cursor += 2;
    } else if (body[cursor] === 10) {
      cursor += 1;
    } else if (!(closing && cursor === body.length)) {
      continue;
    }

    if (partStart !== null) {
      let end = index;
      if (end > partStart && body[end - 1] === 10) {
        end -= 1;
        if (end > partStart && body[end - 1] === 13) {
          end -= 1;
        }
      }
      parts.push(body.slice(partStart, end));
    }
    if (closing) {
      partStart = null;
      break;
    }
    partStart = cursor;
    searchFrom = cursor;
  }
  if (partStart !== null && partStart < body.length) {
    parts.push(body.slice(partStart));
  }
  return parts;
};
