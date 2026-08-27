'use client';

/**
 * Drop-in replacement untuk 'lucide-react' — nama export & prop API
 * (size, className, strokeWidth, dst.) sama persis, jadi tinggal ganti
 * sumber import-nya tanpa perlu ubah JSX pemakaiannya sama sekali.
 * Setiap icon otomatis animasi saat di-hover (desktop) atau di-tap (HP) —
 * lihat AnimatedIcon.tsx untuk engine-nya (CSS-based, ringan) dan
 * globals.css untuk daftar keyframe `.icon-anim-*`.
 *
 * Preset dipilih per "keluarga" icon supaya masing-masing kerasa beda
 * karakternya, bukan cuma variasi arah dari gerakan yang sama:
 *  - tick/spin-once/spin-ccw → benda muter (jam, refresh, undo/redo)
 *  - tilt/swing/wiggle       → benda "digoyang" (gantungan, gembok, pensil)
 *  - slide-*                 → arah masuk/keluar/navigasi
 *  - pop-clean                → tap ringan tanpa overshoot (netral, dipakai
 *                                 buat icon UI generik)
 *  - squeeze                  → benda dikompres (zip, garis, slider)
 *  - draw                     → stroke digambar ulang (checkmark, bintang)
 *  - glow-pulse/flicker       → cahaya (api, listrik, sparkle)
 *  - ring-expand               → radar/scan/proteksi
 *  - blur-focus                → kamera fokus (search, code)
 *  - fade-flip/corner-peek     → benda dibalik/dibuka
 */
import React from 'react';
import * as Lucide from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { AnimatedIcon, type AnimationPreset } from './AnimatedIcon';
import { ZapMotion } from './ZapMotion';
import { SparklesMotion } from './SparklesMotion';

type WrappedIconProps = LucideProps & { preset?: AnimationPreset };

function wrap(icon: LucideIcon, defaultPreset: AnimationPreset) {
  // `preset` di props (kalau dikasih di titik pemakaian) menang atas default,
  // jadi icon yang sama bisa dipakai dengan "rasa" animasi berbeda di tempat
  // berbeda (mis. Bookmark di bottom nav vs Bookmark di kartu add-on).
  const Wrapped = React.forwardRef<SVGSVGElement, WrappedIconProps>(({ preset, ...props }, ref) => (
    <AnimatedIcon icon={icon} preset={preset ?? defaultPreset} {...props} />
  ));
  Wrapped.displayName = `Animated(${icon.displayName || 'Icon'})`;
  return Wrapped;
}

