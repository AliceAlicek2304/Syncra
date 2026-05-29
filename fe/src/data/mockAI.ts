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

/** Generic content template for platforms without specific logic yet */
function genericContent(platform: string, _type: string): Pick<RepurposeAtom, 'type' | 'title' | 'content' | 'suggestedHashtags' | 'suggestedCTA'>[] {
  return [
    {
      type: 'POST' as RepurposeAtom['type'],
      title: `${platform} Post`,
      content: `A tailored post based on your source content, optimized for ${platform} audience engagement.`,
      suggestedHashtags: [`#${platform.toLowerCase()}`, '#content', '#socialmedia'],
      suggestedCTA: 'Share your thoughts below!',
    },
    {
      type: 'INSIGHT' as RepurposeAtom['type'],
      title: 'Key Insight',
      content: `An actionable insight extracted from your source content, formatted for maximum impact on ${platform}.`,
      suggestedHashtags: ['#insights', '#tips'],
      suggestedCTA: 'Save this for later!',
    },
  ]
}

const SAMPLE_CONTENT: Record<RepurposePlatform, Pick<RepurposeAtom, 'type' | 'title' | 'content' | 'suggestedHashtags' | 'suggestedCTA'>[]> = {
  linkedin: [
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
  twitter: [
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
  instagram: [
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
  tiktok: [
    {
      type: 'POST',
      title: 'TikTok Script',
      content: 'A short, punchy script optimized for TikTok. Hook in first 3 seconds, value in the middle, CTA at the end.',
      suggestedHashtags: ['#tiktok', '#viral', '#fyp'],
      suggestedCTA: 'Follow for more content like this!',
    },
    {
      type: 'TIP',
      title: 'TikTok Strategy Tip',
      content: 'Short-form video tip derived from your source content. Keep it under 60 seconds for maximum retention.',
      suggestedHashtags: ['#tiktoktips', '#contentstrategy'],
      suggestedCTA: 'Try this in your next video!',
    },
  ],
  facebook: [
    {
      type: 'POST',
      title: 'Facebook Update',
      content: 'An engaging Facebook post that sparks conversation in groups and on your timeline.',
      suggestedHashtags: ['#facebook', '#community', '#discussion'],
      suggestedCTA: 'Share your experience in the comments.',
    },
    {
      type: 'INSIGHT',
      title: 'Community Insight',
      content: 'A deeper dive into the topic, formatted for Facebook\'s feed algorithm with engaging hooks.',
      suggestedHashtags: ['#insights', '#facebook'],
      suggestedCTA: 'Tag a friend who needs to see this.',
    },
  ],
  youtube: [
    {
      type: 'POST',
      title: 'Video Description',
      content: 'An SEO-optimized YouTube video description with timestamps, links, and engagement prompts.',
      suggestedHashtags: ['#youtube', '#video', '#tutorial'],
      suggestedCTA: 'Watch the full video and subscribe!',
    },
    {
      type: 'INSIGHT',
      title: 'Video Script Outline',
      content: 'A structured outline for a YouTube video based on your source content, with hook, main points, and CTA.',
      suggestedHashtags: ['#youtubetips', '#contentcreation'],
      suggestedCTA: 'Like and subscribe for more!',
    },
  ],
  pinterest: [
    {
      type: 'POST',
      title: 'Pinterest Pin',
      content: 'An informative pin description with keywords optimized for Pinterest search. Include tips and takeaways.',
      suggestedHashtags: ['#pinterest', '#infographic', '#tips'],
      suggestedCTA: 'Save this pin for later!',
    },
    {
      type: 'CAROUSEL',
      title: 'Step-by-Step Guide',
      content: 'Slide 1: Title\nSlide 2: What you need\nSlide 3: Step 1\nSlide 4: Step 2\nSlide 5: Result & CTA',
      suggestedHashtags: ['#guide', '#howto', '#pinterest'],
      suggestedCTA: 'Follow our board for more!',
    },
  ],
  reddit: [
    {
      type: 'POST',
      title: 'Reddit Post',
      content: 'A discussion-oriented post formatted for Reddit communities. Start with context, then share insights.',
      suggestedHashtags: ['#reddit', '#discussion'],
      suggestedCTA: 'What\'s your take? Join the discussion.',
    },
    {
      type: 'THREAD',
      title: 'Reddit Thread',
      content: 'A detailed breakdown for subreddit communities. Provide value upfront and expand in replies.',
      suggestedHashtags: ['#reddit', '#insights'],
      suggestedCTA: 'Upvote if you found this helpful!',
    },
  ],
  bluesky: [
    ...genericContent('Bluesky', 'social'),
    {
      type: 'POST',
      title: 'Bluesky Update',
      content: 'A concise, engaging post for Bluesky\'s growing community. Focus on authentic, value-driven content.',
      suggestedHashtags: ['#bluesky', '#social', '#newplatform'],
      suggestedCTA: 'Follow for more updates!',
    },
  ],
  threads: [
    ...genericContent('Threads', 'social'),
    {
      type: 'POST',
      title: 'Threads Post',
      content: 'A casual, conversational post for Threads. Short-form content with personality and authenticity.',
      suggestedHashtags: ['#threads', '#social', '#conversation'],
      suggestedCTA: 'Share your thoughts!',
    },
  ],
  googlebusiness: [
    ...genericContent('Google Business', 'local'),
    {
      type: 'POST',
      title: 'Google Business Update',
      content: 'A local business update optimized for Google Business Profile. Include offers, updates, or events.',
      suggestedHashtags: ['#googlebusiness', '#local', '#smallbusiness'],
      suggestedCTA: 'Visit our store today!',
    },
  ],
  telegram: [
    ...genericContent('Telegram', 'messaging'),
    {
      type: 'POST',
      title: 'Telegram Channel Post',
      content: 'An informative update for your Telegram channel members. Direct, value-packed content.',
      suggestedHashtags: ['#telegram', '#channel', '#updates'],
      suggestedCTA: 'Join our channel for more!',
    },
  ],
  snapchat: [
    ...genericContent('Snapchat', 'visual'),
    {
      type: 'POST',
      title: 'Snapchat Story Idea',
      content: 'A creative story concept for Snapchat. Quick, visual, and engaging with a clear narrative arc.',
      suggestedHashtags: ['#snapchat', '#story', '#creative'],
      suggestedCTA: 'Add us on Snapchat!',
    },
  ],
  whatsapp: [
    ...genericContent('WhatsApp', 'messaging'),
    {
      type: 'POST',
      title: 'WhatsApp Broadcast',
      content: 'A personal yet professional broadcast message for your WhatsApp contacts or group.',
      suggestedHashtags: ['#whatsapp', '#broadcast', '#community'],
      suggestedCTA: 'Reply to start a conversation!',
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
    const samples = SAMPLE_CONTENT[platform] || genericContent(platform, 'generic')
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
