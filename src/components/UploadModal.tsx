import React, { useState, useRef } from 'react';
import { X, FileArchive, Check, HelpCircle, ImagePlus, Trash2 } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { DescriptionEditor } from './DescriptionEditor';
import { CustomSelect } from './CustomSelect';
import { getButtonClasses, getInputClasses } from '../lib/designSystem';
import { FadeImage } from './FadeImage';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROJECT_LICENSES = [
  'All Rights Reserved',
  'Creative Commons 4.0',
  'MIT License',
  'Apache License version 2.0',
  'BSD License',
  'Eclipse Public License - v 2.0',
  'Academic Free License v3.0',
  'Ace3 Style BSD',
  'Apple Public Source License version 2.0 (APSL)',
  'Attribution-NonCommercial-ShareAlike 4.0 International',
  'Common Development and Distribution License (CDDL)',
];

const STEPS = ['general', 'description', 'license'] as const;
type Step = typeof STEPS[number];

const ADDON_CATEGORIES = ['Bukkit Plugins', 'Modpack', 'Customization', 'Add-Ons', 'Shaders', 'Mods', 'Resource Packs', 'Data Pack', 'World', 'Skin Pack'];

function getAddonPayloadError(data: Record<string, unknown>): string {
  const isStr = (v: unknown, min: number, max: number) => typeof v === 'string' && v.length >= min && v.length <= max;
  const isUrl = (v: unknown) => typeof v === 'string' && /^https?:\/\//.test(v) && v.length < 1000;

  if (!isStr(data.id, 1, 100)) return 'Invalid internal ID (id).';
  if (!isStr(data.title, 1, 100)) return 'Title must be between 1 and 100 characters.';
  if (!isStr(data.description, 1, 10000)) return 'Description must be between 1 and 10,000 characters.';
  if (typeof data.category !== 'string' || !ADDON_CATEGORIES.includes(data.category)) return 'Main Category is not a valid option — please reselect it.';
  if (!isUrl(data.imageUrl)) return 'Cover image URL is missing or invalid.';
  if (data.imageUrls && !(Array.isArray(data.imageUrls) && data.imageUrls.length <= 30)) return 'Too many cover images (max 30).';
  if (data.panoramaUrl && !isUrl(data.panoramaUrl)) return 'Panorama image URL is invalid.';
  if (!isUrl(data.downloadUrl)) return 'Download URL is missing or invalid.';
  if (!isStr(data.authorName, 1, 100)) return 'Your account is missing a display name — please set one in your profile before publishing.';
  if (!Array.isArray(data.tags) || data.tags.length > 20) return 'Tags are invalid (max 20).';
  if (data.projectClass && !isStr(data.projectClass, 1, 100)) return 'Class is invalid — please reselect it.';
  if (data.additionalCategory && data.additionalCategory !== '' && !isStr(data.additionalCategory, 1, 100)) return 'Additional Category is invalid.';
  if (!isStr(data.license, 1, 200)) return 'Project License is invalid — please reselect it.';
  if (!isStr(data.distributionPref, 1, 200)) return 'Distribution setting is invalid — please reselect it.';
  if (data.demoUrl && data.demoUrl !== '' && !isUrl(data.demoUrl)) return 'Demo URL is invalid.';
  if (data.socials && !(Array.isArray(data.socials) && data.socials.length <= 15)) return 'Too many social links (max 15).';
  return '';
}

const Label = ({ children, hint, htmlFor }: { children: React.ReactNode; hint?: boolean; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="mb-2 flex items-center gap-1 text-sm font-bold text-ink-900">
    {children} {hint && <HelpCircle size={12} className="text-ink-900/40" />}
  </label>
);

const TextInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`${getInputClasses()} ${props.className || ''}`}
  />
);

function convertToWebp(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
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

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('The selected file is not a readable image.'));
    };
    img.src = objectUrl;
  });
}

async function validatePanoramaFile(file: File): Promise<string> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxBytes = 20 * 1024 * 1024;
  if (!allowedTypes.includes(file.type)) return 'Panorama must be a JPG, PNG, or WebP image.';
  if (file.size > maxBytes) return 'Panorama must be smaller than 20 MB.';
  try {
    const { width, height } = await readImageDimensions(file);
    if (width < 1200) return 'Panorama must be at least 1,200 px wide.';
    if (width / height < 1.6) return 'Choose a wide panorama with an aspect ratio of at least 16:10.';
  } catch (error) {
    return error instanceof Error ? error.message : 'The selected file is not a readable image.';
  }
  return '';
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

