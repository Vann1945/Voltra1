import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { query, queryOne } from '../src/lib/db.js';
import { ensureFeatureTables } from '../src/lib/featureSchema.js';
import { getSessionUser, requireUser } from '../src/lib/apiAuth.js';
import { safeLogError } from '../src/lib/safeLog.js';

function isSafeUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length < 1 || value.length > 2000) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function toVersion(row: any) {
  return {
    id: row.id,
    addonId: row.addon_id,
    version: row.version,
    downloadUrl: row.download_url,
    changelog: row.changelog || '',
    compatibilityNotes: row.compatibility_notes || '',
    createdAt: new Date(row.created_at).toISOString(),
  };
}

async function canAccessAddon(req: VercelRequest, addonId: string) {
  const addon = await queryOne<{ status: string; author_id: string }>('SELECT status, author_id FROM addons WHERE id = ?', [addonId]);
  if (!addon) return { addon: null, user: null, allowed: false };
  const user = await getSessionUser(req);
  const allowed = addon.status === 'approved' || user?.uid === addon.author_id || user?.role === 'admin';
  return { addon, user, allowed };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const addonId = typeof req.query.addonId === 'string' ? req.query.addonId : typeof req.body?.addonId === 'string' ? req.body.addonId : '';
  const versionId = typeof req.query.id === 'string' ? req.query.id : typeof req.body?.id === 'string' ? req.body.id : '';
  if (!addonId) return res.status(400).json({ error: 'addonId is required.' });

  try {
    await ensureFeatureTables();
    const access = await canAccessAddon(req, addonId);
    if (!access.addon) return res.status(404).json({ error: 'Add-on not found.' });
    if (!access.allowed) return res.status(404).json({ error: 'Add-on not found.' });

    if (req.method === 'GET') {
      const rows = await query<any>('SELECT * FROM addon_versions WHERE addon_id = ? ORDER BY created_at DESC', [addonId]);
      return res.status(200).json({ versions: rows.map(toVersion) });
    }

    const user = await requireUser(req);
    if (access.addon.author_id !== user.uid && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the project owner can manage versions.' });
    }

    const body = req.body || {};
    const version = typeof body.version === 'string' ? body.version.trim() : '';
    const downloadUrl = typeof body.downloadUrl === 'string' ? body.downloadUrl.trim() : '';
    const changelog = typeof body.changelog === 'string' ? body.changelog.trim() : '';
    const compatibilityNotes = typeof body.compatibilityNotes === 'string' ? body.compatibilityNotes.trim() : '';
    if (!version || version.length > 80) return res.status(400).json({ error: 'Version is required and must be at most 80 characters.' });
    if (!isSafeUrl(downloadUrl)) return res.status(400).json({ error: 'A valid download URL is required.' });
    if (changelog.length > 10000) return res.status(400).json({ error: 'Changelog must be at most 10,000 characters.' });
    if (compatibilityNotes.length > 1000) return res.status(400).json({ error: 'Compatibility notes must be at most 1,000 characters.' });

    if (req.method === 'POST') {
      const countRow = await queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM addon_versions WHERE addon_id = ?', [addonId]);
      if (Number(countRow?.count || 0) >= 2) return res.status(400).json({ error: 'An add-on can have at most two versions.' });
      const duplicate = await queryOne('SELECT id FROM addon_versions WHERE addon_id = ? AND version = ?', [addonId, version]);
      if (duplicate) return res.status(409).json({ error: 'That version already exists for this add-on.' });
      const id = crypto.randomUUID();
      await query(
        'INSERT INTO addon_versions (id, addon_id, version, download_url, changelog, compatibility_notes) VALUES (?, ?, ?, ?, ?, ?)',
        [id, addonId, version, downloadUrl, changelog, compatibilityNotes]
      );
      await query('UPDATE addons SET download_url = ? WHERE id = ?', [downloadUrl, addonId]);
      return res.status(201).json({ id, addonId, version, downloadUrl, changelog, compatibilityNotes, createdAt: new Date().toISOString() });
    }

    if (req.method === 'PATCH') {
      if (!versionId) return res.status(400).json({ error: 'Version id is required.' });
      const existing = await queryOne<{ id: string; addon_id: string }>('SELECT id, addon_id FROM addon_versions WHERE id = ?', [versionId]);
      if (!existing || existing.addon_id !== addonId) return res.status(404).json({ error: 'Version not found.' });
      const duplicate = await queryOne('SELECT id FROM addon_versions WHERE addon_id = ? AND version = ? AND id <> ?', [addonId, version, versionId]);
      if (duplicate) return res.status(409).json({ error: 'That version already exists for this add-on.' });
      await query(
        'UPDATE addon_versions SET version = ?, download_url = ?, changelog = ?, compatibility_notes = ? WHERE id = ?',
        [version, downloadUrl, changelog, compatibilityNotes, versionId]
      );
      await query('UPDATE addons SET download_url = ? WHERE id = ?', [downloadUrl, addonId]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    safeLogError('[api/versions] error:', err);
    const status = err?.statusCode || 500;
    return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to process add-on version.' });
  }
}
