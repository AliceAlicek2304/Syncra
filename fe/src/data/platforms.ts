// ─── Centralized Zernio Platform Registry ───────────────────────────────────
//
// Single source of truth for all 14 Zernio-supported platforms.
// All platform lists across the frontend MUST import from here.
//
// Zernio API platform IDs (from zernio-api-documentation.md):
//   twitter, instagram, facebook, linkedin, tiktok, youtube,
//   pinterest, reddit, bluesky, threads, googlebusiness,
//   telegram, snapchat, whatsapp
// ─────────────────────────────────────────────────────────────────────────────

export interface ZernioPlatform {
  id: string
  label: string
  color: string
  icon: string
}

/**
 * All 14 platforms supported by the Zernio API.
 * Sorted alphabetically by id.
 */
export const ZERNIO_PLATFORMS: readonly ZernioPlatform[] = [
  { id: 'bluesky',       label: 'Bluesky',             color: '#0085ff',  icon: 'bluesky' },
  { id: 'facebook',      label: 'Facebook',            color: '#1877f2',  icon: 'facebook' },
  { id: 'googlebusiness',label: 'Google Business',     color: '#4285f4',  icon: 'google' },
  { id: 'instagram',     label: 'Instagram',           color: '#e4405f',  icon: 'instagram' },
  { id: 'linkedin',      label: 'LinkedIn',            color: '#0a66c2',  icon: 'linkedin' },
  { id: 'pinterest',     label: 'Pinterest',           color: '#e60023',  icon: 'pinterest' },
  { id: 'reddit',        label: 'Reddit',              color: '#ff4500',  icon: 'reddit' },
  { id: 'snapchat',      label: 'Snapchat',            color: '#fffc00',  icon: 'snapchat' },
  { id: 'telegram',      label: 'Telegram',            color: '#0088cc',  icon: 'telegram' },
  { id: 'threads',       label: 'Threads',             color: '#e7e9ea',  icon: 'threads' },
  { id: 'tiktok',        label: 'TikTok',              color: '#ff0050',  icon: 'tiktok' },
  { id: 'twitter',       label: 'Twitter / X',         color: '#e7e9ea',  icon: 'twitter' },
  { id: 'whatsapp',      label: 'WhatsApp',            color: '#25D366',  icon: 'whatsapp' },
  { id: 'youtube',       label: 'YouTube',             color: '#ff0000',  icon: 'youtube' },
] as const;

/**
 * Look up a platform by its Zernio ID.
 * Returns undefined if not found.
 */
export function getPlatformById(id: string): ZernioPlatform | undefined {
  return ZERNIO_PLATFORMS.find(p => p.id === id);
}

/**
 * Convenience: array of just platform IDs for quick iteration.
 */
export const ZERNIO_PLATFORM_IDS: readonly string[] = ZERNIO_PLATFORMS.map(p => p.id);

/**
 * Convenience: record keyed by platform ID.
 */
export const ZERNIO_PLATFORM_MAP: Readonly<Record<string, ZernioPlatform>> =
  Object.fromEntries(ZERNIO_PLATFORMS.map(p => [p.id, p]));
