import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function toolcoinBase(): string {
  return (
    process.env.TOOLCOIN_API_URL ||
    process.env.NEXT_PUBLIC_TOOLCOIN_API_URL ||
    'https://toolcoin.rakzvolt.my.id'
  ).replace(/\/$/, '').trim();
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const base = toolcoinBase();
  if (!base) {
    return NextResponse.json({ error: 'TOOLCOIN_API_URL not configured' }, { status: 503 });
  }
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
  const on = req.nextUrl.searchParams.get('on') !== 'false';
  try {
    const upstream = `${base}/api/featured/${encodeURIComponent(id)}?on=${on ? 'true' : 'false'}`;
    const res = await fetch(upstream, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, {
      status: res.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'featured proxy failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return POST(req, context);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const base = toolcoinBase();
  if (!base) {
    return NextResponse.json({ error: 'TOOLCOIN_API_URL not configured' }, { status: 503 });
  }
  const { id } = await context.params;
  try {
    const res = await fetch(`${base}/api/featured/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      { error: 'featured proxy failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
