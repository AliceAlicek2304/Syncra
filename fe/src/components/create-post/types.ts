import type { ToastItem } from '../Toast'

export type Platform = 'TikTok' | 'Instagram' | 'Facebook' | 'X'
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
}

export const PLATFORMS: { id: Platform; label: string; maxChars: number }[] = [
  { id: 'TikTok', label: 'TikTok', maxChars: 2200 },
  { id: 'Instagram', label: 'Instagram', maxChars: 2200 },
  { id: 'Facebook', label: 'Facebook', maxChars: 2200 },
  { id: 'X', label: 'Twitter/X', maxChars: 280 },
]

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