import { Auth } from '@auth/core';
import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/auth.config';
import { safeLogError } from '@/lib/safeLog';

// NextRequest sudah mengimplementasikan Fetch API `Request`, jadi Auth.js core
// (@auth/core) bisa langsung menerimanya tanpa perlu adapter konversi manual
// seperti versi Vercel Serverless Function yang lama.

function isSessionRequest(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname.replace(/\/+$/, '');
  return request.method === 'GET' && pathname.endsWith('/session');
}

async function handleAuth(request: NextRequest) {
  if (!authConfig.secret) {
    if (isSessionRequest(request)) {
      return NextResponse.json(null, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }
    return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 503 });
  }

  try {
    return await Auth(request, authConfig);
  } catch (err) {
    safeLogError('[AuthJS] handler error:', err);
    if (isSessionRequest(request)) {
      return NextResponse.json(null);
    }
    return NextResponse.json({ error: 'Internal authentication error.' }, { status: 500 });
  }
}

export const GET = handleAuth;
export const POST = handleAuth;
