import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Auth } from '@auth/core';
import { authConfig } from '../auth.config.js';
import { safeLogError } from '../src/lib/safeLog.js';

function getFormBody(body: unknown): URLSearchParams | null {
  if (typeof body === 'string') return new URLSearchParams(body);
  if (body && typeof body === 'object') {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (value !== undefined && value !== null) params.set(key, String(value));
    }
    return params;
  }
  return null;
}

function toWebRequest(req: VercelRequest): Request {
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers.host;
  const url = `${protocol}://${host}${req.url || ''}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(', '));
  }

  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const contentType = (req.headers['content-type'] as string) || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = getFormBody(req.body);
      if (params) {
        body = params.toString();
        if (params.get('json') === 'true') headers.set('X-Auth-Return-Redirect', '1');
      }
    } else if (contentType.includes('application/json')) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
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

function isSessionRequest(req: VercelRequest): boolean {
  const pathname = (req.url || '').split('?')[0].replace(/\/+$/, '');
  return req.method === 'GET' && pathname.endsWith('/session');
}

async function sendWebResponse(webRes: Response, res: VercelResponse) {
  res.status(webRes.status);
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') res.setHeader(key, value);
  });

  const headers = webRes.headers as Headers & { getSetCookie?: () => string[] };
  const cookies = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : webRes.headers.get('set-cookie')
      ? [webRes.headers.get('set-cookie') as string]
      : [];
  if (cookies.length > 0) res.setHeader('set-cookie', cookies);

  const text = await webRes.text();
  res.send(text);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authConfig.secret) {
    // A public session probe must be safe on first boot/preview deployments.
    // Auth actions still report a useful configuration error instead of a
    // generic Auth.js 500 response.
    if (isSessionRequest(req)) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return res.status(200).json(null);
    }
    return res.status(503).json({ error: 'Authentication is not configured.' });
  }

  try {
    const webRequest = toWebRequest(req);
    const webResponse = await Auth(webRequest, authConfig);
    await sendWebResponse(webResponse, res);
  } catch (err) {
    safeLogError('[AuthJS] handler error:', err);
    if (isSessionRequest(req)) {
      res.status(200).json(null);
    } else {
      res.status(500).json({ error: 'Internal authentication error.' });
    }
  }
}
