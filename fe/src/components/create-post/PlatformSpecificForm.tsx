/**
 * PlatformSpecificForm
 *
 * Dynamic form component that renders configuration UI for all 14
 * Zernio-supported social media platforms. Each platform's fields are
 * derived 1:1 from the OpenAPI schema definitions:
 *   TwitterPlatformData, ThreadsPlatformData, FacebookPlatformData,
 *   InstagramPlatformData, LinkedInPlatformData, PinterestPlatformData,
 *   YouTubePlatformData, GoogleBusinessPlatformData, TikTokPlatformData,
 *   TelegramPlatformData, SnapchatPlatformData, RedditPlatformData,
 *   BlueskyPlatformData, DiscordPlatformData
 */

import { useState, useRef, type KeyboardEvent } from 'react'
import { ChevronDown, Plus, X, Image } from 'lucide-react'
import { ExtendedPlatformIcon } from './platformIcons'
import { shortId } from '../../utils/shortId'
import type { MediaFile } from './types'
import styles from './PlatformSpecificForm.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeoRestriction {
  countries: string[]
}

// Twitter
export interface TwitterPlatformData {
  replyToTweetId?: string
  replySettings?: 'following' | 'mentionedUsers' | 'subscribers' | 'verified'
  threadItems?: Array<{ content: string; mediaItems?: any[] }>
  poll?: {
    options: string[]
    duration_minutes: number
  }
  longVideo?: boolean
  geoRestriction?: GeoRestriction
}

// Threads
export interface ThreadsPlatformData {
  topic_tag?: string
  threadItems?: Array<{ content: string; mediaItems?: any[] }>
}

// Facebook
export interface FacebookPlatformData {
  draft?: boolean
  contentType?: 'story' | 'reel'
  title?: string
  firstComment?: string
  pageId?: string
  geoRestriction?: GeoRestriction
  carouselCards?: Array<{ link?: string; name?: string; description?: string; media?: MediaFile }>
  carouselLink?: string
}

// Instagram
export interface InstagramPlatformData {
  contentType?: 'story'
  shareToFeed?: boolean
  collaborators?: string[]
  firstComment?: string
  trialParams?: { graduationStrategy?: 'MANUAL' | 'SS_PERFORMANCE' }
  userTags?: Array<{ username: string; x: number; y: number; mediaIndex?: number }>
  audioName?: string
  thumbOffset?: number
  instagramThumbnail?: string
  reelCover?: string
}

// LinkedIn
export interface LinkedInPlatformData {
  documentTitle?: string
  organizationUrn?: string
  firstComment?: string
  disableLinkPreview?: boolean
  geoRestriction?: GeoRestriction
}

// Pinterest
export interface PinterestPlatformData {
  title?: string
  boardId?: string
  link?: string
  coverImageUrl?: string
  coverImageKeyFrameTime?: number
}

// YouTube
export interface YouTubePlatformData {
  title?: string
  visibility?: 'public' | 'private' | 'unlisted'
  madeForKids?: boolean
  firstComment?: string
  containsSyntheticMedia?: boolean
  categoryId?: string
  playlistId?: string
}

// Google Business
export interface GoogleBusinessPlatformData {
  locationId?: string
  languageCode?: string
  topicType?: 'STANDARD' | 'EVENT' | 'OFFER'
  callToAction?: {
    type: 'LEARN_MORE' | 'BOOK' | 'ORDER' | 'SHOP' | 'SIGN_UP' | 'CALL'
    url: string
  }
  event?: {
    title: string
    schedule: {
      startDate: { year: number; month: number; day: number }
      endDate: { year: number; month: number; day: number }
      startTime?: { hours: number; minutes: number }
      endTime?: { hours: number; minutes: number }
    }
  }
  offer?: {
    offerType?: 'OFFER' | 'BUY_ONE_GET_ONE'
    redeemOnlineUrl?: string
    termsConditions?: string
    couponCode?: string
  }
}

// TikTok
export interface TikTokPlatformData {
  draft?: boolean
  privacyLevel?: string
  allowComment?: boolean
  allowDuet?: boolean
  allowStitch?: boolean
  commercialContentType?: 'none' | 'brand_organic' | 'brand_content'
  brandPartnerPromote?: boolean
  isBrandOrganicPost?: boolean
  contentPreviewConfirmed?: boolean
  expressConsentGiven?: boolean
  mediaType?: 'video' | 'photo'
  videoCoverTimestampMs?: number
  videoCoverImageUrl?: string
  photoCoverIndex?: number
  autoAddMusic?: boolean
  videoMadeWithAi?: boolean
  description?: string
}

// Telegram
export interface TelegramPlatformData {
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  disableWebPagePreview?: boolean
  disableNotification?: boolean
  protectContent?: boolean
}

// Snapchat
export interface SnapchatPlatformData {
  contentType?: 'story' | 'saved_story' | 'spotlight'
}

// Reddit
export interface RedditPlatformData {
  subreddit?: string
  title?: string
  url?: string
  forceSelf?: boolean
  flairId?: string
  nativeVideo?: boolean
  videogif?: boolean
  videoPosterUrl?: string
}

// Bluesky
export interface BlueskyPlatformData {
  threadItems?: Array<{ content: string; mediaItems?: any[] }>
}

// Discord embed field
export interface DiscordEmbedField { name: string; value: string; inline?: boolean }
export interface DiscordEmbed {
  title?: string
  description?: string
  url?: string
  color?: number
  image?: { url: string }
  thumbnail?: { url: string }
  footer?: { text: string; icon_url?: string }
  author?: { name: string; url?: string; icon_url?: string }
  fields?: DiscordEmbedField[]
}

// Discord
export interface DiscordPlatformData {
  channelId: string
  embeds?: DiscordEmbed[]
  poll?: {
    question: { text: string }
    answers: Array<{ poll_media: { text: string } }>
    duration?: number
    allow_multiselect?: boolean
  }
  crosspost?: boolean
  forumThreadName?: string
  forumAppliedTags?: string[]
  threadFromMessage?: {
    name: string
    autoArchiveDuration?: 60 | 1440 | 4320 | 10080
    rateLimitPerUser?: number
  }
  tts?: boolean
  webhookUsername?: string
  webhookAvatarUrl?: string
}

export interface AllPlatformData {
  twitter?: TwitterPlatformData
  threads?: ThreadsPlatformData
  facebook?: FacebookPlatformData
  instagram?: InstagramPlatformData
  linkedin?: LinkedInPlatformData
  pinterest?: PinterestPlatformData
  youtube?: YouTubePlatformData
  googlebusiness?: GoogleBusinessPlatformData
  tiktok?: TikTokPlatformData
  telegram?: TelegramPlatformData
  snapchat?: SnapchatPlatformData
  reddit?: RedditPlatformData
  bluesky?: BlueskyPlatformData
  discord?: DiscordPlatformData
}

