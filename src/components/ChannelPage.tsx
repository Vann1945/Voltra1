'use client';

import React, { useEffect, useState } from 'react';
import type { Channel, ChannelUpdate } from '@/types';
import { ArrowLeft, CalendarCheck, MessageSquare } from '@/components/icons/animated';
import { getButtonClasses } from '@/lib/designSystem';

export function ChannelPage({ slug }: { slug: string }) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [updates, setUpdates] = useState<ChannelUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/channels?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Channel not found.');
        if (!cancelled) { setChannel(data.channel || null); setUpdates(data.updates || []); }
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Channel not found.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <div className="mx-auto min-h-[70dvh] max-w-4xl px-4 py-16"><div className="h-52 animate-pulse rounded-3xl bg-ink-900/[0.06]" /><div className="mt-6 h-28 animate-pulse rounded-2xl bg-ink-900/[0.06]" /></div>;
  if (error || !channel) return <section className="mx-auto min-h-[70dvh] max-w-3xl px-4 py-20 text-center"><h1 className="text-2xl font-bold text-ink-900">{error || 'Channel not found.'}</h1><a href="/" className={`mt-5 inline-flex ${getButtonClasses('secondary', 'md')}`}><ArrowLeft size={16} /> Back to marketplace</a></section>;

  return <section className="min-h-[calc(100dvh-64px)] bg-parchment pb-32"><div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8"><a href="/" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-ink-900/60 hover:bg-ink-900/[0.04] hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-terracotta"><ArrowLeft size={16} /> Back to marketplace</a><header className="mt-6 overflow-hidden rounded-3xl border border-parchment-border bg-ink-900 text-paper shadow-card"><div className="h-24 bg-terracotta/80" /><div className="p-6 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta text-ink-900"><MessageSquare size={22} /></span><div><p className="text-xs font-bold uppercase tracking-widest text-terracotta">Channel</p><h1 className="text-2xl font-bold sm:text-3xl">{channel.name}</h1></div></div>{channel.description && <p className="mt-5 max-w-2xl text-sm leading-6 text-paper/70">{channel.description}</p>}</div><div className="rounded-xl bg-paper/10 px-3 py-2 text-xs font-bold text-paper/70">/{channel.slug}</div></div></div></header><div className="mt-8 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-terracotta-text">Community updates</p><h2 className="mt-1 text-2xl font-bold text-ink-900">What’s new</h2></div><span className="text-sm font-medium text-ink-900/50">{updates.length} updates</span></div><div className="mt-5 space-y-4">{updates.length === 0 ? <div className="rounded-2xl border border-dashed border-parchment-border bg-parchment-raised p-10 text-center"><MessageSquare size={26} className="mx-auto text-terracotta-text" /><p className="mt-3 text-sm font-bold text-ink-900">No updates yet</p><p className="mt-1 text-xs text-ink-900/55">Check back soon for news from this creator.</p></div> : updates.map(update => <article key={update.id} className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-bold text-ink-900">{update.title}</h3><p className="mt-1 flex items-center gap-1.5 text-xs text-ink-900/50"><CalendarCheck size={13} /> {new Date(update.publish_at || update.created_at).toLocaleString()}</p></div></div><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink-900/75">{update.body}</p>{update.media_url && <img src={update.media_url} alt="" loading="lazy" className="mt-4 max-h-96 w-full rounded-xl object-cover" />}</article>)}</div></div></section>;
}
