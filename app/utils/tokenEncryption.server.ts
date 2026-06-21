const decodeBase64 = (value: string) =>
  Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const encodeBase64 = (value: Uint8Array) => {
  let binary = '';
  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const importKey = (encodedKey: string) => {
  const bytes = decodeBase64(encodedKey);
  if (bytes.byteLength !== 32) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key',
    );
  }
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
};

export const encryptToken = async (token: string, encodedKey: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await importKey(encodedKey),
    new TextEncoder().encode(token),
  );
  return `v1.${encodeBase64(iv)}.${encodeBase64(new Uint8Array(encrypted))}`;
};

export const decryptToken = async (value: string, encodedKey: string) => {
  const [version, encodedIv, encodedCiphertext] = value.split('.');
  if (version !== 'v1' || !encodedIv || !encodedCiphertext) {
    throw new Error('Unsupported encrypted token format');
  }
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decodeBase64(encodedIv) },
    await importKey(encodedKey),
    decodeBase64(encodedCiphertext),
  );
  return new TextDecoder().decode(decrypted);
};
