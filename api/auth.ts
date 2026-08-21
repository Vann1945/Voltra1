import { Auth } from '@auth/core';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authConfig } from '../auth.config.js';
import { safeLogError } from '../src/lib/safeLog.js';

function toWebRequest(req: VercelRequest): Request {
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers.host;
  const url = `${protocol}://${host}${req.url}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(', '));
  }

  let body: string | undefined;

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const contentType = (req.headers['content-type'] as string) || '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = req.body as Record<string, string>;
      body = new URLSearchParams(params).toString();

      if (params?.json === 'true') {
        headers.set('X-Auth-Return-Redirect', '1');
      }
    } else if (contentType.includes('application/json')) {
      body = JSON.stringify(req.body);
    } else if (typeof req.body === 'string') {
      body = req.body;
    } else if (req.body !== undefined && req.body !== null) {
      body = JSON.stringify(req.body);
    }
  }

  return new Request(url, {
    method: req.method,
    headers,
    body,
  });
}

async function sendWebResponse(webRes: Response, res: VercelResponse) {
  res.status(webRes.status);
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') {
      res.setHeader(key, value);
    }
  });
  const headersAny = webRes.headers as unknown as { getSetCookie?: () => string[] };
  const cookies = typeof headersAny.getSetCookie === 'function'
    ? headersAny.getSetCookie()
    : webRes.headers.get('set-cookie')
      ? [webRes.headers.get('set-cookie') as string]
      : [];
  if (cookies.length > 0) {
    res.setHeader('set-cookie', cookies);
  }
  const text = await webRes.text();
  res.send(text);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const webRequest = toWebRequest(req);
    const webResponse = await Auth(webRequest, authConfig);
    await sendWebResponse(webResponse, res);
  } catch (err) {
    safeLogError('[AuthJS] handler error:', err);
    res.status(500).json({ error: 'Internal authentication error.' });
  }
}
