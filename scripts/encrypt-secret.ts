import { encryptSecret } from '../src/lib/secretsEncryption.js';

const plaintext = process.argv[2];

if (!plaintext) {
  console.error('Usage: npx tsx scripts/encrypt-secret.ts "<secret value to encrypt>"');
  process.exit(1);
}

try {
  const encrypted = encryptSecret(plaintext);
  console.log('\nEncrypted result (save as a new env var in Vercel):\n');
  console.log(encrypted);
  console.log('');
} catch (err) {
  console.error('Encryption failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}
