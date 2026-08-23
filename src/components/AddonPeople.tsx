import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, UserRound, X } from 'lucide-react';
import { AddonCollaborator } from '../types';
import { ViewState } from '../App';
import { ProfileAvatar } from './borderEffects';
import { useToast } from '../hooks/useToast';

type Person = AddonCollaborator & { isCreator?: boolean };

interface AddonPeopleProps {
  addonId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string | null;
  authorBorder?: string;
  collaborators?: AddonCollaborator[];
  onNavigate?: (view: ViewState) => void;
  canManage?: boolean;
  onCollaboratorsChange?: (collaborators: AddonCollaborator[]) => void;
  compact?: boolean;
}

function uniquePeople(author: Person, collaborators: AddonCollaborator[]): Person[] {
  const seen = new Set<string>([author.uid]);
  return [author, ...collaborators.filter(person => {
    if (!person?.uid || seen.has(person.uid)) return false;
    seen.add(person.uid);
    return true;
  })];
}

export function AddonPeople({
  addonId,
  authorId,
  authorName,
  authorPhoto,
  authorBorder,
  collaborators = [],
  onNavigate,
  canManage = false,
  onCollaboratorsChange,
  compact = false,
}: AddonPeopleProps) {
  const { showToast } = useToast();
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddonCollaborator[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const people = useMemo(() => uniquePeople({ uid: authorId, displayName: authorName, photoURL: authorPhoto, profileBorder: authorBorder, isCreator: true }, collaborators), [authorId, authorName, authorPhoto, authorBorder, collaborators]);
  const visiblePeople = compact ? people.slice(0, 3) : people;
  const hiddenCount = Math.max(0, people.length - visiblePeople.length);
  const collaboratorIds = useMemo(() => new Set(people.map(person => person.uid)), [people]);

  useEffect(() => {
    if (!isManagerOpen || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/users?scope=search&q=${encodeURIComponent(query.trim())}`, { credentials: 'include', signal: controller.signal });
        const data = await response.json().catch(() => ({}));
        if (response.ok) setResults(Array.isArray(data.users) ? data.users.filter((person: AddonCollaborator) => !collaboratorIds.has(person.uid)) : []);
      } catch (error) {
        if ((error as Error)?.name !== 'AbortError') setResults([]);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 240);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [collaboratorIds, isManagerOpen, query]);

  const navigateToProfile = (event: React.MouseEvent, uid: string) => {
    event.stopPropagation();
    onNavigate?.({ type: 'author', id: uid });
  };

  const addCollaborator = async (person: AddonCollaborator) => {
    if (isSaving || collaboratorIds.has(person.uid)) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/addons?action=collaborators', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonId, collaboratorId: person.uid }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to add collaborator.');
      onCollaboratorsChange?.([...collaborators, data.collaborator as AddonCollaborator]);
      setQuery('');
      setResults([]);
      showToast(`${person.displayName} added as a collaborator.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to add collaborator.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const removeCollaborator = async (person: AddonCollaborator) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/addons?action=collaborators', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonId, collaboratorId: person.uid }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to remove collaborator.');
      onCollaboratorsChange?.(collaborators.filter(item => item.uid !== person.uid));
      showToast(`${person.displayName} removed from collaborators.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to remove collaborator.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={compact ? 'mt-4' : 'mt-5'} aria-label="Creators and collaborators">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-900/45">Creators</p>
        {canManage && (
          <button type="button" onClick={(event) => { event.stopPropagation(); setIsManagerOpen(value => !value); }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-terracotta-text transition-colors hover:bg-terracotta/10" aria-expanded={isManagerOpen}>
            {isManagerOpen ? <X size={12} /> : <Plus size={12} />} {isManagerOpen ? 'Close' : 'Add collaborator'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {visiblePeople.map(person => (
          <button key={person.uid} type="button" onClick={(event) => navigateToProfile(event, person.uid)} className="group/person inline-flex min-w-0 items-center gap-2 rounded-xl border border-parchment-border bg-parchment px-2 py-1.5 text-left transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px hover:border-terracotta/60 hover:bg-terracotta/10 active:scale-[0.98]" title={`Open ${person.displayName}'s profile`}>
            <ProfileAvatar photoURL={person.photoURL} displayName={person.displayName} borderValue={person.profileBorder || 'none'} sizeClassName={compact ? 'h-6 w-6' : 'h-7 w-7'} textSizeClassName="text-[9px]" />
            <span className="max-w-[140px] truncate text-xs font-bold text-ink-900 group-hover/person:text-terracotta-text">{person.displayName}</span>
            {person.isCreator && <span className="hidden text-[9px] font-semibold text-ink-900/40 sm:inline">Creator</span>}
          </button>
        ))}
        {hiddenCount > 0 && <span className="rounded-full bg-ink-900/[0.06] px-2.5 py-1.5 text-[10px] font-bold text-ink-900/55">+{hiddenCount} more</span>}
        {people.length === 0 && <span className="inline-flex items-center gap-1.5 text-xs text-ink-900/45"><UserRound size={14} /> No creators listed</span>}
      </div>

      {isManagerOpen && canManage && (
        <div className="mt-3 rounded-2xl border border-parchment-border bg-parchment p-4 shadow-card" onClick={event => event.stopPropagation()}>
          <div className="flex items-center gap-2 rounded-xl border border-parchment-border bg-parchment-raised px-3 focus-within:border-terracotta focus-within:ring-2 focus-within:ring-terracotta/15">
            <Search size={15} className="shrink-0 text-ink-900/40" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by display name" className="min-h-10 min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-900/40" aria-label="Search users to add as collaborators" />
          </div>
          <p className="mt-2 text-[11px] text-ink-900/50">Search at least 2 characters. Each collaborator will link to their public profile.</p>
          {isSearching && <p className="mt-3 text-xs font-semibold text-ink-900/50">Searching…</p>}
          {!isSearching && query.trim().length >= 2 && results.length === 0 && <p className="mt-3 text-xs text-ink-900/50">No available users found.</p>}
          {results.length > 0 && <div className="mt-3 space-y-2">{results.map(person => <button key={person.uid} type="button" disabled={isSaving} onClick={() => addCollaborator(person)} className="flex w-full items-center gap-3 rounded-xl border border-transparent px-2 py-2 text-left transition-colors hover:border-terracotta/40 hover:bg-terracotta/10 disabled:opacity-50"><ProfileAvatar photoURL={person.photoURL} displayName={person.displayName} borderValue={person.profileBorder || 'none'} sizeClassName="h-8 w-8" textSizeClassName="text-[10px]" /><span className="min-w-0 flex-1 truncate text-sm font-bold text-ink-900">{person.displayName}</span><Plus size={15} className="text-terracotta-text" /></button>)}</div>}
          {collaborators.length > 0 && <div className="mt-4 border-t border-parchment-border pt-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-900/45">Current collaborators</p><div className="mt-2 space-y-2">{collaborators.map(person => <div key={person.uid} className="flex items-center gap-3 rounded-xl bg-parchment-raised px-2 py-2"><ProfileAvatar photoURL={person.photoURL} displayName={person.displayName} borderValue={person.profileBorder || 'none'} sizeClassName="h-8 w-8" textSizeClassName="text-[10px]" /><button type="button" onClick={(event) => navigateToProfile(event, person.uid)} className="min-w-0 flex-1 truncate text-left text-sm font-bold text-ink-900 hover:text-terracotta-text">{person.displayName}</button><button type="button" disabled={isSaving} onClick={() => removeCollaborator(person)} className="rounded-lg p-2 text-ink-900/40 transition-colors hover:bg-red-500/10 hover:text-red-700 disabled:opacity-50" aria-label={`Remove ${person.displayName}`}><Trash2 size={14} /></button></div>)}</div></div>}
        </div>
      )}
    </section>
  );
}
