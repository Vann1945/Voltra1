import React, { useMemo, useState, useEffect } from 'react';
import { AddonCard } from './AddonCard';
import { Addon, Report } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Package, Heart, Edit2, Check, X, Loader2, AlertTriangle, Trash2, Settings } from 'lucide-react';
import { ViewState } from '../App';
import { db, auth } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonCard } from './Skeleton';
import { FadeImage } from './FadeImage';
import { compressImage } from '../lib/imageUtils';

interface UserProfileProps {
  addons: Addon[];
  loading: boolean;
  userLikes: Set<string>;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onNavigate: (view: ViewState) => void;
}

export function UserProfile({ addons, loading, userLikes, onToggleLike, onNavigate }: UserProfileProps) {
  const { user } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [editProfileBorder, setEditProfileBorder] = useState('none');
  const [savingProfile, setSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  
  const [addonToDelete, setAddonToDelete] = useState<string | null>(null);
  const [deletingAddon, setDeletingAddon] = useState(false);

  const [myUploads, setMyUploads] = useState<Addon[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.displayName || '');
      setEditBio(user.bio || '');
      setEditPhotoURL(user.photoURL || '');
      setEditProfileBorder(user.profileBorder || 'none');
      
      const fetchReports = async () => {
        setLoadingReports(true);
        try {
          const q = query(collection(db, 'reports'), where('userId', '==', user.uid));
          const snapshot = await getDocs(q);
          const fetchedReports = snapshot.docs.map(doc => doc.data() as Report);
          setReports(fetchedReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
          console.error("Error fetching reports:", error);
        } finally {
          setLoadingReports(false);
        }
      };
      
      const fetchMyUploads = async () => {
        setLoadingUploads(true);
        try {
          const q = query(collection(db, 'addons'), where('authorId', '==', user.uid));
          const snapshot = await getDocs(q);
          const fetchedAddons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Addon));
          setMyUploads(fetchedAddons.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
          console.error("Error fetching my uploads:", error);
        } finally {
          setLoadingUploads(false);
        }
      };
      
      fetchReports();
      fetchMyUploads();
    }
  }, [user]);

  const myLikes = useMemo(() => {
    if (!user) return [];
    return addons.filter(a => userLikes.has(a.id)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [addons, user, userLikes]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      // Compress to a smaller size for profile pictures
      const base64Image = await compressImage(file, 400, 400, 0.6);
      setEditPhotoURL(base64Image);
    } catch (error) {
      console.error("Failed to process profile photo:", error);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !auth.currentUser) return;
    setSavingProfile(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: editName,
        photoURL: editPhotoURL
      });
      
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editName,
        photoURL: editPhotoURL,
        bio: editBio,
        profileBorder: editProfileBorder
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      // Handle error without alert
    } finally {
      setSavingProfile(false);
    }
  };
  
  const handleDeleteAddon = async () => {
    if (!addonToDelete || !user) return;
    setDeletingAddon(true);
    try {
      await deleteDoc(doc(db, 'addons', addonToDelete));
      setAddonToDelete(null);
    } catch (error) {
      console.error("Error deleting addon:", error);
      // Handle error without alert
    } finally {
      setDeletingAddon(false);
    }
  };

  if (!user) {
    return (
      <div className="py-32 text-center">
        <h3 className="text-lg font-semibold text-white">Please sign in to view your profile.</h3>
      </div>
    );
  }

  const getBorderClass = (borderType: string) => {
    switch (borderType) {
      case 'gold': return 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_15px_rgba(250,204,21,0.5)]';
      case 'neon': return 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_15px_rgba(34,211,238,0.6)]';
      case 'fire': return 'ring-2 ring-rose-500 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_15px_rgba(244,63,94,0.6)]';
      case 'void': return 'ring-2 ring-purple-600 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_15px_rgba(147,51,234,0.6)]';
      default: return 'border border-white/10';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <section aria-label="User Profile" className="mb-12 flex flex-col md:flex-row items-start md:items-center gap-8 relative bg-zinc-900 p-8 sm:p-10 rounded-[2rem] border border-white/5 shadow-2xl ">
        <div className={`h-32 w-32 shrink-0 overflow-hidden rounded-full bg-black/40 flex items-center justify-center transition duration-500 ${getBorderClass(isEditing ? editProfileBorder : (user.profileBorder || 'none'))}`} aria-hidden="true">
          {isEditing ? (
            editPhotoURL ? (
              <FadeImage src={editPhotoURL} alt="" className="h-full w-full object-cover opacity-50" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500 text-center p-2">
                Preview
              </div>
            )
          ) : user.photoURL ? (
            <FadeImage src={user.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-light text-zinc-400">
              {user.displayName.charAt(0)}
            </div>
          )}
        </div>
        
        <div className="flex-1 w-full">
          {isEditing ? (
            <div className="space-y-5 max-w-md">
              <div>
                <label htmlFor="edit-display-name" className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Display Name</label>
                <input 
                  id="edit-display-name"
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition"
                />
              </div>
              <div>
                <label htmlFor="edit-photo-url" className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Profile Picture</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="flex-shrink-0 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 text-white px-4 py-3 rounded-xl text-sm font-medium transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:not-disabled:scale-[0.96]"
                  >
                    {isUploadingPhoto ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Edit2 size={16} aria-hidden="true" />}
                    Upload
                  </button>
                  <input 
                    id="edit-photo-url"
                    type="url" 
                    value={editPhotoURL} 
                    onChange={e => setEditPhotoURL(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition"
                    placeholder="Or paste URL here..."
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                    aria-label="Upload profile photo"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="edit-profile-border" className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Settings size={12} aria-hidden="true" /> Profile Border</label>
                <select 
                  id="edit-profile-border"
                  value={editProfileBorder} 
                  onChange={e => setEditProfileBorder(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition appearance-none"
                >
                  <option value="none">None</option>
                  <option value="gold">Gold (Premium)</option>
                  <option value="neon">Neon Cyan</option>
                  <option value="fire">Fire Ruby</option>
                  <option value="void">Void Purple</option>
                </select>
              </div>
              <div>
                <label htmlFor="edit-bio" className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Bio</label>
                <textarea 
                  id="edit-bio"
                  value={editBio} 
                  onChange={e => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={handleSaveProfile} 
                  disabled={savingProfile}
                  className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-5 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:not-disabled:scale-[0.96]"
                >
                  {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Save Changes
                </button>
                <button 
                  onClick={() => setIsEditing(false)} 
                  disabled={savingProfile}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 text-white px-5 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:not-disabled:scale-[0.96]"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between w-full">
                <h1 className="text-4xl font-medium tracking-tight text-white">{user.displayName}</h1>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors border border-transparent hover:border-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:scale-[0.96]"
                  title="Edit Profile"
                >
                  <Edit2 size={18} />
                </button>
              </div>
              <p className="mt-2 text-sm text-zinc-500">{user.email}</p>
              {user.bio && <p className="mt-4 text-sm text-zinc-300 max-w-2xl leading-relaxed font-light">{user.bio}</p>}
              <div className="mt-6 flex items-center gap-6 text-sm text-zinc-400">
                <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5"><Package size={14} /> {myUploads.length} Uploads</span>
                <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5"><Heart size={14} /> {myLikes.length} Likes</span>
              </div>
            </>
          )}
        </div>
      </section>

      <div className="space-y-16">
        <section>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Package className="text-violet-500" /> My Uploads
            </h2>
            <p className="text-xs text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800">
              Pending add-ons must wait for admin confirmation or contact WA <span className="text-violet-400 font-medium">081905077129</span>.
            </p>
          </div>
          
          {loadingUploads ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : myUploads.length === 0 ? (
            <div className="rounded-3xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl py-20 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-sm text-zinc-400 font-medium tracking-wide">You haven't uploaded any add-ons yet.</p>
            </div>
          ) : (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {myUploads.map((addon) => (
                <motion.div 
                  key={addon.id} 
                  className="relative group"
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 }
                  }}
                >
                  <AddonCard
                    addon={addon}
                    isLiked={userLikes.has(addon.id)}
                    onToggleLike={onToggleLike}
                    onNavigate={onNavigate}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); setAddonToDelete(addon.id); }}
                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-rose-600/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 active:scale-[0.96]"
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
          <h2 className="mb-6 text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Heart className="text-rose-500" /> Liked Add-ons
          </h2>
          
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : myLikes.length === 0 ? (
            <div className="rounded-3xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl py-20 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-sm text-zinc-400 font-medium tracking-wide">You haven't liked any add-ons yet.</p>
            </div>
          ) : (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {myLikes.map((addon) => (
                <motion.div
                  key={addon.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 }
                  }}
                >
                  <AddonCard
                    addon={addon}
                    isLiked={userLikes.has(addon.id)}
                    onToggleLike={onToggleLike}
                    onNavigate={onNavigate}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
        
        <section>
          <h2 className="mb-6 text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertTriangle className="text-amber-500" /> My Reports
          </h2>
          
          {loadingReports ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-900/50" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-3xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl py-20 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-sm text-zinc-400 font-medium tracking-wide">You haven't submitted any reports.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map(report => {
                const reportedAddon = addons.find(a => a.id === report.addonId);
                return (
                  <div key={report.id} className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-800/60 transition-colors shadow-sm">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Reported: <span className="text-zinc-300">{reportedAddon ? reportedAddon.title : 'Unknown Add-on'}</span>
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">Reason: {report.reason}</p>
                      <p className="text-xs text-zinc-600 mt-1">{new Date(report.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${report.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                          report.status === 'reviewed' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 
                          'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}
                      >
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
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
      {addonToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAddonToDelete(null)}
            className="absolute inset-0 bg-black/80 "
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/5 bg-zinc-950 shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] p-8"
          >
            <h3 className="text-xl font-bold text-white mb-2">Delete Add-on?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Are you sure you want to delete this add-on? This action cannot be undone and will remove it from the marketplace permanently.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setAddonToDelete(null)}
                disabled={deletingAddon}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:not-disabled:scale-[0.96]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAddon}
                disabled={deletingAddon}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 text-white hover:bg-rose-500 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 active:not-disabled:scale-[0.96]"
              >
                {deletingAddon ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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
