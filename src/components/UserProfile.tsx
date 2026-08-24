import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AddonCard } from './AddonCard';
import { getButtonClasses, getInputClasses } from '../lib/designSystem';
import { Addon, Report } from '../types';
import { PROFILE_UPDATED_EVENT, useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Package, Heart, Edit2, Check, X, AlertTriangle, Trash2, Settings, Upload } from 'lucide-react';
import { ViewState } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { SkeletonCard } from './Skeleton';
import { FadeImage } from './FadeImage';
import { BORDER_OPTIONS, getBorderEffect, renderBorderDecoration, getBorderRingClass, ProfileAvatar } from './borderEffects';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { getCoverFileError } from '../lib/uploadValidation';

function convertToWebp(file: File, maxDimension = 512, quality = 0.85): Promise<File> {
  return new Promise(resolve => {
    if (!file.type.startsWith('image/')) { resolve(file); return; }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => {
          if (!blob) { resolve(file); return; }
          const newName = file.name.replace(/\.[^.]+$/, '') + '.webp';
          resolve(new File([blob], newName, { type: 'image/webp' }));
        },
        'image/webp',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

interface UserProfileProps {
  addons: Addon[];
  loading: boolean;
  userLikes: Set<string>;
  userBookmarks: Set<string>;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onToggleBookmark: (addonId: string, isBookmarked: boolean) => void;
  onNavigate: (view: ViewState) => void;
  onAddonDeleted: (addonId: string) => void;
}

export function UserProfile({ addons, loading, userLikes, userBookmarks, onToggleLike, onToggleBookmark, onNavigate, onAddonDeleted }: UserProfileProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [editProfileBorder, setEditProfileBorder] = useState('none');
  const [savingProfile, setSavingProfile] = useState(false);

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const [addonToDelete, setAddonToDelete] = useState<string | null>(null);
  const [deletingAddon, setDeletingAddon] = useState(false);

  const [photoUploadProgress, setPhotoUploadProgress] = useState<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const borderDialogRef = useRef<HTMLDivElement>(null);
  const [isBorderModalOpen, setIsBorderModalOpen] = useState(false);
    useBodyScrollLock(!!addonToDelete || isBorderModalOpen);
  useEffect(() => {
    if (!isBorderModalOpen) return;
    const firstButton = borderDialogRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])');
    firstButton?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsBorderModalOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !borderDialogRef.current) return;
      const focusable = Array.from(borderDialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (focusable.length < 2) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isBorderModalOpen]);
  useEffect(() => {
    if (user) {
      setEditName(user.displayName || '');
      setEditBio(user.bio || '');
      setEditPhotoURL(user.photoURL || '');
      setEditProfileBorder(user.profileBorder || 'none');

      const fetchReports = async () => {
        setLoadingReports(true);
        try {
          const res = await fetch('/api/reports?mine=true', { credentials: 'include' });
          if (!res.ok) throw new Error('failed');
          const data = await res.json();
          const fetchedReports = data.reports as Report[];
          setReports(fetchedReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
          showToast('Failed to load your reports.', 'error');
        } finally {
          setLoadingReports(false);
        }
      };
      fetchReports();
    }
  }, [user]);

  const myUploads = useMemo(() => {
    if (!user) return [];
    return addons.filter(a => a.authorId === user.uid).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [addons, user]);

  const myLikes = useMemo(() => {
    if (!user) return [];
    return addons.filter(a => userLikes.has(a.id)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [addons, user, userLikes]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const fileError = getCoverFileError(file);
    if (fileError) {
      showToast(fileError, 'error');
      return;
    }

    setPhotoUploadProgress(0);

    let imageBase64: string;
    try {
      const webpFile = await convertToWebp(file);
      imageBase64 = await fileToBase64(webpFile);
    } catch {
      showToast('Failed to read image file.', 'error');
      setPhotoUploadProgress(null);
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload-image');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;

    xhr.upload.onprogress = event => {
      if (event.lengthComputable) setPhotoUploadProgress((event.loaded / event.total) * 100);
    };

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res?.url) {
          setEditPhotoURL(res.url as string);
          setPhotoUploadProgress(100);
          showToast('Photo uploaded successfully.', 'success');
          setTimeout(() => setPhotoUploadProgress(null), 600);
        } else {
          showToast(res?.error || 'Upload failed, please try again.', 'error');
          setPhotoUploadProgress(null);
        }
      } catch {
        showToast('Upload failed, please try again.', 'error');
        setPhotoUploadProgress(null);
      }
    };

    xhr.onerror = () => {
      showToast('Could not connect to server.', 'error');
      setPhotoUploadProgress(null);
    };

    xhr.send(JSON.stringify({ imageBase64 }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const displayName = editName.trim();
    const photoURL = editPhotoURL.trim();
    const bio = editBio.trim();
    if (!displayName) {
      showToast('Display name is required.', 'error');
      return;
    }
    if (photoURL) {
      try {
        const parsedPhotoURL = new URL(photoURL);
        if (!['http:', 'https:'].includes(parsedPhotoURL.protocol)) throw new Error('invalid');
      } catch {
        showToast('Profile photo URL must start with http:// or https://.', 'error');
        return;
      }
    }
    setSavingProfile(true);
    try {
      const res = await fetch('/api/users?scope=me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName, photoURL, bio, profileBorder: editProfileBorder,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to update profile.');
      }
      const updatedProfile = {
        uid: user.uid,
        displayName,
        photoURL: photoURL || undefined,
        bio: bio || undefined,
        profileBorder: editProfileBorder || 'none',
      };
      window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: updatedProfile }));
      showToast('Profile updated successfully.', 'success');
      setIsEditing(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update profile. Please try again.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAddon = async () => {
    if (!addonToDelete || !user) return;
    setDeletingAddon(true);
    try {
      const res = await fetch(`/api/addons?id=${addonToDelete}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete add-on.');
      }
      onAddonDeleted(addonToDelete);
      showToast('Add-on deleted.', 'success');
      setAddonToDelete(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to delete add-on. Please try again.', 'error');
    } finally {
      setDeletingAddon(false);
    }
  };

  if (!user) {
    return (
      <div className="py-32 text-center bg-parchment-raised">
        <h3 className="text-lg font-bold text-ink-900 uppercase">Please sign in to view your profile.</h3>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section aria-labelledby="profile-card-title" className="mb-8 overflow-hidden rounded-2xl border border-parchment-border bg-parchment-raised shadow-card">
        <div className="flex flex-col items-start gap-6 p-5 sm:p-6 md:flex-row md:items-center">
        <div className="relative h-32 w-32 shrink-0">
          {renderBorderDecoration(getBorderEffect(isEditing ? editProfileBorder : (user?.profileBorder || 'none')))}
          <div className={`relative h-full w-full overflow-hidden rounded-full bg-parchment-raised border border-parchment-border flex items-center justify-center transition-all duration-300 ${getBorderRingClass(getBorderEffect(isEditing ? editProfileBorder : (user.profileBorder || 'none')))}`}>
            {isEditing ? (
              editPhotoURL ? (
                <FadeImage src={editPhotoURL} alt="Preview" className="h-full w-full object-cover opacity-60" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-ink-900 text-center p-2">Preview</div>
              )
            ) : user.photoURL ? (
              <FadeImage src={user.photoURL} alt={user.displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-ink-900">{(user.displayName || user.email || '?').charAt(0).toUpperCase()}</div>
            )}
          </div>
        </div>

        <div className="flex-1 w-full">
          {isEditing ? (
            <div className="w-full max-w-3xl space-y-5 rounded-2xl border border-parchment-border bg-parchment p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-4 border-b border-parchment-border pb-4">
                <div><p className="text-xs font-bold uppercase tracking-widest text-terracotta-text">Profile settings</p><h2 className="mt-1 text-lg font-bold text-ink-900">Make your profile yours</h2><p className="mt-1 text-xs font-medium text-ink-900/50">Update what the community sees.</p></div>
                <span className="rounded-full bg-terracotta/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-terracotta-text">Editing</span>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="profile-display-name" className="block text-xs font-bold text-ink-900">Display name</label><span className="text-xs font-bold text-ink-900/45">{editName.length}/60</span></div>
                <input id="profile-display-name" type="text" maxLength={60} value={editName} onChange={e => setEditName(e.target.value)} className={getInputClasses()} placeholder="Your creator name" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="profile-photo-url" className="block text-xs font-bold text-ink-900">Profile photo</label><span className="text-xs font-medium text-ink-900/45">URL or upload</span></div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input id="profile-photo-url" type="url" maxLength={2000} value={editPhotoURL} onChange={e => setEditPhotoURL(e.target.value)} className={`min-w-0 flex-1 ${getInputClasses()}`} placeholder="https://..." />
                  <button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoUploadProgress !== null} aria-label="Upload profile photo" className={`shrink-0 disabled:cursor-not-allowed disabled:opacity-50 ${getButtonClasses('secondary', 'md')}`}>
                    {photoUploadProgress !== null ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-900/20 border-t-terracotta" aria-label="Uploading" /> : <><Upload size={16} aria-hidden="true" /> Upload</>}
                  </button>
                </div>
                <input type="file" ref={photoInputRef} onChange={handlePhotoUpload} accept="image/jpeg,image/png,image/webp" className="hidden" />
                {photoUploadProgress !== null && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-900/10" aria-label={`Uploading ${Math.round(photoUploadProgress)} percent`}><div className="h-full rounded-full bg-terracotta transition-[width] duration-200" style={{ width: `${photoUploadProgress}%` }} /></div>}
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2"><Settings size={14} className="text-terracotta-text" aria-hidden="true" /><label className="block text-xs font-bold text-ink-900">Profile border</label></div>
                <button
                  type="button"
                  onClick={() => setIsBorderModalOpen(true)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-parchment-border bg-parchment-raised px-4 py-3 text-sm font-bold text-ink-900 shadow-card transition-[border-color,box-shadow,transform] hover:border-terracotta/60 hover:shadow-card-hover active:scale-[0.99]"
                >
                  <ProfileAvatar
                    photoURL={editPhotoURL}
                    displayName={user.displayName}
                    borderValue={editProfileBorder}
                    sizeClassName="h-9 w-9"
                    textSizeClassName="text-[10px]"
                  />
                  <span className="flex-1 text-left">{BORDER_OPTIONS.find(b => b.value === editProfileBorder)?.label || 'None'}</span>
                  <span className="text-xs font-bold uppercase text-ink-900/50">Change</span>
                </button>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="profile-bio" className="block text-xs font-bold text-ink-900">Bio</label><span className="text-xs font-bold text-ink-900/45">{editBio.length}/500</span></div>
                <textarea id="profile-bio" maxLength={500} value={editBio} onChange={e => setEditBio(e.target.value)} rows={4} className={`${getInputClasses()} resize-y`} placeholder="Tell the community about yourself..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className={`disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses('primary', 'md')}`}
                >
                  {savingProfile ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink-900/10 before:to-transparent" /> : <Check size={16} />}
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={savingProfile}
                  className={`disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses('secondary', 'md')}`}
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between w-full">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-terracotta-text">Your profile</p>
                  <h1 id="profile-card-title" className="mt-2 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{user.displayName}</h1>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className={getButtonClasses('secondary', 'md')}
                  title="Edit profile"
                >
                  <Edit2 size={17} />
                  <span className="hidden sm:inline">Edit profile</span>
                </button>
              </div>
              <p className="mt-2 text-sm font-bold text-ink-900/60">{user.email}</p>
              {user.bio && <p className="mt-4 text-sm font-medium text-ink-900/80 max-w-2xl leading-relaxed">{user.bio}</p>}
              <div className="mt-6 flex items-center gap-3 text-sm font-bold text-ink-900">
                <span className="flex items-center gap-2 rounded-xl border border-parchment-border bg-parchment-raised px-4 py-2 shadow-card"><Package size={14} className="text-terracotta-text" /> {myUploads.length} Uploads</span>
                <span className="flex items-center gap-2 rounded-xl border border-parchment-border bg-parchment-raised px-4 py-2 shadow-card"><Heart size={14} className="text-terracotta-text" /> {myLikes.length} Likes</span>
              </div>
            </>
          )}
        </div>
        </div>
      </section>

      <div className="space-y-10">
        <section>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink-900">
              <Package className="text-terracotta-text" /> My Uploads
            </h2>
            <p className="text-xs font-bold text-ink-900 bg-terracotta px-3 py-1.5 rounded-lg shadow-card">
              Pending add-ons wait for admin review. Contact WA <span className="text-ink-900">082278781685</span>.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : myUploads.length === 0 ? (
            <div className="rounded-2xl border border-parchment-border bg-parchment-raised py-12 text-center shadow-card">
              <Package size={32} className="mx-auto mb-3 text-ink-900/30" />
              <p className="text-sm font-bold text-ink-900">Nothing published yet</p>
              <p className="mt-1 text-xs font-normal text-ink-900/60">Use the Publish button in the top bar to share your first add-on.</p>
            </div>
          ) : (
            <motion.div
              initial="hidden" animate="visible"
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } }}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {myUploads.map(addon => (
                <motion.div key={addon.id} className="relative group" variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.54, ease: 'easeOut' } } }}>
                  <AddonCard addon={addon} isLiked={userLikes.has(addon.id)} isBookmarked={userBookmarks.has(addon.id)} onToggleLike={onToggleLike} onToggleBookmark={onToggleBookmark} onRequireAuth={() => showToast('Please sign in to save projects for later.', 'error')} onNavigate={onNavigate} />
                  <button
                    onClick={e => { e.stopPropagation(); setAddonToDelete(addon.id); }}
                    aria-label={`Delete ${addon.title}`}
                    className="absolute right-2 top-2 rounded-lg border border-danger/30 bg-parchment-raised p-2 text-danger shadow-sm transition-colors hover:bg-danger hover:text-white focus-visible:ring-2 focus-visible:ring-danger sm:opacity-0 sm:group-hover:opacity-100"
                    title="Delete add-on"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight text-ink-900">
            <Heart className="text-terracotta-text" /> Liked Add-ons
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : myLikes.length === 0 ? (
            <div className="rounded-2xl border border-parchment-border bg-parchment-raised py-12 text-center shadow-card">
              <Heart size={32} className="mx-auto mb-3 text-ink-900/30" />
              <p className="text-sm font-bold text-ink-900">No likes yet</p>
              <p className="mt-1 text-xs font-normal text-ink-900/60">Tap the heart on any add-on in the marketplace to save it here.</p>
            </div>
          ) : (
            <motion.div
              initial="hidden" animate="visible"
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } }}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {myLikes.map(addon => (
                <motion.div key={addon.id} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.54, ease: 'easeOut' } } }}>
                  <AddonCard addon={addon} isLiked={userLikes.has(addon.id)} isBookmarked={userBookmarks.has(addon.id)} onToggleLike={onToggleLike} onToggleBookmark={onToggleBookmark} onRequireAuth={() => showToast('Please sign in to save projects for later.', 'error')} onNavigate={onNavigate} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight text-ink-900">
            <AlertTriangle className="text-terracotta-text" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }} /> My Reports
          </h2>

          {loadingReports ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => <div key={i} className="h-20 border border-parchment-border rounded-lg bg-ink-900/5 animate-pulse" />)}
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl border border-parchment-border bg-parchment-raised py-12 text-center">
              <p className="text-sm font-bold text-ink-900/60">You haven't submitted any reports.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map(report => {
                const reportedAddon = addons.find(a => a.id === report.addonId);
                return (
                  <div key={report.id} className="bg-parchment-raised rounded-lg shadow-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-ink-900">
                        Reported: <span className="font-bold">{reportedAddon ? reportedAddon.title : 'Unknown Add-on'}</span>
                      </p>
                      <p className="text-xs font-bold text-ink-900/50 mt-1">Reason: {report.reason}</p>
                      <p className="text-xs font-medium text-ink-900/40 mt-1">{new Date(report.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-3 py-1 border border-parchment-border rounded-lg text-xs font-bold uppercase ${
                        report.status === 'pending' ? 'bg-parchment-raised text-ink-900' :
                        'bg-terracotta-text text-white'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {addonToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAddonToDelete(null)}
              className="absolute inset-0 bg-ink-900/70"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-addon-title"
              className="relative w-full max-w-md rounded-2xl border border-parchment-border bg-parchment-raised p-6 shadow-card-float"
            >
              <h3 id="delete-addon-title" className="mb-2 text-xl font-bold text-ink-900">Delete add-on?</h3>
              <p className="text-ink-900/60 text-sm font-medium mb-6">
                Are you sure you want to delete this add-on? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setAddonToDelete(null)}
                  disabled={deletingAddon}
                  className={`disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses('secondary', 'md')}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAddon}
                  disabled={deletingAddon}
                  className={`disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses('danger', 'md')}`}
                >
                  {deletingAddon ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink-900/10 before:to-transparent" /> : <Trash2 size={16} />}
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBorderModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsBorderModalOpen(false)}
              className="absolute inset-0 bg-ink-900/70"
            />
            <motion.div
              ref={borderDialogRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-border-title"
              className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card-float sm:p-6"
            >
              <div className="mb-5 flex shrink-0 items-center justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-widest text-terracotta-text">Appearance</p><h3 id="profile-border-title" className="mt-1 text-lg font-bold text-ink-900">Choose profile border</h3></div>
                <button type="button" onClick={() => setIsBorderModalOpen(false)} aria-label="Close profile border dialog" className={getButtonClasses('secondary', 'sm')}>
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-5">
                {BORDER_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => { setEditProfileBorder(option.value); setIsBorderModalOpen(false); }}
                    title={option.label}
                    aria-pressed={option.value === editProfileBorder}
                    className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border p-2 transition-all ${
                      option.value === editProfileBorder ? 'border-terracotta bg-terracotta/10' : 'border-transparent hover:border-ink-900/15 hover:bg-ink-900/5'
                    }`}
                  >
                    <ProfileAvatar
                      photoURL={editPhotoURL}
                      displayName={user.displayName}
                      borderValue={option.value}
                      sizeClassName="h-12 w-12"
                      textSizeClassName="text-sm"
                      selected={option.value === editProfileBorder}
                    />
                    <span className="text-[9px] font-bold leading-tight text-ink-900 text-center">{option.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
