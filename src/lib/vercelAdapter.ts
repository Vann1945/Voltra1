import { NextRequest, NextResponse } from 'next/server';

/**
 * Adapter kompatibilitas: kode API asli (folder /api di project Vite lama)
 * ditulis dengan gaya Vercel Serverless Function `(req: VercelRequest, res: VercelResponse)`.
 * Daripada menulis ulang logika bisnis di setiap handler (resiko bug tinggi & rawan salah),
 * adapter ini membungkus handler lama supaya bisa langsung dipakai sebagai
 * Next.js App Router Route Handler (`export const GET/POST/...`).
 *
 * Handler asli tetap dipertahankan apa adanya di `src/api-handlers/*.ts`
 * (hanya path import yang disesuaikan), dipanggil lewat `adaptVercelHandler(handler)`.
 */

type QueryValue = string | string[] | undefined;

export interface MinimalVercelRequest {
  method?: string;
  url?: string;
  headers: Record<string, string>;
  query: Record<string, QueryValue>;
  body: any;
  cookies: Record<string, string>;
}

export interface MinimalVercelResponse {
  status: (code: number) => MinimalVercelResponse;
  json: (data: any) => MinimalVercelResponse;
  send: (data: any) => MinimalVercelResponse;
  setHeader: (key: string, value: string | string[]) => MinimalVercelResponse;
  end: (data?: any) => MinimalVercelResponse;
  redirect: (statusOrUrl: number | string, url?: string) => MinimalVercelResponse;
}

export type VercelStyleHandler = (
  req: MinimalVercelRequest,
  res: MinimalVercelResponse
) => any | Promise<any>;

type RouteContext = { params: Promise<Record<string, string | string[]>> };

async function buildVercelRequest(request: NextRequest, context?: RouteContext): Promise<MinimalVercelRequest> {
  const url = new URL(request.url);
  const query: Record<string, QueryValue> = {};

  url.searchParams.forEach((value, key) => {
    const existing = query[key];
    if (existing === undefined) query[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else query[key] = [existing, value];
  });

  if (context) {
    const params = await context.params;
    for (const [key, value] of Object.entries(params || {})) {
      query[key] = value;
    }
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const cookies: Record<string, string> = {};
  request.cookies.getAll().forEach((c) => {
    cookies[c.name] = c.value;
  });

  let body: any = undefined;
  const method = request.method;
  if (method !== 'GET' && method !== 'HEAD') {
    const contentType = headers['content-type'] || '';
    try {
      if (contentType.includes('application/json')) {
        const text = await request.text();
        body = text ? JSON.parse(text) : {};
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await request.text();
        body = Object.fromEntries(new URLSearchParams(text).entries());
      } else if (contentType.includes('multipart/form-data')) {
        const form = await request.formData();
        const obj: Record<string, any> = {};
        form.forEach((value, key) => {
          obj[key] = value;
        });
        body = obj;
      } else {
        const text = await request.text();
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            body = text;
          }
        }
      }
    } catch {
      body = undefined;
    }
  }

  return {
    method,
    url: url.pathname + url.search,
    headers,
    query,
    body,
    cookies,
  };
}

export function adaptVercelHandler(handler: VercelStyleHandler) {
  return async function routeHandler(request: NextRequest, context?: RouteContext) {
    const vReq = await buildVercelRequest(request, context);

    let statusCode = 200;
    const responseHeaders = new Headers();
    const cookieHeaders: string[] = [];
    let resolvedBody: any = null;
    let redirectResponse: NextResponse | null = null;

    const vRes: MinimalVercelResponse = {
      status(code: number) {
        statusCode = code;
        return vRes;
      },
      json(data: any) {
        resolvedBody = JSON.stringify(data);
        if (!responseHeaders.has('Content-Type')) {
          responseHeaders.set('Content-Type', 'application/json');
        }
        return vRes;
      },
      send(data: any) {
        if (typeof data === 'string') {
          resolvedBody = data;
        } else if (data === undefined || data === null) {
          resolvedBody = null;
        } else {
          resolvedBody = JSON.stringify(data);
          if (!responseHeaders.has('Content-Type')) {
            responseHeaders.set('Content-Type', 'application/json');
          }
        }
        return vRes;
      },
      setHeader(key: string, value: string | string[]) {
        if (key.toLowerCase() === 'set-cookie') {
          const arr = Array.isArray(value) ? value : [value];
          cookieHeaders.push(...arr);
        } else {
          responseHeaders.set(key, Array.isArray(value) ? value.join(', ') : value);
        }
        return vRes;
      },
      end(data?: any) {
        if (data !== undefined) resolvedBody = data;
        return vRes;
      },
      redirect(statusOrUrl: number | string, url?: string) {
        const status = typeof statusOrUrl === 'number' ? statusOrUrl : 302;
        const target = typeof statusOrUrl === 'string' ? statusOrUrl : (url as string);
        redirectResponse = NextResponse.redirect(new URL(target, request.url), status);
        return vRes;
      },
    };

    await handler(vReq, vRes);

    if (redirectResponse) {
      for (const cookie of cookieHeaders) {
        redirectResponse.headers.append('set-cookie', cookie);
      }
      return redirectResponse;
    }

    for (const cookie of cookieHeaders) {
      responseHeaders.append('set-cookie', cookie);
    }

    return new NextResponse(resolvedBody, { status: statusCode, headers: responseHeaders });
  };
}
