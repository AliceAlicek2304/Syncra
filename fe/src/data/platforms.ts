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
  bg?: string
  border?: string
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

/**
 * Platform-specific style tokens (bg + border) for use in repurpose UI.
 * These may differ from brand color for better UI contrast.
 */
export const PLATFORM_STYLES: Record<string, { color: string; bg: string; border: string }> = {
    linkedin:       { color: '#0a66c2', bg: 'rgba(10,102,194,0.08)',  border: 'rgba(10,102,194,0.22)' },
    twitter:        { color: '#201515', bg: 'rgba(32,21,21,0.06)',   border: 'rgba(32,21,21,0.15)' },
    instagram:      { color: '#d62976', bg: 'rgba(214,41,118,0.08)', border: 'rgba(214,41,118,0.22)' },
    tiktok:         { color: '#ef2950', bg: 'rgba(239,41,80,0.08)',  border: 'rgba(239,41,80,0.22)' },
    facebook:       { color: '#1877f2', bg: 'rgba(24,119,242,0.08)', border: 'rgba(24,119,242,0.22)' },
    youtube:        { color: '#c20000', bg: 'rgba(194,0,0,0.06)',    border: 'rgba(194,0,0,0.22)' },
    pinterest:      { color: '#bd081c', bg: 'rgba(189,8,28,0.08)',   border: 'rgba(189,8,28,0.22)' },
    bluesky:        { color: '#0085ff', bg: 'rgba(0,133,255,0.08)',  border: 'rgba(0,133,255,0.22)' },
    threads:        { color: '#201515', bg: 'rgba(32,21,21,0.06)',   border: 'rgba(32,21,21,0.15)' },
    googlebusiness: { color: '#0f9d58', bg: 'rgba(15,157,88,0.08)',  border: 'rgba(15,157,88,0.22)' },
    telegram:       { color: '#0088cc', bg: 'rgba(0,136,204,0.08)',  border: 'rgba(0,136,204,0.22)' },
    snapchat:       { color: '#a68000', bg: 'rgba(166,128,0,0.08)',  border: 'rgba(166,128,0,0.22)' },
    whatsapp:       { color: '#075e54', bg: 'rgba(7,94,84,0.08)',    border: 'rgba(7,94,84,0.22)' },
    reddit:         { color: '#ff4500', bg: 'rgba(255,69,0,0.08)',   border: 'rgba(255,69,0,0.22)' },
};

/**
 * Get full platform style (color + bg + border) for repurpose UI.
 * Falls back to brand color + computed alpha values.
 */
export function getPlatformStyle(id: string): { color: string; bg: string; border: string } {
    return PLATFORM_STYLES[id] ?? { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)' };
}
