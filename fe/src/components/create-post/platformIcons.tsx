import { Facebook, Instagram, Youtube, Linkedin, Twitter } from 'lucide-react'
import type { Platform } from './types'

interface PlatformIconProps {
  platform: Platform
  size?: number
}

export function PlatformIcon({ platform, size = 16 }: PlatformIconProps) {
  switch (platform) {
    case 'TikTok':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      )
    case 'Facebook':
      return <Facebook width={size} height={size} />
    case 'Instagram':
      return <Instagram width={size} height={size} />
    case 'X':
      return <Twitter width={size} height={size} />
    default:
      return null
  }
}

interface ExtendedPlatformIconProps {
  platform: string
  size?: number
}

export function ExtendedPlatformIcon({ platform, size = 16 }: ExtendedPlatformIconProps) {
  switch (platform) {
    case 'TikTok':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      )
    case 'Facebook':
      return <Facebook width={size} height={size} />
    case 'Instagram':
      return <Instagram width={size} height={size} />
    case 'X':
      return <Twitter width={size} height={size} />
    case 'LinkedIn':
      return <Linkedin width={size} height={size} />
    case 'YouTube':
      return <Youtube width={size} height={size} />
    default:
      return <span style={{ fontSize: size * 0.7, fontWeight: 700 }}>{platform[0]}</span>
  }
}
