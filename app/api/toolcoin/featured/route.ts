import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function toolcoinBase(): string {
  return (
    process.env.TOOLCOIN_API_URL ||
    process.env.NEXT_PUBLIC_TOOLCOIN_API_URL ||
    'https://toolcoin.rakzvolt.my.id'
  ).replace(/\/$/, '').trim();
}

export async function GET() {
  const base = toolcoinBase();
  if (!base) {
    return NextResponse.json(
      { error: 'TOOLCOIN_API_URL not configured', ids: [], count: 0 },
      { status: 503 }
    );
  }
  try {
    const res = await fetch(`${base}/api/featured`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({ ids: [], count: 0 }));
    return NextResponse.json(data, {
      status: res.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: 'featured proxy failed',
        detail: e instanceof Error ? e.message : String(e),
        ids: [],
        count: 0,
      },
      { status: 502 }
    );
  }
}
