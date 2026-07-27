import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, Image as ImageIcon, Link as LinkIcon, Tag, FileText, LayoutGrid, Plus, Trash2, Check } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeImage } from './FadeImage';
import { compressImage } from '../lib/imageUtils';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Resource Pack',
    imageUrl: '',
    imageUrls: [] as string[],
    downloadUrl: '',
    tags: '',
    versionHistory: '',
    compatibilityNotes: '',
    changelog: '',
    demoUrl: '',
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0 || !user) return;

    const uploadPromises = Array.from(files).map(async (file) => {
      setUploadProgress(prev => ({ ...prev, [file.name]: 10 }));
      try {
        // Compress image to base64 to store directly in Firestore
        // This avoids Firebase Storage rules issues and keeps documents small
        const base64Image = await compressImage(file, 600, 600, 0.5);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        
        // Remove progress after a short delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        }, 500);
        
        return base64Image;
      } catch (error) {
        console.error("Image processing failed:", error);
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
        return null;
      }
    });

    try {
      const newUrls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];
      setFormData(prev => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...newUrls],
        imageUrl: prev.imageUrl || newUrls[0] || ''
      }));
    } catch (error) {
      console.error("Error processing images:", error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const imageFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      processFiles(imageFiles);
    }
  };

  const addImageUrl = () => {
    if (urlInput.trim()) {
      setFormData(prev => ({
        ...prev,
        imageUrls: [...prev.imageUrls, urlInput.trim()],
        imageUrl: prev.imageUrl || urlInput.trim()
      }));
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newUrls = [...prev.imageUrls];
      newUrls.splice(index, 1);
      return {
        ...prev,
        imageUrls: newUrls,
        imageUrl: newUrls.length > 0 ? newUrls[0] : ''
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const addonId = crypto.randomUUID();
      const tagsArray = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);

      await setDoc(doc(db, 'addons', addonId), {
        id: addonId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        imageUrl: formData.imageUrl,
        downloadUrl: formData.downloadUrl,
        imageUrls: formData.imageUrls.length > 0 ? formData.imageUrls : [formData.imageUrl].filter(Boolean),
        versionHistory: formData.versionHistory,
        compatibilityNotes: formData.compatibilityNotes,
        changelog: formData.changelog,
        demoUrl: formData.demoUrl,
        authorId: user.uid,
        authorName: user.displayName,
        createdAt: new Date().toISOString(),
        likesCount: 0,
        downloadsCount: 0,
        tags: tagsArray,
        status: 'pending',
      });

      setSuccessMessage('Add-on published successfully! It is currently pending admin confirmation. Please contact WA 081905077129 for approval.');
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
        setFormData({
          title: '',
          description: '',
          category: 'Resource Pack',
          imageUrl: '',
          imageUrls: [],
          downloadUrl: '',
          tags: '',
          versionHistory: '',
          compatibilityNotes: '',
          changelog: '',
          demoUrl: '',
        });
      }, 5000);
    } catch (error) {
      console.error('Error uploading addon:', error);
      // Handle error gracefully without alert
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40/80 "
          />
          <motion.div
            initial={{ y: '100%', opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: '100%', opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full h-full sm:h-auto sm:max-h-[90vh] max-w-2xl flex flex-col overflow-hidden sm:rounded-2xl bg-zinc-900 shadow-2xl border border-zinc-800/80"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 sm:px-6 sm:py-5 bg-zinc-900 shrink-0 z-10">
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="sm:hidden rounded-lg p-2 bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-700/50">
                  <X size={18} />
                </button>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white">Publish Add-on</h2>
                  <p className="text-xs text-zinc-400 mt-0.5 font-normal">Share your creation with the community</p>
                </div>
              </div>
              <button onClick={onClose} className="hidden sm:block rounded-lg p-2 bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-700/50">
                <X size={18} />
              </button>
            </div>

            {/* Form Content */}
            <div className="overflow-y-auto p-5 sm:p-6 flex-1">
              {successMessage ? (
                <div className="flex flex-col items-center justify-center text-center space-y-3 py-12">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 border border-emerald-500/20 mb-1">
                    <Check size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Upload Successful!</h3>
                  <p className="text-zinc-400 text-xs max-w-sm font-normal">
                    {successMessage}
                  </p>
                </div>
              ) : (
                <form id="upload-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Title</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-zinc-700 focus:outline-none transition-colors"
                    placeholder="e.g. Epic Dragons Mod"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><LayoutGrid size={13} /> Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white focus:border-zinc-700 focus:outline-none transition-colors appearance-none"
                  >
                    <option>Resource Pack</option>
                    <option>Behavior Pack</option>
                    <option>World</option>
                    <option>Skin Pack</option>
                    <option>Mod</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Tag size={13} /> Tags</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-zinc-700 focus:outline-none transition-colors"
                    placeholder="dragons, magic, survival"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><FileText size={13} /> Description</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-zinc-700 focus:outline-none transition-colors resize-none font-normal"
                    placeholder="Describe your add-on in detail..."
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[11px] sm:text-xs font-medium text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><ImageIcon size={14} /> Images (Gallery or URLs)</label>
                  
                  <div 
                    className={`grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 p-4 rounded-2xl border-2 border-dashed transition-colors ${isDragging ? 'border-violet-500 bg-violet-500/5' : 'border-white/10 bg-black/20'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {formData.imageUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden group border border-white/10">
                        <FadeImage src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-rose-500/80 text-white rounded-lg  opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="flex flex-col gap-2">
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-slate-400 hover:text-white aspect-video"
                      >
                        <Upload size={20} />
                        <span className="text-xs">Upload</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-slate-400 hover:text-white aspect-video"
                      >
                        <LinkIcon size={20} />
                        <span className="text-xs">Add URL</span>
                      </button>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {showUrlInput && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex gap-2 mb-4 overflow-hidden"
                      >
                        <input
                          type="url"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-600 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
                          placeholder="https://example.com/image.png"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
                        />
                        <button 
                          type="button"
                          onClick={addImageUrl}
                          className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors text-sm font-medium"
                        >
                          Add
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  {Object.keys(uploadProgress).length > 0 && (
                    <div className="space-y-2 mt-4 mb-4">
                      {Object.entries(uploadProgress).map(([fileName, progress]) => (
                        <div key={fileName} className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 truncate w-24">{fileName}</span>
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-violet-500 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-8">{Math.round(progress)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    required={formData.imageUrls.length === 0}
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="block w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 sm:px-5 sm:py-3.5 text-white placeholder-slate-600 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm sm:text-base"
                    placeholder="Or enter a main cover image URL directly..."
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[11px] sm:text-xs font-medium text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><LinkIcon size={14} /> Download URL</label>
                  <input
                    required
                    type="url"
                    value={formData.downloadUrl}
                    onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
                    className="block w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 sm:px-5 sm:py-3.5 text-white placeholder-slate-600 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm sm:text-base"
                    placeholder="https://..."
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[11px] sm:text-xs font-medium text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><LinkIcon size={14} /> Demo URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.demoUrl}
                    onChange={(e) => setFormData({ ...formData, demoUrl: e.target.value })}
                    className="block w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 sm:px-5 sm:py-3.5 text-white placeholder-slate-600 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm sm:text-base"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[11px] sm:text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">Version History</label>
                  <input
                    type="text"
                    value={formData.versionHistory}
                    onChange={(e) => setFormData({ ...formData, versionHistory: e.target.value })}
                    className="block w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 sm:px-5 sm:py-3.5 text-white placeholder-slate-600 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm sm:text-base"
                    placeholder="e.g. v1.0.0, v1.1.0"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[11px] sm:text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">Compatibility Notes</label>
                  <input
                    type="text"
                    value={formData.compatibilityNotes}
                    onChange={(e) => setFormData({ ...formData, compatibilityNotes: e.target.value })}
                    className="block w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 sm:px-5 sm:py-3.5 text-white placeholder-slate-600 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm sm:text-base"
                    placeholder="e.g. Works with 1.20+"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[11px] sm:text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">Changelog</label>
                  <textarea
                    rows={3}
                    value={formData.changelog}
                    onChange={(e) => setFormData({ ...formData, changelog: e.target.value })}
                    className="block w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 sm:px-5 sm:py-3.5 text-white placeholder-slate-600 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all resize-none text-sm sm:text-base font-light"
                    placeholder="What's new in this version..."
                  />
                </div>
              </form>
              )}
            </div>

            {/* Footer */}
            {!successMessage && (
            <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 border-t border-white/5 p-4 sm:px-8 sm:py-6 bg-black/40/90  z-20">
              <p className="text-xs text-slate-500 text-center sm:text-left max-w-xs font-light">
                Add-ons require admin approval. For faster confirmation, contact WA <span className="text-white font-medium">081905077129</span>.
              </p>
              <div className="flex flex-col-reverse sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto rounded-full px-6 py-3.5 sm:py-3 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="upload-form"
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 sm:py-3 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  Publish Add-on
                </button>
              </div>
            </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
