'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp, Check, ExternalLink, LayoutGrid, MessageSquare, Plus, RotateCcw, Upload, Users, X,
  Bell, DollarSign, Wallet, BarChart3, PieChart, Filter, Eye, EyeOff, Edit2, Trash2, Search,
  AlertTriangle, Sparkles, Inbox, Download, Star, Package,
} from '@/components/icons/animated';
import type { Addon, Channel } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { getButtonClasses, getInputClasses } from '@/lib/designSystem';
import { BarChart, DonutChart, LineChart } from '@/components/AnalyticsChart';

interface CreatorDashboardProps {
  addons: Addon[];
  onNavigate: (view: 'home' | 'settings') => void;
  onOpenUpload: () => void;
  onAddonsChanged?: () => void;
}

type ChannelWithUpdates = Channel & { updates?: Array<{ id: string; title: string; body: string; status: string; publish_at?: string | null }> };

type CreatorTab = 'overview' | 'projects' | 'analytics' | 'earnings' | 'channels' | 'notifications';

const inputClass = 'min-h-11 w-full rounded-xl border border-parchment-border bg-parchment px-3 text-sm font-medium text-ink-900 outline-none transition focus:border-terracotta focus:ring-2 focus:ring-terracotta/20';

const ESTIMATED_RATE_PER_DOWNLOAD = 50;

function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

function daysAgoLabel(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Hari ini';
  if (days === 1) return 'Kemarin';
  if (days < 7) return `${days} hari lalu`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} minggu lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function buildDailyTrend(addons: Addon[], numDays = 14) {
  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = numDays - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }
  for (const addon of addons) {
    const key = new Date(addon.createdAt).toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return Array.from(buckets.entries()).map(([key, value]) => ({
    label: new Date(key).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    value,
  }));
}

