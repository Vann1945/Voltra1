import { describe, it, expect, vi } from 'vitest';
import addonsHandler from '../api/addons';
import reviewsHandler from '../api/reviews';
import uploadHandler from '../api/upload-image';

// Mock Vercel Request & Response
function createMockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res;
}

describe('API Unit Tests (Security & Validation)', () => {
  it('GET /api/addons should return empty array if TIDB_HOST is missing', async () => {
    const req = { method: 'GET', query: {} } as any;
    const res = createMockRes();

    // Simulasikan tidak ada DB
    const oldHost = process.env.TIDB_HOST;
    delete process.env.TIDB_HOST;

    await addonsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ addons: [] });

    process.env.TIDB_HOST = oldHost;
  });

  it('POST /api/addons should return 401 Unauthorized without auth cookie', async () => {
    const req = { method: 'POST', query: {}, body: { title: 'Test' }, headers: {}, cookies: {} } as any;
    const res = createMockRes();

    await addonsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('GET /api/reviews should require addonId', async () => {
    const req = { method: 'GET', query: {} } as any;
    const res = createMockRes();

    await reviewsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'addonId is required.' });
  });

  it('POST /api/upload-image should return 401 without auth', async () => {
    const req = { method: 'POST', query: {}, body: { imageBase64: 'data:image/png;base64,iVBORw0K' }, headers: {}, cookies: {} } as any;
    const res = createMockRes();

    await uploadHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('DELETE /api/reviews should return 401 without auth cookie', async () => {
    const req = { method: 'DELETE', query: { id: 'review-1' }, headers: {}, cookies: {} } as any;
    const res = createMockRes();

    await reviewsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('DELETE /api/reviews should require authentication before accessing review data', async () => {
    const req = { method: 'DELETE', query: {}, headers: {}, cookies: {} } as any;
    const res = createMockRes();

    await reviewsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
