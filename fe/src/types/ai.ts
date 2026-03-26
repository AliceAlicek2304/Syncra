export type ContentIdea = {
  id: string
  title: string
  hook?: string
  caption?: string
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

export type RepurposePlatform = 'LinkedIn' | 'X' | 'Instagram' | 'Newsletter' | 'All'

export type AtomType = 'POST' | 'THREAD' | 'CAROUSEL' | 'INSIGHT' | 'TIP' | 'QUOTE'

export type RepurposeAtom = {
  id: string
  platform: RepurposePlatform
  type: AtomType
  title?: string
  content: string
  suggestedCTA?: string
  suggestedHashtags: string[]
}

export type RepurposeAtomShort = Pick<RepurposeAtom, 'id' | 'platform' | 'type' | 'content'>

export default {}
