'use client';

import React from 'react';
import * as Lucide from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { AnimatedIcon, type AnimationPreset } from './AnimatedIcon';
import {
  ZapIcon,
  SparklesIcon,
  MailboxMotion,
  ActivityIcon,
  ArrowDownIcon,
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BanIcon,
  BellIcon,
  BlocksIcon,
  BookmarkIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleHelpIcon,
  CircleIcon,
  ClockIcon,
  CopyIcon,
  DollarSignIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  FlameIcon,
  FolderOpenIcon,
  FolderArchiveIcon,
  GithubIcon,
  HeartIcon,
  HistoryIcon,
  InstagramIcon,
  ItalicIcon,
  LayersIcon,
  LayoutGridIcon,
  LinkIcon,
  LinkedinIcon,
  LockIcon,
  LockKeyholeIcon,
  LogInIcon,
  LogoutIcon,
  MailIcon,
  MapPinIcon,
  MenuIcon,
  MessageSquareIcon,
  PaletteIcon,
  PlusIcon,
  RotateCCWIcon,
  SearchIcon,
  SendIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SunMediumIcon,
  TrendingUpIcon,
  UnderlineIcon,
  UploadIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
  WorkflowIcon,
  XIcon,
  ProjectsIcon,
  RouteIcon,
  BinaryIcon,
} from './CustomIcon';

type WrappedIconProps = LucideProps & { preset?: AnimationPreset };

function wrap(icon: LucideIcon, defaultPreset: AnimationPreset) {
  const Wrapped = React.forwardRef<SVGSVGElement, WrappedIconProps>(({ preset, ...props }, ref) => (
    <AnimatedIcon icon={icon} preset={preset ?? defaultPreset} {...props} />
  ));
  Wrapped.displayName = `Animated(${icon.displayName || 'Icon'})`;
  return Wrapped;
}

