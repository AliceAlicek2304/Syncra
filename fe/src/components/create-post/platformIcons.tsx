import type { Platform } from './types'

import blueskyIcon from '../../assets/platforms/bluesky.png'
import devtoIcon from '../../assets/platforms/devto.png'
import discordIcon from '../../assets/platforms/discord.png'
import dribbbleIcon from '../../assets/platforms/dribbble.png'
import facebookIcon from '../../assets/platforms/facebook.png'
import gmbIcon from '../../assets/platforms/gmb.png'
import hashnodeIcon from '../../assets/platforms/hashnode.png'
import instagramIcon from '../../assets/platforms/instagram.png'
import instagramStandaloneIcon from '../../assets/platforms/instagram-standalone.png'
import kickIcon from '../../assets/platforms/kick.png'
import lemmyIcon from '../../assets/platforms/lemmy.png'
import linkedinIcon from '../../assets/platforms/linkedin.png'
import linkedinPageIcon from '../../assets/platforms/linkedin-page.png'
import listmonkIcon from '../../assets/platforms/listmonk.png'
import mastodonIcon from '../../assets/platforms/mastodon.png'
import mastodonCustomIcon from '../../assets/platforms/mastodon-custom.png'
import mediumIcon from '../../assets/platforms/medium.png'
import meweIcon from '../../assets/platforms/mewe.png'
import moltbookIcon from '../../assets/platforms/moltbook.png'
import nostrIcon from '../../assets/platforms/nostr.png'
import pinterestIcon from '../../assets/platforms/pinterest.png'
import redditIcon from '../../assets/platforms/reddit.png'
import skoolIcon from '../../assets/platforms/skool.png'
import slackIcon from '../../assets/platforms/slack.png'
import telegramIcon from '../../assets/platforms/telegram.png'
import threadsIcon from '../../assets/platforms/threads.png'
import tiktokIcon from '../../assets/platforms/tiktok.png'
import twitchIcon from '../../assets/platforms/twitch.png'
import vkIcon from '../../assets/platforms/vk.png'
import whopIcon from '../../assets/platforms/whop.png'
import wordpressIcon from '../../assets/platforms/wordpress.png'
import wrapcastIcon from '../../assets/platforms/wrapcast.png'
import xIcon from '../../assets/platforms/x.png'
import youtubeIcon from '../../assets/platforms/youtube.png'

interface PlatformIconProps {
  platform: Platform
  size?: number
}

export function PlatformIcon({ platform, size = 16 }: PlatformIconProps) {
  return <ExtendedPlatformIcon platform={platform} size={size} />
}

interface ExtendedPlatformIconProps {
  platform: string
  size?: number
}

const iconMap: Record<string, string> = {
  bluesky: blueskyIcon,
  devto: devtoIcon,
  discord: discordIcon,
  dribbble: dribbbleIcon,
  facebook: facebookIcon,
  googlebusiness: gmbIcon,
  gmb: gmbIcon,
  hashnode: hashnodeIcon,
  instagram: instagramIcon,
  'instagram-standalone': instagramStandaloneIcon,
  kick: kickIcon,
  lemmy: lemmyIcon,
  linkedin: linkedinIcon,
  'linkedin-page': linkedinPageIcon,
  listmonk: listmonkIcon,
  mastodon: mastodonIcon,
  'mastodon-custom': mastodonCustomIcon,
  medium: mediumIcon,
  mewe: meweIcon,
  moltbook: moltbookIcon,
  nostr: nostrIcon,
  pinterest: pinterestIcon,
  reddit: redditIcon,
  skool: skoolIcon,
  slack: slackIcon,
  telegram: telegramIcon,
  threads: threadsIcon,
  tiktok: tiktokIcon,
  twitch: twitchIcon,
  twitter: xIcon,
  vk: vkIcon,
  whop: whopIcon,
  wordpress: wordpressIcon,
  wrapcast: wrapcastIcon,
  youtube: youtubeIcon,
}

export function ExtendedPlatformIcon({ platform, size = 16 }: ExtendedPlatformIconProps) {
  const src = iconMap[platform]
  if (!src) {
    return <span style={{ fontSize: size * 0.7, fontWeight: 700 }}>{platform[0].toUpperCase()}</span>
  }
  return <img src={src} alt={platform} style={{ width: size, height: size }} />
}
