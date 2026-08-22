import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AddonCard } from './AddonCard';
import { Addon, Report } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Package, Heart, Edit2, Check, X, AlertTriangle, Trash2, Settings, Upload } from 'lucide-react';
import { ViewState } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { SkeletonCard } from './Skeleton';
import { FadeImage } from './FadeImage';
import { BORDER_OPTIONS, getBorderEffect, renderBorderDecoration, getBorderRingClass, ProfileAvatar } from './borderEffects';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

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
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onNavigate: (view: ViewState) => void;
}

export function UserProfile({ addons, loading, userLikes, onToggleLike, onNavigate }: UserProfileProps) {
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
  const [isBorderModalOpen, setIsBorderModalOpen] = useState(false);
  useBodyScrollLock(!!addonToDelete || isBorderModalOpen);

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
    setSavingProfile(true);
    try {
      const res = await fetch('/api/users?scope=me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editName, photoURL: editPhotoURL, bio: editBio, profileBorder: editProfileBorder,
        }),
      });
      if (!res.ok) throw new Error('failed');
      showToast('Profile updated successfully.', 'success');
      setIsEditing(false);
    } catch (error) {
      showToast('Failed to update profile. Please try again.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAddon = async () => {
    if (!addonToDelete || !user) return;
    setDeletingAddon(true);
    try {
      const res = await fetch(`/api/addons?id=${addonToDelete}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      showToast('Add-on deleted.', 'success');
      setAddonToDelete(null);
    } catch (error) {
      showToast('Failed to delete add-on. Please try again.', 'error');
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
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 min-h-[100dvh]">
      <div className="mb-12 flex flex-col md:flex-row items-start md:items-center gap-8 relative bg-parchment-raised p-8 sm:p-10 rounded-lg shadow-card neumorph glass">
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
            <div className="space-y-5 max-w-md">
              <div>
                <label className="block text-[10px] font-bold text-ink-900 uppercase tracking-widest mb-2">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-parchment-raised border border-parchment-border rounded-lg px-4 py-3 text-sm font-bold text-ink-900 focus:outline-none focus:shadow-[0_2px_12px_rgba(217,119,87,0.15)] transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ink-900 uppercase tracking-widest mb-2">Profile Picture</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editPhotoURL}
                    onChange={e => setEditPhotoURL(e.target.value)}
                    className="flex-1 bg-parchment-raised border border-parchment-border rounded-lg px-4 py-3 text-sm font-bold text-ink-900 focus:outline-none focus:shadow-[0_2px_12px_rgba(217,119,87,0.15)] transition-all"
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploadProgress !== null}
                    className="shrink-0 flex items-center gap-2 bg-parchment-raised rounded-lg text-ink-900 px-4 py-3 text-sm font-bold shadow-card btn-3d disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {photoUploadProgress !== null ? (
                      <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink-900/10 before:to-transparent" />
                    ) : (
                      <Upload size={16} />
                    )}
                  </button>
                </div>
                <input type="file" ref={photoInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                {photoUploadProgress !== null && (
                  <div className="mt-2 h-2 border border-parchment-border rounded-lg bg-parchment-raised overflow-hidden">
                    <div className="h-full bg-terracotta-soft transition-all duration-300" style={{ width: `${photoUploadProgress}%` }} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ink-900 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Settings size={12} /> Profile Border
                </label>
                <button
                  type="button"
                  onClick={() => setIsBorderModalOpen(true)}
                  className="flex w-full items-center gap-3 bg-parchment-raised rounded-lg px-4 py-3 text-sm font-bold text-ink-900 shadow-card btn-3d"
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
                <label className="block text-[10px] font-bold text-ink-900 uppercase tracking-widest mb-2">Bio</label>
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full bg-parchment-raised border border-parchment-border rounded-lg px-4 py-3 text-sm font-medium text-ink-900 focus:outline-none focus:shadow-[0_2px_12px_rgba(217,119,87,0.15)] transition-all resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="flex items-center gap-2 bg-parchment-raised rounded-lg text-ink-900 px-5 py-2.5 text-sm font-bold uppercase shadow-card btn-3d disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingProfile ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink-900/10 before:to-transparent" /> : <Check size={16} />}
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={savingProfile}
                  className="flex items-center gap-2 bg-parchment-raised rounded-lg text-ink-900 px-5 py-2.5 text-sm font-bold uppercase shadow-card btn-3d disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between w-full">
                <h1 className="text-4xl font-bold text-ink-900 tracking-tight">{user.displayName}</h1>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2.5 bg-parchment-raised rounded-lg text-ink-900 shadow-card btn-3d"
                  title="Edit Profile"
                >
                  <Edit2 size={18} />
                </button>
              </div>
              <p className="mt-2 text-sm font-bold text-ink-900/60">{user.email}</p>
              {user.bio && <p className="mt-4 text-sm font-medium text-ink-900/80 max-w-2xl leading-relaxed">{user.bio}</p>}
              <div className="mt-6 flex items-center gap-3 text-sm font-bold text-ink-900">
                <span className="flex items-center gap-2 bg-parchment-raised px-3 py-1.5 rounded-xl shadow-card"><Package size={14} /> {myUploads.length} Uploads</span>
                <span className="flex items-center gap-2 bg-parchment-raised px-3 py-1.5 rounded-xl shadow-card"><Heart size={14} /> {myLikes.length} Likes</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-16">
        <section>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-ink-900 uppercase tracking-tight flex items-center gap-2">
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
            <div className="rounded-2xl bg-parchment-raised py-16 text-center shadow-card neumorph glass">
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
                  <AddonCard addon={addon} isLiked={userLikes.has(addon.id)} onToggleLike={onToggleLike} onNavigate={onNavigate} />
                  <button
                    onClick={e => { e.stopPropagation(); setAddonToDelete(addon.id); }}
                    className="absolute top-2 right-2 p-2 bg-danger rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all shadow-card"
                    title="Delete Add-on"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        <section>
          <h2 className="mb-6 text-xl font-bold text-ink-900 uppercase tracking-tight flex items-center gap-2">
            <Heart className="text-terracotta-text" /> Liked Add-ons
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : myLikes.length === 0 ? (
            <div className="rounded-2xl bg-parchment-raised py-16 text-center shadow-card neumorph glass">
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
                  <AddonCard addon={addon} isLiked={userLikes.has(addon.id)} onToggleLike={onToggleLike} onNavigate={onNavigate} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        <section>
          <h2 className="mb-6 text-xl font-bold text-ink-900 uppercase tracking-tight flex items-center gap-2">
            <AlertTriangle className="text-terracotta-text" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }} /> My Reports
          </h2>

          {loadingReports ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => <div key={i} className="h-20 border border-parchment-border rounded-lg bg-ink-900/5 animate-pulse" />)}
            </div>
          ) : reports.length === 0 ? (
            <div className="border border-parchment-border rounded-lg bg-parchment-raised py-16 text-center">
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
              className="relative w-full max-w-md bg-parchment-raised rounded-lg shadow-card p-6"
            >
              <h3 className="text-xl font-bold text-ink-900 uppercase mb-2">Delete Add-on?</h3>
              <p className="text-ink-900/60 text-sm font-medium mb-6">
                Are you sure you want to delete this add-on? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setAddonToDelete(null)}
                  disabled={deletingAddon}
                  className="px-4 py-2.5 text-sm font-bold text-ink-900 uppercase rounded-lg bg-parchment-raised shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAddon}
                  disabled={deletingAddon}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white uppercase bg-danger rounded-lg shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-parchment-raised rounded-lg shadow-card p-6 max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="text-lg font-bold text-ink-900 uppercase">Choose Profile Border</h3>
                <button
                  onClick={() => setIsBorderModalOpen(false)}
                  className="p-2 rounded-lg bg-parchment-raised shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 overflow-y-auto pr-1">
                {BORDER_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => { setEditProfileBorder(option.value); setIsBorderModalOpen(false); }}
                    title={option.label}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${
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
