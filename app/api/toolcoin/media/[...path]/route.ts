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

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

/**
 * Proxy media from ToolCoin Railway.
 * Query: ?f=webp&q=75&w=1200 — best-effort compress via sharp if installed.
 * fetch-pack is always streamed (no recompress).
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const base = toolcoinBase();
  if (!base) {
    return NextResponse.json(
      { error: 'TOOLCOIN_API_URL not configured' },
      { status: 503 }
    );
  }

  const { path: parts = [] } = await context.params;
  const rel = parts.join('/');
  if (!rel) {
    return NextResponse.json({ error: 'missing path' }, { status: 400 });
  }

  const isFetchPack = rel.startsWith('fetch-pack/');
  // Strip our transform query from upstream URL
  const upstream = `${base}/api/${rel}`;

  try {
    const res = await fetch(upstream, {
      headers: {
        Accept: '*/*',
        ...(req.headers.get('range') ? { Range: req.headers.get('range')! } : {}),
      },
      cache: isFetchPack ? 'no-store' : 'force-cache',
    });

    if (isFetchPack) {
      const headers = new Headers();
      const ct = res.headers.get('content-type') || 'application/octet-stream';
      headers.set('Content-Type', ct);
      const cd = res.headers.get('content-disposition');
      if (cd) headers.set('Content-Disposition', cd);
      else {
        const id = rel.split('/')[1] || 'pack';
        headers.set('Content-Disposition', `attachment; filename="${id}.mcaddon"`);
      }
      const cl = res.headers.get('content-length');
      if (cl) headers.set('Content-Length', cl);
      headers.set('Cache-Control', 'private, no-store');
      return new NextResponse(res.body, { status: res.status, headers });
    }

    const wantWebp = (req.nextUrl.searchParams.get('f') || '').toLowerCase() === 'webp';
    const quality = Math.min(90, Math.max(40, Number(req.nextUrl.searchParams.get('q') || 78) || 78));
    const maxW = Math.min(2000, Math.max(0, Number(req.nextUrl.searchParams.get('w') || 0) || 0));

    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get('content-type') || 'application/octet-stream';

    if (wantWebp && !ct.includes('svg')) {
      try {
        // Optional dependency — if sharp is not installed, fall through
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const sharp = (await import('sharp')).default;
        let pipeline = sharp(buf).rotate();
        if (maxW > 0) pipeline = pipeline.resize({ width: maxW, withoutEnlargement: true });
        const out = await pipeline.webp({ quality, effort: 4 }).toBuffer();
        return new NextResponse(out, {
          status: 200,
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          },
        });
      } catch {
        // sharp missing or bad image — serve original
      }
    }

    return new NextResponse(buf, {
      status: res.status,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: 'media proxy failed',
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 502 }
    );
  }
}
