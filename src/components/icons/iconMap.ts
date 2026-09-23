import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import {
  LayoutGridIcon,
  ServerIcon,
  BinaryIcon,
  WrenchIcon,
  SearchIcon,
  PaletteIcon,
  HammerIcon,
  RocketIcon,
  DatabaseBackupIcon,
} from './CustomIcon'

type IconComponent = ComponentType<{ size?: number | string; className?: string }>

export const skillGroupIcons: Record<'code' | 'database' | 'tool', IconComponent> = {
  code: BinaryIcon,
  database: DatabaseBackupIcon,
  tool: WrenchIcon,
}

export const skillGroupPresets = {} as const

export const focusAreaIcons: Record<'layout' | 'server' | 'code', IconComponent> = {
  layout: LayoutGridIcon,
  server: ServerIcon,
  code: BinaryIcon,
}

export const focusAreaPresets = {} as const

export const processIcons: Record<'search' | 'palette' | 'hammer' | 'rocket', IconComponent> = {
  search: SearchIcon,
  palette: PaletteIcon,
  hammer: HammerIcon,
  rocket: RocketIcon,
}

export const processPresets = {} as const
