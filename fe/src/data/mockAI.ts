import type { RepurposeAtom, RepurposePlatform } from '../context/repurposeContextBase'

export type { RepurposePlatform, AtomType, RepurposeAtom } from '../context/repurposeContextBase'

interface MockGenerateRequest {
  sourceText: string
  platforms: RepurposePlatform[]
  tone: string
  extractAtoms: boolean
}

interface MockGenerateResponse {
  atoms: RepurposeAtom[]
}

const TONE_PREFIXES: Record<string, string> = {
  professional: 'Professional',
  casual: 'Casual',
  bold: 'Bold',
  educational: 'Educational',
  default: '',
}

const SAMPLE_CONTENT: Record<RepurposePlatform, Pick<RepurposeAtom, 'type' | 'title' | 'content' | 'suggestedHashtags' | 'suggestedCTA'>[]> = {
  LinkedIn: [
    {
      type: 'POST',
      title: 'Key Takeaway',
      content: 'Here is a professional breakdown of the main ideas from your source content, tailored for LinkedIn engagement.',
      suggestedHashtags: ['#insights', '#professional', '#growth'],
      suggestedCTA: 'What are your thoughts? Share below.',
    },
    {
      type: 'CAROUSEL',
      title: '5 Points to Remember',
      content: 'Slide 1: Introduction\nSlide 2: Point One\nSlide 3: Point Two\nSlide 4: Point Three\nSlide 5: Conclusion & CTA',
      suggestedHashtags: ['#carousel', '#learning', '#tips'],
      suggestedCTA: 'Save this for later!',
    },
  ],
  X: [
    {
      type: 'THREAD',
      title: 'Thread',
      content: '1/ Here is a concise thread based on your source.\n\n2/ Key point one explained briefly.\n\n3/ Key point two with a different angle.\n\n4/ Wrap-up and call to action.',
      suggestedHashtags: ['#thread', '#insights'],
      suggestedCTA: 'Follow for more content like this.',
    },
    {
      type: 'POST',
      title: 'Hot Take',
      content: 'A bold, concise statement derived from your source text. Under 280 characters for maximum impact.',
      suggestedHashtags: ['#hottake', '#opinion'],
      suggestedCTA: 'Agree or disagree?',
    },
  ],
  Instagram: [
    {
      type: 'CAROUSEL',
      title: 'Visual Story',
      content: 'Carousel post with visually-driven captions. Each slide has a clear hook and takeaway for Instagram audiences.',
      suggestedHashtags: ['#instagood', '#contentcreator', '#visualstory'],
      suggestedCTA: 'Double tap if this resonates!',
    },
    {
      type: 'POST',
      title: 'Caption',
      content: 'An engaging Instagram caption with emoji-friendly formatting and line breaks for readability.',
      suggestedHashtags: ['#caption', '#socialmedia', '#engagement'],
      suggestedCTA: 'Tag someone who needs to see this.',
    },
  ],
  Newsletter: [
    {
      type: 'POST',
      title: 'Weekly Digest',
      content: 'A newsletter-style summary of your source content, structured with a clear intro, body, and sign-off.',
      suggestedHashtags: ['#newsletter', '#weeklydigest'],
      suggestedCTA: 'Subscribe for more insights.',
    },
    {
      type: 'INSIGHT',
      title: 'Deep Dive',
      content: 'An extended analysis of the most valuable insight from your source, written for a newsletter audience.',
      suggestedHashtags: ['#deepdive', '#analysis'],
      suggestedCTA: 'Reply with your thoughts.',
    },
  ],
}

export async function mockGenerateRepurpose(request: MockGenerateRequest): Promise<MockGenerateResponse> {
  const { platforms, tone, extractAtoms } = request

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  const atoms: RepurposeAtom[] = []
  let id = 1

  const tonePrefix = TONE_PREFIXES[tone] || ''

  for (const platform of platforms) {
    const samples = SAMPLE_CONTENT[platform] || []
    for (const sample of samples) {
      const title = tonePrefix ? `${tonePrefix}: ${sample.title}` : sample.title
      atoms.push({
        id: `atom-${id++}`,
        type: sample.type,
        title,
        content: sample.content,
        platform,
        suggestedHashtags: sample.suggestedHashtags,
        suggestedCTA: sample.suggestedCTA,
      })
    }

    if (extractAtoms) {
      atoms.push({
        id: `atom-${id++}`,
        type: 'TIP',
        title: 'Pro Tip',
        content: `A key actionable tip extracted from your source content for ${platform}.`,
        platform,
        suggestedHashtags: ['#protip', '#actionable'],
        suggestedCTA: 'Try this today!',
      })
      atoms.push({
        id: `atom-${id++}`,
        type: 'QUOTE',
        title: 'Notable Quote',
        content: '"A powerful quote distilled from your source content."',
        platform,
        suggestedHashtags: ['#quote', '#wisdom'],
      })
    }
  }

  return { atoms }
}
