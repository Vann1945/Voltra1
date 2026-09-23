import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function base() {
  return (process.env.TOOLCOIN_API_URL || process.env.NEXT_PUBLIC_TOOLCOIN_API_URL || '')
    .replace(/\/$/, '')
    .trim();
}

/** src/app/api/toolcoin/home-shelves/route.ts */
export async function GET() {
  const b = base();
  if (!b) return NextResponse.json({ shelves: {}, error: 'TOOLCOIN_API_URL missing' }, { status: 503 });
  try {
    const res = await fetch(`${b}/api/home-shelves`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({ shelves: {} }));
    return NextResponse.json(data, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ shelves: {}, error: String(e) }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const b = base();
  if (!b) return NextResponse.json({ error: 'TOOLCOIN_API_URL missing' }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  try {
    const res = await fetch(`${b}/api/home-shelves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