export const Activity = wrap(Lucide.Activity, 'draw');
export const AlertCircle = wrap(Lucide.AlertCircle, 'shake');
export const AlertTriangle = wrap(Lucide.AlertTriangle, 'shake');
export const ArrowDownToLine = wrap(Lucide.ArrowDownToLine, 'slide-down');
export const ArrowLeft = wrap(Lucide.ArrowLeft, 'slide-left');
export const ArrowRight = wrap(Lucide.ArrowRight, 'slide-right');
export const Ban = wrap(Lucide.Ban, 'shake');
export const Bookmark = wrap(Lucide.Bookmark, 'tap-fold');
export const Calendar = wrap(Lucide.Calendar, 'pop-clean');
export const CalendarDays = wrap(Lucide.CalendarDays, 'pop-clean');
export const Check = wrap(Lucide.Check, 'draw');
export const CheckCircle2 = wrap(Lucide.CheckCircle2, 'draw');
export const ChevronDown = wrap(Lucide.ChevronDown, 'slide-down');
export const ChevronLeft = wrap(Lucide.ChevronLeft, 'slide-left');
export const ChevronRight = wrap(Lucide.ChevronRight, 'slide-right');
export const Clock = wrap(Lucide.Clock, 'tick');
export const Download = wrap(Lucide.Download, 'slide-down');
export const Edit2 = wrap(Lucide.Edit2, 'wiggle');
export const ExternalLink = wrap(Lucide.ExternalLink, 'slide-right');
export const FileArchive = wrap(Lucide.FileArchive, 'squeeze');
export const Flame = wrap(Lucide.Flame, 'flicker');
export const Heart = wrap(Lucide.Heart, 'glow-pulse');
export const HelpCircle = wrap(Lucide.HelpCircle, 'pop-clean');
export const History = wrap(Lucide.History, 'spin-ccw');
export const ImageOff = wrap(Lucide.ImageOff, 'fade-flip');
export const ImagePlus = wrap(Lucide.ImagePlus, 'pop-clean');
export const Info = wrap(Lucide.Info, 'pop-clean');
export const LayoutGrid = wrap(Lucide.LayoutGrid, 'pop-clean');
export const List = wrap(Lucide.List, 'pop-clean');
export const Lock = wrap(Lucide.Lock, 'swing');
export const LockKeyhole = wrap(Lucide.LockKeyhole, 'swing');
export const LogIn = wrap(Lucide.LogIn, 'slide-right');
export const LogOut = wrap(Lucide.LogOut, 'slide-left');
export const Mail = wrap(Lucide.Mail, 'tilt');
export const Menu = wrap(Lucide.Menu, 'wiggle');
export const MessageSquare = wrap(Lucide.MessageSquare, 'pop-clean');
export const MoonStar = wrap(Lucide.MoonStar, 'glow-pulse');
export const MoveHorizontal = wrap(Lucide.MoveHorizontal, 'slide-right');
export const Package = wrap(Lucide.Package, 'corner-peek');
export const PenLine = wrap(Lucide.PenLine, 'wiggle');
export const Plus = wrap(Lucide.Plus, 'pop-clean');
export const RotateCcw = wrap(Lucide.RotateCcw, 'spin-ccw');
export const Scan = wrap(Lucide.Scan, 'ring-expand');
export const Search = wrap(Lucide.Search, 'blur-focus');
export const Send = wrap(Lucide.Send, 'launch');
export const Settings = wrap(Lucide.Settings, 'spin-once');
export const Shield = wrap(Lucide.Shield, 'ring-expand');
export const SlidersHorizontal = wrap(Lucide.SlidersHorizontal, 'squeeze');
// Zap & Sparkles sengaja TIDAK lewat `wrap()` (engine CSS generik) — dua
// icon ini direbuild 1:1 dari lucide-animated.com (motion path draw untuk
// Zap, sparkle-bounce + star-blink untuk Sparkles). Lihat ZapMotion.tsx dan
// SparklesMotion.tsx untuk detailnya. Beda dari icon lain di file ini, dua
// export ini TIDAK menerima prop `preset` (tipe-nya LucideProps polos) —
// animasinya sudah fix sesuai sumber asli, jadi kalau ada titik pemakaian
// yang butuh preset custom, jangan dikasih ke Zap/Sparkles.
export const Sparkles = SparklesMotion;
export const Star = wrap(Lucide.Star, 'draw');
export const SunMedium = wrap(Lucide.SunMedium, 'glow-pulse');
export const Target = wrap(Lucide.Target, 'ring-expand');
export const Trash2 = wrap(Lucide.Trash2, 'wiggle');
export const Upload = wrap(Lucide.Upload, 'slide-up');
export const User = wrap(Lucide.User, 'pop-clean');
export const UserRound = wrap(Lucide.UserRound, 'pop-clean');
export const UserX = wrap(Lucide.UserX, 'shake');
export const Users = wrap(Lucide.Users, 'swing');
export const X = wrap(Lucide.X, 'fade-flip');
export const XCircle = wrap(Lucide.XCircle, 'fade-flip');
export const Zap = ZapMotion;

