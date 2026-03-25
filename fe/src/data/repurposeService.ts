import type { AtomType, RepurposeAtom, RepurposePlatform } from './mockAI'

type RepurposeLength = 'short' | 'medium' | 'long'

export interface GenerateRepurposeRequest {
  sourceText: string
  platforms: RepurposePlatform[]
  tone: string
  length: RepurposeLength
  extractAtoms: boolean
}

const VALID_ATOM_TYPES: AtomType[] = ['POST', 'THREAD', 'CAROUSEL', 'INSIGHT', 'TIP', 'QUOTE']
const VALID_PLATFORMS: RepurposePlatform[] = ['LinkedIn', 'X', 'Instagram', 'Newsletter']
const MAX_SOURCE_TEXT_LENGTH = 20000
const REPURPOSE_API_URL = (import.meta.env.VITE_REPURPOSE_API_URL as string | undefined)?.trim()
  || 'http://localhost:5260/api/v1/repurpose/generate'

function toLengthInstruction(length: RepurposeLength): string {   
  if (length === 'short') return 'short form'
  if (length === 'long') return 'long form'
  return 'medium form'
}

function toToneInstruction(tone: string): string {
  if (!tone || tone === 'default') return 'adaptive and balanced tone'
  return `${tone} tone`
}

export function buildRepurposePrompt(req: GenerateRepurposeRequest): string {
  const sanitizedSourceText = sanitizeSourceText(req.sourceText)
  const platformList = req.platforms.join(', ')
  const atomTypeList = VALID_ATOM_TYPES.join(', ')
  const toneInstruction = toToneInstruction(req.tone)
  const lengthInstruction = toLengthInstruction(req.length)
  const extractInstruction = req.extractAtoms
    ? 'Prioritize atom types INSIGHT, TIP, QUOTE when possible.'
    : 'Prioritize full post formats like POST, THREAD, CAROUSEL when possible.'

  return `You are a social media repurpose assistant.
Generate 2 to 3 content atoms from the source text for these platforms: ${platformList}.
Use ${toneInstruction} and ${lengthInstruction}.
${extractInstruction}

Return STRICT JSON ONLY.
Do not include markdown, explanation, or code fences.
Return an object with this shape:
{
  "atoms": [
    {
      "id": "string",
      "type": "one of: ${atomTypeList}",
      "title": "optional string",
      "content": "non-empty string",
      "platform": "one of: ${VALID_PLATFORMS.join(', ')}",
      "suggestedHashtags": ["string"],
      "suggestedCTA": "optional string"
    }
  ]
}

Validation rules:
- atoms length must be between 2 and 3
- every atom.platform must be one of selected platforms: ${platformList}
- every atom.content must be non-empty
- suggestedHashtags must be an array of strings

Source text:
${sanitizedSourceText}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function sanitizeSourceText(sourceText: string): string {
  const normalized = sourceText.split('\0').join('').trim()
  if (!normalized) throw new Error('Source text is invalid.')
  if (normalized.length > MAX_SOURCE_TEXT_LENGTH) {
    throw new Error(`Source text is too long (maximum ${MAX_SOURCE_TEXT_LENGTH.toLocaleString()} characters).`)
  }
  return normalized
}

function parseAtom(raw: unknown, selectedPlatforms: RepurposePlatform[]): RepurposeAtom {
  if (!isRecord(raw)) throw new Error('Invalid atom item.')

  const id = raw.id
  const type = raw.type
  const title = raw.title
  const content = raw.content
  const platform = raw.platform
  const suggestedHashtags = raw.suggestedHashtags
  const suggestedCTA = raw.suggestedCTA

  if (typeof id !== 'string' || !id.trim()) throw new Error('Each atom must have a non-empty string id.')
  if (typeof type !== 'string' || !VALID_ATOM_TYPES.includes(type as AtomType)) throw new Error('Invalid atom type.')
  if (title !== undefined && typeof title !== 'string') throw new Error('title must be a string when provided.')
  if (typeof content !== 'string' || !content.trim()) throw new Error('Each atom must have non-empty content.')
  if (typeof platform !== 'string' || !VALID_PLATFORMS.includes(platform as RepurposePlatform)) throw new Error('Invalid platform.')
  if (!selectedPlatforms.includes(platform as RepurposePlatform)) throw new Error('Atom platform is not in selected platforms.')
  if (!Array.isArray(suggestedHashtags) || suggestedHashtags.some(tag => typeof tag !== 'string')) {
    throw new Error('suggestedHashtags must be an array of strings.')
  }
  if (suggestedCTA !== undefined && typeof suggestedCTA !== 'string') throw new Error('suggestedCTA must be a string when provided.')

  return {
    id,
    type: type as AtomType,
    title: title as string | undefined,
    content,
    platform: platform as RepurposePlatform,
    suggestedHashtags,
    suggestedCTA: suggestedCTA as string | undefined,
  }
}

export function parseRepurposeAtomsResponse(rawText: string, selectedPlatforms: RepurposePlatform[]): RepurposeAtom[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('AI response is not valid JSON.')
  }

  if (!isRecord(parsed)) throw new Error('AI response must be a JSON object.')
  const atoms = parsed.atoms
  if (!Array.isArray(atoms)) throw new Error('AI response must contain an atoms array.')
  if (atoms.length < 2 || atoms.length > 3) throw new Error('AI response must contain 2 to 3 atoms.')

  return atoms.map(atom => parseAtom(atom, selectedPlatforms))
}

export function extractRepurposeAtoms(rawText: string, selectedPlatforms: RepurposePlatform[]): RepurposeAtom[] {
  return parseRepurposeAtomsResponse(rawText, selectedPlatforms)
}

export async function generateRepurpose(req: GenerateRepurposeRequest): Promise<{ atoms: RepurposeAtom[] }> {
  const sanitizedSourceText = sanitizeSourceText(req.sourceText)
  const prompt = buildRepurposePrompt({ ...req, sourceText: sanitizedSourceText })

  const response = await fetch(REPURPOSE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceText: sanitizedSourceText,
      platforms: req.platforms,
      tone: req.tone,
      length: req.length,
      extractAtoms: req.extractAtoms,
      prompt,
    }),
  })

  if (!response.ok) {
    const failureDetails = (await response.text()).trim()
    const suffix = failureDetails ? ` Details: ${failureDetails.slice(0, 300)}` : ''
    throw new Error(`Repurpose generation failed (${response.status} ${response.statusText || 'unknown error'}).${suffix}`)
  }

  const payload = await response.text()
  const atoms = extractRepurposeAtoms(payload, req.platforms)
  return { atoms }
}
