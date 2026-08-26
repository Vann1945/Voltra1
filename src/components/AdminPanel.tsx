'use client';

import React, { useState, useEffect } from 'react';
import { Addon, Channel, Report, User } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Shield, Check, X, AlertTriangle, Trash2, ArrowLeft, Users, LayoutGrid, Edit2, Ban, UserX, Sparkles, Search, Activity } from '@/components/icons/animated';
import { ViewState } from '@/types';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { FadeImage } from './FadeImage';
import { Skeleton, SkeletonCard } from './Skeleton';
import { getButtonClasses } from '@/lib/designSystem';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

const EXCLUDED_ADMIN_EMAILS = ['unknownfeed76@gmail.com', 'kanzakbarraihanriyanto86@gmail.com'];

interface AdminPanelProps {
  addons: Addon[];
  loading: boolean;
  onNavigate: (view: ViewState) => void;
  onAddonsChanged: () => void;
}

const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};
const itemVariants: Variants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.54, ease: 'easeOut' } } };

export function AdminPanel({ addons, loading, onNavigate, onAddonsChanged }: AdminPanelProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'addons' | 'users' | 'reports' | 'channels'>('overview');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDeleteAddonId, setConfirmDeleteAddonId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  useBodyScrollLock(!!confirmDeleteAddonId || !!confirmDeleteUserId || !!editingAddon);

  useEffect(() => {
    if (user && user.role === 'admin') {
      if (activeTab === 'reports' && reports.length === 0) {
        const fetchReports = async () => {
          setLoadingReports(true);
          try {
            const res = await fetch('/api/reports', { credentials: 'include' });
            if (!res.ok) throw new Error('failed');
            const data = await res.json();
            setReports(data.reports as Report[]);
          } catch (error) {
            showToast('Failed to load reports.', 'error');
          } finally {
            setLoadingReports(false);
          }
        };
        fetchReports();
      } else if (activeTab === 'users' && users.length === 0) {
        const fetchUsers = async () => {
          setLoadingUsers(true);
          try {
            const res = await fetch('/api/users', { credentials: 'include' });
            if (!res.ok) throw new Error('failed');
            const data = await res.json();
            setUsers(data.users as User[]);
          } catch (error) {
            showToast('Failed to load users.', 'error');
          } finally {
            setLoadingUsers(false);
          }
        };
        fetchUsers();
      }
      if (activeTab === 'channels') {
        const fetchChannels = async () => {
          setLoadingChannels(true);
          try {
            const params = new URLSearchParams({ scope: 'admin' });
            if (channelSearch.trim()) params.set('q', channelSearch.trim());
            const res = await fetch(`/api/channels?${params.toString()}`, { credentials: 'include', cache: 'no-store' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to load channels.');
            setChannels(Array.isArray(data.channels) ? data.channels : []);
          } catch (error) {
            showToast(error instanceof Error ? error.message : 'Failed to load channels.', 'error');
          } finally { setLoadingChannels(false); }
        };
        fetchChannels();
      }
    }
  }, [user, activeTab, reports.length, users.length, channelSearch]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="py-32 text-center min-h-[100dvh]">
        <h3 className="text-lg font-bold text-ink-900 uppercase">Access Denied. Admin only.</h3>
        <button
          onClick={() => onNavigate('home')}
          className={`mt-5 ${getButtonClasses('secondary', 'md')}`}
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 min-h-[100dvh]">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const pendingAddons = addons.filter(a => a.status === 'pending');
  const approvedAddons = addons.filter(a => a.status === 'approved');
  const rejectedAddons = addons.filter(a => a.status === 'rejected');

  const handleStatusChange = async (addonId: string, newStatus: 'approved' | 'rejected') => {
    setProcessingId(addonId);
    try {
      const res = await fetch(`/api/addons?id=${addonId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('failed');
      showToast(`Add-on ${newStatus} successfully.`, 'success');
      onAddonsChanged();
    } catch (error) {
      showToast('Failed to update status.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleFeatureToggle = async (addonId: string, currentFeatured: boolean) => {
    setProcessingId(addonId);
    try {
      const res = await fetch(`/api/addons?id=${addonId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !currentFeatured }),
      });
      if (!res.ok) throw new Error('failed');
      showToast(`Add-on ${!currentFeatured ? 'featured' : 'unfeatured'} successfully.`, 'success');
      onAddonsChanged();
    } catch (error) {
      showToast('Failed to update feature status.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteAddon = async () => {
    if (!confirmDeleteAddonId) return;
    setProcessingId(confirmDeleteAddonId);
    try {
      const res = await fetch(`/api/addons?id=${confirmDeleteAddonId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      showToast('Add-on deleted successfully.', 'success');
      onAddonsChanged();
    } catch (error) {
      showToast('Failed to delete add-on.', 'error');
    } finally {
      setProcessingId(null);
      setConfirmDeleteAddonId(null);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    setProcessingId(reportId);
    try {
      const res = await fetch(`/api/reports?id=${reportId}`, { method: 'PATCH', credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      setReports(reports.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
      showToast('Report resolved.', 'success');
    } catch (error) {
      showToast('Failed to resolve report.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUserRoleChange = async (userId: string, newRole: 'user' | 'admin' | 'banned' | 'suspended') => {
    setProcessingId(userId);
    try {
      const res = await fetch(`/api/users?id=${userId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error('failed');
      setUsers(users.map(u => u.uid === userId ? { ...u, role: newRole } : u));
      showToast(`User role updated to ${newRole}.`, 'success');
    } catch (error) {
      showToast('Failed to update user role.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUserId) return;
    setProcessingId(confirmDeleteUserId);
    try {
      const res = await fetch(`/api/users?id=${confirmDeleteUserId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      setUsers(users.filter(u => u.uid !== confirmDeleteUserId));
      showToast('User profile deleted.', 'success');
    } catch (error) {
      showToast('Failed to delete user.', 'error');
    } finally {
      setProcessingId(null);
      setConfirmDeleteUserId(null);
    }
  };

  const handleSaveAddonEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddon) return;
    setProcessingId(editingAddon.id);
    try {
      const tagsArray = typeof editingAddon.tags === 'string'
        ? (editingAddon.tags as string).split(',').map(t => t.trim()).filter(Boolean)
        : editingAddon.tags;

      const res = await fetch(`/api/addons?id=${editingAddon.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: editingAddon.category, tags: tagsArray }),
      });
      if (!res.ok) throw new Error('failed');
      showToast('Add-on updated.', 'success');
      setEditingAddon(null);
      onAddonsChanged();
    } catch (error) {
      showToast('Failed to update add-on.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Reusable editorial action button
  const ActionButton = ({
    onClick, disabled, icon, label, tone = 'default',
  }: { onClick: () => void; disabled?: boolean; icon: React.ReactNode; label: string; tone?: 'default' | 'success' | 'danger' | 'warn' | 'info' }) => {
    const toneToVariant: Record<string, 'primary' | 'secondary' | 'danger' | 'ghost'> = {
      default: 'secondary',
      success: 'primary',
      danger: 'danger',
      warn: 'primary',
      info: 'secondary',
    };
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses(toneToVariant[tone], 'sm')}`}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 min-h-[100dvh]">
      <button
        onClick={() => onNavigate('home')}
        className="mb-8 flex items-center gap-2 text-sm font-bold text-ink-900 uppercase hover:text-terracotta-text transition-colors"
      >
        <ArrowLeft size={16} /> Back to Marketplace
      </button>

      {/* Header */}
      <div className="mb-12 flex items-center gap-6 bg-parchment-raised rounded-2xl shadow-card neumorph p-8 glass">
 <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-terracotta rounded-2xl text-ink-900 shadow-card">
          <Shield size={28} />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-ink-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-ink-900/60 mt-1 font-bold text-sm">Manage add-ons, reports, and users.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-10">
        <div className="sm:col-span-2 bg-parchment-raised rounded-2xl shadow-card neumorph p-6 flex items-center justify-between glass">
          <div>
            <p className="text-xs text-ink-900/50 font-bold uppercase tracking-widest mb-1">Total Add-ons</p>
            <p className="text-3xl font-bold text-ink-900 font-meta">{addons.length}</p>
          </div>
          <div className="w-11 h-11 bg-terracotta-text border border-parchment-border rounded-lg flex items-center justify-center text-white">
            <LayoutGrid size={22} />
          </div>
        </div>
        <div className="sm:col-span-1 bg-parchment-raised rounded-2xl shadow-card neumorph p-6 flex items-center justify-between glass">
          <div>
            <p className="text-xs text-ink-900/50 font-bold uppercase tracking-widest mb-1">Pending Approval</p>
            <p className="text-3xl font-bold text-ink-900 font-meta">{pendingAddons.length}</p>
          </div>
          <div className="w-11 h-11 bg-terracotta border border-parchment-border rounded-lg flex items-center justify-center text-ink-900">
            <AlertTriangle size={22} />
          </div>
        </div>
        <div className="sm:col-span-1 bg-parchment-raised rounded-2xl shadow-card neumorph p-6 flex items-center justify-between glass">
          <div>
            <p className="text-xs text-ink-900/50 font-bold uppercase tracking-widest mb-1">Total Users</p>
            <p className="text-3xl font-bold text-ink-900 font-meta">{users.length > 0 ? users.length : '-'}</p>
          </div>
          <div className="w-11 h-11 bg-terracotta border border-parchment-border rounded-lg flex items-center justify-center text-ink-900">
            <Users size={22} />
          </div>
        </div>
      </div>

      {/* Tabs */}
 <div className="mb-10 flex rounded-lg bg-parchment-raised w-fit shadow-card neumorph glass">
        {(['overview', 'addons', 'users', 'reports', 'channels'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-xs sm:text-sm font-bold uppercase tracking-wide border-r border-parchment-border last:border-r-0 transition-colors ${
              activeTab === tab ? 'bg-terracotta text-ink-900' : 'bg-parchment-raised text-ink-900/40 hover:text-ink-900'
            }`}
          >
            {tab === 'overview' ? 'Overview' : tab === 'channels' ? 'Channels' : tab}
          </button>
        ))}
      </div>

      <div className="space-y-16">
        {activeTab === 'overview' && (
          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-parchment-border bg-parchment-raised p-6 shadow-card">
              <div className="flex items-start gap-3"><Activity size={20} className="mt-0.5 text-terracotta-text" /><div><h2 className="text-xl font-bold text-ink-900">Operations overview</h2><p className="mt-1 text-sm text-ink-900/55">A quick view of the work that needs attention.</p></div></div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setActiveTab('addons')} className="rounded-xl border border-parchment-border bg-parchment p-4 text-left hover:border-terracotta"><span className="block text-xs font-bold uppercase tracking-widest text-ink-900/50">Pending content</span><span className="mt-2 block text-2xl font-bold text-ink-900">{pendingAddons.length}</span><span className="mt-1 block text-xs text-ink-900/55">Open moderation queue</span></button><button type="button" onClick={() => setActiveTab('channels')} className="rounded-xl border border-parchment-border bg-parchment p-4 text-left hover:border-terracotta"><span className="block text-xs font-bold uppercase tracking-widest text-ink-900/50">Channels</span><span className="mt-2 block text-2xl font-bold text-ink-900">{channels.length || '—'}</span><span className="mt-1 block text-xs text-ink-900/55">Review public community feeds</span></button></div>
            </div>
            <div className="rounded-2xl border border-parchment-border bg-ink-900 p-6 text-paper shadow-card"><p className="text-xs font-bold uppercase tracking-widest text-terracotta">Quality guardrails</p><h2 className="mt-2 text-xl font-bold">Keep the marketplace healthy</h2><p className="mt-3 text-sm leading-6 text-paper/70">Use moderation decisions consistently, review storage errors, and record provider errors before release.</p><div className="mt-6 rounded-xl bg-paper/10 p-4 text-sm text-paper/80">Admin access is enforced server-side for every mutation.</div></div>
          </section>
        )}

        {activeTab === 'channels' && (
          <section>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="flex items-center gap-3 text-xl font-bold uppercase tracking-tight text-ink-900"><Users className="text-terracotta-text" size={22} /> Channel management</h2><p className="mt-1 text-sm text-ink-900/55">Review channel visibility and owner activity.</p></div><label className="relative block sm:w-72"><span className="sr-only">Search channels</span><Search size={16} className="absolute left-3 top-3 text-ink-900/40" /><input value={channelSearch} onChange={event => setChannelSearch(event.target.value)} placeholder="Search channels" className="min-h-11 w-full rounded-xl border border-parchment-border bg-parchment-raised pl-9 pr-3 text-sm font-medium text-ink-900 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20" /></label></div>
            {loadingChannels ? <div className="h-32 animate-pulse rounded-2xl bg-ink-900/[0.05]" /> : channels.length === 0 ? <div className="rounded-2xl border border-dashed border-parchment-border bg-parchment-raised p-10 text-center"><p className="text-sm font-bold text-ink-900">No channels found</p><p className="mt-1 text-xs text-ink-900/55">Creator channels will appear here when they are created.</p></div> : <div className="grid gap-4">{channels.map(channel => <article key={channel.id} className="flex flex-col gap-4 rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-ink-900">{channel.name}</h3><span className="rounded-full bg-terracotta/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-terracotta-text">{channel.status}</span></div><p className="mt-1 text-sm text-ink-900/55">/{channel.slug} · {channel.updateCount || 0} public updates · owner {channel.ownerId}</p></div>{channel.status !== 'suspended' && <ActionButton onClick={async () => { setProcessingId(channel.id); try { const res = await fetch(`/api/channels?id=${channel.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'suspended' }) }); if (!res.ok) throw new Error('failed'); setChannels(current => current.map(item => item.id === channel.id ? { ...item, status: 'suspended' } : item)); showToast('Channel suspended.', 'success'); } catch { showToast('Failed to update channel.', 'error'); } finally { setProcessingId(null); } }} disabled={processingId === channel.id} tone="danger" icon={<Ban size={14} />} label="Suspend" />}</article>)}</div>}
          </section>
        )}

        {activeTab === 'addons' && (
          <>
            {/* Pending Add-ons */}
            <section>
              <h2 className="mb-6 text-xl font-bold text-ink-900 uppercase tracking-tight flex items-center gap-3">
                <AlertTriangle className="text-ink-900" size={22} /> Pending Approval ({pendingAddons.length})
              </h2>
              {pendingAddons.length === 0 ? (
                <p className="text-ink-900/50 font-bold bg-parchment-raised border border-parchment-border rounded-lg p-8 text-center">No pending add-ons.</p>
              ) : (
                <motion.div initial="hidden" animate="visible" variants={listVariants} className="grid grid-cols-1 gap-4">
                  {pendingAddons.map(addon => (
                    <motion.div
                      key={addon.id}
                      variants={itemVariants}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-parchment-raised rounded-lg shadow-card neumorph p-5 glass"
                    >
                      <div className="flex items-center gap-5">
                        <FadeImage src={addon.imageUrl} alt={addon.title} className="w-20 h-20 object-cover bg-ink-900 border border-parchment-border rounded-lg" referrerPolicy="no-referrer" />
                        <div>
                          <h3 className="font-bold text-ink-900 text-lg">{addon.title}</h3>
                          <p className="text-sm text-ink-900/50 font-bold mt-1">by {addon.authorName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <ActionButton
                          onClick={() => handleStatusChange(addon.id, 'approved')}
                          disabled={processingId === addon.id}
                          tone="success"
                          icon={processingId === addon.id ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" /> : <Check size={16} />}
                          label="Approve"
                        />
                        <ActionButton
                          onClick={() => handleStatusChange(addon.id, 'rejected')}
                          disabled={processingId === addon.id}
                          tone="danger"
                          icon={processingId === addon.id ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" /> : <X size={16} />}
                          label="Reject"
                        />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </section>

            {/* All Add-ons */}
            <section>
              <h2 className="mb-6 text-xl font-bold text-ink-900 uppercase tracking-tight flex items-center gap-2">
                <Shield className="text-terracotta-text" /> Manage All Add-ons
              </h2>
              <motion.div initial="hidden" animate="visible" variants={listVariants} className="grid grid-cols-1 gap-4">
                {[...approvedAddons, ...rejectedAddons].map(addon => (
                  <motion.div
                    key={addon.id}
                    variants={itemVariants}
 className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-parchment-raised rounded-lg p-4 shadow-card neumorph glass"
                  >
                    <div className="flex items-center gap-4">
                      <FadeImage src={addon.imageUrl} alt={addon.title} className="w-16 h-16 object-cover bg-ink-900 border border-parchment-border rounded-lg" referrerPolicy="no-referrer" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-ink-900">{addon.title}</h3>
                          <span className={`px-2 py-0.5 border border-parchment-border text-[10px] font-bold uppercase tracking-wider rounded ${
                            addon.status === 'approved' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                          }`}>
                            {addon.status}
                          </span>
                        </div>
                        <p className="text-sm text-ink-900/50 font-bold">by {addon.authorName}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {addon.status === 'rejected' && (
                        <ActionButton
                          onClick={() => handleStatusChange(addon.id, 'approved')}
                          disabled={processingId === addon.id}
                          tone="success"
                          icon={processingId === addon.id ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" /> : <Check size={16} />}
                          label="Approve"
                        />
                      )}
                      {addon.status === 'approved' && (
                        <>
                          <ActionButton
                            onClick={() => handleFeatureToggle(addon.id, !!addon.isFeatured)}
                            disabled={processingId === addon.id}
                            tone={addon.isFeatured ? 'success' : 'default'}
                            icon={processingId === addon.id ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" /> : <Sparkles size={16} />}
                            label={addon.isFeatured ? 'Unfeature' : 'Feature'}
                          />
                          <ActionButton
                            onClick={() => handleStatusChange(addon.id, 'rejected')}
                            disabled={processingId === addon.id}
                            tone="warn"
                            icon={processingId === addon.id ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" /> : <X size={16} />}
                            label="Reject"
                          />
                        </>
                      )}
                      <ActionButton
                        onClick={() => setEditingAddon(addon)}
                        disabled={processingId === addon.id}
                        tone="info"
                        icon={<Edit2 size={16} />}
                        label="Edit"
                      />
                      <ActionButton
                        onClick={() => setConfirmDeleteAddonId(addon.id)}
                        disabled={processingId === addon.id}
                        tone="danger"
                        icon={processingId === addon.id ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" /> : <Trash2 size={16} />}
                        label="Delete"
                      />
                    </div>
                  </motion.div>
                ))}
                {[...approvedAddons, ...rejectedAddons].length === 0 && (
                  <p className="text-ink-900/50 font-bold bg-parchment-raised border border-parchment-border rounded-lg p-6 text-center">No other add-ons found.</p>
                )}
              </motion.div>
            </section>
          </>
        )}

        {activeTab === 'reports' && (
          <section>
            <h2 className="mb-6 text-xl font-bold text-ink-900 uppercase tracking-tight flex items-center gap-3">
              <AlertTriangle className="text-terracotta-text" size={22} /> User Reports
            </h2>
            {loadingReports ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-56" />)}
              </div>
            ) : reports.length === 0 ? (
              <div className="rounded-lg bg-parchment-raised p-12 text-center shadow-card">
                <AlertTriangle size={28} className="mx-auto mb-3 text-ink-900/30" />
                <p className="text-sm font-bold text-ink-900">No reports right now</p>
                <p className="mt-1 text-xs font-normal text-ink-900/60">Flagged add-ons will show up here for review.</p>
              </div>
            ) : (
              <motion.div initial="hidden" animate="visible" variants={listVariants} className="grid grid-cols-1 gap-4">
                {reports.map(report => {
                  const reportedAddon = addons.find(a => a.id === report.addonId);
                  return (
                    <motion.div
                      key={report.id}
                      variants={itemVariants}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-parchment-raised rounded-lg shadow-card neumorph p-6 glass"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-3 py-1 border border-parchment-border rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                            report.status === 'resolved' ? 'bg-parchment-raised text-ink-900' : 'bg-terracotta text-ink-900'
                          }`}>
                            {report.status}
                          </span>
                          <span className="text-xs text-ink-900/50 font-bold">{new Date(report.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-base text-ink-900 font-bold mb-3">"{report.reason}"</p>
                        <p className="text-xs text-ink-900/50 font-bold">
                          Reported Add-on: <span className="text-ink-900 font-bold">{reportedAddon ? reportedAddon.title : 'Unknown (Deleted?)'}</span>
                        </p>
                      </div>
                      {report.status !== 'resolved' && (
                        <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                          <ActionButton
                            onClick={() => handleResolveReport(report.id)}
                            disabled={processingId === report.id}
                            tone="default"
                            icon={processingId === report.id ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" /> : <Check size={16} />}
                            label="Mark Resolved"
                          />
                          {reportedAddon && (
                            <ActionButton
                              onClick={() => setConfirmDeleteAddonId(reportedAddon.id)}
                              disabled={processingId === reportedAddon.id}
                              tone="danger"
                              icon={processingId === reportedAddon.id ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" /> : <Trash2 size={16} />}
                              label="Delete Add-on"
                            />
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </section>
        )}

        {activeTab === 'users' && (
          <section>
            <h2 className="mb-6 text-xl font-bold text-ink-900 uppercase tracking-tight flex items-center gap-3">
              <Users className="text-terracotta-text" size={22} /> User Management
            </h2>
            {loadingUsers ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-20 border border-parchment-border rounded-lg bg-ink-900/5" />)}
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-lg bg-parchment-raised p-12 text-center shadow-card">
                <Users size={28} className="mx-auto mb-3 text-ink-900/30" />
                <p className="text-sm font-bold text-ink-900">No users found</p>
                <p className="mt-1 text-xs font-normal text-ink-900/60">Registered accounts will appear here.</p>
              </div>
            ) : (
              <motion.div initial="hidden" animate="visible" variants={listVariants} className="grid grid-cols-1 gap-4">
                {users.map(u => (
                  <motion.div
                    key={u.uid}
                    variants={itemVariants}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-parchment-raised rounded-lg shadow-card neumorph p-6 glass"
                  >
                    <div className="flex items-center gap-4">
                      {u.photoURL ? (
                        <FadeImage src={u.photoURL} alt={u.displayName} className="w-12 h-12 rounded-full object-cover bg-parchment-raised border border-parchment-border" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-terracotta border border-parchment-border flex items-center justify-center text-ink-900">
                          <UserX size={22} />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-ink-900">{u.displayName}</h3>
                          <span className={`px-2 py-0.5 border border-parchment-border rounded text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'admin' ? 'bg-terracotta-text text-white' :
                            u.role === 'banned' ? 'bg-danger text-white' :
                            u.role === 'suspended' ? 'bg-terracotta text-ink-900' :
                            'bg-parchment-raised text-ink-900'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        <p className="text-sm text-ink-900/50 font-bold">{u.email}</p>
                        <p className="text-xs text-ink-900/40 font-bold mt-1">Joined: {new Date(u.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                      {u.role !== 'admin' && (
                        <ActionButton onClick={() => handleUserRoleChange(u.uid, 'admin')} disabled={processingId === u.uid} tone="info" icon={<Shield size={14} />} label="Make Admin" />
                      )}
                      {u.role === 'admin' && !EXCLUDED_ADMIN_EMAILS.includes(u.email) && (
                        <ActionButton onClick={() => handleUserRoleChange(u.uid, 'user')} disabled={processingId === u.uid} tone="default" icon={<X size={14} />} label="Remove Admin" />
                      )}
                      {u.role !== 'banned' && !EXCLUDED_ADMIN_EMAILS.includes(u.email) && (
                        <ActionButton onClick={() => handleUserRoleChange(u.uid, 'banned')} disabled={processingId === u.uid} tone="danger" icon={<Ban size={14} />} label="Ban" />
                      )}
                      {u.role !== 'suspended' && !EXCLUDED_ADMIN_EMAILS.includes(u.email) && (
                        <ActionButton onClick={() => handleUserRoleChange(u.uid, 'suspended')} disabled={processingId === u.uid} tone="warn" icon={<AlertTriangle size={14} />} label="Suspend" />
                      )}
                      {(u.role === 'banned' || u.role === 'suspended') && (
                        <ActionButton onClick={() => handleUserRoleChange(u.uid, 'user')} disabled={processingId === u.uid} tone="success" icon={<Check size={14} />} label="Restore" />
                      )}
                      {!EXCLUDED_ADMIN_EMAILS.includes(u.email) && (
                        <ActionButton onClick={() => setConfirmDeleteUserId(u.uid)} disabled={processingId === u.uid} tone="danger" icon={processingId === u.uid ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" /> : <Trash2 size={14} />} label="Delete" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </section>
        )}
      </div>

      {/* Edit Add-on Modal */}
      <AnimatePresence>
        {editingAddon && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingAddon(null)} className="absolute inset-0 bg-ink-900/70" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-parchment-raised rounded-lg shadow-card neumorph p-7 glass"
            >
              <h3 className="text-xl font-bold text-ink-900 uppercase mb-6 flex items-center gap-2">
                <Edit2 size={20} className="text-terracotta-text" /> Edit Add-on
              </h3>
              <form onSubmit={handleSaveAddonEdit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-ink-900 uppercase tracking-widest mb-2">Category</label>
                  <select
                    value={editingAddon.category}
                    onChange={e => setEditingAddon({ ...editingAddon, category: e.target.value as any })}
                    className="w-full border border-parchment-border rounded-lg bg-parchment-raised px-4 py-3 text-sm font-bold text-ink-900 focus:outline-none focus:shadow-[0_2px_12px_rgba(217,119,87,0.15)] transition-all"
                  >
                    <option value="Resource Pack">Resource Pack</option>
                    <option value="Behavior Pack">Behavior Pack</option>
                    <option value="World">World</option>
                    <option value="Skin Pack">Skin Pack</option>
                    <option value="Mod">Mod</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-900 uppercase tracking-widest mb-2">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={typeof editingAddon.tags === 'string' ? editingAddon.tags : (editingAddon.tags || []).join(', ')}
                    onChange={e => setEditingAddon({ ...editingAddon, tags: e.target.value as any })}
                    className="w-full border border-parchment-border rounded-lg bg-parchment-raised px-4 py-3 text-sm font-bold text-ink-900 focus:outline-none focus:shadow-[0_2px_12px_rgba(217,119,87,0.15)] transition-all"
                    placeholder="e.g. pvp, realistic, 32x"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setEditingAddon(null)}
                    disabled={!!processingId}
                    className="px-4 py-2.5 text-sm font-bold text-ink-900/60 hover:text-ink-900 transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!!processingId}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-ink-900 bg-terracotta rounded-lg shadow-card uppercase transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingId === editingAddon.id ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" /> : <Check size={16} />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Addon Confirmation */}
      <AnimatePresence>
        {confirmDeleteAddonId && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDeleteAddonId(null)} className="absolute inset-0 bg-ink-900/70" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-parchment-raised rounded-lg shadow-card neumorph p-7 glass"
            >
              <h3 className="text-xl font-bold text-ink-900 uppercase mb-2">Delete Add-on?</h3>
              <p className="text-ink-900/60 text-sm font-bold mb-6">
                Are you sure you want to delete this add-on? This action cannot be undone and will remove it from the marketplace permanently.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDeleteAddonId(null)}
                  disabled={!!processingId}
 className="px-4 py-2.5 text-sm font-bold text-ink-900 uppercase rounded-lg bg-parchment-raised shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAddon}
                  disabled={!!processingId}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-danger rounded-lg shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === confirmDeleteAddonId ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" /> : <Trash2 size={16} />}
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete User Confirmation */}
      <AnimatePresence>
        {confirmDeleteUserId && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDeleteUserId(null)} className="absolute inset-0 bg-ink-900/70" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-parchment-raised rounded-lg shadow-card neumorph p-7 glass"
            >
              <h3 className="text-xl font-bold text-ink-900 uppercase mb-2">Delete User?</h3>
              <p className="text-ink-900/60 text-sm font-bold mb-6">
                Are you sure you want to delete this user? This action cannot be undone and will remove their profile permanently.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDeleteUserId(null)}
                  disabled={!!processingId}
 className="px-4 py-2.5 text-sm font-bold text-ink-900 uppercase rounded-lg bg-parchment-raised shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={!!processingId}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-danger rounded-lg shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === confirmDeleteUserId ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" /> : <Trash2 size={16} />}
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
