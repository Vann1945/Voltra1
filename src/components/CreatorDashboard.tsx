'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Check, ExternalLink, LayoutGrid, MessageSquare, Plus, RotateCcw, Upload, Users, X } from '@/components/icons/animated';
import type { Addon, Channel } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { getButtonClasses } from '@/lib/designSystem';

interface CreatorDashboardProps {
  addons: Addon[];
  onNavigate: (view: 'home' | 'settings') => void;
  onOpenUpload: () => void;
}

type ChannelWithUpdates = Channel & { updates?: Array<{ id: string; title: string; body: string; status: string; publish_at?: string | null }> };

const inputClass = 'min-h-11 w-full rounded-xl border border-parchment-border bg-parchment px-3 text-sm font-medium text-ink-900 outline-none transition focus:border-terracotta focus:ring-2 focus:ring-terracotta/20';

export function CreatorDashboard({ addons, onNavigate, onOpenUpload }: CreatorDashboardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [channels, setChannels] = useState<ChannelWithUpdates[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState<string | null>(null);
  const [channelForm, setChannelForm] = useState({ name: '', slug: '', description: '' });
  const [updateForm, setUpdateForm] = useState({ title: '', body: '', publishAt: '' });
  const [saving, setSaving] = useState(false);

  const creatorAddons = useMemo(() => addons.filter(addon => addon.authorId === user?.uid), [addons, user?.uid]);
  const pendingCount = creatorAddons.filter(addon => addon.status === 'pending').length;
  const approvedCount = creatorAddons.filter(addon => addon.status === 'approved').length;
  const totalDownloads = creatorAddons.reduce((sum, addon) => sum + (addon.downloadsCount || 0), 0);

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
          {statCards.map(({ label, value, Icon }) => <div key={label} className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest text-ink-900/50">{label}</p><Icon size={18} className="text-terracotta-text" /></div><p className="mt-4 text-3xl font-bold tracking-tight text-ink-900">{value}</p><p className="mt-1 text-xs text-ink-900/50">Updated from your current library</p></div>)}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6" aria-labelledby="channels-heading">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-terracotta-text">Community</p><h2 id="channels-heading" className="mt-1 text-xl font-bold text-ink-900">Your channels</h2><p className="mt-1 text-sm text-ink-900/55">Share releases, maintenance notes, and scheduled updates.</p></div><button type="button" onClick={() => setShowChannelForm(true)} className="rounded-xl border border-parchment-border p-2.5 text-terracotta-text transition hover:border-terracotta focus-visible:ring-2 focus-visible:ring-terracotta" aria-label="Create channel"><Plus size={18} /></button></div>
            {loading ? <div className="mt-6 h-28 animate-pulse rounded-xl bg-ink-900/[0.05]" /> : channels.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-parchment-border p-8 text-center"><MessageSquare size={25} className="mx-auto text-terracotta-text" /><p className="mt-3 text-sm font-bold text-ink-900">No channel yet</p><p className="mt-1 text-xs text-ink-900/55">Create a channel and its public link will appear on your profile.</p><button type="button" onClick={() => setShowChannelForm(true)} className={`mt-4 ${getButtonClasses('secondary', 'sm')}`}>Create your first channel</button></div> : <div className="mt-6 space-y-4">{channels.map(channel => <article key={channel.id} className="rounded-xl border border-parchment-border bg-parchment p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-ink-900">{channel.name}</h3><span className="rounded-full bg-terracotta/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-terracotta-text">{channel.status}</span></div><p className="mt-1 text-xs text-ink-900/55">/{channel.slug} · {channel.updateCount || 0} published updates</p>{channel.description && <p className="mt-3 text-sm leading-6 text-ink-900/65">{channel.description}</p>}</div><div className="flex shrink-0 gap-2"><a href={channel.url} target="_blank" rel="noreferrer" className="rounded-lg border border-parchment-border p-2 text-ink-900/60 hover:text-terracotta-text" aria-label={`Open ${channel.name}`}><ExternalLink size={15} /></a><button type="button" onClick={() => setShowUpdateForm(showUpdateForm === channel.id ? null : channel.id)} className={getButtonClasses('secondary', 'sm')}><MessageSquare size={14} /> Post update</button></div></div>{showUpdateForm === channel.id && <form onSubmit={event => publishUpdate(event, channel.id)} className="mt-4 grid gap-3 border-t border-parchment-border pt-4"><input required maxLength={120} className={inputClass} placeholder="Update title" value={updateForm.title} onChange={event => setUpdateForm({ ...updateForm, title: event.target.value })} /><textarea required maxLength={10000} className={`${inputClass} min-h-28 py-3`} placeholder="Tell your community what changed…" value={updateForm.body} onChange={event => setUpdateForm({ ...updateForm, body: event.target.value })} /><label className="text-xs font-bold text-ink-900/60">Update time (optional)<input type="datetime-local" className={`${inputClass} mt-2`} value={updateForm.publishAt} onChange={event => setUpdateForm({ ...updateForm, publishAt: event.target.value })} /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowUpdateForm(null)} className={getButtonClasses('ghost', 'sm')}>Cancel</button><button type="submit" disabled={saving} className={getButtonClasses('primary', 'sm')}>{saving ? 'Publishing…' : 'Publish update'}</button></div></form>}</article>)}</div>}
          </section>

          <aside className="space-y-4"><section className="rounded-2xl border border-parchment-border bg-ink-900 p-5 text-paper shadow-card"><p className="text-xs font-bold uppercase tracking-widest text-terracotta">Profile link</p><h2 className="mt-2 text-lg font-bold">Your channel appears in your bio</h2><p className="mt-2 text-sm leading-6 text-paper/70">Only you and admins can manage the channel. When it is public, its link is shown automatically on your profile.</p><div className="mt-5 rounded-xl bg-paper/10 p-3 text-sm text-paper/90">{channels.find(channel => channel.status === 'published')?.url || 'Publish a channel to show its link'}</div></section><section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card"><h2 className="font-bold text-ink-900">Next actions</h2><div className="mt-4 grid gap-2"><button type="button" onClick={onOpenUpload} className="flex items-center gap-3 rounded-xl bg-parchment px-3 py-3 text-left text-sm font-bold text-ink-900 hover:bg-terracotta/10"><Upload size={16} className="text-terracotta-text" /> Publish a project</button><button type="button" onClick={() => onNavigate('settings')} className="flex items-center gap-3 rounded-xl bg-parchment px-3 py-3 text-left text-sm font-bold text-ink-900 hover:bg-terracotta/10"><Users size={16} className="text-terracotta-text" /> Tune your profile settings</button></div></section></aside>
        </div>
      </div>

      {showChannelForm && <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"><button type="button" aria-label="Close channel dialog" className="absolute inset-0 bg-ink-900/60" onClick={() => setShowChannelForm(false)} /><form onSubmit={createChannel} className="relative w-full max-w-md rounded-2xl border border-parchment-border bg-parchment-raised p-6 shadow-card-float"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-terracotta-text">New channel</p><h2 className="mt-1 text-xl font-bold text-ink-900">Start a community feed</h2></div><button type="button" onClick={() => setShowChannelForm(false)} className="rounded-lg p-2 text-ink-900/55 hover:bg-ink-900/[0.05]" aria-label="Close"><X size={17} /></button></div><div className="mt-6 grid gap-4"><label className="text-sm font-bold text-ink-900">Name<input required maxLength={80} className={`${inputClass} mt-2`} value={channelForm.name} onChange={event => setChannelForm({ ...channelForm, name: event.target.value })} placeholder="e.g. Redstone Weekly" /></label><label className="text-sm font-bold text-ink-900">Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={80} className={`${inputClass} mt-2`} value={channelForm.slug} onChange={event => setChannelForm({ ...channelForm, slug: event.target.value.toLowerCase() })} placeholder="redstone-weekly" /></label><label className="text-sm font-bold text-ink-900">Description<textarea maxLength={500} className={`${inputClass} mt-2 min-h-24 py-3`} value={channelForm.description} onChange={event => setChannelForm({ ...channelForm, description: event.target.value })} placeholder="What should people expect here?" /></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowChannelForm(false)} className={getButtonClasses('ghost', 'sm')}>Cancel</button><button type="submit" disabled={saving} className={getButtonClasses('primary', 'sm')}>{saving ? 'Creating…' : 'Create channel'}</button></div></form></div>}
    </section>
  );
}
