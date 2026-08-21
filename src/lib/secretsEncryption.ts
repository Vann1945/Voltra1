import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const FORMAT_VERSION = 'v1';

function getMasterKey(): Buffer {
  const raw = process.env.ENCRYPTION_MASTER_KEY;
  if (!raw) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY belum diset. Generate dengan: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_MASTER_KEY harus 32 byte (256-bit) dalam base64.');
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [FORMAT_VERSION, iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(encoded: string): string {
  const parts = encoded.split(':');
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error('Format secret terenkripsi tidak dikenali.');
  }
  const [, ivB64, authTagB64, dataB64] = parts;
  const key = getMasterKey();
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

const decryptedCache = new Map<string, string>();

export function getEncryptedEnv(encVarName: string, plainFallbackVarName?: string): string | undefined {
  if (decryptedCache.has(encVarName)) return decryptedCache.get(encVarName);

  const encValue = process.env[encVarName];
  if (encValue) {
    try {
      const plaintext = decryptSecret(encValue);
      decryptedCache.set(encVarName, plaintext);
      return plaintext;
    } catch (err) {
      console.error(`[secretsEncryption] Decryption failed ${encVarName}:`, err instanceof Error ? err.message : err);
      return undefined;
    }
  }

  if (plainFallbackVarName) {
    return process.env[plainFallbackVarName];
  }
  return undefined;
}
