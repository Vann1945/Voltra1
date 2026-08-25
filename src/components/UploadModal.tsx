'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, FileArchive, Check, HelpCircle, ImagePlus, Trash2, Upload, ChevronDown } from '@/components/icons/animated';
import { Skeleton } from './Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { DescriptionEditor } from './DescriptionEditor';
import { CustomSelect } from './CustomSelect';
import { getButtonClasses, getInputClasses } from '@/lib/designSystem';
import { FadeImage } from './FadeImage';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { IMAGE_ACCEPT, MAX_COVER_IMAGES, getCoverFileError, parseTags } from '@/lib/uploadValidation';
import { uploadAddonFile, ADDON_FILE_ACCEPT } from '@/lib/addonFileUpload';
import { uploadImageToImageKit } from '@/lib/imageUpload';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublished?: () => void | Promise<void>;
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

type DraftVersion = {
  version: string;
  downloadUrl: string;
  changelog: string;
  compatibilityNotes: string;
  fileName?: string;
};

const ADDON_CATEGORIES = ['Bukkit Plugins', 'Modpack', 'Customization', 'Add-Ons', 'Shaders', 'Mods', 'Resource Packs', 'Data Pack', 'World', 'Skin Pack'];
const createInitialFormData = () => ({
  title: '', description: '', projectClass: 'Modpack', mainCategory: 'Add-Ons', additionalCategory: '', tagsInput: '',
  imageUrl: '', imageUrls: [] as string[], panoramaUrl: '', downloadUrl: '', demoUrl: '', license: 'All Rights Reserved',
  distributionPref: 'Allow distribution to 3rd party', unlisted: false, allowComments: true,
  socials: [] as { platform: string; url: string }[],
});

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

const UNREADABLE_IMAGE_MESSAGE =
  "This image couldn't be read on your device. If it's a photo from cloud storage (Google Photos, etc.) on a slow connection, wait for it to fully download and try again, or pick a different image.";

/**
 * Decodes a File into an image source we can draw to a canvas.
 * Prefers createImageBitmap (more reliable across mobile browsers/WebViews,
 * decodes off the main thread) and falls back to an <img> element for
 * browsers that don't support it.
 */
