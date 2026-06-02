export const PLATFORMS_BY_TAB = {
  messages: ['facebook', 'instagram', 'twitter', 'bluesky', 'reddit', 'telegram', 'whatsapp'],
  comments: ['facebook', 'instagram', 'twitter', 'bluesky', 'threads', 'reddit', 'youtube', 'linkedin'],
  reviews: ['facebook', 'google'],
} as const;

export type InboxTabKey = keyof typeof PLATFORMS_BY_TAB;

export const PLATFORMS: { key: string; label: string }[] = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'twitter', label: 'Twitter/X' },
  { key: 'bluesky', label: 'Bluesky' },
  { key: 'reddit', label: 'Reddit' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'threads', label: 'Threads' },
  { key: 'google', label: 'Google Business' },
];
