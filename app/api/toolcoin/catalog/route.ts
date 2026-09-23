import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function toolcoinBase(): string {
  const raw =
    process.env.TOOLCOIN_API_URL ||
    process.env.NEXT_PUBLIC_TOOLCOIN_API_URL ||
    '';
  return raw.replace(/\/$/, '').trim();
}

export async function GET(req: NextRequest) {
  const base = toolcoinBase();
  if (!base) {
    return NextResponse.json(
      {
        error: 'TOOLCOIN_API_URL not configured',
        hint: 'Set TOOLCOIN_API_URL or NEXT_PUBLIC_TOOLCOIN_API_URL to your Railway URL (no trailing slash), then redeploy.',
        total: 0,
        page: 1,
        limit: 0,
        has_more: false,
        items: [],
      },
      { status: 503 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const upstream = new URL(`${base}/api/catalog`);

  const passthrough = [
    'page',
    'limit',
    'category',
    'q',
    'sort',
    'creator',
    'tag',
    'item',
    'enrich',
  ] as const;

  for (const key of passthrough) {
    const value = sp.get(key);
    if (value !== null && value !== '') {
      upstream.searchParams.set(key, value);
    }
  }

  if (!upstream.searchParams.has('page')) upstream.searchParams.set('page', '1');
  if (!upstream.searchParams.has('limit')) upstream.searchParams.set('limit', '50');
  if (!upstream.searchParams.has('category')) upstream.searchParams.set('category', 'all');

  try {
    const res = await fetch(upstream.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          error: 'Upstream returned non-JSON',
          status: res.status,
          body: text.slice(0, 200),
        },
        { status: 502 }
      );
    }
    const isDetail = Boolean(sp.get('item') || sp.get('creator'));
    return NextResponse.json(data, {
      status: res.status,
      headers: {
        'Cache-Control': isDetail
          ? 'private, no-store'
          : 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Failed to reach ToolCoin API',
        detail: err instanceof Error ? err.message : String(err),
        base,
      },
      { status: 502 }
    );
  }
}
