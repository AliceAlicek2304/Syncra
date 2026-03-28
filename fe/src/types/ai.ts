export type ContentIdea = {
  id: string
  title: string
  type: string
  hook: string
  caption: string
  hashtags: string[]
  platforms: string[]
  bestTime?: string
  estimatedReach?: string
  description?: string
}

export type AIGenerateInput = {
  topic: string
  niche?: string
  audience?: string
  goal?: string
  tone?: string
  files?: Array<{ name: string; type: string; caption?: string }>
}

export type RepurposePlatform = 'LinkedIn' | 'X' | 'Instagram' | 'Newsletter' | 'Facebook' | 'TikTok' | 'YouTube' | 'All'

export type AtomType = 'POST' | 'THREAD' | 'CAROUSEL' | 'INSIGHT' | 'TIP' | 'QUOTE'

export interface MediaFile {
  id: string
  url: string
  type: 'image' | 'video'
  name: string
}

export type RepurposeAtom = {
  id: string
  platform: RepurposePlatform
  type: AtomType
  title?: string
  content: string
  suggestedCTA?: string
  suggestedHashtags: string[]
  media?: MediaFile[]
}

export type RepurposeAtomShort = Pick<RepurposeAtom, 'id' | 'platform' | 'type' | 'content'>

export default {}
