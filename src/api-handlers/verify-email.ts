import type { MinimalVercelRequest as VercelRequest, MinimalVercelResponse as VercelResponse } from '@/lib/vercelAdapter';
import { query, queryOne } from '@/lib/db';
import { safeLogError } from '@/lib/safeLog';
import { timingSafeEqual } from '@/lib/timingSafe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { token, uid } = req.query;
    if (typeof token !== 'string' || typeof uid !== 'string') {
      return res.status(400).send('Link tidak valid.');
    }

    const user = await queryOne<{
      email_verified: number;
      verify_token: string | null;
      verify_token_expires: number | null;
    }>('SELECT email_verified, verify_token, verify_token_expires FROM users WHERE id = ? LIMIT 1', [uid]);

    if (!user) return res.status(404).send('Account not found.');

    if (user.email_verified) {
      return res.redirect(302, '/?verified=already');
    }
    if (!timingSafeEqual(user.verify_token, token) || (user.verify_token_expires && Date.now() > user.verify_token_expires)) {
      return res.status(400).send('The verification link is invalid or has expired.');
    }

    await query(
      'UPDATE users SET email_verified = TRUE, verify_token = NULL, verify_token_expires = NULL WHERE id = ?',
      [uid]
    );
    return res.redirect(302, '/?verified=success');
  } catch (err: any) {
    safeLogError('[VerifyJS] handler error:', err);
    return res.status(500).send('An error occurred on the server. Please try again later.');
  }
}