// Icon tambahan (kelewat di scan pertama karena ada di import multi-baris)
export const Award = wrap(Lucide.Award, 'ring-expand');
export const Trophy = wrap(Lucide.Trophy, 'tilt');
export const Medal = wrap(Lucide.Medal, 'swing');
export const Crown = wrap(Lucide.Crown, 'pop-clean');
export const Gem = wrap(Lucide.Gem, 'glow-pulse');
export const TrendingUp = wrap(Lucide.TrendingUp, 'slide-up');
export const CalendarCheck = wrap(Lucide.CalendarCheck, 'draw');
export const Percent = wrap(Lucide.Percent, 'pop-clean');
export const Bold = wrap(Lucide.Bold, 'pop-clean');
export const Italic = wrap(Lucide.Italic, 'tilt');
export const Underline = wrap(Lucide.Underline, 'slide-down');
export const Strikethrough = wrap(Lucide.Strikethrough, 'squeeze');
export const Link = wrap(Lucide.Link, 'swing');
export const AlignLeft = wrap(Lucide.AlignLeft, 'slide-left');
export const AlignCenter = wrap(Lucide.AlignCenter, 'pop-clean');
export const AlignRight = wrap(Lucide.AlignRight, 'slide-right');
export const MoreHorizontal = wrap(Lucide.MoreHorizontal, 'pop-clean');
export const ListOrdered = wrap(Lucide.ListOrdered, 'pop-clean');
export const Indent = wrap(Lucide.Indent, 'slide-right');
export const Outdent = wrap(Lucide.Outdent, 'slide-left');
export const Image = wrap(Lucide.Image, 'fade-flip');
export const Code = wrap(Lucide.Code, 'blur-focus');
export const Quote = wrap(Lucide.Quote, 'pop-clean');
export const Minus = wrap(Lucide.Minus, 'squeeze');
export const Code2 = wrap(Lucide.Code2, 'blur-focus');
export const Undo2 = wrap(Lucide.Undo2, 'spin-ccw');
export const Redo2 = wrap(Lucide.Redo2, 'spin-once');
export const Baseline = wrap(Lucide.Baseline, 'slide-down');
export const Highlighter = wrap(Lucide.Highlighter, 'tilt');
export const Palette = wrap(Lucide.Palette, 'glow-pulse');
export const Video = wrap(Lucide.Video, 'pop-clean');
export const Unlock = wrap(Lucide.Unlock, 'swing');
export const UploadCloud = wrap(Lucide.UploadCloud, 'slide-up');
export const Table = wrap(Lucide.Table, 'pop-clean');
export const Blocks = wrap(Lucide.Blocks, 'corner-peek');
export const ShieldCheck = wrap(Lucide.ShieldCheck, 'ring-expand');

// Icon tambahan — dipakai di Creator Dashboard & Admin Panel yang di-remake
// (analytics, notifikasi, earnings, bulk actions, filter channel/laporan).
export const Bell = wrap(Lucide.Bell, 'heartbeat');
export const BellRing = wrap(Lucide.BellRing, 'heartbeat');
export const DollarSign = wrap(Lucide.DollarSign, 'bounce-pop');
export const Wallet = wrap(Lucide.Wallet, 'bounce-pop');
export const BarChart3 = wrap(Lucide.BarChart3, 'count-flip');
export const PieChart = wrap(Lucide.PieChart, 'orbit-spin');
export const Filter = wrap(Lucide.Filter, 'squeeze');
export const CheckSquare = wrap(Lucide.CheckSquare, 'elastic-pop');
export const Square = wrap(Lucide.Square, 'pop-clean');
export const Eye = wrap(Lucide.Eye, 'blur-focus');
export const EyeOff = wrap(Lucide.EyeOff, 'fade-flip');
export const MoreVertical = wrap(Lucide.MoreVertical, 'pop-clean');
export const FolderOpen = wrap(Lucide.FolderOpen, 'corner-peek');
export const KeyRound = wrap(Lucide.KeyRound, 'swing');
export const ShieldAlert = wrap(Lucide.ShieldAlert, 'shake');
export const Layers = wrap(Lucide.Layers, 'orbit-spin');
export const Inbox = wrap(Lucide.Inbox, 'bounce-pop');