async function loadImageSource(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (file.size === 0) {
    throw new Error("This file appears to be empty or hasn't fully downloaded yet. Please try selecting it again.");
  }

  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to the <img> based decode below.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(UNREADABLE_IMAGE_MESSAGE));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getImageSourceDimensions(source: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  return source instanceof HTMLImageElement
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

async function convertToWebp(file: File, maxDimension = 1600, quality = 0.82, maxBytes = 4 * 1024 * 1024): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  const newName = file.name.replace(/\.[^.]+$/, '') + '.webp';
  const source = await loadImageSource(file).catch(err => {
    throw err instanceof Error ? err : new Error(UNREADABLE_IMAGE_MESSAGE);
  });

  let { width, height } = getImageSourceDimensions(source);
  if (!width || !height) {
    if (source instanceof ImageBitmap) source.close();
    throw new Error(UNREADABLE_IMAGE_MESSAGE);
  }
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) { if (source instanceof ImageBitmap) source.close(); throw new Error('Could not prepare the image for upload.'); }
  ctx.drawImage(source, 0, 0, width, height);
  if (source instanceof ImageBitmap) source.close();

  return new Promise<File>((resolve, reject) => {
    const encode = (currentCanvas: HTMLCanvasElement, nextQuality: number) => {
      currentCanvas.toBlob(blob => {
        if (!blob) { reject(new Error('Could not prepare the image for upload.')); return; }
        if (blob.size <= maxBytes || nextQuality <= 0.45 || currentCanvas.width < 720) {
          if (blob.size > maxBytes) {
            reject(new Error('Image is still too large after compression. Choose a smaller image.'));
            return;
          }
          resolve(new File([blob], newName, { type: 'image/webp' }));
          return;
        }
        const smallerCanvas = document.createElement('canvas');
        smallerCanvas.width = Math.max(720, Math.round(currentCanvas.width * 0.8));
        smallerCanvas.height = Math.max(480, Math.round(currentCanvas.height * 0.8));
        const smallerContext = smallerCanvas.getContext('2d');
        if (!smallerContext) { reject(new Error('Could not prepare the image for upload.')); return; }
        smallerContext.drawImage(currentCanvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
        encode(smallerCanvas, Math.max(0.45, nextQuality - 0.08));
      }, 'image/webp', nextQuality);
    };
    encode(canvas, quality);
  });
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const source = await loadImageSource(file);
  const dims = getImageSourceDimensions(source);
  if (source instanceof ImageBitmap) source.close();
  return dims;
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

function uploadCoverImage(file: File, onProgress: (pct: number) => void, folderName?: string): Promise<string> {
  return uploadImageToImageKit(file, 'addon', folderName || 'untitled', onProgress);
}

export function UploadModal({ isOpen, onClose, onPublished }: UploadModalProps) {
  const reduceMotion = useReducedMotion();
  useBodyScrollLock(isOpen);
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isImageDragActive, setIsImageDragActive] = useState(false);
  const [isAddonDragActive, setIsAddonDragActive] = useState(false);
  const [isPanoramaDragActive, setIsPanoramaDragActive] = useState(false);
  const [formData, setFormData] = useState(createInitialFormData);

  const [versions, setVersions] = useState<DraftVersion[]>([
    { version: '1.0.0', downloadUrl: '', changelog: '', compatibilityNotes: '' },
  ]);
  const versionFileInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [versionUploadProgress, setVersionUploadProgress] = useState<Record<number, number | null>>({});
  const [step, setStep] = useState<Step>('general');
  const [stepError, setStepError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const addonFileInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalPanelRef = useRef<HTMLDivElement>(null);
  const hasAutoAdvancedGeneralRef = useRef(false);
  const hasAutoAdvancedDescriptionRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const panoramaInputRef = useRef<HTMLInputElement>(null);

  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const [panoramaUploadProgress, setPanoramaUploadProgress] = useState<number | null>(null);

  const [fileUploadProgress, setFileUploadProgress] = useState<number | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const handleClose = () => {
    if (loading || imageUploadProgress !== null || panoramaUploadProgress !== null || fileUploadProgress !== null) return;
    setFormData(createInitialFormData());
    setVersions([{ version: '1.0.0', downloadUrl: '', changelog: '', compatibilityNotes: '' }]);
    setVersionUploadProgress({});
    setImageUploadProgress(null);
    setPanoramaUploadProgress(null);
    setFileUploadProgress(null);
    setUploadedFileName('');
    setStep('general');
    setStepError('');
    setSuccessMessage('');
    setAdvancedOpen(false);
    hasAutoAdvancedGeneralRef.current = false;
    hasAutoAdvancedDescriptionRef.current = false;
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) handleClose();
      if (event.key !== 'Tab' || !modalPanelRef.current) return;
      const focusable = Array.from(modalPanelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (focusable.length === 0) return;
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
  }, [isOpen, loading, onClose]);

  const uploadCoverFiles = async (selectedFiles: File[]) => {
    const availableSlots = Math.max(0, MAX_COVER_IMAGES - formData.imageUrls.length);
    const files = selectedFiles.slice(0, availableSlots);
    if (files.length === 0) {
      showToast(`You can add up to ${MAX_COVER_IMAGES} cover images.`, 'error');
      return;
    }
    const invalidFile = files.find(file => getCoverFileError(file));
    if (invalidFile) {
      showToast(getCoverFileError(invalidFile), 'error');
      return;
    }
    if (selectedFiles.length > files.length) {
      showToast(`Only ${MAX_COVER_IMAGES} cover images are allowed.`, 'error');
    }

    setImageUploadProgress(0);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const webpFile = await convertToWebp(files[i]);
        const url = await uploadCoverImage(webpFile, pct => {
          setImageUploadProgress(Math.round(((i + pct / 100) / files.length) * 100));
        }, formData.title);
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
      showToast(`${uploadedUrls.length} cover image${uploadedUrls.length > 1 ? 's' : ''} ready.`, 'success');
    } catch (err: unknown) {
      showToast((err as Error)?.message || 'Image upload failed. Please try again.', 'error');
    } finally {
      setImageUploadProgress(null);
    }
  };

  const handleImagesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length > 0) await uploadCoverFiles(files);
  };

  const handleImageDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsImageDragActive(false);
    if (imageUploadProgress !== null) return;
    const files = Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) await uploadCoverFiles(files);
  };

  const uploadPanoramaFile = async (file: File) => {
    const validationError = await validatePanoramaFile(file);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setPanoramaUploadProgress(0);
    try {
        const webpFile = await convertToWebp(file, 1800, 0.76);
      const url = await uploadCoverImage(webpFile, pct => setPanoramaUploadProgress(pct), formData.title);
      setFormData(prev => ({ ...prev, panoramaUrl: url }));
      showToast('Panorama image uploaded successfully.', 'success');
    } catch (err: unknown) {
      showToast((err as Error)?.message || 'Panorama upload failed. Please try again.', 'error');
    } finally {
      setPanoramaUploadProgress(null);
    }
  };

  const handlePanoramaSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await uploadPanoramaFile(file);
  };

  const handlePanoramaDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsPanoramaDragActive(false);
    if (panoramaUploadProgress !== null) return;
    const file = event.dataTransfer.files?.[0];
    if (file) await uploadPanoramaFile(file);
  };

  const removePanorama = () => {
    setFormData(prev => ({ ...prev, panoramaUrl: '' }));
  };

  const uploadPrimaryAddonFile = async (file: File) => {
    setFileUploadProgress(0);
    try {
      const downloadUrl = await uploadAddonFile(file, pct => setFileUploadProgress(pct));
      setFormData(prev => ({ ...prev, downloadUrl }));
      setVersions(prev => prev.map((version, index) => index === 0 ? { ...version, downloadUrl, fileName: file.name } : version));
      setUploadedFileName(file.name);
      showToast('Project file ready.', 'success');
    } catch (err: unknown) {
      showToast((err as Error)?.message || 'Failed to upload file.', 'error');
    } finally {
      setFileUploadProgress(null);
    }
  };

  const handleAddonFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await uploadPrimaryAddonFile(file);
  };

  const handleAddonDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsAddonDragActive(false);
    if (fileUploadProgress !== null) return;
    const file = event.dataTransfer.files?.[0];
    if (file) await uploadPrimaryAddonFile(file);
  };

  const handleVersionFileSelected = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setVersionUploadProgress(prev => ({ ...prev, [index]: 0 }));
    try {
      const downloadUrl = await uploadAddonFile(file, pct => setVersionUploadProgress(prev => ({ ...prev, [index]: pct })));
      setVersions(prev => prev.map((version, versionIndex) => versionIndex === index ? { ...version, downloadUrl, fileName: file.name } : version));
      if (index === 0) {
        setFormData(prev => ({ ...prev, downloadUrl }));
        setUploadedFileName(file.name);
      }
      showToast(`Version ${index + 1} file uploaded successfully.`, 'success');
    } catch (err: unknown) {
      showToast((err as Error)?.message || 'Failed to upload version file.', 'error');
    } finally {
      setVersionUploadProgress(prev => ({ ...prev, [index]: null }));
    }
  };

  const updateVersion = (index: number, patch: Partial<DraftVersion>) => {
    setVersions(prev => prev.map((version, versionIndex) => versionIndex === index ? { ...version, ...patch } : version));
    if (index === 0 && patch.downloadUrl !== undefined) {
      setFormData(prev => ({ ...prev, downloadUrl: patch.downloadUrl || '' }));
      if (!patch.downloadUrl) setUploadedFileName('');
    }
  };

  const addVersion = () => {
    setVersions(prev => prev.length >= 2 ? prev : [...prev, { version: '', downloadUrl: '', changelog: '', compatibilityNotes: '' }]);
  };

  const removeVersion = (index: number) => {
    if (index === 0) return;
    setVersions(prev => prev.filter((_, versionIndex) => versionIndex !== index));
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
  const generalReady = Boolean(formData.title.trim() && formData.downloadUrl.trim() && formData.imageUrls.length > 0 && versions.every(version => version.version.trim() && isValidHttpUrl(version.downloadUrl)));

  useEffect(() => {
    if (!isOpen) {
      hasAutoAdvancedGeneralRef.current = false;
      hasAutoAdvancedDescriptionRef.current = false;
      return;
    }
    if (step === 'general' && generalReady && !loading && !hasAutoAdvancedGeneralRef.current) {
      hasAutoAdvancedGeneralRef.current = true;
      setStepError('');
      setStep('description');
    }
  }, [generalReady, isOpen, loading, step]);

  const validateStep = (s: Step): string => {
    if (s === 'general') {
      if (!formData.title.trim()) return 'Title is mandatory.';
      if (!formData.downloadUrl.trim()) return 'Download URL is required for version 1.';
      if (!isValidHttpUrl(formData.downloadUrl)) return 'Version 1 download URL must start with http:// or https://.';
      if (!formData.imageUrl && formData.imageUrls.length === 0) return 'At least 1 cover image must be filled in.';
      if (versions.length > 2) return 'You can add at most two versions.';
      for (let index = 0; index < versions.length; index++) {
        const version = versions[index];
        if (!version.version.trim()) return `Version ${index + 1} name is required.`;
        if (!version.downloadUrl.trim() || !isValidHttpUrl(version.downloadUrl)) return `Version ${index + 1} needs a valid download URL.`;
        if (version.changelog.length > 10000) return `Version ${index + 1} changelog is too long.`;
      }
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
    if (idx > 0) {
      if (step === 'description') hasAutoAdvancedGeneralRef.current = true;
      if (step === 'license') hasAutoAdvancedDescriptionRef.current = true;
      setStep(STEPS[idx - 1]);
    }
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
        versions: versions.map(({ fileName, ...version }) => version),
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
          versions: versions.map(({ fileName, ...version }) => version),
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
      await onPublished?.();
      setSuccessMessage('Add-on published! It is pending admin review.');
      showToast('Add-on published successfully.', 'success');
      setTimeout(() => { setSuccessMessage(''); handleClose(); }, 2500);
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
          <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduceMotion ? undefined : { opacity: 0 }} onClick={handleClose} className="absolute inset-0 bg-ink-900/70" />
          <motion.div
            ref={modalPanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-modal-title"
            aria-describedby="upload-modal-description"
            initial={reduceMotion ? false : { y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { y: '100%', opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: 'easeOut' }}
            className="relative flex h-[100dvh] max-h-[100dvh] w-full min-h-0 max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-parchment-border bg-parchment-raised shadow-card-float sm:h-auto sm:max-h-[90vh] sm:rounded-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-parchment-border bg-parchment-raised px-4 py-4 sm:px-6">
              <div>
                <p className="voltra-section-label">Publish</p>
                <h2 id="upload-modal-title" className="mt-1 text-xl font-bold tracking-tight text-ink-900">Create project</h2>
                <p id="upload-modal-description" className="mt-1 text-xs font-medium text-ink-900/50">Share your work with the Voltra community.</p>
              </div>
              <button ref={closeButtonRef} type="button" onClick={handleClose} aria-label="Close publish dialog" className="rounded-xl border border-parchment-border bg-parchment-raised p-2.5 text-ink-900 transition hover:bg-ink-900/[0.05] focus-visible:ring-2 focus-visible:ring-terracotta">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Publish steps" className="flex shrink-0 gap-1 border-b border-parchment-border bg-parchment px-4 py-2 sm:px-6">
              {STEPS.map(s => (
                <button key={s} type="button" onClick={() => goToStep(s)} aria-current={step === s ? 'step' : undefined} className={`min-h-10 flex-1 rounded-xl px-3 text-xs font-bold transition-colors ${step === s ? 'bg-terracotta text-paper shadow-sm' : 'text-ink-900/50 hover:bg-parchment-raised hover:text-ink-900'}`}>
                  <span>{s === 'general' ? 'Essentials' : s === 'description' ? 'Description' : 'Publish settings'}</span>
                </button>
              ))}
            </nav>

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
                      <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-4 shadow-sm sm:p-5">
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div>
                            <p className="voltra-section-label">Essentials</p>
                            <h3 className="mt-1 text-base font-bold text-ink-900">Tell us about your project</h3>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
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
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                              <Label htmlFor="upload-class">Class</Label>
                              <CustomSelect
                                id="upload-class"
                                value={formData.projectClass}
                                options={ADDON_CATEGORIES}
                                onChange={val => setFormData({ ...formData, projectClass: val })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="upload-main-category">Main category</Label>
                              <CustomSelect
                                id="upload-main-category"
                                value={formData.mainCategory}
                                options={ADDON_CATEGORIES}
                                onChange={val => setFormData({ ...formData, mainCategory: val })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="upload-additional-category">Extra category</Label>
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
                        </div>
                      </section>

                      <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-4 shadow-sm sm:p-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <Label htmlFor="upload-tags">Tags</Label>
                            <p className="text-xs font-medium text-ink-900/50">Separate with commas.</p>
                          </div>
                          <span className="text-xs font-bold text-ink-900/45">{parseTags(formData.tagsInput).length}/20</span>
                        </div>
                        <TextInput
                          id="upload-tags"
                          type="text"
                          placeholder="pvp, survival, medieval"
                          value={formData.tagsInput}
                          onChange={e => setFormData({ ...formData, tagsInput: e.target.value })}
                        />
                        {formData.tagsInput.trim() && (
                          <div className="mt-3 flex flex-wrap gap-2" aria-label="Parsed tags">
                            {parseTags(formData.tagsInput).map((tag, i) => (
                              <span key={i} className="inline-flex items-center rounded-full bg-terracotta/10 px-2.5 py-1 text-xs font-bold text-terracotta-text">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </section>

                      <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-4 shadow-sm sm:p-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <Label>Cover images *</Label>
                            <p className="text-xs font-medium text-ink-900/50">First image becomes the cover.</p>
                          </div>
                          <span className="text-xs font-bold text-ink-900/45">{formData.imageUrls.length}/{MAX_COVER_IMAGES}</span>
                        </div>
                        {formData.imageUrls.length > 0 && (
                          <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Cover image previews">
                            {formData.imageUrls.map(url => (
                              <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-parchment-border bg-parchment shadow-sm">
                                <FadeImage src={url} alt="Cover preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                {url === formData.imageUrl && <span className="absolute left-1 top-1 rounded-full bg-terracotta px-1.5 py-0.5 text-[9px] font-bold uppercase text-paper">Main</span>}
                                <button type="button" onClick={() => removeImage(url)} aria-label="Remove cover image" className="absolute right-1 top-1 rounded-full bg-ink-900/75 p-1.5 text-paper opacity-100 transition group-hover:opacity-100 sm:opacity-0 focus-visible:opacity-100">
                                  <Trash2 size={12} aria-hidden="true" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => imageInputRef.current?.click()}
                          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); imageInputRef.current?.click(); } }}
                          onDragEnter={event => { event.preventDefault(); setIsImageDragActive(true); }}
                          onDragOver={event => event.preventDefault()}
                          onDragLeave={() => setIsImageDragActive(false)}
                          onDrop={handleImageDrop}
                          aria-label="Add cover images"
                          className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-4 text-center transition-colors focus-visible:ring-2 focus-visible:ring-terracotta ${isImageDragActive ? 'border-terracotta bg-terracotta/10' : 'border-ink-900/20 bg-parchment hover:border-terracotta/60 hover:bg-terracotta/[0.04]'}`}
                        >
                          {imageUploadProgress !== null ? <span className="text-sm font-bold text-terracotta-text">Uploading {Math.round(imageUploadProgress)}%</span> : <><Upload size={18} className="text-terracotta-text" aria-hidden="true" /><span className="text-sm font-bold text-ink-900">Drop screenshots here or choose files</span><span className="text-xs font-medium text-ink-900/45">JPG, PNG, or WebP · up to {MAX_COVER_IMAGES} images</span></>}
                        </div>
                        <input type="file" ref={imageInputRef} onChange={handleImagesSelected} accept={IMAGE_ACCEPT} multiple className="hidden" />
                        {imageUploadProgress !== null && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-900/10" aria-label={`Uploading ${Math.round(imageUploadProgress)} percent`}><div className="h-full rounded-full bg-terracotta transition-[width] duration-200" style={{ width: `${imageUploadProgress}%` }} /></div>}
                      </section>

                      <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-4 shadow-sm sm:p-5">
                        <div className="mb-3 flex items-center justify-between gap-3"><div><p className="voltra-section-label">Header media</p><h3 className="mt-1 text-base font-bold text-ink-900">Add a panorama <span className="text-xs font-medium text-ink-900/45">(optional)</span></h3></div>{formData.panoramaUrl && <button type="button" onClick={removePanorama} className="rounded-lg p-2 text-danger hover:bg-danger/[0.08]" aria-label="Remove panorama image"><Trash2 size={15} aria-hidden="true" /></button>}</div>
                        {formData.panoramaUrl ? <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-parchment-border"><FadeImage src={formData.panoramaUrl} alt="Panorama preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" /></div> : <div role="button" tabIndex={0} onClick={() => panoramaInputRef.current?.click()} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); panoramaInputRef.current?.click(); } }} onDragEnter={event => { event.preventDefault(); setIsPanoramaDragActive(true); }} onDragOver={event => event.preventDefault()} onDragLeave={() => setIsPanoramaDragActive(false)} onDrop={handlePanoramaDrop} aria-label="Add panorama image" className={`flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-3 text-center transition-colors focus-visible:ring-2 focus-visible:ring-terracotta ${isPanoramaDragActive ? 'border-terracotta bg-terracotta/10' : 'border-ink-900/20 bg-parchment hover:border-terracotta/60 hover:bg-terracotta/[0.04]'}`}>{panoramaUploadProgress !== null ? <span className="text-sm font-bold text-terracotta-text" aria-live="polite">Uploading {Math.round(panoramaUploadProgress)}%</span> : <><span className="flex items-center gap-2 text-sm font-bold text-ink-900"><ImagePlus size={16} className="text-terracotta-text" aria-hidden="true" /> Drop or choose panorama</span><span className="text-xs font-medium text-ink-900/45">JPG, PNG, WebP · at least 1,200 px wide · 16:10+</span></>}</div>}
                        <input id="upload-panorama" type="file" ref={panoramaInputRef} onChange={handlePanoramaSelected} accept={IMAGE_ACCEPT} className="hidden" />
                        {panoramaUploadProgress !== null && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-900/10" aria-label={`Uploading ${Math.round(panoramaUploadProgress)} percent`}><div className="h-full rounded-full bg-terracotta transition-[width] duration-200" style={{ width: `${panoramaUploadProgress}%` }} /></div>}
                      </section>

                      <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-4 shadow-sm sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="voltra-section-label">Release files</p>
                            <h3 className="mt-1 text-base font-bold text-ink-900">Add a downloadable version</h3>
                          </div>
                          {versions.length < 2 && <button type="button" onClick={addVersion} className="min-h-10 rounded-xl border border-parchment-border px-3 text-xs font-bold text-terracotta-text transition hover:border-terracotta/60 hover:bg-terracotta/[0.04]">+ Version</button>}
                        </div>
                        <div className="mt-4 space-y-3">
                          {versions.map((version, index) => (
                            <div key={index} className="rounded-xl border border-parchment-border bg-parchment p-3 sm:p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-terracotta/10 text-terracotta-text"><FileArchive size={14} aria-hidden="true" /></span><span className="text-sm font-bold text-ink-900">{index === 0 ? 'Current release' : 'Optional update'}</span></div>
                                {index > 0 && <button type="button" onClick={() => removeVersion(index)} className="rounded-lg p-2 text-ink-900/45 transition hover:bg-danger/[0.08] hover:text-danger" aria-label={`Remove version ${index + 1}`}><Trash2 size={15} aria-hidden="true" /></button>}
                              </div>
                              <div className="grid gap-3 sm:grid-cols-[minmax(0,136px)_1fr]">
                                <TextInput id={`upload-version-${index + 1}`} required value={version.version} onChange={event => updateVersion(index, { version: event.target.value })} placeholder={index === 0 ? '1.0.0' : '1.1.0'} aria-label={`Version ${index + 1} name`} />
                                <div className={`flex min-w-0 gap-2 rounded-xl transition-colors ${isAddonDragActive && index === 0 ? 'ring-2 ring-terracotta' : ''}`} onDragEnter={event => { if (index === 0) { event.preventDefault(); setIsAddonDragActive(true); } }} onDragOver={event => { if (index === 0) event.preventDefault(); }} onDragLeave={() => index === 0 && setIsAddonDragActive(false)} onDrop={event => { if (index === 0) handleAddonDrop(event); }}>
                                  <TextInput
  id={`upload-version-url-${index + 1}`}
  required
  type={version.fileName ? 'text' : 'url'}
  value={version.fileName || version.downloadUrl}
  readOnly={Boolean(version.fileName)}
  onChange={event => updateVersion(index, { downloadUrl: event.target.value, fileName: '' })}
  placeholder="Link Untuk Update"
  aria-label={`Version ${index + 1} download URL or file name`}
/>
                                  <button type="button" onClick={() => index === 0 ? addonFileInputRef.current?.click() : versionFileInputRefs.current[index]?.click()} disabled={index === 0 ? fileUploadProgress !== null : versionUploadProgress[index] !== null} title={`Upload version ${index + 1} file`} aria-label={`Upload version ${index + 1} file`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-terracotta text-paper shadow-sm transition hover:bg-terracotta-text active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                                    {index === 0 && fileUploadProgress !== null || index > 0 && versionUploadProgress[index] !== null ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/35 border-t-paper" /> : <FileArchive size={16} aria-hidden="true" />}
                                  </button>
                                  {index === 0 ? <input type="file" ref={addonFileInputRef} onChange={handleAddonFileSelected} accept={ADDON_FILE_ACCEPT} className="hidden" /> : <input type="file" ref={element => { versionFileInputRefs.current[index] = element; }} onChange={event => handleVersionFileSelected(event, index)} accept={ADDON_FILE_ACCEPT} className="hidden" />}
                                </div>
                              </div>
                              {(version.fileName || index === 0 && uploadedFileName) && <p className="mt-2 flex items-center gap-2 truncate text-xs font-bold text-success"><Check size={13} aria-hidden="true" />{version.fileName || uploadedFileName}</p>}
                              <details className="mt-3 rounded-xl border border-parchment-border/70 bg-parchment-raised px-3 py-2">
                                <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold text-ink-900"><span>Release notes</span><ChevronDown size={14} aria-hidden="true" /></summary>
                                <div className="mt-3 space-y-3">
                                  <div><label htmlFor={`upload-version-changelog-${index + 1}`} className="mb-2 block text-xs font-bold text-ink-900/65">Changelog</label><textarea id={`upload-version-changelog-${index + 1}`} value={version.changelog} onChange={event => updateVersion(index, { changelog: event.target.value })} rows={3} maxLength={10000} placeholder="What changed in this release?" className={`${getInputClasses()} resize-y`} /></div>
                                  <div><label htmlFor={`upload-version-compatibility-${index + 1}`} className="mb-2 block text-xs font-bold text-ink-900/65">Compatibility <span className="font-medium text-ink-900/40">(optional)</span></label><TextInput id={`upload-version-compatibility-${index + 1}`} value={version.compatibilityNotes} onChange={event => updateVersion(index, { compatibilityNotes: event.target.value })} placeholder="Minecraft 1.21+" /></div>
                                </div>
                              </details>
                            </div>
                          ))}
                        </div>
                        {(fileUploadProgress !== null || Object.values(versionUploadProgress).some(Boolean)) && <p className="mt-3 text-xs font-bold text-terracotta-text" aria-live="polite">Uploading release file… {Math.round(fileUploadProgress ?? Object.values(versionUploadProgress).find(value => value !== null) ?? 0)}%</p>}
                      </section>

                      <details open={advancedOpen} onToggle={event => setAdvancedOpen(event.currentTarget.open)} className="rounded-2xl border border-parchment-border bg-parchment-raised p-4 shadow-sm sm:p-5">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-ink-900"><span><span className="voltra-section-label block">Optional</span><span className="mt-1 block">Add more project details</span></span><ChevronDown size={18} className={`text-ink-900/50 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} aria-hidden="true" /></summary>
                        <div className="mt-4 space-y-4">
                          <div>
                            <Label htmlFor="upload-demo-url">Demo video URL</Label>
                            <TextInput id="upload-demo-url" type="url" value={formData.demoUrl} onChange={e => setFormData({ ...formData, demoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                          </div>
                          <div className="grid gap-3 rounded-xl border border-parchment-border bg-parchment p-3 sm:grid-cols-2 sm:p-4">
                            <NeuCheckbox id="upload-allow-comments" checked={formData.allowComments} onChange={v => setFormData({ ...formData, allowComments: v })} label="Allow comments" />
                            <NeuCheckbox id="upload-unlisted" checked={formData.unlisted} onChange={v => setFormData({ ...formData, unlisted: v })} label="Unlisted project" sublabel="Share by direct link only." />
                          </div>

                        </div>
                      </details>
                    </>
                  )}

                  {step === 'description' && (
                    <div
                      onBlur={event => {
                        const relatedTarget = event.relatedTarget as Node | null;
                        if ((!relatedTarget || !event.currentTarget.contains(relatedTarget)) && formData.description.trim() && !hasAutoAdvancedDescriptionRef.current) {
                          hasAutoAdvancedDescriptionRef.current = true;
                          setStepError('');
                          setStep('license');
                        }
                      }}
                    >
                      <Label>Description *</Label>
                      <p className="mb-4 text-xs font-medium text-ink-900/50">Add the details players need before downloading.</p>
                      <DescriptionEditor
                        required
                        value={formData.description}
                        onChange={val => setFormData({ ...formData, description: val })}
                        onUploadImage={file => uploadCoverImage(file, () => {}, formData.title)}
                        placeholder="Write a clear description of your add-on..."
                      />
                    </div>
                  )}

                  {step === 'license' && (
                    <div className="space-y-7">
                      <div>
                        <h3 className="text-sm font-bold text-ink-900 uppercase tracking-widest mb-1">Project License</h3>
                          <p className="text-xs text-ink-900/50 font-medium mb-3">Choose how others may use and share this project.</p>
                        <CustomSelect
                          value={formData.license}
                          options={PROJECT_LICENSES}
                          onChange={val => setFormData({ ...formData, license: val })}
                        />
                      </div>

                      <div className="pt-5 border-t border-parchment-border">
                        <h3 className="text-sm font-bold text-ink-900 uppercase tracking-widest mb-1 flex items-center gap-1">
                          Distribution <HelpCircle size={13} className="text-ink-900/40" />
                        </h3>
                        <p className="text-xs text-ink-900/50 font-medium mb-3">Choose whether third-party distribution is allowed.</p>
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
                    <p role="alert" className="text-xs font-bold text-danger">{stepError}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
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
                      Back
                    </button>
                  )}
                  {step !== 'license' ? (
                    <button
                      type="button"
                      onClick={goNext}
                      className={getButtonClasses('primary', 'md')}
                    >
                      Continue
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
                        Publish add-on
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
