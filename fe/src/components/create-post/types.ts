import type { ToastItem } from '../Toast'
import type { ScheduledPost } from '../../context/calendarContextBase'
import { ZERNIO_PLATFORMS } from '../../data/platforms'
import type { ZernioPlatform } from '../../data/platforms'

/** Post-capable platforms in Zernio – those available for create-post */
export type Platform = 'tiktok' | 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' | 'pinterest'
export type Tone = 'default' | 'professional' | 'casual'

export interface MediaFile {
  id: string
  url: string
  type: 'image' | 'video'
  name: string
}

export type PlatformCaptionMap = Record<Platform, string>

export interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onToast?: (t: Omit<ToastItem, 'id'>) => void
  initialContent?: string | null
  initialDate?: { year: number; month: number; day: number }
  editPost?: ScheduledPost | null
}

/** Max character limits per platform */
const PLATFORM_MAX_CHARS: Record<string, number> = {
  tiktok: 2200,
  instagram: 2200,
  facebook: 2200,
  twitter: 280,
  linkedin: 3000,
  youtube: 5000,
  pinterest: 500,
}

/** Post-capable platforms derived from the centralized Zernio platform registry */
export const PLATFORMS: { id: Platform; label: string; maxChars: number }[] =
  ZERNIO_PLATFORMS
    .filter((p): p is ZernioPlatform & { id: Platform } =>
      ['tiktok', 'instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'pinterest'].includes(p.id)
    )
    .map(p => ({
      id: p.id,
      label: p.label,
      maxChars: PLATFORM_MAX_CHARS[p.id] ?? 2200,
    }))

export const PLATFORM_ICONS: Record<Platform, string> = {
  tiktok: '♪',
  instagram: '📸',
  facebook: 'f',
  twitter: '𝕏',
  linkedin: 'in',
  youtube: '▶',
  pinterest: 'P',
}

export type PlatformCaptionMap = Record<Platform, string>

export interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onToast?: (t: Omit<ToastItem, 'id'>) => void
  initialContent?: string | null
  initialDate?: { year: number; month: number; day: number }
  editPost?: ScheduledPost | null
}

import { ZERNIO_PLATFORMS } from '../../data/platforms'

/** Max character limits per platform for create-post */
export const PLATFORM_MAX_CHARS: Record<string, number> = {
  tiktok: 2200,
  instagram: 2200,
  facebook: 2200,
  twitter: 280,
  linkedin: 3000,
  youtube: 5000,
  pinterest: 500,
}

export const PLATFORMS: { id: string; label: string; maxChars: number }[] =
  ZERNIO_PLATFORMS.map(p => ({
    id: p.id,
    label: p.label,
    maxChars: PLATFORM_MAX_CHARS[p.id] ?? 2200,
  }))

export const PLATFORM_ICONS: Record<Platform, string> = {
  TikTok: '♪',
  Instagram: '📸',
  Facebook: 'f',
  X: '𝕏',
}

export const COMMON_EMOJIS = [
  '😊', '🔥', '💡', '🚀', '✅', '💬', '👇', '❤️', '🎯', '💪',
  '📊', '🌟', '😂', '👏', '🙌', '💼', '🎉', '✨', '📱', '💰'
]

export const HASH_TAGS = [
  '#contentcreator', '#viral', '#trending', '#socialmedia', '#growth', '#marketing'
]

export const CROP_PRESETS = [
  { label: 'Free', ratio: null },
  { label: '1:1', ratio: 1 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '9:16', ratio: 9 / 16 },
]