interface PlatformSpecificFormProps {
  /** Active platform IDs to show forms for */
  activePlatforms: string[]
  value: AllPlatformData
  onChange: (next: AllPlatformData) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BRAND_COLORS: Record<string, string> = {
  twitter:        '#000000',
  threads:        '#000000',
  facebook:       '#1877F2',
  instagram:      '#E4405F',
  linkedin:       '#0A66C2',
  pinterest:      '#E60023',
  youtube:        '#FF0000',
  googlebusiness: '#34A853',
  tiktok:         '#000000',
  telegram:       '#2CA5E0',
  snapchat:       '#FFFC00',
  reddit:         '#FF4500',
  bluesky:        '#0085FF',
  discord:        '#5865F2',
}

const PLATFORM_LABELS: Record<string, string> = {
  twitter:        'X / Twitter',
  threads:        'Threads',
  facebook:       'Facebook',
  instagram:      'Instagram',
  linkedin:       'LinkedIn',
  pinterest:      'Pinterest',
  youtube:        'YouTube',
  googlebusiness: 'Google Business',
  tiktok:         'TikTok',
  telegram:       'Telegram',
  snapchat:       'Snapchat',
  reddit:         'Reddit',
  bluesky:        'Bluesky',
  discord:        'Discord',
}

// ─── Primitive UI helpers ──────────────────────────────────────────────────────

function Switch({ on, onChange, label, desc, disabled }: {
  on: boolean; onChange: (v: boolean) => void; label: string; desc?: string; disabled?: boolean
}) {
  return (
    <div className={`${styles.switchRow} ${disabled ? styles.switchDisabled : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        className={`${styles.switchTrack} ${on ? styles.switchOn : ''}`}
        onClick={() => !disabled && onChange(!on)}
      >
        <span className={styles.switchKnob} />
      </button>
      <div className={styles.switchMeta}>
        <div className={styles.switchLabel}>{label}</div>
        {desc && <div className={styles.switchDesc}>{desc}</div>}
      </div>
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className={`${styles.label} ${required ? styles.labelRequired : ''}`}>
      {children}
    </label>
  )
}

function TodoSelect({ label, placeholder }: { label: string; placeholder?: string }) {
  return (
    <div className={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      <select className={styles.select} disabled>
        <option value="">{placeholder || '// TODO: Fetch from API'}</option>
      </select>
      <p className={styles.todoBanner}>
        <span>⚙</span>
        <span>Options sẽ được fetch từ API sau khi kết nối tài khoản</span>
      </p>
    </div>
  )
}

function GeoRestrictionField({ value, onChange }: {
  value?: GeoRestriction; onChange: (v: GeoRestriction | undefined) => void
}) {
  const [inputVal, setInputVal] = useState('')
  const countries = value?.countries ?? []

  const addCountry = (code: string) => {
    const upper = code.toUpperCase().trim()
    if (upper.length === 2 && /^[A-Z]{2}$/.test(upper) && !countries.includes(upper)) {
      onChange({ countries: [...countries, upper] })
    }
    setInputVal('')
  }

  const removeCountry = (code: string) => {
    const next = countries.filter(c => c !== code)
    onChange(next.length ? { countries: next } : undefined)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      addCountry(inputVal)
    }
  }

  return (
    <div className={styles.field}>
      <FieldLabel>geo restriction (countries)</FieldLabel>
      <div className={styles.countriesTagInput} onClick={(e) => {
        (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()
      }}>
        {countries.map(c => (
          <span key={c} className={styles.countryTag}>
            {c}
            <button type="button" className={styles.countryTagRemove} onClick={() => removeCountry(c)}>×</button>
          </span>
        ))}
        <input
          className={styles.countriesInput}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => inputVal && addCountry(inputVal)}
          placeholder={countries.length === 0 ? 'US, CA, GB … (Enter to add)' : ''}
          maxLength={2}
        />
      </div>
      <p className={styles.hint}>ISO 3166-1 alpha-2 codes. Max 25 countries.</p>
    </div>
  )
}

function ThreadItemsEditor({ value, onChange, label }: {
  value?: Array<{ content: string }>
  onChange: (v: Array<{ content: string }>) => void
  label: string
}) {
  const items = value ?? []
  const add = () => onChange([...items, { content: '' }])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const update = (i: number, content: string) => {
    const next = [...items]
    next[i] = { ...next[i], content }
    onChange(next)
  }

  return (
    <div className={styles.field}>
      <div className={styles.arrayHeader}>
        <FieldLabel>{label}</FieldLabel>
        <button type="button" className={styles.addBtn} onClick={add}>
          <Plus size={11} /> Add item
        </button>
      </div>
      <div className={styles.arrayItems}>
        {items.map((item, i) => (
          <div key={i} className={styles.arrayItem}>
            <span className={styles.arrayItemIndex}>#{i + 1}</span>
            <div className={styles.arrayItemBody}>
              <textarea
                className={styles.textarea}
                rows={2}
                placeholder={`Content for item ${i + 1}...`}
                value={item.content}
                onChange={e => update(i, e.target.value)}
              />
            </div>
            <button type="button" className={styles.arrayItemRemoveBtn} onClick={() => remove(i)}>
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      {items.length === 0 && (
        <p className={styles.hint}>Each item becomes a chained reply in the thread</p>
      )}
    </div>
  )
}

// ─── Accordion Wrapper ─────────────────────────────────────────────────────────

function PlatformAccordion({
  platform,
  children,
  hasContent,
}: {
  platform: string
  children: React.ReactNode
  hasContent?: boolean
}) {
  const [open, setOpen] = useState(false)
  const label = PLATFORM_LABELS[platform] ?? platform
  const color = BRAND_COLORS[platform] ?? '#6b7280'

  return (
    <div className={styles.platformSection}>
      <button
        type="button"
        className={styles.accordionHeader}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className={styles.platformBadge} style={{ backgroundColor: color }}>
          <ExtendedPlatformIcon platform={platform} size={13} />
        </div>
        <span className={styles.platformTitle}>{label}</span>
        {hasContent && (
          <span style={{ fontSize: 10, color: 'var(--clr-primary)', fontWeight: 700, marginRight: 4 }}>
            ●
          </span>
        )}
        <ChevronDown
          size={14}
          className={`${styles.accordionChevron} ${open ? styles.accordionChevronOpen : ''}`}
        />
      </button>

      {open && (
        <div className={styles.accordionBody}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Per-platform form sections ────────────────────────────────────────────────

// Twitter / X
function TwitterForm({ value, onChange }: {
  value: TwitterPlatformData
  onChange: (v: TwitterPlatformData) => void
}) {
  const set = <K extends keyof TwitterPlatformData>(k: K, v: TwitterPlatformData[K]) =>
    onChange({ ...value, [k]: v })

  const poll = value.poll ?? { options: ['', ''], duration_minutes: 1440 }

  const setPollOption = (i: number, text: string) => {
    const opts = [...poll.options]
    opts[i] = text
    set('poll', { ...poll, options: opts })
  }

  const addPollOption = () => {
    if (poll.options.length < 4) set('poll', { ...poll, options: [...poll.options, ''] })
  }

  const removePollOption = (i: number) => {
    const opts = poll.options.filter((_, idx) => idx !== i)
    set('poll', { ...poll, options: opts })
  }

  return (
    <>
      <div className={styles.field}>
        <FieldLabel>reply to tweet ID</FieldLabel>
        <input
          className={styles.input}
          placeholder="e.g. 1929012345678900000"
          value={value.replyToTweetId ?? ''}
          onChange={e => set('replyToTweetId', e.target.value || undefined)}
        />
        <p className={styles.hint}>Published tweet will appear as a reply in that thread</p>
      </div>

      <div className={styles.field}>
        <FieldLabel>reply settings</FieldLabel>
        <select
          className={styles.select}
          value={value.replySettings ?? ''}
          onChange={e => set('replySettings', (e.target.value || undefined) as any)}
        >
          <option value="">Everyone can reply (default)</option>
          <option value="following">Following only</option>
          <option value="mentionedUsers">Mentioned users only</option>
          <option value="subscribers">Subscribers only</option>
          <option value="verified">Verified users only</option>
        </select>
      </div>

      <ThreadItemsEditor
        label="thread items"
        value={value.threadItems}
        onChange={v => set('threadItems', v)}
      />

      {/* Poll */}
      <div className={styles.subFormBox}>
        <div className={styles.subFormTitle}>Poll (optional)</div>
        <p className={styles.hint}>Mutually exclusive with media and threads</p>

        <Switch
          on={!!value.poll}
          onChange={v => set('poll', v ? { options: ['', ''], duration_minutes: 1440 } : undefined)}
          label="Enable poll"
        />

        {value.poll && (
          <>
            <div className={styles.field}>
              <FieldLabel required>options (2–4)</FieldLabel>
              <div className={styles.arrayItems}>
                {poll.options.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      className={styles.input}
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      maxLength={25}
                      onChange={e => setPollOption(i, e.target.value)}
                    />
                    {poll.options.length > 2 && (
                      <button type="button" className={styles.arrayItemRemoveBtn}
                        style={{ position: 'static' }} onClick={() => removePollOption(i)}>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {poll.options.length < 4 && (
                <button type="button" className={styles.addBtn} onClick={addPollOption} style={{ marginTop: 6 }}>
                  <Plus size={11} /> Add option
                </button>
              )}
            </div>

            <div className={styles.field}>
              <FieldLabel required>duration (minutes)</FieldLabel>
              <input
                type="number"
                className={styles.input}
                min={5}
                max={10080}
                value={poll.duration_minutes}
                onChange={e => set('poll', { ...poll, duration_minutes: Number(e.target.value) })}
              />
              <p className={styles.hint}>5 min – 7 days (10080 min)</p>
            </div>
          </>
        )}
      </div>

      <Switch
        on={value.longVideo ?? false}
        onChange={v => set('longVideo', v)}
        label="Long video (>140s)"
        desc="Requires X Premium account with API long-video access"
      />

      <GeoRestrictionField
        value={value.geoRestriction}
        onChange={v => set('geoRestriction', v)}
      />
    </>
  )
}

// Threads
function ThreadsForm({ value, onChange }: {
  value: ThreadsPlatformData
  onChange: (v: ThreadsPlatformData) => void
}) {
  const set = <K extends keyof ThreadsPlatformData>(k: K, v: ThreadsPlatformData[K]) =>
    onChange({ ...value, [k]: v })

  return (
    <>
      <div className={styles.field}>
        <FieldLabel>topic tag</FieldLabel>
        <input
          className={styles.input}
          placeholder="e.g. technology"
          maxLength={50}
          value={value.topic_tag ?? ''}
          onChange={e => set('topic_tag', e.target.value || undefined)}
        />
        <p className={styles.hint}>1–50 chars, no periods or ampersands</p>
      </div>

      <ThreadItemsEditor
        label="thread items"
        value={value.threadItems}
        onChange={v => set('threadItems', v)}
      />
    </>
  )
}

// Facebook
function FacebookForm({ value, onChange }: {
  value: FacebookPlatformData
  onChange: (v: FacebookPlatformData) => void
}) {
  const set = <K extends keyof FacebookPlatformData>(k: K, v: FacebookPlatformData[K]) =>
    onChange({ ...value, [k]: v })

  const carouselCards = value.carouselCards ?? []

  const carouselFileInputRef = useRef<HTMLInputElement>(null)
  const carouselMediaTargetRef = useRef<number | null>(null)

  const addCard = () => {
    if (carouselCards.length < 5) set('carouselCards', [...carouselCards, {}])
  }

  const updateCard = (i: number, patch: Partial<(typeof carouselCards)[0]>) => {
    const next = [...carouselCards]
    next[i] = { ...next[i], ...patch }
    set('carouselCards', next)
  }

  const removeCard = (i: number) => {
    const card = carouselCards[i]
    if (card.media) URL.revokeObjectURL(card.media.url)
    const next = carouselCards.filter((_, idx) => idx !== i)
    set('carouselCards', next.length ? next : undefined)
  }

  const handleAddCardMedia = (cardIndex: number) => {
    carouselMediaTargetRef.current = cardIndex
    carouselFileInputRef.current?.click()
  }

  const handleCardMediaSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const targetIdx = carouselMediaTargetRef.current
    if (!file || targetIdx === null) return

    const type = file.type.startsWith('video') ? 'video' : 'image'
    const localUrl = URL.createObjectURL(file)

    const mediaFile: MediaFile = {
      id: shortId(),
      url: localUrl,
      type,
      name: file.name,
      file,
    }

    updateCard(targetIdx, { media: mediaFile })
    e.target.value = ''
    carouselMediaTargetRef.current = null
  }

  const removeCardMedia = (cardIndex: number) => {
    const card = carouselCards[cardIndex]
    if (card.media) URL.revokeObjectURL(card.media.url)
    updateCard(cardIndex, { media: undefined })
  }

  return (
    <>
      <Switch
        on={value.draft ?? false}
        onChange={v => set('draft', v)}
        label="Save as draft"
        desc={
          value.contentType === 'story'
            ? "Not supported for stories. Drafts expire after ~30 days."
            : "Creates post in Facebook Publishing Tools instead of publishing immediately. Drafts expire after ~30 days."
        }
        disabled={true}
      />

      <div className={styles.field}>
        <FieldLabel>content type</FieldLabel>
        <div className={styles.tabStrip}>
          {(['feed', 'story', 'reel'] as const).map(ct => (
            <button
              key={ct}
              type="button"
              className={`${styles.tabBtn} ${
                (ct === 'feed' && !value.contentType) || value.contentType === ct
                  ? styles.tabBtnActive : ''
              }`}
              onClick={() => {
                const nextType = ct === 'feed' ? undefined : ct
                if (nextType === 'story') {
                  onChange({ ...value, contentType: nextType, draft: false })
                } else {
                  set('contentType', nextType)
                }
              }}
            >
              {ct.charAt(0).toUpperCase() + ct.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {value.contentType === 'reel' && (
        <div className={`${styles.field} ${styles.conditionalField}`}>
          <FieldLabel>reel title</FieldLabel>
          <input
            className={styles.input}
            placeholder="Reel title (separate from caption)"
            value={value.title ?? ''}
            onChange={e => set('title', e.target.value || undefined)}
          />
        </div>
      )}

      {value.contentType !== 'story' && (
        <div className={styles.field}>
          <FieldLabel>first comment</FieldLabel>
          <textarea
            className={styles.textarea}
            rows={2}
            placeholder="Optional first comment after publishing..."
            value={value.firstComment ?? ''}
            onChange={e => set('firstComment', e.target.value || undefined)}
            disabled={value.draft}
          />
          {value.draft && <p className={styles.hint}>Skipped when draft is enabled</p>}
        </div>
      )}

      {value.contentType !== 'story' && value.contentType !== 'reel' && (
        <>
          <div className={styles.sectionDivider} />
          {/* Carousel Cards */}
          <div className={styles.subFormBox}>
            <div className={styles.arrayHeader}>
              <div className={styles.subFormTitle}>Carousel Cards (2–5 images)</div>
              {carouselCards.length < 5 && (
                <button type="button" className={styles.addBtn} onClick={addCard}>
                  <Plus size={11} /> Add card
                </button>
              )}
            </div>

            <p className={styles.hint}>Each card has its own image. Requires matching total mediaItems count.</p>

            <div className={styles.arrayItems}>
              {carouselCards.map((card, i) => (
                <div key={i} className={styles.arrayItem}>
                  <span className={styles.arrayItemIndex}>#{i + 1}</span>
                  <div className={styles.arrayItemBody}>
                    <div className={styles.field}>
                      <FieldLabel required>image</FieldLabel>
                      {card.media ? (
                        <div className={styles.carouselMediaPreview}>
                          {card.media.type === 'image'
                            ? <img src={card.media.url} alt={card.media.name} className={styles.carouselMediaThumb} />
                            : <div className={styles.carouselMediaVideo}>🎬 Video</div>
                          }
                          <button type="button" className={styles.carouselMediaRemove} onClick={() => removeCardMedia(i)}>
                            <X size={11} />
                          </button>
                        </div>
                      ) : card.link ? (
                        <div className={styles.carouselMediaPreview}>
                          <img src={card.link} alt="" className={styles.carouselMediaThumb} />
                          <button type="button" className={styles.carouselMediaRemove} onClick={() => removeCardMedia(i)}>
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <div className={styles.carouselMediaZone} onClick={() => handleAddCardMedia(i)}>
                          <Image size={14} />
                          <span>Add media</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <FieldLabel>headline</FieldLabel>
                        <input
                          className={styles.input}
                          placeholder="Card headline (~35 chars)"
                          maxLength={255}
                          value={card.name ?? ''}
                          onChange={e => updateCard(i, { name: e.target.value || undefined })}
                        />
                      </div>
                      <div className={styles.field}>
                        <FieldLabel>description</FieldLabel>
                        <input
                          className={styles.input}
                          placeholder="Sub-headline (~30 chars)"
                          maxLength={255}
                          value={card.description ?? ''}
                          onChange={e => updateCard(i, { description: e.target.value || undefined })}
                        />
                      </div>
                    </div>
                  </div>
                  <button type="button" className={styles.arrayItemRemoveBtn} onClick={() => removeCard(i)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            {carouselCards.length > 0 && (
              <div className={styles.field}>
                <FieldLabel>carousel "see more" link</FieldLabel>
                <input
                  className={styles.input}
                  placeholder="Defaults to first card's link"
                  value={value.carouselLink ?? ''}
                  onChange={e => set('carouselLink', e.target.value || undefined)}
                />
              </div>
            )}
          </div>
        </>
      )}

      <input
        ref={carouselFileInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleCardMediaSelected}
      />
    </>
  )
}

// Instagram
function InstagramForm({ value, onChange }: {
  value: InstagramPlatformData
  onChange: (v: InstagramPlatformData) => void
}) {
  const set = <K extends keyof InstagramPlatformData>(k: K, v: InstagramPlatformData[K]) =>
    onChange({ ...value, [k]: v })

  const userTags = value.userTags ?? []

  const addTag = () => set('userTags', [...userTags, { username: '', x: 0.5, y: 0.5 }])
  const removeTag = (i: number) => set('userTags', userTags.filter((_, idx) => idx !== i))
  const updateTag = (i: number, patch: Partial<typeof userTags[0]>) => {
    const next = [...userTags]
    next[i] = { ...next[i], ...patch }
    set('userTags', next)
  }

  const collaborators = value.collaborators ?? []

  return (
    <>
      <div className={styles.field}>
        <FieldLabel>content type</FieldLabel>
        <select
          className={styles.select}
          value={value.contentType ?? ''}
          onChange={e => set('contentType', (e.target.value || undefined) as any)}
        >
          <option value="">Default (Reel / Feed)</option>
          <option value="story">Story</option>
        </select>
      </div>

      {value.contentType !== 'story' && (
        <Switch
          on={value.shareToFeed ?? true}
          onChange={v => set('shareToFeed', v)}
          label="Share Reel to feed"
          desc="When enabled, Reel appears on both the Reels tab and your main profile feed"
        />
      )}

      <div className={styles.field}>
        <FieldLabel>first comment</FieldLabel>
        <textarea
          className={styles.textarea}
          rows={2}
          placeholder="Optional first comment (not applied to Stories)"
          value={value.firstComment ?? ''}
          onChange={e => set('firstComment', e.target.value || undefined)}
        />
      </div>

      {/* Collaborators */}
      <div className={styles.field}>
        <FieldLabel>collaborators (up to 3)</FieldLabel>
        <div className={styles.arrayItems}>
          {collaborators.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <input
                className={styles.input}
                placeholder="@username"
                value={c}
                onChange={e => {
                  const next = [...collaborators]
                  next[i] = e.target.value
                  set('collaborators', next)
                }}
              />
              <button type="button" className={styles.arrayItemRemoveBtn} style={{ position: 'static' }}
                onClick={() => set('collaborators', collaborators.filter((_, idx) => idx !== i))}>
                <X size={12} />
              </button>
            </div>
          ))}
          {collaborators.length < 3 && (
            <button type="button" className={styles.addBtn}
              onClick={() => set('collaborators', [...collaborators, ''])}>
              <Plus size={11} /> Add collaborator
            </button>
          )}
        </div>
      </div>

      {/* Trial Reels */}
      {value.contentType !== 'story' && (
        <div className={styles.subFormBox}>
          <div className={styles.subFormTitle}>Trial Reels (optional)</div>
          <p className={styles.hint}>Shared to non-followers first; can be graduated to a regular Reel</p>
          <Switch
            on={!!value.trialParams}
            onChange={v => set('trialParams', v ? { graduationStrategy: 'MANUAL' } : undefined)}
            label="Enable trial Reel"
          />
          {value.trialParams && (
            <div className={`${styles.field} ${styles.conditionalField}`}>
              <FieldLabel>graduation strategy</FieldLabel>
              <select
                className={styles.select}
                value={value.trialParams?.graduationStrategy ?? 'MANUAL'}
                onChange={e => set('trialParams', { graduationStrategy: e.target.value as any })}
              >
                <option value="MANUAL">Manual (graduate from Instagram app)</option>
                <option value="SS_PERFORMANCE">Auto (graduate if performs well)</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Reel cover */}
      {value.contentType !== 'story' && (
        <div className={styles.subFormBox}>
          <div className={styles.subFormTitle}>Reel Cover</div>
          <div className={styles.field}>
            <FieldLabel>thumbnail URL</FieldLabel>
            <input
              className={styles.input}
              placeholder="https://... (JPG or PNG)"
              value={value.instagramThumbnail ?? ''}
              onChange={e => set('instagramThumbnail', e.target.value || undefined)}
            />
          </div>
          <div className={styles.field}>
            <FieldLabel>thumb offset (ms)</FieldLabel>
            <input
              type="number"
              className={styles.input}
              min={0}
              placeholder="e.g. 5000"
              value={value.thumbOffset ?? ''}
              onChange={e => set('thumbOffset', e.target.value ? Number(e.target.value) : undefined)}
            />
            <p className={styles.hint}>Ignored when thumbnail URL is provided</p>
          </div>
          <div className={styles.field}>
            <FieldLabel>custom audio name</FieldLabel>
            <input
              className={styles.input}
              placeholder="My Podcast Intro"
              value={value.audioName ?? ''}
              onChange={e => set('audioName', e.target.value || undefined)}
            />
            <p className={styles.hint}>Replaces "Original Audio" label. Can only be set once.</p>
          </div>
        </div>
      )}

      {/* User Tags */}
      {value.contentType !== 'story' && (
        <div className={styles.subFormBox}>
          <div className={styles.arrayHeader}>
            <div className={styles.subFormTitle}>User Tags in photos</div>
            <button type="button" className={styles.addBtn} onClick={addTag}>
              <Plus size={11} /> Add tag
            </button>
          </div>
          <p className={styles.hint}>Position 0.0 = top-left, 1.0 = bottom-right. Not supported for videos.</p>
          <div className={styles.arrayItems}>
            {userTags.map((tag, i) => (
              <div key={i} className={styles.arrayItem}>
                <span className={styles.arrayItemIndex}>#{i + 1}</span>
                <div className={styles.arrayItemBody}>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <FieldLabel required>username</FieldLabel>
                      <input
                        className={styles.input}
                        placeholder="friend_username"
                        value={tag.username}
                        onChange={e => updateTag(i, { username: e.target.value })}
                      />
                    </div>
                    <div className={styles.field}>
                      <FieldLabel>slide index</FieldLabel>
                      <input
                        type="number"
                        className={styles.input}
                        min={0}
                        placeholder="0"
                        value={tag.mediaIndex ?? ''}
                        onChange={e => updateTag(i, { mediaIndex: e.target.value ? Number(e.target.value) : undefined })}
                      />
                    </div>
                  </div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <FieldLabel required>x position (0–1)</FieldLabel>
                      <input
                        type="number"
                        className={styles.input}
                        min={0} max={1} step={0.05}
                        value={tag.x}
                        onChange={e => updateTag(i, { x: Number(e.target.value) })}
                      />
                    </div>
                    <div className={styles.field}>
                      <FieldLabel required>y position (0–1)</FieldLabel>
                      <input
                        type="number"
                        className={styles.input}
                        min={0} max={1} step={0.05}
                        value={tag.y}
                        onChange={e => updateTag(i, { y: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <button type="button" className={styles.arrayItemRemoveBtn} onClick={() => removeTag(i)}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// LinkedIn
function LinkedInForm({ value, onChange }: {
  value: LinkedInPlatformData
  onChange: (v: LinkedInPlatformData) => void
}) {
  const set = <K extends keyof LinkedInPlatformData>(k: K, v: LinkedInPlatformData[K]) =>
    onChange({ ...value, [k]: v })

  return (
    <>
      <div className={styles.field}>
        <FieldLabel>document title (PDF/carousel)</FieldLabel>
        <input
          className={styles.input}
          placeholder="Title shown on document posts"
          value={value.documentTitle ?? ''}
          onChange={e => set('documentTitle', e.target.value || undefined)}
        />
        <p className={styles.hint}>Required by LinkedIn for document posts. Falls back to filename.</p>
      </div>

      <TodoSelect label="organization URN" placeholder="// TODO: Fetch organizations from API" />

      <div className={styles.field}>
        <FieldLabel>first comment</FieldLabel>
        <textarea
          className={styles.textarea}
          rows={2}
          placeholder="Optional first comment after publishing..."
          value={value.firstComment ?? ''}
          onChange={e => set('firstComment', e.target.value || undefined)}
        />
      </div>

      <Switch
        on={value.disableLinkPreview ?? false}
        onChange={v => set('disableLinkPreview', v)}
        label="Disable link preview"
        desc="Prevents automatic link preview cards from appearing on the post"
      />

      <GeoRestrictionField
        value={value.geoRestriction}
        onChange={v => set('geoRestriction', v)}
      />
    </>
  )
}

// Pinterest
function PinterestForm({ value, onChange }: {
  value: PinterestPlatformData
  onChange: (v: PinterestPlatformData) => void
}) {
  const set = <K extends keyof PinterestPlatformData>(k: K, v: PinterestPlatformData[K]) =>
    onChange({ ...value, [k]: v })

  return (
    <>
      <div className={styles.field}>
        <FieldLabel>pin title</FieldLabel>
        <input
          className={styles.input}
          placeholder="Pin title (max 100 chars)"
          maxLength={100}
          value={value.title ?? ''}
          onChange={e => set('title', e.target.value || undefined)}
        />
      </div>

      <TodoSelect label="board ID" placeholder="// TODO: Fetch boards from API" />

      <div className={styles.field}>
        <FieldLabel>destination link</FieldLabel>
        <input
          className={styles.input}
          placeholder="https://example.com"
          value={value.link ?? ''}
          onChange={e => set('link', e.target.value || undefined)}
        />
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <FieldLabel>cover image URL</FieldLabel>
          <input
            className={styles.input}
            placeholder="https://... (video cover)"
            value={value.coverImageUrl ?? ''}
            onChange={e => set('coverImageUrl', e.target.value || undefined)}
          />
        </div>
        <div className={styles.field}>
          <FieldLabel>cover key frame (seconds)</FieldLabel>
          <input
            type="number"
            className={styles.input}
            min={0}
            placeholder="e.g. 5"
            value={value.coverImageKeyFrameTime ?? ''}
            onChange={e => set('coverImageKeyFrameTime', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </div>
    </>
  )
}

// YouTube
function YouTubeForm({ value, onChange }: {
  value: YouTubePlatformData
  onChange: (v: YouTubePlatformData) => void
}) {
  const set = <K extends keyof YouTubePlatformData>(k: K, v: YouTubePlatformData[K]) =>
    onChange({ ...value, [k]: v })

  const CATEGORIES = [
    { id: '1', label: 'Film & Animation' },
    { id: '2', label: 'Autos & Vehicles' },
    { id: '10', label: 'Music' },
    { id: '15', label: 'Pets & Animals' },
    { id: '17', label: 'Sports' },
    { id: '20', label: 'Gaming' },
    { id: '22', label: 'People & Blogs (default)' },
    { id: '23', label: 'Comedy' },
    { id: '24', label: 'Entertainment' },
    { id: '25', label: 'News & Politics' },
    { id: '26', label: 'Howto & Style' },
    { id: '27', label: 'Education' },
    { id: '28', label: 'Science & Technology' },
  ]

  return (
    <>
      <div className={styles.field}>
        <FieldLabel>video title</FieldLabel>
        <input
          className={styles.input}
          placeholder="Video title (max 100 chars)"
          maxLength={100}
          value={value.title ?? ''}
          onChange={e => set('title', e.target.value || undefined)}
        />
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <FieldLabel>visibility</FieldLabel>
          <select
            className={styles.select}
            value={value.visibility ?? 'public'}
            onChange={e => set('visibility', e.target.value as any)}
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted (link only)</option>
            <option value="private">Private (invite only)</option>
          </select>
        </div>
        <div className={styles.field}>
          <FieldLabel>category</FieldLabel>
          <select
            className={styles.select}
            value={value.categoryId ?? '22'}
            onChange={e => set('categoryId', e.target.value)}
          >
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <FieldLabel>first comment</FieldLabel>
        <textarea
          className={styles.textarea}
          rows={2}
          maxLength={10000}
          placeholder="Optional pinned first comment (max 10,000 chars)"
          value={value.firstComment ?? ''}
          onChange={e => set('firstComment', e.target.value || undefined)}
        />
      </div>

      <Switch
        on={value.madeForKids ?? false}
        onChange={v => set('madeForKids', v)}
        label="Made for kids (COPPA)"
        desc="Set for child-directed content. Restricts comments, notifications, ad targeting."
      />

      <Switch
        on={value.containsSyntheticMedia ?? false}
        onChange={v => set('containsSyntheticMedia', v)}
        label="Contains AI-generated (synthetic) media"
        desc="YouTube may add a disclosure label"
      />

      <TodoSelect label="playlist ID" placeholder="// TODO: Fetch playlists from API" />
    </>
  )
}

// Google Business Profile
function GoogleBusinessForm({ value, onChange }: {
  value: GoogleBusinessPlatformData
  onChange: (v: GoogleBusinessPlatformData) => void
}) {
  const set = <K extends keyof GoogleBusinessPlatformData>(k: K, v: GoogleBusinessPlatformData[K]) =>
    onChange({ ...value, [k]: v })

  const topicType = value.topicType ?? 'STANDARD'

  const event = value.event ?? {
    title: '',
    schedule: {
      startDate: { year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: new Date().getDate() },
      endDate: { year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: new Date().getDate() + 1 },
    }
  }

  const offer = value.offer ?? {}
  const cta = value.callToAction

  return (
    <>
      <TodoSelect label="location ID" placeholder="// TODO: Fetch GBP locations from API" />

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <FieldLabel>topic type</FieldLabel>
          <select
            className={styles.select}
            value={topicType}
            onChange={e => set('topicType', e.target.value as any)}
          >
            <option value="STANDARD">Standard update</option>
            <option value="EVENT">Event</option>
            <option value="OFFER">Offer</option>
          </select>
        </div>
        <div className={styles.field}>
          <FieldLabel>language code</FieldLabel>
          <input
            className={styles.input}
            placeholder="e.g. en, de, es"
            value={value.languageCode ?? ''}
            onChange={e => set('languageCode', e.target.value || undefined)}
          />
        </div>
      </div>

      {/* Call to Action */}
      <div className={styles.subFormBox}>
        <div className={styles.arrayHeader}>
          <div className={styles.subFormTitle}>Call to Action button</div>
        </div>
        <Switch
          on={!!cta}
          onChange={v => set('callToAction', v ? { type: 'LEARN_MORE', url: '' } : undefined)}
          label="Add CTA button"
        />
        {cta && (
          <div className={`${styles.conditionalField}`}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <FieldLabel required>button type</FieldLabel>
                <select
                  className={styles.select}
                  value={cta.type}
                  onChange={e => set('callToAction', { ...cta, type: e.target.value as any })}
                >
                  <option value="LEARN_MORE">Learn More</option>
                  <option value="BOOK">Book</option>
                  <option value="ORDER">Order</option>
                  <option value="SHOP">Shop</option>
                  <option value="SIGN_UP">Sign Up</option>
                  <option value="CALL">Call</option>
                </select>
              </div>
              <div className={styles.field}>
                <FieldLabel required>destination URL</FieldLabel>
                <input
                  className={styles.input}
                  placeholder="https://example.com"
                  value={cta.url}
                  onChange={e => set('callToAction', { ...cta, url: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event */}
      {topicType === 'EVENT' && (
        <div className={`${styles.subFormBox} ${styles.conditionalField}`}>
          <div className={styles.subFormTitle}>Event details (required for EVENT)</div>
          <div className={styles.field}>
            <FieldLabel required>event title</FieldLabel>
            <input
              className={styles.input}
              placeholder="Grand Opening Weekend"
              value={event.title}
              onChange={e => set('event', { ...event, title: e.target.value })}
            />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <FieldLabel required>start date</FieldLabel>
              <input
                type="date"
                className={styles.input}
                value={`${event.schedule.startDate.year}-${String(event.schedule.startDate.month).padStart(2,'0')}-${String(event.schedule.startDate.day).padStart(2,'0')}`}
                onChange={e => {
                  const [y, m, d] = e.target.value.split('-').map(Number)
                  set('event', { ...event, schedule: { ...event.schedule, startDate: { year: y, month: m, day: d } } })
                }}
              />
            </div>
            <div className={styles.field}>
              <FieldLabel>start time (optional)</FieldLabel>
              <input
                type="time"
                className={styles.input}
                value={event.schedule.startTime
                  ? `${String(event.schedule.startTime.hours).padStart(2,'0')}:${String(event.schedule.startTime.minutes).padStart(2,'0')}`
                  : ''}
                onChange={e => {
                  const [h, m] = e.target.value.split(':').map(Number)
                  set('event', { ...event, schedule: { ...event.schedule, startTime: e.target.value ? { hours: h, minutes: m } : undefined } })
                }}
              />
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <FieldLabel required>end date</FieldLabel>
              <input
                type="date"
                className={styles.input}
                value={`${event.schedule.endDate.year}-${String(event.schedule.endDate.month).padStart(2,'0')}-${String(event.schedule.endDate.day).padStart(2,'0')}`}
                onChange={e => {
                  const [y, m, d] = e.target.value.split('-').map(Number)
                  set('event', { ...event, schedule: { ...event.schedule, endDate: { year: y, month: m, day: d } } })
                }}
              />
            </div>
            <div className={styles.field}>
              <FieldLabel>end time (optional)</FieldLabel>
              <input
                type="time"
                className={styles.input}
                value={event.schedule.endTime
                  ? `${String(event.schedule.endTime.hours).padStart(2,'0')}:${String(event.schedule.endTime.minutes).padStart(2,'0')}`
                  : ''}
                onChange={e => {
                  const [h, m] = e.target.value.split(':').map(Number)
                  set('event', { ...event, schedule: { ...event.schedule, endTime: e.target.value ? { hours: h, minutes: m } : undefined } })
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Offer */}
      {topicType === 'OFFER' && (
        <div className={`${styles.subFormBox} ${styles.conditionalField}`}>
          <div className={styles.subFormTitle}>Offer details (recommended)</div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <FieldLabel>offer type</FieldLabel>
              <select
                className={styles.select}
                value={offer.offerType ?? ''}
                onChange={e => set('offer', { ...offer, offerType: (e.target.value || undefined) as any })}
              >
                <option value="">Not specified</option>
                <option value="OFFER">Offer / Discount</option>
                <option value="BUY_ONE_GET_ONE">Buy One Get One</option>
              </select>
            </div>
            <div className={styles.field}>
              <FieldLabel>coupon code</FieldLabel>
              <input
                className={styles.input}
                placeholder="SAVE20"
                value={offer.couponCode ?? ''}
                onChange={e => set('offer', { ...offer, couponCode: e.target.value || undefined })}
              />
            </div>
          </div>
          <div className={styles.field}>
            <FieldLabel>redeem online URL</FieldLabel>
            <input
              className={styles.input}
              placeholder="https://example.com/redeem"
              value={offer.redeemOnlineUrl ?? ''}
              onChange={e => set('offer', { ...offer, redeemOnlineUrl: e.target.value || undefined })}
            />
          </div>
          <div className={styles.field}>
            <FieldLabel>terms &amp; conditions</FieldLabel>
            <textarea
              className={styles.textarea}
              rows={2}
              placeholder="Offer terms..."
              value={offer.termsConditions ?? ''}
              onChange={e => set('offer', { ...offer, termsConditions: e.target.value || undefined })}
            />
          </div>
        </div>
      )}
    </>
  )
}

// TikTok
function TikTokForm({ value, onChange }: {
  value: TikTokPlatformData
  onChange: (v: TikTokPlatformData) => void
}) {
  const set = <K extends keyof TikTokPlatformData>(k: K, v: TikTokPlatformData[K]) =>
    onChange({ ...value, [k]: v })

  return (
    <>
      <Switch
        on={value.draft ?? false}
        onChange={v => set('draft', v)}
        label="Send to TikTok Creator Inbox (draft)"
        desc="Creator receives inbox notification to complete posting. Requires video.upload scope."
      />

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <FieldLabel>media type</FieldLabel>
          <select
            className={styles.select}
            value={value.mediaType ?? ''}
            onChange={e => set('mediaType', (e.target.value || undefined) as any)}
          >
            <option value="">Auto-detect</option>
            <option value="video">Video</option>
            <option value="photo">Photo carousel</option>
          </select>
        </div>
        <div className={styles.field}>
          <FieldLabel>commercial content</FieldLabel>
          <select
            className={styles.select}
            value={value.commercialContentType ?? 'none'}
            onChange={e => set('commercialContentType', e.target.value as any)}
          >
            <option value="none">None</option>
            <option value="brand_organic">Brand organic</option>
            <option value="brand_content">Brand content (paid partnership)</option>
          </select>
        </div>
      </div>

      {/* Privacy Level */}
      <div className={styles.field}>
        <FieldLabel>privacy level</FieldLabel>
        <input
          className={styles.input}
          placeholder="e.g. PUBLIC_TO_EVERYONE (from creator info API)"
          value={value.privacyLevel ?? ''}
          onChange={e => set('privacyLevel', e.target.value || undefined)}
        />
        <p className={styles.hint}>Must match values returned by TikTok creator info API for this account</p>
      </div>

      {/* Engagement */}
      <div className={styles.subFormBox}>
        <div className={styles.subFormTitle}>Engagement settings (video)</div>
        <Switch on={value.allowComment ?? true} onChange={v => set('allowComment', v)} label="Allow comments" />
        <Switch on={value.allowDuet ?? true} onChange={v => set('allowDuet', v)} label="Allow duets" desc="Required for video posts" />
        <Switch on={value.allowStitch ?? true} onChange={v => set('allowStitch', v)} label="Allow stitches" desc="Required for video posts" />
        <Switch on={value.autoAddMusic ?? false} onChange={v => set('autoAddMusic', v)} label="Auto-add music (photos only)" />
      </div>

      {/* Disclosure */}
      <div className={styles.subFormBox}>
        <div className={styles.subFormTitle}>Content disclosure</div>
        <Switch on={value.brandPartnerPromote ?? false} onChange={v => set('brandPartnerPromote', v)} label="Promotes brand partner" />
        <Switch on={value.isBrandOrganicPost ?? false} onChange={v => set('isBrandOrganicPost', v)} label="Brand organic post" />
        <Switch on={value.videoMadeWithAi ?? false} onChange={v => set('videoMadeWithAi', v)} label="Made with AI (synthetic content)" />
        <Switch on={value.contentPreviewConfirmed ?? false} onChange={v => set('contentPreviewConfirmed', v)} label="Content preview confirmed" />
        <Switch on={value.expressConsentGiven ?? false} onChange={v => set('expressConsentGiven', v)} label="Express consent given" />
      </div>

      {/* Video cover */}
      <div className={styles.subFormBox}>
        <div className={styles.subFormTitle}>Video cover</div>
        <div className={styles.field}>
          <FieldLabel>cover image URL</FieldLabel>
          <input
            className={styles.input}
            placeholder="https://... (JPG, PNG, WebP, max 20MB)"
            value={value.videoCoverImageUrl ?? ''}
            onChange={e => set('videoCoverImageUrl', e.target.value || undefined)}
          />
        </div>
        <div className={styles.field}>
          <FieldLabel>cover timestamp (ms)</FieldLabel>
          <input
            type="number"
            className={styles.input}
            min={0}
            placeholder="1000"
            value={value.videoCoverTimestampMs ?? ''}
            onChange={e => set('videoCoverTimestampMs', e.target.value ? Number(e.target.value) : undefined)}
          />
          <p className={styles.hint}>Ignored when cover image URL is provided</p>
        </div>
      </div>

      {/* Photo */}
      <div className={styles.subFormBox}>
        <div className={styles.subFormTitle}>Photo carousel</div>
        <div className={styles.field}>
          <FieldLabel>cover photo index</FieldLabel>
          <input
            type="number"
            className={styles.input}
            min={0}
            placeholder="0 (first image)"
            value={value.photoCoverIndex ?? ''}
            onChange={e => set('photoCoverIndex', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
        <div className={styles.field}>
          <FieldLabel>long description (photos)</FieldLabel>
          <textarea
            className={styles.textarea}
            rows={3}
            maxLength={4000}
            placeholder="Long-form description for photo posts (max 4000 chars)"
            value={value.description ?? ''}
            onChange={e => set('description', e.target.value || undefined)}
          />
          <p className={styles.hint}>Recommended when main content exceeds 90 chars (photo titles are auto-truncated)</p>
        </div>
      </div>
    </>
  )
}

// Telegram
function TelegramForm({ value, onChange }: {
  value: TelegramPlatformData
  onChange: (v: TelegramPlatformData) => void
}) {
  const set = <K extends keyof TelegramPlatformData>(k: K, v: TelegramPlatformData[K]) =>
    onChange({ ...value, [k]: v })

  return (
    <>
      <div className={styles.field}>
        <FieldLabel>parse mode</FieldLabel>
        <select
          className={styles.select}
          value={value.parseMode ?? 'HTML'}
          onChange={e => set('parseMode', e.target.value as any)}
        >
          <option value="HTML">HTML (default)</option>
          <option value="Markdown">Markdown</option>
          <option value="MarkdownV2">MarkdownV2</option>
        </select>
      </div>
      <Switch
        on={value.disableWebPagePreview ?? false}
        onChange={v => set('disableWebPagePreview', v)}
        label="Disable web page preview"
        desc="Disables link preview generation for URLs in the message"
      />
      <Switch
        on={value.disableNotification ?? false}
        onChange={v => set('disableNotification', v)}
        label="Silent notification"
        desc="Users receive notification without sound"
      />
      <Switch
        on={value.protectContent ?? false}
        onChange={v => set('protectContent', v)}
        label="Protect content"
        desc="Prevents forwarding and saving of message content"
      />
    </>
  )
}

// Snapchat
function SnapchatForm({ value, onChange }: {
  value: SnapchatPlatformData
  onChange: (v: SnapchatPlatformData) => void
}) {
  const set = <K extends keyof SnapchatPlatformData>(k: K, v: SnapchatPlatformData[K]) =>
    onChange({ ...value, [k]: v })

  return (
    <div className={styles.field}>
      <FieldLabel>content type</FieldLabel>
      <select
        className={styles.select}
        value={value.contentType ?? 'story'}
        onChange={e => set('contentType', e.target.value as any)}
      >
        <option value="story">Story (ephemeral 24h, default)</option>
        <option value="saved_story">Saved story (permanent, title max 45 chars)</option>
        <option value="spotlight">Spotlight (video feed, max 160 chars)</option>
      </select>
      <p className={styles.hint}>Requires a Public Profile. Single media item only.</p>
    </div>
  )
}

// Reddit
function RedditForm({ value, onChange }: {
  value: RedditPlatformData
  onChange: (v: RedditPlatformData) => void
}) {
  const set = <K extends keyof RedditPlatformData>(k: K, v: RedditPlatformData[K]) =>
    onChange({ ...value, [k]: v })

  return (
    <>
      <div className={styles.fieldRow}>
        <TodoSelect label="subreddit" placeholder="// TODO: Fetch subreddits from API" />
        <TodoSelect label="flair ID" placeholder="// TODO: Fetch flairs from API" />
      </div>

      <div className={styles.field}>
        <FieldLabel>post title</FieldLabel>
        <input
          className={styles.input}
          placeholder="Post title (max 300 chars)"
          maxLength={300}
          value={value.title ?? ''}
          onChange={e => set('title', e.target.value || undefined)}
        />
        <p className={styles.hint}>Defaults to first line of content if omitted</p>
      </div>

      <div className={styles.field}>
        <FieldLabel>URL (link posts)</FieldLabel>
        <input
          className={styles.input}
          placeholder="https://example.com (creates link post)"
          value={value.url ?? ''}
          onChange={e => set('url', e.target.value || undefined)}
        />
      </div>

      <Switch
        on={value.forceSelf ?? false}
        onChange={v => set('forceSelf', v)}
        label="Force self / text post"
        desc="Creates text post even when a URL or media is provided"
      />

      <div className={styles.sectionDivider} />

      <div className={styles.subFormBox}>
        <div className={styles.subFormTitle}>Video settings</div>
        <Switch
          on={value.nativeVideo ?? true}
          onChange={v => set('nativeVideo', v)}
          label="Use Reddit native video player"
          desc="Uploads to Reddit CDN. Falls back to link post if subreddit blocks video."
        />
        {(value.nativeVideo ?? true) && (
          <>
            <Switch
              on={value.videogif ?? false}
              onChange={v => set('videogif', v)}
              label="Submit as silent videogif"
              desc="For short looping clips without audio"
            />
            <div className={styles.field}>
              <FieldLabel>video poster / thumbnail URL</FieldLabel>
              <input
                className={styles.input}
                placeholder="https://... (auto-extracted from first frame if omitted)"
                value={value.videoPosterUrl ?? ''}
                onChange={e => set('videoPosterUrl', e.target.value || undefined)}
              />
            </div>
          </>
        )}
      </div>
    </>
  )
}

// Bluesky
function BlueskyForm({ value, onChange }: {
  value: BlueskyPlatformData
  onChange: (v: BlueskyPlatformData) => void
}) {
  const set = <K extends keyof BlueskyPlatformData>(k: K, v: BlueskyPlatformData[K]) =>
    onChange({ ...value, [k]: v })

  return (
    <ThreadItemsEditor
      label="thread items"
      value={value.threadItems}
      onChange={v => set('threadItems', v)}
    />
  )
}

// Discord
function DiscordForm({ value, onChange }: {
  value: DiscordPlatformData
  onChange: (v: DiscordPlatformData) => void
}) {
  const set = <K extends keyof DiscordPlatformData>(k: K, v: DiscordPlatformData[K]) =>
    onChange({ ...value, [k]: v })

  const embeds = value.embeds ?? []
  const poll = value.poll
  const threadFromMsg = value.threadFromMessage
  const forumTags = value.forumAppliedTags ?? []

  const addEmbed = () => {
    if (embeds.length < 10) set('embeds', [...embeds, {}])
  }

  const updateEmbed = (i: number, patch: Partial<DiscordEmbed>) => {
    const next = [...embeds]
    next[i] = { ...next[i], ...patch }
    set('embeds', next)
  }

  const removeEmbed = (i: number) => {
    const next = embeds.filter((_, idx) => idx !== i)
    set('embeds', next.length ? next : undefined)
  }

  const addPollAnswer = () => {
    const answers = [...(poll?.answers ?? []), { poll_media: { text: '' } }]
    set('poll', { ...(poll ?? { question: { text: '' } }), answers })
  }

  return (
    <>
      {/* Channel ID — required */}
      <div className={styles.field}>
        <FieldLabel required>channel ID</FieldLabel>
        <input
          className={styles.input}
          placeholder="1234567890123456789"
          value={value.channelId ?? ''}
          onChange={e => set('channelId', e.target.value)}
        />
        <p className={styles.hint}>Target channel snowflake ID. Determines which channel receives the message.</p>
      </div>

      <div className={styles.sectionDivider} />

      {/* Embeds */}
      <div className={styles.subFormBox}>
        <div className={styles.arrayHeader}>
          <div className={styles.subFormTitle}>Rich Embeds (max 10)</div>
          {embeds.length < 10 && (
            <button type="button" className={styles.addBtn} onClick={addEmbed}>
              <Plus size={11} /> Add embed
            </button>
          )}
        </div>
        <p className={styles.hint}>Combined max 6,000 characters across all embeds</p>
        <div className={styles.arrayItems}>
          {embeds.map((embed, i) => (
            <div key={i} className={styles.arrayItem}>
              <span className={styles.arrayItemIndex}>Embed #{i + 1}</span>
              <div className={styles.arrayItemBody}>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <FieldLabel>title</FieldLabel>
                    <input className={styles.input} placeholder="Embed title (max 256)" maxLength={256}
                      value={embed.title ?? ''} onChange={e => updateEmbed(i, { title: e.target.value || undefined })} />
                  </div>
                  <div className={styles.field}>
                    <FieldLabel>URL (title link)</FieldLabel>
                    <input className={styles.input} placeholder="https://..."
                      value={embed.url ?? ''} onChange={e => updateEmbed(i, { url: e.target.value || undefined })} />
                  </div>
                </div>
                <div className={styles.field}>
                  <FieldLabel>description</FieldLabel>
                  <textarea className={styles.textarea} rows={2} placeholder="Embed body (max 4,096)" maxLength={4096}
                    value={embed.description ?? ''} onChange={e => updateEmbed(i, { description: e.target.value || undefined })} />
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <FieldLabel>color (decimal)</FieldLabel>
                    <input type="number" className={styles.input} placeholder="e.g. 5814783"
                      value={embed.color ?? ''} onChange={e => updateEmbed(i, { color: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                  <div className={styles.field}>
                    <FieldLabel>image URL</FieldLabel>
                    <input className={styles.input} placeholder="https://..."
                      value={embed.image?.url ?? ''} onChange={e => updateEmbed(i, { image: e.target.value ? { url: e.target.value } : undefined })} />
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <FieldLabel>thumbnail URL</FieldLabel>
                    <input className={styles.input} placeholder="https://..."
                      value={embed.thumbnail?.url ?? ''} onChange={e => updateEmbed(i, { thumbnail: e.target.value ? { url: e.target.value } : undefined })} />
                  </div>
                  <div className={styles.field}>
                    <FieldLabel>footer text</FieldLabel>
                    <input className={styles.input} placeholder="Footer (max 2,048)" maxLength={2048}
                      value={embed.footer?.text ?? ''} onChange={e => updateEmbed(i, { footer: e.target.value ? { ...(embed.footer ?? {}), text: e.target.value } : undefined })} />
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <FieldLabel>author name</FieldLabel>
                    <input className={styles.input} placeholder="Author (max 256)" maxLength={256}
                      value={embed.author?.name ?? ''} onChange={e => updateEmbed(i, { author: { ...(embed.author ?? { name: '' }), name: e.target.value } })} />
                  </div>
                  <div className={styles.field}>
                    <FieldLabel>author URL</FieldLabel>
                    <input className={styles.input} placeholder="https://..."
                      value={embed.author?.url ?? ''} onChange={e => updateEmbed(i, { author: { ...(embed.author ?? { name: '' }), url: e.target.value || undefined } })} />
                  </div>
                </div>
              </div>
              <button type="button" className={styles.arrayItemRemoveBtn} onClick={() => removeEmbed(i)}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Poll */}
      <div className={styles.subFormBox}>
        <div className={styles.subFormTitle}>Discord Poll (optional)</div>
        <p className={styles.hint}>Cannot be combined with media attachments</p>
        <Switch
          on={!!poll}
          onChange={v => set('poll', v ? { question: { text: '' }, answers: [{ poll_media: { text: '' } }] } : undefined)}
          label="Enable poll"
        />
        {poll && (
          <>
            <div className={styles.field}>
              <FieldLabel required>question</FieldLabel>
              <input
                className={styles.input}
                placeholder="Poll question (max 300)"
                maxLength={300}
                value={poll.question.text}
                onChange={e => set('poll', { ...poll, question: { text: e.target.value } })}
              />
            </div>
            <div className={styles.field}>
              <div className={styles.arrayHeader}>
                <FieldLabel>answers (1–10)</FieldLabel>
                {(poll.answers?.length ?? 0) < 10 && (
                  <button type="button" className={styles.addBtn} onClick={addPollAnswer}>
                    <Plus size={11} /> Add answer
                  </button>
                )}
              </div>
              <div className={styles.arrayItems}>
                {(poll.answers ?? []).map((ans, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      className={styles.input}
                      placeholder={`Answer ${i + 1}`}
                      value={ans.poll_media.text}
                      onChange={e => {
                        const next = [...(poll.answers ?? [])]
                        next[i] = { poll_media: { text: e.target.value } }
                        set('poll', { ...poll, answers: next })
                      }}
                    />
                    <button type="button" className={styles.arrayItemRemoveBtn} style={{ position: 'static' }}
                      onClick={() => {
                        const next = poll.answers?.filter((_, idx) => idx !== i) ?? []
                        set('poll', { ...poll, answers: next })
                      }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <FieldLabel>duration (hours)</FieldLabel>
                <input
                  type="number"
                  className={styles.input}
                  min={1} max={768}
                  placeholder="24"
                  value={poll.duration ?? ''}
                  onChange={e => set('poll', { ...poll, duration: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div className={styles.field} style={{ justifyContent: 'flex-end' }}>
                <Switch
                  on={poll.allow_multiselect ?? false}
                  onChange={v => set('poll', { ...poll, allow_multiselect: v })}
                  label="Allow multi-select"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Forum / thread */}
      <div className={styles.subFormBox}>
        <div className={styles.subFormTitle}>Forum channel settings</div>
        <div className={styles.field}>
          <FieldLabel>forum thread name</FieldLabel>
          <input
            className={styles.input}
            placeholder="Thread title (required for forum channels)"
            value={value.forumThreadName ?? ''}
            onChange={e => set('forumThreadName', e.target.value || undefined)}
          />
        </div>
        <div className={styles.field}>
          <FieldLabel>applied tag IDs (max 5)</FieldLabel>
          <div className={styles.countriesTagInput} onClick={e => {
            (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()
          }}>
            {forumTags.map((tag, i) => (
              <span key={i} className={styles.countryTag}>
                {tag}
                <button type="button" className={styles.countryTagRemove}
                  onClick={() => set('forumAppliedTags', forumTags.filter((_, idx) => idx !== i))}>×</button>
              </span>
            ))}
            {forumTags.length < 5 && (
              <input
                className={styles.countriesInput}
                placeholder={forumTags.length === 0 ? 'Tag snowflake IDs…' : ''}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    const val = (e.target as HTMLInputElement).value.trim()
                    if (val && !forumTags.includes(val)) {
                      set('forumAppliedTags', [...forumTags, val])
                    }
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Thread from message */}
      <div className={styles.subFormBox}>
        <div className={styles.subFormTitle}>Follow-up thread from message</div>
        <Switch
          on={!!threadFromMsg}
          onChange={v => set('threadFromMessage', v ? { name: '' } : undefined)}
          label="Create follow-up thread"
        />
        {threadFromMsg && (
          <>
            <div className={styles.field}>
              <FieldLabel required>thread name</FieldLabel>
              <input
                className={styles.input}
                placeholder="Thread name (1–100 chars)"
                value={threadFromMsg.name}
                onChange={e => set('threadFromMessage', { ...threadFromMsg, name: e.target.value })}
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <FieldLabel>auto-archive duration</FieldLabel>
                <select
                  className={styles.select}
                  value={threadFromMsg.autoArchiveDuration ?? ''}
                  onChange={e => set('threadFromMessage', { ...threadFromMsg, autoArchiveDuration: e.target.value ? Number(e.target.value) as any : undefined })}
                >
                  <option value="">Default</option>
                  <option value="60">1 hour</option>
                  <option value="1440">24 hours</option>
                  <option value="4320">3 days</option>
                  <option value="10080">1 week</option>
                </select>
              </div>
              <div className={styles.field}>
                <FieldLabel>slow-mode (seconds)</FieldLabel>
                <input
                  type="number"
                  className={styles.input}
                  min={0} max={21600}
                  placeholder="0"
                  value={threadFromMsg.rateLimitPerUser ?? ''}
                  onChange={e => set('threadFromMessage', { ...threadFromMsg, rateLimitPerUser: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Misc */}
      <Switch
        on={value.crosspost ?? false}
        onChange={v => set('crosspost', v)}
        label="Auto-crosspost to servers following this channel"
        desc="Only for announcement channels (type 5)"
      />

      <Switch
        on={value.tts ?? false}
        onChange={v => set('tts', v)}
        label="Text-to-speech"
        desc="Discord reads the message aloud in the channel"
      />

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <FieldLabel>webhook display name</FieldLabel>
          <input
            className={styles.input}
            placeholder="Override for this post (1-80 chars)"
            maxLength={80}
            value={value.webhookUsername ?? ''}
            onChange={e => set('webhookUsername', e.target.value || undefined)}
          />
        </div>
        <div className={styles.field}>
          <FieldLabel>webhook avatar URL</FieldLabel>
          <input
            className={styles.input}
            placeholder="https://... (override for this post)"
            value={value.webhookAvatarUrl ?? ''}
            onChange={e => set('webhookAvatarUrl', e.target.value || undefined)}
          />
        </div>
      </div>
    </>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

const PLATFORM_FORM_MAP = [
  'twitter', 'threads', 'facebook', 'instagram', 'linkedin',
  'pinterest', 'youtube', 'googlebusiness', 'tiktok',
  'telegram', 'snapchat', 'reddit', 'bluesky', 'discord',
] as const

type SupportedPlatform = typeof PLATFORM_FORM_MAP[number]

function isSupportedPlatform(p: string): p is SupportedPlatform {
  return PLATFORM_FORM_MAP.includes(p as SupportedPlatform)
}

/** Returns true if the value object has any non-empty, non-default-falsy values */
function hasConfiguredValues(data: Record<string, any>): boolean {
  return Object.values(data).some(v => {
    if (v === undefined || v === null || v === false) return false
    if (typeof v === 'string') return v.trim().length > 0
    if (typeof v === 'object') return hasConfiguredValues(v)
    return true
  })
}

export default function PlatformSpecificForm({
  activePlatforms,
  value,
  onChange,
}: PlatformSpecificFormProps) {
  const visiblePlatforms = activePlatforms.filter(isSupportedPlatform)

  if (visiblePlatforms.length === 0) return null

  const updatePlatform = <K extends keyof AllPlatformData>(
    platform: K,
    data: AllPlatformData[K]
  ) => {
    onChange({ ...value, [platform]: data })
  }

  const renderForm = (platform: SupportedPlatform) => {
    switch (platform) {
      case 'twitter':
        return (
          <TwitterForm
            value={value.twitter ?? {}}
            onChange={d => updatePlatform('twitter', d)}
          />
        )
      case 'threads':
        return (
          <ThreadsForm
            value={value.threads ?? {}}
            onChange={d => updatePlatform('threads', d)}
          />
        )
      case 'facebook':
        return (
          <FacebookForm
            value={value.facebook ?? {}}
            onChange={d => updatePlatform('facebook', d)}
          />
        )
      case 'instagram':
        return (
          <InstagramForm
            value={value.instagram ?? {}}
            onChange={d => updatePlatform('instagram', d)}
          />
        )
      case 'linkedin':
        return (
          <LinkedInForm
            value={value.linkedin ?? {}}
            onChange={d => updatePlatform('linkedin', d)}
          />
        )
      case 'pinterest':
        return (
          <PinterestForm
            value={value.pinterest ?? {}}
            onChange={d => updatePlatform('pinterest', d)}
          />
        )
      case 'youtube':
        return (
          <YouTubeForm
            value={value.youtube ?? {}}
            onChange={d => updatePlatform('youtube', d)}
          />
        )
      case 'googlebusiness':
        return (
          <GoogleBusinessForm
            value={value.googlebusiness ?? {}}
            onChange={d => updatePlatform('googlebusiness', d)}
          />
        )
      case 'tiktok':
        return (
          <TikTokForm
            value={value.tiktok ?? {}}
            onChange={d => updatePlatform('tiktok', d)}
          />
        )
      case 'telegram':
        return (
          <TelegramForm
            value={value.telegram ?? {}}
            onChange={d => updatePlatform('telegram', d)}
          />
        )
      case 'snapchat':
        return (
          <SnapchatForm
            value={value.snapchat ?? {}}
            onChange={d => updatePlatform('snapchat', d)}
          />
        )
      case 'reddit':
        return (
          <RedditForm
            value={value.reddit ?? {}}
            onChange={d => updatePlatform('reddit', d)}
          />
        )
      case 'bluesky':
        return (
          <BlueskyForm
            value={value.bluesky ?? {}}
            onChange={d => updatePlatform('bluesky', d)}
          />
        )
      case 'discord':
        return (
          <DiscordForm
            value={value.discord ?? { channelId: '' }}
            onChange={d => updatePlatform('discord', d)}
          />
        )
      default:
        return null
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {visiblePlatforms.map(platform => {
        const platformData = value[platform as keyof AllPlatformData]
        const hasContent = platformData ? hasConfiguredValues(platformData as Record<string, any>) : false

        return (
          <PlatformAccordion key={platform} platform={platform} hasContent={hasContent}>
            {renderForm(platform)}
          </PlatformAccordion>
        )
      })}
    </div>
  )
}