function uploadToImgbb(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    fileToBase64(file)
      .then(imageBase64 => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload-image');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.withCredentials = true;

        xhr.upload.onprogress = event => {
          if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
        };

        xhr.onload = () => {
          try {
            const res = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && res?.url) {
              resolve(res.url as string);
            } else {
              reject(new Error(res?.error || 'Upload failed, please try again.'));
            }
          } catch {
            reject(new Error('Upload failed, please try again.'));
          }
        };

        xhr.onerror = () => reject(new Error('Could not connect to server.'));
        xhr.send(JSON.stringify({ imageBase64 }));
      })
      .catch(reject);
  });
}

const MAX_ADDON_FILE_BYTES = 200 * 1024 * 1024;
const ALLOWED_ADDON_EXTENSIONS = ['.mcaddon', '.mcpack', '.mcworld', '.mctemplate', '.zip', '.jar'];

function hasAllowedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_ADDON_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function uploadAddonFile(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!hasAllowedExtension(file.name)) {
      reject(new Error(`Unsupported file type. Allowed: ${ALLOWED_ADDON_EXTENSIONS.join(', ')}`));
      return;
    }
    if (file.size > MAX_ADDON_FILE_BYTES) {
      reject(new Error('File is too large (max 200MB).'));
      return;
    }

    fetch('/api/upload-image?type=sign', { method: 'POST', credentials: 'include' })
      .then(async signRes => {
        const signData = await signRes.json();
        if (!signRes.ok) throw new Error(signData?.error || 'Failed to prepare upload.');
        return signData as { cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string };
      })
      .then(({ cloudName, apiKey, timestamp, folder, signature }) => {
        const body = new FormData();
        body.append('file', file);
        body.append('api_key', apiKey);
        body.append('timestamp', String(timestamp));
        body.append('folder', folder);
        body.append('signature', signature);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`);

        xhr.upload.onprogress = event => {
          if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
        };

        xhr.onload = () => {
          try {
            const res = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && res?.secure_url) {
              resolve(res.secure_url as string);
            } else {
              reject(new Error(res?.error?.message || 'Upload failed, please try again.'));
            }
          } catch {
            reject(new Error('Upload failed, please try again.'));
          }
        };

        xhr.onerror = () => reject(new Error('Could not connect to the file host. Please try again.'));
        xhr.send(body);
      })
      .catch(reject);
  });
}

export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (trimmed && trimmed.length <= 30) seen.add(trimmed);
  }
  return Array.from(seen).slice(0, 20);
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const reduceMotion = useReducedMotion();
  useBodyScrollLock(isOpen);
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectClass: 'Modpack',
    mainCategory: 'Add-Ons',
    additionalCategory: '',
    tagsInput: '',
    imageUrl: '',
    imageUrls: [] as string[],
    panoramaUrl: '',
    downloadUrl: '',
    demoUrl: '',
    license: 'All Rights Reserved',
    distributionPref: 'Allow distribution to 3rd party',
    unlisted: false,
    allowComments: true,
    socials: [] as { platform: string; url: string }[],
  });

  const [step, setStep] = useState<Step>('general');
  const [stepError, setStepError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const addonFileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const panoramaInputRef = useRef<HTMLInputElement>(null);

  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const [panoramaUploadProgress, setPanoramaUploadProgress] = useState<number | null>(null);

  const [fileUploadProgress, setFileUploadProgress] = useState<number | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const handleImagesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';

    setImageUploadProgress(0);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const webpFile = await convertToWebp(files[i]);
        const url = await uploadToImgbb(webpFile, pct => {
          setImageUploadProgress(Math.round(((i + pct / 100) / files.length) * 100));
        });
        uploadedUrls.push(url);
      }
      setFormData(prev => {
        const nextImageUrls = [...prev.imageUrls, ...uploadedUrls];
        return {
          ...prev,
          imageUrls: nextImageUrls,
          imageUrl: prev.imageUrl || nextImageUrls[0] || '',
        };
      });
      showToast(`${uploadedUrls.length} image${uploadedUrls.length > 1 ? 's' : ''} uploaded successfully.`, 'success');
    } catch (err: unknown) {
      showToast((err as Error)?.message || 'Image upload failed. Please try again.', 'error');
    } finally {
      setImageUploadProgress(null);
    }
  };

  const handlePanoramaSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validationError = await validatePanoramaFile(file);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setPanoramaUploadProgress(0);
    try {
      const webpFile = await convertToWebp(file, 2400, 0.85);
      const url = await uploadToImgbb(webpFile, pct => setPanoramaUploadProgress(pct));
      setFormData(prev => ({ ...prev, panoramaUrl: url }));
      showToast('Panorama image uploaded successfully.', 'success');
    } catch (err: unknown) {
      showToast((err as Error)?.message || 'Panorama upload failed. Please try again.', 'error');
    } finally {
      setPanoramaUploadProgress(null);
    }
  };

  const removePanorama = () => {
    setFormData(prev => ({ ...prev, panoramaUrl: '' }));
  };

  const handleAddonFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setFileUploadProgress(0);
    try {
      const downloadUrl = await uploadAddonFile(file, pct => setFileUploadProgress(pct));
      setFormData(prev => ({ ...prev, downloadUrl }));
      setUploadedFileName(file.name);
      showToast('File uploaded successfully.', 'success');
    } catch (err: unknown) {
      showToast((err as Error)?.message || 'Failed to upload file.', 'error');
    } finally {
      setFileUploadProgress(null);
    }
  };

  const clearUploadedFile = () => {
    setUploadedFileName('');
    setFormData(prev => ({ ...prev, downloadUrl: '' }));
  };

  const removeImage = (url: string) => {
    setFormData(prev => {
      const nextImageUrls = prev.imageUrls.filter(u => u !== url);
      return {
        ...prev,
        imageUrls: nextImageUrls,
        imageUrl: prev.imageUrl === url ? (nextImageUrls[0] || '') : prev.imageUrl,
      };
    });
  };

  const isValidHttpUrl = (url: string) => /^https?:\/\//.test(url.trim()) && url.trim().length < 1000;

  const validateStep = (s: Step): string => {
    if (s === 'general') {
      if (!formData.title.trim()) return 'Title is mandatory.';
      if (!formData.downloadUrl.trim()) return 'Download URL is required.';
      if (!isValidHttpUrl(formData.downloadUrl)) return 'Download URL must start with http:// or https://.';
      if (!formData.imageUrl && formData.imageUrls.length === 0) return 'At least 1 cover image must be filled in.';
      if (formData.panoramaUrl.trim() && !isValidHttpUrl(formData.panoramaUrl)) return 'Panorama URL must start with http:// or https://.';
    }
    if (s === 'description') {
      if (!formData.description.trim()) return 'Description is mandatory.';
    }
    return '';
  };

  const goToStep = (target: Step) => {
    setStepError('');
    const targetIdx = STEPS.indexOf(target);
    const currentIdx = STEPS.indexOf(step);
    if (targetIdx > currentIdx) {
      for (let i = currentIdx; i < targetIdx; i++) {
        const err = validateStep(STEPS[i]);
        if (err) {
          setStep(STEPS[i]);
          setStepError(err);
          return;
        }
      }
    }
    setStep(target);
  };

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    const next = STEPS[idx + 1];
    if (next) goToStep(next);
  };

  const goPrev = () => {
    setStepError('');
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('You need to sign in to publish an add-on.', 'error');
      return;
    }
    if (step !== 'license') { goNext(); return; }

    for (const s of STEPS) {
      const err = validateStep(s);
      if (err) {
        setStep(s);
        setStepError(err);
        return;
      }
    }

    setLoading(true);
    try {
      const addonId = crypto.randomUUID();

      const payload = {
        id: addonId,
        title: formData.title.trim(),
        description: formData.description,
        projectClass: formData.projectClass,
        category: formData.mainCategory,
        additionalCategory: formData.additionalCategory || '',
        tags: parseTags(formData.tagsInput),
        imageUrl: formData.imageUrl,
        imageUrls: formData.imageUrls.length > 0 ? formData.imageUrls : [formData.imageUrl].filter(Boolean),
        panoramaUrl: formData.panoramaUrl,
        downloadUrl: formData.downloadUrl,
        demoUrl: formData.demoUrl || '',
        license: formData.license,
        distributionPref: formData.distributionPref,
        createdAt: new Date().toISOString(),
        authorId: user.uid,
        likesCount: 0,
        isFeatured: false,
        downloadsCount: 0,
        status: 'pending' as const,
        ratingCount: 0,
        averageRating: 0,
        authorName: user.displayName,
        unlisted: formData.unlisted,
        allowComments: formData.allowComments,
        socials: formData.socials.filter(s => s.url.trim()),
      };

      const payloadError = getAddonPayloadError(payload);
      if (payloadError) {
        showToast(payloadError, 'error');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/addons', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          projectClass: formData.projectClass,
          mainCategory: formData.mainCategory,
          additionalCategory: formData.additionalCategory,
          tagsInput: formData.tagsInput,
          imageUrl: formData.imageUrl,
          imageUrls: formData.imageUrls,
          panoramaUrl: formData.panoramaUrl,
          downloadUrl: formData.downloadUrl,
          demoUrl: formData.demoUrl,
          license: formData.license,
          distributionPref: formData.distributionPref,
          unlisted: formData.unlisted,
          allowComments: formData.allowComments,
          socials: formData.socials,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to publish add-on.');
      }
      setSuccessMessage('Add-on published! It is pending admin review.');
      showToast('Add-on published successfully.', 'success');
      setTimeout(() => { setSuccessMessage(''); onClose(); setStep('general'); }, 2500);
    } catch (error: unknown) {
      showToast((error as Error)?.message || 'Failed to publish add-on.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const NeuCheckbox = ({ id, checked, onChange, label, sublabel }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string }) => (
    <label htmlFor={id} className="group relative flex min-w-0 cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer absolute left-0 top-0.5 h-5 w-5 cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border border-parchment-border transition-[background-color,border-color,box-shadow,transform] duration-200 group-active:scale-[0.96] peer-focus-visible:ring-2 peer-focus-visible:ring-terracotta peer-focus-visible:ring-offset-2 ${checked ? 'bg-terracotta' : 'bg-parchment-raised group-hover:bg-terracotta/30'}`}
      >
        {checked && <Check size={12} strokeWidth={3} className="text-ink-900" aria-hidden="true" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink-900">{label}</span>
        {sublabel && <span className="mt-0.5 block text-xs font-medium leading-5 text-ink-900/50">{sublabel}</span>}
      </span>
    </label>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduceMotion ? undefined : { opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-ink-900/70" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-modal-title"
            initial={reduceMotion ? false : { y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { y: '100%', opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: 'easeOut' }}
            className="relative flex h-[100dvh] max-h-[100dvh] w-full min-h-0 max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-parchment-raised neumorph glass sm:h-auto sm:max-h-[90vh] sm:rounded-lg sm:shadow-card"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-parchment-border bg-parchment-raised px-6 py-4">
              <h2 id="upload-modal-title" className="text-lg font-bold text-ink-900 uppercase tracking-tight">Create Project</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close publish dialog"
                className="rounded-lg border border-parchment-border bg-parchment-raised p-2 text-ink-900 shadow-sm transition-colors hover:bg-ink-900/10 focus-visible:ring-2 focus-visible:ring-terracotta"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex shrink-0 border-b border-parchment-border bg-parchment-raised">
              {STEPS.map((s, idx) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => goToStep(s)}
                  aria-current={step === s ? 'step' : undefined}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest border-r border-parchment-border last:border-r-0 transition-colors ${
                    step === s ? 'bg-terracotta text-paper shadow-sm' : 'bg-parchment-raised text-ink-900/50 hover:bg-ink-900/10'
                  }`}
                >
                  {idx + 1}. {s}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-6 pb-8 [scrollbar-width:thin]">
              {successMessage ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-14 h-14 bg-terracotta rounded-lg flex items-center justify-center mx-auto shadow-sm">
                    <Check size={28} className="text-paper" />
                  </div>
                  <h3 className="text-xl font-bold text-ink-900 uppercase">Upload Successful</h3>
                  <p className="text-sm text-ink-900/60 font-medium max-w-xs mx-auto">{successMessage}</p>
                </div>
              ) : (
                <form id="upload-form" onSubmit={handleSubmit}>
                  {step === 'general' && (
                    <>
                      <div className="mb-5">
                        <Label htmlFor="upload-title">Title *</Label>
                        <TextInput
                          id="upload-title"
                          type="text"
                          required
                          value={formData.title}
                          onChange={e => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Give your add-on a name..."
                        />
                      </div>

                      <div className="mb-5">
                        <Label htmlFor="upload-class" hint>Class</Label>
                        <p className="text-[11px] text-ink-900/50 font-medium mb-2">Which class does your project fit under?</p>
                        <CustomSelect
                          id="upload-class"
                          value={formData.projectClass}
                          options={['Bukkit Plugins', 'Modpack', 'Customization', 'Add-Ons', 'Shaders', 'Mods', 'Resource Packs', 'Data Pack', 'World', 'Skin Pack']}
                          onChange={val => setFormData({ ...formData, projectClass: val })}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                          <Label htmlFor="upload-main-category">Main Category</Label>
                          <CustomSelect
                            id="upload-main-category"
                            value={formData.mainCategory}
                            options={['Bukkit Plugins', 'Modpack', 'Customization', 'Add-Ons', 'Shaders', 'Mods', 'Resource Packs', 'Data Pack', 'World', 'Skin Pack']}
                            onChange={val => setFormData({ ...formData, mainCategory: val })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="upload-additional-category">Additional Category</Label>
                          <CustomSelect
                            id="upload-additional-category"
                            value={formData.additionalCategory}
                            options={[
                              { value: '', label: 'None' },
                              { value: 'Resource Packs', label: 'Resource Packs' },
                              { value: 'Behavior Packs', label: 'Behavior Packs' },
                              { value: 'Adventure', label: 'Adventure' },
                            ]}
                            onChange={val => setFormData({ ...formData, additionalCategory: val })}
                          />
                        </div>
                      </div>

                      <div className="mb-5">
                        <Label htmlFor="upload-tags" hint>Tags</Label>
                        <p className="text-[11px] text-ink-900/50 font-medium mb-2">
                          Help people find your add-on. Separate each tag with a comma (,).
                        </p>
                        <TextInput
                          id="upload-tags"
                          type="text"
                          placeholder="pvp, survival, medieval, horror"
                          value={formData.tagsInput}
                          onChange={e => setFormData({ ...formData, tagsInput: e.target.value })}
                        />
                        {formData.tagsInput.trim() && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {parseTags(formData.tagsInput).map((tag, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center bg-terracotta rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-paper shadow-sm"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mb-5">
                        <Label>Cover Images *</Label>
                        <p className="text-[11px] text-ink-900/50 font-medium mb-2">
                          Upload one or more screenshots. The first image becomes the main cover.
                        </p>

                        {formData.imageUrls.length > 0 && (
                          <div className="flex flex-wrap gap-3 mb-3">
                            {formData.imageUrls.map(url => (
                              <div key={url} className="relative w-20 h-20 rounded-lg shadow-card overflow-hidden group">
                                <FadeImage src={url} alt="Cover preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                {url === formData.imageUrl && (
                                  <span className="absolute top-0.5 left-0.5 bg-terracotta text-paper border border-ink-900 px-1 text-[9px] font-bold uppercase">Main</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeImage(url)}
                                  aria-label="Remove cover image"
                                  className="absolute bottom-1 right-1 rounded-lg bg-terracotta p-1.5 text-paper shadow-sm transition-opacity focus-visible:ring-2 focus-visible:ring-terracotta sm:opacity-0 sm:group-hover:opacity-100"
                                >
                                  <Trash2 size={11} className="text-paper" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={imageUploadProgress !== null}
                          className="w-full flex items-center justify-center gap-2 border border-dashed border-ink-900/25 bg-parchment-raised py-4 text-sm font-medium text-ink-900 uppercase tracking-wide transition-all hover:bg-terracotta/10 hover:border-ink-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {imageUploadProgress !== null ? (
                            <>
                              <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border relative before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" />
                              Uploading {Math.round(imageUploadProgress)}%
                            </>
                          ) : (
                            <>
                              <ImagePlus size={16} />
                              Upload Images
                            </>
                          )}
                        </button>
                        <input
                          type="file"
                          ref={imageInputRef}
                          onChange={handleImagesSelected}
                          accept="image/*"
                          multiple
                          className="hidden"
                        />

                        {imageUploadProgress !== null && (
                          <div className="mt-2 h-2 border border-parchment-border rounded-lg bg-parchment-raised overflow-hidden">
                            <div
                              className="h-full bg-terracotta-soft transition-all duration-200"
                              style={{ width: `${imageUploadProgress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="mb-5">
                        <Label htmlFor="upload-download-url" hint>Download File / URL *</Label>
                        <p className="text-[11px] text-ink-900/50 font-medium mb-2">
                          Upload your file — it's hosted for you automatically. Or paste your own link instead.
                        </p>

                        {uploadedFileName ? (
                          <div className="flex items-center justify-between gap-3 border border-parchment-border rounded-lg bg-parchment-raised px-4 py-2.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-ink-900 min-w-0">
                              <Check size={14} className="text-ink-900 shrink-0" />
                              <span className="truncate">{uploadedFileName}</span>
                            </div>
                            <button
                              type="button"
                              onClick={clearUploadedFile}
                              className="shrink-0 text-[11px] font-bold text-ink-900/50 uppercase underline hover:text-ink-900 transition-colors"
                            >
                              Change
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <TextInput
                              id="upload-download-url"
                              required
                              type="url"
                              value={formData.downloadUrl}
                              onChange={e => setFormData({ ...formData, downloadUrl: e.target.value })}
                              placeholder="https://... or upload a file →"
                            />
                            <button
                              type="button"
                              onClick={() => addonFileInputRef.current?.click()}
                              disabled={fileUploadProgress !== null}
                              title="Upload file"
                              className="shrink-0 px-4 py-2.5 rounded-lg bg-terracotta text-paper font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105 active:brightness-95 transition-all"
                            >
                              {fileUploadProgress !== null ? <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border relative before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" /> : <FileArchive size={16} />}
                            </button>
                            <input
                              type="file"
                              ref={addonFileInputRef}
                              onChange={handleAddonFileSelected}
                              accept=".mcaddon,.mcpack,.mcworld,.mctemplate,.zip"
                              className="hidden"
                            />
                          </div>
                        )}

                        {fileUploadProgress !== null && (
                          <div className="mt-2">
                            <div className="h-2 border border-parchment-border rounded-lg bg-parchment-raised overflow-hidden">
                              <div className="h-full bg-terracotta-soft transition-all duration-200" style={{ width: `${fileUploadProgress}%` }} />
                            </div>
                            <p className="text-[10px] font-bold text-ink-900/50 uppercase mt-1">
                              Uploading… {Math.round(fileUploadProgress)}%
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mb-5">
                        <Label htmlFor="upload-demo-url" hint>Demo / Preview Video URL</Label>
                        <p className="text-[11px] text-ink-900/50 font-medium mb-2">
                          Paste a YouTube link and it'll play right on your add-on page. Optional.
                        </p>
                        <TextInput
                          id="upload-demo-url"
                          type="url"
                          value={formData.demoUrl}
                          onChange={e => setFormData({ ...formData, demoUrl: e.target.value })}
                          placeholder="https://youtube.com/watch?v=..."
                        />
                      </div>

                      <div className="space-y-4 pt-4 border-t border-parchment-border">
                        <NeuCheckbox
                          id="upload-allow-comments"
                          checked={formData.allowComments}
                          onChange={v => setFormData({ ...formData, allowComments: v })}
                          label="Allow Comments"
                        />
                        <NeuCheckbox
                          id="upload-unlisted"
                          checked={formData.unlisted}
                          onChange={v => setFormData({ ...formData, unlisted: v })}
                          label="Unlisted Project"
                          sublabel="Won't appear in search or profile. Can be shared via direct link."
                        />
                      </div>

                      <div className="mt-5 pt-5 border-t border-parchment-border">
                        <Label htmlFor="upload-panorama">Panorama Image <span className="font-medium normal-case tracking-normal text-ink-900/45">(optional)</span></Label>
                        <p className="text-[11px] text-ink-900/50 font-medium mb-2">
                          Add a wide screenshot for the header banner. JPG, PNG, or WebP; at least 1,200 px wide.
                        </p>

                        {formData.panoramaUrl ? (
                          <div className="relative w-full aspect-[21/9] rounded-lg shadow-card overflow-hidden group mb-3">
                            <FadeImage src={formData.panoramaUrl} alt="Panorama preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={removePanorama}
                              aria-label="Remove panorama image"
                              className="absolute bottom-2 right-2 rounded-lg bg-terracotta p-2 text-paper shadow-sm transition-opacity focus-visible:ring-2 focus-visible:ring-terracotta sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <Trash2 size={13} className="text-paper" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => panoramaInputRef.current?.click()}
                            disabled={panoramaUploadProgress !== null}
                            className="w-full flex items-center justify-center gap-2 border border-dashed border-ink-900/25 bg-parchment-raised py-6 text-sm font-medium text-ink-900 uppercase tracking-wide transition-all hover:bg-terracotta/10 hover:border-ink-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {panoramaUploadProgress !== null ? (
                                <>
                                  <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border relative before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" />
                                  Uploading {Math.round(panoramaUploadProgress)}%
                                </>
                              ) : (
                                <>
                                  <ImagePlus size={16} />
                                  Upload Panorama
                                </>
                              )}
                          </button>
                        )}
                          <input
                          id="upload-panorama"
                          type="file"
                          ref={panoramaInputRef}
                          onChange={handlePanoramaSelected}
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                        />

                        {panoramaUploadProgress !== null && (
                          <div className="mt-2 h-2 border border-parchment-border rounded-lg bg-parchment-raised overflow-hidden">
                            <div
                              className="h-full bg-terracotta-soft transition-all duration-200"
                              style={{ width: `${panoramaUploadProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {step === 'description' && (
                    <div>
                      <Label>Description *</Label>
                      <DescriptionEditor
                        required
                        value={formData.description}
                        onChange={val => setFormData({ ...formData, description: val })}
                        placeholder="Write a clear description of your add-on..."
                      />
                    </div>
                  )}

                  {step === 'license' && (
                    <div className="space-y-7">
                      <div>
                        <h3 className="text-sm font-bold text-ink-900 uppercase tracking-widest mb-1">Project License</h3>
                        <p className="text-xs text-ink-900/50 font-medium mb-3">
                          Use the original license for forked projects.{' '}
                          <a href="#" className="text-ink-900 font-bold underline">Full guidelines</a>
                        </p>
                        <CustomSelect
                          value={formData.license}
                          options={PROJECT_LICENSES}
                          onChange={val => setFormData({ ...formData, license: val })}
                        />
                        <a href="#" className="inline-block text-xs text-ink-900/50 font-bold underline mt-2 hover:text-ink-900">
                          View full license
                        </a>
                      </div>

                      <div className="pt-5 border-t border-parchment-border">
                        <h3 className="text-sm font-bold text-ink-900 uppercase tracking-widest mb-1 flex items-center gap-1">
                          Distribution <HelpCircle size={13} className="text-ink-900/40" />
                        </h3>
                        <p className="text-xs text-ink-900/50 font-medium mb-3">
                          Downloads outside the ecosystem don't count toward rewards.{' '}
                          <a href="#" className="text-ink-900 font-bold underline">Learn more</a>
                        </p>
                        <CustomSelect
                          value={formData.distributionPref}
                          options={['Allow distribution to 3rd party', "Don't allow distribution to 3rd party"]}
                          onChange={val => setFormData({ ...formData, distributionPref: val })}
                        />
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>

            {!successMessage && (
              <div className="flex shrink-0 items-center justify-between border-t border-parchment-border bg-parchment-raised p-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
                <div>
                  {stepError && (
                    <p className="text-xs font-bold text-danger">{stepError}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className={getButtonClasses('ghost', 'md')}
                  >
                    Cancel
                  </button>
                  {step !== 'general' && (
                    <button
                      type="button"
                      onClick={goPrev}
                      className={getButtonClasses('secondary', 'md')}
                    >
                      Previous
                    </button>
                  )}
                  {step !== 'license' ? (
                    <button
                      type="button"
                      onClick={goNext}
                      className={getButtonClasses('primary', 'md')}
                    >
                      Next
                    </button>
                  ) : (
                    loading ? (
                      <div className="px-6 py-2.5">
                        <Skeleton className="h-10 w-36 rounded-lg" />
                      </div>
                    ) : (
                      <button
                        type="submit"
                        form="upload-form"
                        disabled={loading || !!successMessage}
                        className={`disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses('primary', 'md')}`}
                      >
                        Publish Add-on
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