export const AlertCircle = wrap(Lucide.AlertCircle, 'shake');
export const AlertTriangle = wrap(Lucide.AlertTriangle, 'shake');
export const ArrowDownToLine = wrap(Lucide.ArrowDownToLine, 'slide-down');
export const Calendar = wrap(Lucide.Calendar, 'pop-clean');
export const Edit2 = wrap(Lucide.Edit2, 'wiggle');
export const FileArchive = wrap(Lucide.FileArchive, 'squeeze');
export const ImageOff = wrap(Lucide.ImageOff, 'fade-flip');
export const ImagePlus = wrap(Lucide.ImagePlus, 'pop-clean');
export const Info = wrap(Lucide.Info, 'pop-clean');
export const List = wrap(Lucide.List, 'pop-clean');
export const MoonStar = wrap(Lucide.MoonStar, 'glow-pulse');
export const MoveHorizontal = wrap(Lucide.MoveHorizontal, 'slide-right');
export const Package = wrap(Lucide.Package, 'corner-peek');
export const PenLine = wrap(Lucide.PenLine, 'wiggle');
export const Scan = wrap(Lucide.Scan, 'ring-expand');
export const Shield = wrap(Lucide.Shield, 'ring-expand');
export const Sparkles = SparklesIcon;
export const ArrowUpRight = ArrowUpRightIcon;
export const Instagram = InstagramIcon;
export const Mailbox = MailboxMotion;
export const Star = wrap(Lucide.Star, 'draw');
export const Target = wrap(Lucide.Target, 'ring-expand');
export const Trash2 = wrap(Lucide.Trash2, 'wiggle');
export const UserRound = wrap(Lucide.UserRound, 'pop-clean');
export const UserX = wrap(Lucide.UserX, 'shake');
export const XCircle = wrap(Lucide.XCircle, 'fade-flip');
export const Zap = ZapIcon;
export const Award = wrap(Lucide.Award, 'ring-expand');
export const Trophy = wrap(Lucide.Trophy, 'tilt');
export const Medal = wrap(Lucide.Medal, 'swing');
export const Crown = wrap(Lucide.Crown, 'pop-clean');
export const Gem = wrap(Lucide.Gem, 'glow-pulse');
export const Percent = wrap(Lucide.Percent, 'pop-clean');
export const Bold = wrap(Lucide.Bold, 'pop-clean');
export const Strikethrough = wrap(Lucide.Strikethrough, 'squeeze');
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
export const Video = wrap(Lucide.Video, 'pop-clean');
export const Unlock = wrap(Lucide.Unlock, 'swing');
export const UploadCloud = wrap(Lucide.UploadCloud, 'slide-up');
export const Table = wrap(Lucide.Table, 'pop-clean');
export const BellRing = wrap(Lucide.BellRing, 'heartbeat');
export const BarChart3 = wrap(Lucide.BarChart3, 'count-flip');
export const Filter = wrap(Lucide.Filter, 'squeeze');
export const CheckSquare = wrap(Lucide.CheckSquare, 'elastic-pop');
export const Square = wrap(Lucide.Square, 'pop-clean');
export const MoreVertical = wrap(Lucide.MoreVertical, 'pop-clean');
export const KeyRound = wrap(Lucide.KeyRound, 'swing');
export const ShieldAlert = wrap(Lucide.ShieldAlert, 'shake');
export const Inbox = wrap(Lucide.Inbox, 'bounce-pop');
export const Activity = ActivityIcon;
export const AlignCenter = AlignCenterIcon;
export const AlignLeft = AlignLeftIcon;
export const AlignRight = AlignRightIcon;
export const ArrowLeft = ArrowLeftIcon;
export const ArrowRight = ArrowRightIcon;
export const ArrowDown = ArrowDownIcon;
export const Ban = BanIcon;
export const Bell = BellIcon;
export const Binary = BinaryIcon;
export const Blocks = BlocksIcon;
export const Bookmark = BookmarkIcon;
export const CalendarCheck = CalendarCheckIcon;
export const CalendarDays = CalendarDaysIcon;
export const Check = CheckIcon;
export const CheckCircle2 = CircleCheckIcon;
export const ChevronDown = ChevronDownIcon;
export const ChevronLeft = ChevronLeftIcon;
export const ChevronRight = ChevronRightIcon;
export const Clock = ClockIcon;
export const Copy = CopyIcon;
export const DollarSign = DollarSignIcon;
export const Download = DownloadIcon;
export const ExternalLink = ExternalLinkIcon;
export const Eye = EyeIcon;
export const EyeOff = EyeOffIcon;
export const Flame = FlameIcon;
export const FolderArchive = FolderArchiveIcon;
export const FolderOpen = FolderOpenIcon;
export const Github = GithubIcon;
export const Heart = HeartIcon;
export const HelpCircle = CircleHelpIcon;
export const History = HistoryIcon;
export const Italic = ItalicIcon;
export const Layers = LayersIcon;
export const LayoutGrid = LayoutGridIcon;
export const Link = LinkIcon;
export const Linkedin = LinkedinIcon;
export const Lock = LockIcon;
export const LockKeyhole = LockKeyholeIcon;
export const LogIn = LogInIcon;
export const LogOut = LogoutIcon;
export const Mail = MailIcon;
export const MapPin = MapPinIcon;
export const Menu = MenuIcon;
export const MessageSquare = MessageSquareIcon;
export const Palette = PaletteIcon;
export const PieChart = ChartPieIcon;
export const Plus = PlusIcon;
export const Project = ProjectsIcon;
export const RotateCcw = RotateCCWIcon;
export const Route = RouteIcon;
export const Search = SearchIcon;
export const Send = SendIcon;
export const Settings = SettingsIcon;
export const ShieldCheck = ShieldCheckIcon;
export const SlidersHorizontal = SlidersHorizontalIcon;
export const SunMedium = SunMediumIcon;
export const TrendingUp = TrendingUpIcon;
export const Underline = UnderlineIcon;
export const Upload = UploadIcon;
export const User = UserIcon;
export const Users = UsersIcon;
export const Wallet = WalletIcon;
export const Workflow = WorkflowIcon;
export const X = XIcon;

export {
  CircleDashedIcon,
  CircleIcon,
};