const TABS: Array<{ id: CreatorTab; label: string; Icon: React.ElementType }> = [
  { id: 'overview', label: 'Overview', Icon: LayoutGrid },
  { id: 'projects', label: 'Proyek Saya', Icon: Package },
  { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
  { id: 'earnings', label: 'Earnings', Icon: Wallet },
  { id: 'channels', label: 'Channel', Icon: Users },
  { id: 'notifications', label: 'Notifikasi', Icon: Bell },
];

export function CreatorDashboard({ addons, onNavigate, onOpenUpload, onAddonsChanged }: CreatorDashboardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<CreatorTab>('overview');
  const [channels, setChannels] = useState<ChannelWithUpdates[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState<string | null>(null);
  const [channelForm, setChannelForm] = useState({ name: '', slug: '', description: '' });
  const [updateForm, setUpdateForm] = useState({ title: '', body: '', publishAt: '' });
  const [saving, setSaving] = useState(false);

  // --- Proyek Saya (manajemen addon dari dashboard) ---
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', downloadUrl: '', demoUrl: '', allowComments: true });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const creatorAddons = useMemo(() => addons.filter(addon => addon.authorId === user?.uid), [addons, user?.uid]);
  const pendingCount = creatorAddons.filter(addon => addon.status === 'pending').length;
  const approvedCount = creatorAddons.filter(addon => addon.status === 'approved').length;
  const rejectedCount = creatorAddons.filter(addon => addon.status === 'rejected').length;
  const totalDownloads = creatorAddons.reduce((sum, addon) => sum + (addon.downloadsCount || 0), 0);
  const totalLikes = creatorAddons.reduce((sum, addon) => sum + (addon.likesCount || 0), 0);
  const ratedAddons = creatorAddons.filter(addon => (addon.ratingCount || 0) > 0);
  const averageRating = ratedAddons.length > 0
    ? ratedAddons.reduce((sum, addon) => sum + (addon.averageRating || 0), 0) / ratedAddons.length
    : 0;

  const filteredProjects = useMemo(() => {
    return creatorAddons
      .filter(addon => projectStatusFilter === 'all' || addon.status === projectStatusFilter)
      .filter(addon => !projectSearch.trim() || addon.title.toLowerCase().includes(projectSearch.trim().toLowerCase()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [creatorAddons, projectStatusFilter, projectSearch]);

  const topByDownloads = useMemo(
    () => [...creatorAddons].sort((a, b) => (b.downloadsCount || 0) - (a.downloadsCount || 0)).slice(0, 6),
    [creatorAddons]
  );

  const dailyTrend = useMemo(() => buildDailyTrend(creatorAddons), [creatorAddons]);

  const notifications = useMemo(() => {
    type Notif = { id: string; kind: 'approved' | 'rejected' | 'pending' | 'update'; title: string; detail: string; date: Date };
    const items: Notif[] = [];
    for (const addon of creatorAddons) {
      if (addon.status === 'approved') items.push({ id: `${addon.id}-approved`, kind: 'approved', title: addon.title, detail: 'Disetujui dan sudah tayang di marketplace.', date: new Date(addon.createdAt) });
      if (addon.status === 'rejected') items.push({ id: `${addon.id}-rejected`, kind: 'rejected', title: addon.title, detail: 'Ditolak oleh tim moderasi. Cek kembali detail proyekmu.', date: new Date(addon.createdAt) });
      if (addon.status === 'pending') items.push({ id: `${addon.id}-pending`, kind: 'pending', title: addon.title, detail: 'Masih menunggu review admin.', date: new Date(addon.createdAt) });
    }
    for (const channel of channels) {
      for (const update of channel.updates || []) {
        if (update.status === 'published') {
          items.push({ id: `${channel.id}-${update.id}`, kind: 'update', title: `${channel.name}: ${update.title}`, detail: 'Update channel berhasil dipublikasikan.', date: new Date(update.publish_at || channel.updatedAt || channel.createdAt) });
        }
      }
    }
    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20);
  }, [creatorAddons, channels]);

  const loadChannels = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/channels?ownerId=${encodeURIComponent(user.uid)}`, { credentials: 'include', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load channels.');
      const fullChannels = await Promise.all((data.channels || []).map(async (channel: Channel) => {
        const detailResponse = await fetch(`/api/channels?id=${encodeURIComponent(channel.id)}`, { credentials: 'include', cache: 'no-store' });
        const detail = await detailResponse.json().catch(() => ({}));
        return { ...channel, updates: detail.updates || [] };
      }));
      setChannels(fullChannels);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to load channels.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadChannels(); }, [user?.uid]);

  if (!user) {
    return <section className="mx-auto min-h-[70dvh] max-w-3xl px-4 py-20 text-center"><h1 className="text-2xl font-bold text-ink-900">Sign in to open Creator Dashboard</h1><p className="mx-auto mt-3 max-w-md text-sm text-ink-900/60">Manage your uploads, channels, and community updates from one workspace.</p></section>;
  }

  const createChannel = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/channels', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(channelForm) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to create channel.');
      setChannelForm({ name: '', slug: '', description: '' });
      setShowChannelForm(false);
      await loadChannels();
      showToast('Channel created as a draft. Publish it when ready.', 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Failed to create channel.', 'error'); }
    finally { setSaving(false); }
  };

  const publishUpdate = async (event: React.FormEvent, channelId: string) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/channels?id=${encodeURIComponent(channelId)}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: updateForm.title, body: updateForm.body, publishAt: updateForm.publishAt || null }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to publish update.');
      setUpdateForm({ title: '', body: '', publishAt: '' });
      setShowUpdateForm(null);
      await loadChannels();
      showToast('Channel update published.', 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Failed to publish update.', 'error'); }
    finally { setSaving(false); }
  };

  const openEdit = (addon: Addon) => {
    setEditingAddon(addon);
    setEditForm({
      title: addon.title,
      description: addon.description,
      downloadUrl: addon.downloadUrl,
      demoUrl: addon.demoUrl || '',
      allowComments: addon.allowComments !== false,
    });
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingAddon) return;
    setProcessingId(editingAddon.id);
    try {
      const res = await fetch(`/api/addons?id=${editingAddon.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update project.');
      showToast('Proyek berhasil diperbarui.', 'success');
      setEditingAddon(null);
      onAddonsChanged?.();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update project.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const toggleUnlisted = async (addon: Addon) => {
    setProcessingId(addon.id);
    try {
      const res = await fetch(`/api/addons?id=${addon.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlisted: !addon.unlisted }),
      });
      if (!res.ok) throw new Error('failed');
      showToast(!addon.unlisted ? 'Proyek disembunyikan dari publik (draft).' : 'Proyek ditampilkan kembali ke publik.', 'success');
      onAddonsChanged?.();
    } catch {
      showToast('Gagal mengubah visibilitas proyek.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const deleteProject = async () => {
    if (!confirmDeleteId) return;
    setProcessingId(confirmDeleteId);
    try {
      const res = await fetch(`/api/addons?id=${confirmDeleteId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      showToast('Proyek berhasil dihapus.', 'success');
      onAddonsChanged?.();
    } catch {
      showToast('Gagal menghapus proyek.', 'error');
    } finally {
      setProcessingId(null);
      setConfirmDeleteId(null);
    }
  };

  const statCards: Array<{ label: string; value: number; Icon: React.ElementType }> = [
    { label: 'Projects', value: creatorAddons.length, Icon: LayoutGrid },
    { label: 'Approved', value: approvedCount, Icon: Check },
    { label: 'Pending review', value: pendingCount, Icon: RotateCcw },
    { label: 'Downloads', value: totalDownloads, Icon: TrendingUp },
  ];

  return (
    <section className="min-h-[calc(100dvh-64px)] bg-parchment pb-32">
      <div className="border-b border-parchment-border bg-parchment-raised">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-terracotta-text">Creator workspace</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">Build your audience on Voltra</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink-900/60">Publish projects, track review status, and keep your community informed through channels.</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={onOpenUpload} className={getButtonClasses('primary', 'sm')}><Upload size={15} /> New project</button><button type="button" onClick={() => setShowChannelForm(true)} className={getButtonClasses('secondary', 'sm')}><Plus size={15} /> New channel</button></div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ label, value, Icon }) => <div key={label} className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest text-ink-900/50">{label}</p><Icon size={18} className="text-terracotta-text" /></div><p className="mt-4 text-3xl font-bold tracking-tight text-ink-900">{formatNumber(value)}</p><p className="mt-1 text-xs text-ink-900/50">Updated from your current library</p></div>)}
        </div>

        {/* Tabs */}
        <div className="flex w-fit flex-wrap rounded-xl border border-parchment-border bg-parchment-raised p-1 shadow-card">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors sm:text-sm ${activeTab === id ? 'bg-terracotta text-ink-900' : 'text-ink-900/50 hover:text-ink-900'}`}
            >
              <Icon size={15} />
              {label}
              {id === 'notifications' && notifications.length > 0 && <span className="ml-1 rounded-full bg-ink-900 px-1.5 py-0.5 text-[10px] text-paper">{notifications.length}</span>}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
            <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6">
              <div className="flex items-start gap-3"><BarChart3 size={20} className="mt-0.5 text-terracotta-text" /><div><h2 className="text-xl font-bold text-ink-900">Ringkasan performa</h2><p className="mt-1 text-sm text-ink-900/55">Tren proyek baru 14 hari terakhir.</p></div></div>
              <div className="mt-6"><LineChart data={dailyTrend} height={150} /></div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-parchment-border bg-parchment p-4"><p className="text-xs font-bold uppercase tracking-widest text-ink-900/50">Total likes</p><p className="mt-2 text-2xl font-bold text-ink-900">{formatNumber(totalLikes)}</p></div>
                <div className="rounded-xl border border-parchment-border bg-parchment p-4"><p className="text-xs font-bold uppercase tracking-widest text-ink-900/50">Rating rata-rata</p><p className="mt-2 flex items-center gap-1 text-2xl font-bold text-ink-900">{averageRating.toFixed(1)} <Star size={16} className="text-terracotta-text" /></p></div>
                <div className="rounded-xl border border-parchment-border bg-parchment p-4"><p className="text-xs font-bold uppercase tracking-widest text-ink-900/50">Ditolak</p><p className="mt-2 text-2xl font-bold text-ink-900">{rejectedCount}</p></div>
              </div>
            </section>
            <aside className="space-y-4">
              <section className="rounded-2xl border border-parchment-border bg-ink-900 p-5 text-paper shadow-card"><p className="text-xs font-bold uppercase tracking-widest text-terracotta">Profile link</p><h2 className="mt-2 text-lg font-bold">Your channel appears in your bio</h2><p className="mt-2 text-sm leading-6 text-paper/70">Only you and admins can manage the channel. When it is public, its link is shown automatically on your profile.</p><div className="mt-5 rounded-xl bg-paper/10 p-3 text-sm text-paper/90">{channels.find(channel => channel.status === 'published')?.url || 'Publish a channel to show its link'}</div></section>
              <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card"><h2 className="font-bold text-ink-900">Next actions</h2><div className="mt-4 grid gap-2"><button type="button" onClick={onOpenUpload} className="flex items-center gap-3 rounded-xl bg-parchment px-3 py-3 text-left text-sm font-bold text-ink-900 hover:bg-terracotta/10"><Upload size={16} className="text-terracotta-text" /> Publish a project</button><button type="button" onClick={() => setActiveTab('projects')} className="flex items-center gap-3 rounded-xl bg-parchment px-3 py-3 text-left text-sm font-bold text-ink-900 hover:bg-terracotta/10"><Package size={16} className="text-terracotta-text" /> Kelola proyekmu</button><button type="button" onClick={() => onNavigate('settings')} className="flex items-center gap-3 rounded-xl bg-parchment px-3 py-3 text-left text-sm font-bold text-ink-900 hover:bg-terracotta/10"><Users size={16} className="text-terracotta-text" /> Tune your profile settings</button></div></section>
            </aside>
          </div>
        )}

        {activeTab === 'projects' && (
          <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div><h2 className="text-xl font-bold text-ink-900">Proyek saya</h2><p className="mt-1 text-sm text-ink-900/55">Edit, sembunyikan (draft), atau hapus proyekmu langsung dari sini.</p></div>
              <div className="flex flex-wrap gap-2">
                <label className="relative block"><span className="sr-only">Cari proyek</span><Search size={16} className="absolute left-3 top-3 text-ink-900/40" /><input value={projectSearch} onChange={e => setProjectSearch(e.target.value)} placeholder="Cari proyek…" className={`${inputClass} pl-9 sm:w-56`} /></label>
                <div className="relative"><Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-900/40" /><select value={projectStatusFilter} onChange={e => setProjectStatusFilter(e.target.value as any)} className={`${inputClass} appearance-none pl-8 pr-8`}><option value="all">Semua status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-parchment-border p-10 text-center"><Package size={26} className="mx-auto text-terracotta-text" /><p className="mt-3 text-sm font-bold text-ink-900">Belum ada proyek yang cocok</p></div>
            ) : (
              <div className="mt-6 grid gap-3">
                {filteredProjects.map(addon => (
                  <article key={addon.id} className="flex flex-col gap-4 rounded-xl border border-parchment-border bg-parchment p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <img src={addon.imageUrl} alt={addon.title} className="h-14 w-14 shrink-0 rounded-lg border border-parchment-border object-cover" referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold text-ink-900">{addon.title}</h3><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${addon.status === 'approved' ? 'bg-success/10 text-success' : addon.status === 'rejected' ? 'bg-danger/10 text-danger' : 'bg-terracotta/10 text-terracotta-text'}`}>{addon.status}</span>{addon.unlisted && <span className="shrink-0 rounded-full bg-ink-900/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink-900/60">Draft/Unlisted</span>}</div>
                        <p className="mt-1 text-xs font-bold text-ink-900/50">{formatNumber(addon.downloadsCount || 0)} downloads · {formatNumber(addon.likesCount || 0)} likes · {(addon.averageRating || 0).toFixed(1)}★</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button type="button" onClick={() => toggleUnlisted(addon)} disabled={processingId === addon.id} className={getButtonClasses('secondary', 'sm')}>{addon.unlisted ? <Eye size={14} /> : <EyeOff size={14} />} {addon.unlisted ? 'Tampilkan' : 'Sembunyikan'}</button>
                      <button type="button" onClick={() => openEdit(addon)} disabled={processingId === addon.id} className={getButtonClasses('secondary', 'sm')}><Edit2 size={14} /> Edit</button>
                      <button type="button" onClick={() => setConfirmDeleteId(addon.id)} disabled={processingId === addon.id} className={getButtonClasses('danger', 'sm')}><Trash2 size={14} /> Hapus</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'analytics' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6">
              <div className="flex items-center gap-2"><BarChart3 size={18} className="text-terracotta-text" /><h2 className="text-lg font-bold text-ink-900">Download per proyek (top 6)</h2></div>
              <div className="mt-6">
                {topByDownloads.length === 0 ? <p className="text-sm text-ink-900/50">Belum ada data.</p> : (
                  <BarChart data={topByDownloads.map(a => ({ label: a.title.length > 10 ? `${a.title.slice(0, 9)}…` : a.title, value: a.downloadsCount || 0 }))} valueFormatter={formatNumber} />
                )}
              </div>
            </section>
            <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6">
              <div className="flex items-center gap-2"><PieChart size={18} className="text-terracotta-text" /><h2 className="text-lg font-bold text-ink-900">Distribusi status proyek</h2></div>
              <div className="mt-6">
                <DonutChart data={[
                  { label: 'Approved', value: approvedCount, tone: 'success' },
                  { label: 'Pending', value: pendingCount, tone: 'terracotta' },
                  { label: 'Rejected', value: rejectedCount, tone: 'danger' },
                ]} />
              </div>
            </section>
            <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6 lg:col-span-2">
              <div className="flex items-center gap-2"><TrendingUp size={18} className="text-terracotta-text" /><h2 className="text-lg font-bold text-ink-900">Proyek baru per hari (14 hari terakhir)</h2></div>
              <div className="mt-6"><LineChart data={dailyTrend} height={180} /></div>
            </section>
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-terracotta/30 bg-terracotta/[0.06] p-4 text-sm font-medium text-ink-900/70">
              <AlertTriangle size={14} className="mr-2 inline text-terracotta-text" />
              Ini <strong>estimasi ilustratif</strong> berdasarkan jumlah download — Voltra belum punya sistem pembayaran/payout nyata, jadi angka ini bukan saldo yang bisa dicairkan.
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest text-ink-900/50">Estimasi total</p><DollarSign size={18} className="text-terracotta-text" /></div><p className="mt-4 text-3xl font-bold tracking-tight text-ink-900">{formatNumber(totalDownloads * ESTIMATED_RATE_PER_DOWNLOAD)}</p><p className="mt-1 text-xs text-ink-900/50">poin (bukan mata uang nyata)</p></div>
              <div className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest text-ink-900/50">Per download</p><Wallet size={18} className="text-terracotta-text" /></div><p className="mt-4 text-3xl font-bold tracking-tight text-ink-900">{ESTIMATED_RATE_PER_DOWNLOAD}</p><p className="mt-1 text-xs text-ink-900/50">poin/download (tetap)</p></div>
              <div className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest text-ink-900/50">Total download</p><Download size={18} className="text-terracotta-text" /></div><p className="mt-4 text-3xl font-bold tracking-tight text-ink-900">{formatNumber(totalDownloads)}</p></div>
            </div>
            <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6">
              <h2 className="text-lg font-bold text-ink-900">Estimasi per proyek</h2>
              <div className="mt-6">
                {topByDownloads.length === 0 ? <p className="text-sm text-ink-900/50">Belum ada data.</p> : (
                  <BarChart data={topByDownloads.map(a => ({ label: a.title.length > 10 ? `${a.title.slice(0, 9)}…` : a.title, value: (a.downloadsCount || 0) * ESTIMATED_RATE_PER_DOWNLOAD }))} valueFormatter={formatNumber} />
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'channels' && (
          <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6" aria-labelledby="channels-heading">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-terracotta-text">Community</p><h2 id="channels-heading" className="mt-1 text-xl font-bold text-ink-900">Your channels</h2><p className="mt-1 text-sm text-ink-900/55">Share releases, maintenance notes, and scheduled updates.</p></div><button type="button" onClick={() => setShowChannelForm(true)} className="rounded-xl border border-parchment-border p-2.5 text-terracotta-text transition hover:border-terracotta focus-visible:ring-2 focus-visible:ring-terracotta" aria-label="Create channel"><Plus size={18} /></button></div>
            {loading ? <div className="mt-6 h-28 animate-pulse rounded-xl bg-ink-900/[0.05]" /> : channels.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-parchment-border p-8 text-center"><MessageSquare size={25} className="mx-auto text-terracotta-text" /><p className="mt-3 text-sm font-bold text-ink-900">No channel yet</p><p className="mt-1 text-xs text-ink-900/55">Create a channel and its public link will appear on your profile.</p><button type="button" onClick={() => setShowChannelForm(true)} className={`mt-4 ${getButtonClasses('secondary', 'sm')}`}>Create your first channel</button></div> : <div className="mt-6 space-y-4">{channels.map(channel => <article key={channel.id} className="rounded-xl border border-parchment-border bg-parchment p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-ink-900">{channel.name}</h3><span className="rounded-full bg-terracotta/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-terracotta-text">{channel.status}</span></div><p className="mt-1 text-xs text-ink-900/55">/{channel.slug} · {channel.updateCount || 0} published updates</p>{channel.description && <p className="mt-3 text-sm leading-6 text-ink-900/65">{channel.description}</p>}</div><div className="flex shrink-0 gap-2"><a href={channel.url} target="_blank" rel="noreferrer" className="rounded-lg border border-parchment-border p-2 text-ink-900/60 hover:text-terracotta-text" aria-label={`Open ${channel.name}`}><ExternalLink size={15} /></a><button type="button" onClick={() => setShowUpdateForm(showUpdateForm === channel.id ? null : channel.id)} className={getButtonClasses('secondary', 'sm')}><MessageSquare size={14} /> Post update</button></div></div>{showUpdateForm === channel.id && <form onSubmit={event => publishUpdate(event, channel.id)} className="mt-4 grid gap-3 border-t border-parchment-border pt-4"><input required maxLength={120} className={inputClass} placeholder="Update title" value={updateForm.title} onChange={event => setUpdateForm({ ...updateForm, title: event.target.value })} /><textarea required maxLength={10000} className={`${inputClass} min-h-28 py-3`} placeholder="Tell your community what changed…" value={updateForm.body} onChange={event => setUpdateForm({ ...updateForm, body: event.target.value })} /><label className="text-xs font-bold text-ink-900/60">Update time (optional)<input type="datetime-local" className={`${inputClass} mt-2`} value={updateForm.publishAt} onChange={event => setUpdateForm({ ...updateForm, publishAt: event.target.value })} /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowUpdateForm(null)} className={getButtonClasses('ghost', 'sm')}>Cancel</button><button type="submit" disabled={saving} className={getButtonClasses('primary', 'sm')}>{saving ? 'Publishing…' : 'Publish update'}</button></div></form>}</article>)}</div>}
          </section>
        )}

        {activeTab === 'notifications' && (
          <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-2"><Bell size={18} className="text-terracotta-text" /><h2 className="text-lg font-bold text-ink-900">Aktivitas terbaru</h2></div>
            {notifications.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-parchment-border p-10 text-center"><Inbox size={26} className="mx-auto text-terracotta-text" /><p className="mt-3 text-sm font-bold text-ink-900">Belum ada notifikasi</p></div>
            ) : (
              <ul className="mt-6 space-y-3">
                {notifications.map(item => {
                  const Icon = item.kind === 'approved' ? Check : item.kind === 'rejected' ? X : item.kind === 'update' ? MessageSquare : RotateCcw;
                  const tone = item.kind === 'approved' ? 'text-success' : item.kind === 'rejected' ? 'text-danger' : 'text-terracotta-text';
                  return (
                    <li key={item.id} className="flex items-start gap-3 rounded-xl border border-parchment-border bg-parchment p-4">
                      <span className={`mt-0.5 shrink-0 ${tone}`}><Icon size={16} /></span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-ink-900">{item.title}</p><p className="mt-0.5 text-xs text-ink-900/55">{item.detail}</p></div>
                      <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-ink-900/40">{daysAgoLabel(item.date)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      {showChannelForm && <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"><button type="button" aria-label="Close channel dialog" className="absolute inset-0 bg-ink-900/60" onClick={() => setShowChannelForm(false)} /><form onSubmit={createChannel} className="relative w-full max-w-md rounded-2xl border border-parchment-border bg-parchment-raised p-6 shadow-card-float"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-terracotta-text">New channel</p><h2 className="mt-1 text-xl font-bold text-ink-900">Start a community feed</h2></div><button type="button" onClick={() => setShowChannelForm(false)} className="rounded-lg p-2 text-ink-900/55 hover:bg-ink-900/[0.05]" aria-label="Close"><X size={17} /></button></div><div className="mt-6 grid gap-4"><label className="text-sm font-bold text-ink-900">Name<input required maxLength={80} className={`${inputClass} mt-2`} value={channelForm.name} onChange={event => setChannelForm({ ...channelForm, name: event.target.value })} placeholder="e.g. Redstone Weekly" /></label><label className="text-sm font-bold text-ink-900">Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={80} className={`${inputClass} mt-2`} value={channelForm.slug} onChange={event => setChannelForm({ ...channelForm, slug: event.target.value.toLowerCase() })} placeholder="redstone-weekly" /></label><label className="text-sm font-bold text-ink-900">Description<textarea maxLength={500} className={`${inputClass} mt-2 min-h-24 py-3`} value={channelForm.description} onChange={event => setChannelForm({ ...channelForm, description: event.target.value })} placeholder="What should people expect here?" /></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowChannelForm(false)} className={getButtonClasses('ghost', 'sm')}>Cancel</button><button type="submit" disabled={saving} className={getButtonClasses('primary', 'sm')}>{saving ? 'Creating…' : 'Create channel'}</button></div></form></div>}

      {editingAddon && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <button type="button" aria-label="Close edit dialog" className="absolute inset-0 bg-ink-900/70" onClick={() => setEditingAddon(null)} />
          <form onSubmit={saveEdit} className="relative w-full max-w-lg rounded-2xl border border-parchment-border bg-parchment-raised p-6 shadow-card-float">
            <div className="flex items-start justify-between"><h2 className="text-xl font-bold text-ink-900">Edit proyek</h2><button type="button" onClick={() => setEditingAddon(null)} className="rounded-lg p-2 text-ink-900/55 hover:bg-ink-900/[0.05]" aria-label="Close"><X size={17} /></button></div>
            <div className="mt-6 grid gap-4">
              <label className="text-sm font-bold text-ink-900">Judul<input required maxLength={100} className={`${inputClass} mt-2`} value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} /></label>
              <label className="text-sm font-bold text-ink-900">Deskripsi<textarea required maxLength={5000} className={`${inputClass} mt-2 min-h-28 py-3`} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></label>
              <label className="text-sm font-bold text-ink-900">Download URL<input required type="url" className={`${inputClass} mt-2`} value={editForm.downloadUrl} onChange={e => setEditForm({ ...editForm, downloadUrl: e.target.value })} /></label>
              <label className="text-sm font-bold text-ink-900">Demo URL (opsional)<input type="url" className={`${inputClass} mt-2`} value={editForm.demoUrl} onChange={e => setEditForm({ ...editForm, demoUrl: e.target.value })} /></label>
              <label className="flex items-center gap-2 text-sm font-bold text-ink-900"><input type="checkbox" checked={editForm.allowComments} onChange={e => setEditForm({ ...editForm, allowComments: e.target.checked })} /> Izinkan komentar</label>
            </div>
            <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEditingAddon(null)} className={getButtonClasses('ghost', 'sm')}>Batal</button><button type="submit" disabled={processingId === editingAddon.id} className={getButtonClasses('primary', 'sm')}>{processingId === editingAddon.id ? 'Menyimpan…' : 'Simpan'}</button></div>
          </form>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <button type="button" aria-label="Close delete dialog" className="absolute inset-0 bg-ink-900/70" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-parchment-border bg-parchment-raised p-7 shadow-card-float">
            <h3 className="mb-2 text-xl font-bold text-ink-900">Hapus proyek ini?</h3>
            <p className="mb-6 text-sm font-medium text-ink-900/60">Tindakan ini tidak bisa dibatalkan dan akan menghapus proyek dari marketplace secara permanen.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteId(null)} disabled={!!processingId} className={getButtonClasses('ghost', 'sm')}>Batal</button>
              <button onClick={deleteProject} disabled={!!processingId} className={getButtonClasses('danger', 'sm')}><Trash2 size={14} /> Hapus</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
