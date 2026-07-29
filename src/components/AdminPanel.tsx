import React, { useState, useEffect } from 'react';
import { Addon, Report, User } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Shield, Check, X, Loader2, AlertTriangle, Trash2, ArrowLeft, Users, FileText, Tag, LayoutGrid, Edit2, Ban, UserX, Sparkles } from 'lucide-react';
import { ViewState } from '../App';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, getDocs, deleteDoc, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeImage } from './FadeImage';

interface AdminPanelProps {
  addons: Addon[];
  loading: boolean;
  onNavigate: (view: ViewState) => void;
}

export function AdminPanel({ addons, loading, onNavigate }: AdminPanelProps) {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activeTab, setActiveTab] = useState<'addons' | 'users' | 'reports'>('addons');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDeleteAddonId, setConfirmDeleteAddonId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);

  useEffect(() => {
    if (user && user.role === 'admin') {
      if (activeTab === 'reports' && reports.length === 0) {
        const fetchReports = async () => {
          setLoadingReports(true);
          try {
            const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const fetchedReports = snapshot.docs.map(doc => doc.data() as Report);
            setReports(fetchedReports);
          } catch (error) {
            console.error("Error fetching reports:", error);
          } finally {
            setLoadingReports(false);
          }
        };
        fetchReports();
      } else if (activeTab === 'users' && users.length === 0) {
        const fetchUsers = async () => {
          setLoadingUsers(true);
          try {
            const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const fetchedUsers = snapshot.docs.map(doc => doc.data() as User);
            setUsers(fetchedUsers);
          } catch (error) {
            console.error("Error fetching users:", error);
          } finally {
            setLoadingUsers(false);
          }
        };
        fetchUsers();
      }
    }
  }, [user, activeTab, reports.length, users.length]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 3000);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="py-32 text-center">
        <h3 className="text-lg font-semibold text-white text-balance">Access Denied. Admin only.</h3>
        <button onClick={() => onNavigate('home')} className="mt-4 text-violet-500 hover:text-violet-400">
          Return to Marketplace
        </button>
      </div>
    );
  }

  const pendingAddons = addons.filter(a => a.status === 'pending');
  const approvedAddons = addons.filter(a => a.status === 'approved');
  const rejectedAddons = addons.filter(a => a.status === 'rejected');

  const handleStatusChange = async (addonId: string, newStatus: 'approved' | 'rejected') => {
    setProcessingId(addonId);
    try {
      await updateDoc(doc(db, 'addons', addonId), { status: newStatus });
      showMessage('success', `Add-on ${newStatus} successfully.`);
    } catch (error) {
      console.error(`Error updating addon status to ${newStatus}:`, error);
      showMessage('error', `Failed to update status.`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleFeatureToggle = async (addonId: string, currentFeatured: boolean) => {
    setProcessingId(addonId);
    try {
      await updateDoc(doc(db, 'addons', addonId), { isFeatured: !currentFeatured });
      showMessage('success', `Add-on ${!currentFeatured ? 'featured' : 'unfeatured'} successfully.`);
    } catch (error) {
      console.error("Error updating addon feature status:", error);
      showMessage('error', 'Failed to update feature status.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteAddon = async () => {
    if (!confirmDeleteAddonId) return;
    setProcessingId(confirmDeleteAddonId);
    try {
      await deleteDoc(doc(db, 'addons', confirmDeleteAddonId));
      showMessage('success', 'Add-on deleted successfully.');
    } catch (error) {
      console.error("Error deleting addon:", error);
      showMessage('error', 'Failed to delete add-on.');
    } finally {
      setProcessingId(null);
      setConfirmDeleteAddonId(null);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    setProcessingId(reportId);
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
      setReports(reports.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
      showMessage('success', 'Report resolved.');
    } catch (error) {
      console.error("Error resolving report:", error);
      showMessage('error', 'Failed to resolve report.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUserRoleChange = async (userId: string, newRole: 'user' | 'admin' | 'banned' | 'suspended') => {
    setProcessingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(users.map(u => u.uid === userId ? { ...u, role: newRole } : u));
      showMessage('success', `User role updated to ${newRole}.`);
    } catch (error) {
      console.error("Error updating user role:", error);
      showMessage('error', 'Failed to update user role.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUserId) return;
    setProcessingId(confirmDeleteUserId);
    try {
      await deleteDoc(doc(db, 'users', confirmDeleteUserId));
      setUsers(users.filter(u => u.uid !== confirmDeleteUserId));
      showMessage('success', 'User profile deleted.');
    } catch (error) {
      console.error("Error deleting user:", error);
      showMessage('error', 'Failed to delete user.');
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
        
      await updateDoc(doc(db, 'addons', editingAddon.id), {
        category: editingAddon.category,
        tags: tagsArray
      });
      showMessage('success', 'Add-on updated.');
      setEditingAddon(null);
    } catch (error) {
      console.error("Error updating addon:", error);
      showMessage('error', 'Failed to update add-on.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <button 
        onClick={() => onNavigate('home')}
        className="mb-8 flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Marketplace
      </button>

      <div className="mb-16 flex items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-zinc-900 border border-white/5 text-white shadow-2xl ">
          <Shield size={32} strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-4xl font-medium tracking-tight text-white text-balance">Admin Dashboard</h1>
          <p className="text-zinc-500 mt-2 font-light text-pretty">Manage add-ons, reports, and users.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider mb-1 text-pretty">Total Add-ons</p>
            <p className="text-3xl font-bold text-white text-pretty">{addons.length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400">
            <LayoutGrid size={24} />
          </div>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider mb-1 text-pretty">Pending Approval</p>
            <p className="text-3xl font-bold text-amber-400 text-pretty">{pendingAddons.length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
            <AlertTriangle size={24} />
          </div>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider mb-1 text-pretty">Total Users</p>
            <p className="text-3xl font-bold text-blue-400 text-pretty">{users.length > 0 ? users.length : '-'}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Users size={24} />
          </div>
        </div>
      </div>

      <div className="mb-8 flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('addons')}
          className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'addons' ? 'border-violet-500 text-violet-400' : 'border-transparent text-zinc-500 hover:text-white hover:border-white/20'
          }`}
        >
          Add-ons
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users' ? 'border-violet-500 text-violet-400' : 'border-transparent text-zinc-500 hover:text-white hover:border-white/20'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'reports' ? 'border-violet-500 text-violet-400' : 'border-transparent text-zinc-500 hover:text-white hover:border-white/20'
          }`}
        >
          Reports
        </button>
      </div>

      <div className="space-y-16">
        {activeTab === 'addons' && (
          <>
            {/* Pending Add-ons */}
        <section>
          <h2 className="mb-8 text-2xl font-medium tracking-tight text-white flex items-center gap-3 text-balance">
            <AlertTriangle className="text-amber-400" size={24} /> Pending Approval ({pendingAddons.length})
          </h2>
          {pendingAddons.length === 0 ? (
            <p className="text-zinc-500 bg-zinc-900 p-8 rounded-[2rem] border border-white/5 text-center font-light text-pretty">No pending add-ons.</p>
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
              className="grid grid-cols-1 gap-4"
            >
              {pendingAddons.map(addon => (
                <motion.div 
                  key={addon.id} 
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-zinc-900 border border-white/5 p-5 rounded-[2rem]  transition hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-5">
                    <FadeImage src={addon.imageUrl} alt={addon.title} className="w-20 h-20 rounded-2xl object-cover bg-black/40 border border-white/5" referrerPolicy="no-referrer" />
                    <div>
                      <h3 className="font-medium text-lg text-white text-balance">{addon.title}</h3>
                      <p className="text-sm text-zinc-500 font-light mt-1 text-pretty">by {addon.authorName}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => handleStatusChange(addon.id, 'approved')}
                      disabled={processingId === addon.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-full transition-colors font-medium text-sm disabled:opacity-50"
                    >
                      {processingId === addon.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      Approve
                    </button>
                    <button 
                      onClick={() => handleStatusChange(addon.id, 'rejected')}
                      disabled={processingId === addon.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-full transition-colors font-medium text-sm disabled:opacity-50"
                    >
                      {processingId === addon.id ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                      Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* All Add-ons Management */}
        <section>
          <h2 className="mb-6 text-xl font-bold tracking-tight text-white flex items-center gap-2 text-balance">
            <Shield className="text-violet-500" /> Manage All Add-ons
          </h2>
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
            className="grid grid-cols-1 gap-4"
          >
            {[...approvedAddons, ...rejectedAddons].map(addon => (
              <motion.div 
                key={addon.id} 
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl"
              >
                <div className="flex items-center gap-4">
                  <FadeImage src={addon.imageUrl} alt={addon.title} className="w-16 h-16 rounded-xl object-cover bg-zinc-800" referrerPolicy="no-referrer" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white text-balance">{addon.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        addon.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {addon.status}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 text-pretty">by {addon.authorName}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {addon.status === 'rejected' && (
                    <button 
                      onClick={() => handleStatusChange(addon.id, 'approved')}
                      disabled={processingId === addon.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
                    >
                      {processingId === addon.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      Approve
                    </button>
                  )}
                  {addon.status === 'approved' && (
                    <>
                      <button 
                        onClick={() => handleFeatureToggle(addon.id, !!addon.isFeatured)}
                        disabled={processingId === addon.id}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-colors font-medium text-sm disabled:opacity-50 ${
                          addon.isFeatured 
                            ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' 
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {processingId === addon.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {addon.isFeatured ? 'Unfeature' : 'Feature'}
                      </button>
                      <button 
                        onClick={() => handleStatusChange(addon.id, 'rejected')}
                        disabled={processingId === addon.id}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
                      >
                        {processingId === addon.id ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                        Reject
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => setEditingAddon(addon)}
                    disabled={processingId === addon.id}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button 
                    onClick={() => setConfirmDeleteAddonId(addon.id)}
                    disabled={processingId === addon.id}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
                  >
                    {processingId === addon.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
            {[...approvedAddons, ...rejectedAddons].length === 0 && (
              <p className="text-zinc-500 bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50 text-center text-pretty">No other add-ons found.</p>
            )}
          </motion.div>
        </section>
        </>
        )}

        {activeTab === 'reports' && (
          <section>
            <h2 className="mb-8 text-2xl font-medium tracking-tight text-white flex items-center gap-3 text-balance">
              <AlertTriangle className="text-rose-400" size={24} /> User Reports
            </h2>
          {loadingReports ? (
            <div className="flex justify-center p-12"><Loader2 size={32} className="animate-spin text-zinc-600" /></div>
          ) : reports.length === 0 ? (
            <p className="text-zinc-500 bg-zinc-900 p-8 rounded-[2rem] border border-white/5 text-center font-light text-pretty">No reports found.</p>
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
              className="grid grid-cols-1 gap-4"
            >
              {reports.map(report => {
                const reportedAddon = addons.find(a => a.id === report.addonId);
                return (
                  <motion.div 
                    key={report.id} 
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-zinc-900 border border-white/5 p-6 rounded-[2rem]  transition hover:bg-white/[0.04]"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-widest border ${
                          report.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {report.status}
                        </span>
                        <span className="text-xs text-zinc-500 font-light">{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-base text-zinc-300 mb-3 font-light text-pretty">"{report.reason}"</p>
                      <p className="text-xs text-zinc-500 text-pretty">
                        Reported Add-on: <span className="text-zinc-300 font-medium">{reportedAddon ? reportedAddon.title : 'Unknown (Deleted?)'}</span>
                      </p>
                    </div>
                    {report.status !== 'resolved' && (
                      <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                        <button 
                          onClick={() => handleResolveReport(report.id)}
                          disabled={processingId === report.id}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
                        >
                          {processingId === report.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          Mark Resolved
                        </button>
                        {reportedAddon && (
                          <button 
                            onClick={() => setConfirmDeleteAddonId(reportedAddon.id)}
                            disabled={processingId === reportedAddon.id}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
                          >
                            {processingId === reportedAddon.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            Delete Add-on
                          </button>
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
            <h2 className="mb-8 text-2xl font-medium tracking-tight text-white flex items-center gap-3 text-balance">
              <Users className="text-blue-400" size={24} /> User Management
            </h2>
            {loadingUsers ? (
              <div className="flex justify-center p-12"><Loader2 size={32} className="animate-spin text-zinc-600" /></div>
            ) : users.length === 0 ? (
              <p className="text-zinc-500 bg-zinc-900 p-8 rounded-[2rem] border border-white/5 text-center font-light text-pretty">No users found.</p>
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
                className="grid grid-cols-1 gap-4"
              >
                {users.map(u => (
                  <motion.div 
                    key={u.uid} 
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-zinc-900 border border-white/5 p-6 rounded-[2rem]  transition hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-4">
                      {u.photoURL ? (
                        <FadeImage src={u.photoURL} alt={u.displayName} className="w-12 h-12 rounded-full object-cover bg-zinc-800" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                          <UserX size={24} />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white text-balance">{u.displayName}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'admin' ? 'bg-violet-500/20 text-violet-400' : 
                            u.role === 'banned' ? 'bg-rose-500/20 text-rose-400' :
                            u.role === 'suspended' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-zinc-500/20 text-zinc-400'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 text-pretty">{u.email}</p>
                        <p className="text-xs text-zinc-500 mt-1 text-pretty">Joined: {new Date(u.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                      {u.role !== 'admin' && (
                        <button 
                          onClick={() => handleUserRoleChange(u.uid, 'admin')}
                          disabled={processingId === u.uid}
                          className="flex items-center justify-center gap-2 px-3 py-1.5 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 rounded-lg transition-colors font-medium text-xs disabled:opacity-50"
                        >
                          Make Admin
                        </button>
                      )}
                      {u.role === 'admin' && u.email !== 'unknownfeed76@gmail.com' && (
                        <button 
                          onClick={() => handleUserRoleChange(u.uid, 'user')}
                          disabled={processingId === u.uid}
                          className="flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 rounded-lg transition-colors font-medium text-xs disabled:opacity-50"
                        >
                          Remove Admin
                        </button>
                      )}
                      {u.role !== 'banned' && u.email !== 'unknownfeed76@gmail.com' && (
                        <button 
                          onClick={() => handleUserRoleChange(u.uid, 'banned')}
                          disabled={processingId === u.uid}
                          className="flex items-center justify-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors font-medium text-xs disabled:opacity-50"
                        >
                          <Ban size={14} /> Ban
                        </button>
                      )}
                      {u.role !== 'suspended' && u.email !== 'unknownfeed76@gmail.com' && (
                        <button 
                          onClick={() => handleUserRoleChange(u.uid, 'suspended')}
                          disabled={processingId === u.uid}
                          className="flex items-center justify-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors font-medium text-xs disabled:opacity-50"
                        >
                          Suspend
                        </button>
                      )}
                      {(u.role === 'banned' || u.role === 'suspended') && (
                        <button 
                          onClick={() => handleUserRoleChange(u.uid, 'user')}
                          disabled={processingId === u.uid}
                          className="flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors font-medium text-xs disabled:opacity-50"
                        >
                          <Check size={14} /> Restore
                        </button>
                      )}
                      {u.email !== 'unknownfeed76@gmail.com' && (
                        <button 
                          onClick={() => setConfirmDeleteUserId(u.uid)}
                          disabled={processingId === u.uid}
                          className="flex items-center justify-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-colors font-medium text-xs disabled:opacity-50"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingAddon(null)}
            className="absolute inset-0 bg-black/80 "
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/5 bg-zinc-950 shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] p-8"
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 text-balance">
              <Edit2 size={20} className="text-violet-500" /> Edit Add-on
            </h3>
            <form onSubmit={handleSaveAddonEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Category</label>
                <select
                  value={editingAddon.category}
                  onChange={(e) => setEditingAddon({ ...editingAddon, category: e.target.value as any })}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                >
                  <option value="Resource Pack">Resource Pack</option>
                  <option value="Behavior Pack">Behavior Pack</option>
                  <option value="World">World</option>
                  <option value="Skin Pack">Skin Pack</option>
                  <option value="Mod">Mod</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={typeof editingAddon.tags === 'string' ? editingAddon.tags : (editingAddon.tags || []).join(', ')}
                  onChange={(e) => setEditingAddon({ ...editingAddon, tags: e.target.value as any })}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                  placeholder="e.g. pvp, realistic, 32x"
                />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setEditingAddon(null)}
                  disabled={!!processingId}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!!processingId}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-500 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:not-disabled:scale-[0.96]"
                >
                  {processingId === editingAddon.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
      {confirmDeleteAddonId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmDeleteAddonId(null)}
            className="absolute inset-0 bg-black/80 "
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/5 bg-zinc-950 shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] p-8"
          >
            <h3 className="text-xl font-bold text-white mb-2 text-balance">Delete Add-on?</h3>
            <p className="text-zinc-400 text-sm mb-6 text-pretty">
              Are you sure you want to delete this add-on? This action cannot be undone and will remove it from the marketplace permanently.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteAddonId(null)}
                disabled={!!processingId}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAddon}
                disabled={!!processingId}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 text-white hover:bg-rose-500 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:not-disabled:scale-[0.96]"
              >
                {processingId === confirmDeleteAddonId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Delete User Confirmation Modal */}
      <AnimatePresence>
      {confirmDeleteUserId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmDeleteUserId(null)}
            className="absolute inset-0 bg-black/80 "
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/5 bg-zinc-950 shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] p-8"
          >
            <h3 className="text-xl font-bold text-white mb-2 text-balance">Delete User?</h3>
            <p className="text-zinc-400 text-sm mb-6 text-pretty">
              Are you sure you want to delete this user? This action cannot be undone and will remove their profile permanently.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteUserId(null)}
                disabled={!!processingId}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={!!processingId}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 text-white hover:bg-rose-500 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:not-disabled:scale-[0.96]"
              >
                {processingId === confirmDeleteUserId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Action Message Toast */}
      {actionMessage && (
        <div className="fixed bottom-4 right-4 z-[130] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
            actionMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
          }`}>
            {actionMessage.type === 'success' ? <Check size={18} /> : <X size={18} />}
            <span className="text-sm font-medium">{actionMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
