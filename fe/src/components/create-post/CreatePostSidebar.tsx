import { Sparkles, ImageIcon, Search, Heart, MessageCircle, BookMarked, Share2, Music2, ThumbsUp, Repeat2, BarChart2, Settings2 } from 'lucide-react'
import { Signal, Wifi, Battery, Home, Users, Inbox, User } from 'lucide-react'
import { PLATFORMS } from './types'
import { PlatformIcon } from './platformIcons'
import type { UseCreatePostStateReturn } from './useCreatePostState'
import SchedulePicker from '../SchedulePicker'
import styles from '../CreatePostModal.module.css'

type SidebarProps = Pick<UseCreatePostStateReturn, 'state' | 'refs' | 'actions'>

export function PlatformTabs({ state, actions }: SidebarProps) {
  return (
    <div className={styles.platformTabs}>
      {PLATFORMS.filter(p => state.activePlatforms.includes(p.id)).map(p => (
        <button
          key={p.id}
          className={`${styles.platformTab} ${state.activeTab === p.id ? styles.platformTabActive : ''}`}
          onClick={() => actions.setActiveTab(p.id)}
        >
          <span><PlatformIcon platform={p.id} size={16} /></span>
          {p.label}
        </button>
      ))}
    </div>
  )
}

export function ScheduleRow({ state, actions }: SidebarProps) {
  return (
    <div className={styles.scheduleRow}>
      <span className={styles.scheduleLabel}>Publish:</span>
      <button
        className={`${styles.scheduleChip} ${!state.scheduleMode ? styles.headerBtnActive : ''}`}
        onClick={() => { actions.setScheduleMode(false); actions.setScheduleTime(''); }}
      >
        <Settings2 size={12} /> Automatic
      </button>
      <button
        className={`${styles.scheduleChip} ${state.scheduleMode ? styles.headerBtnActive : ''}`}
        onClick={() => {
          actions.setScheduleMode(true)
          if (!state.scheduleTime) {
            const tmrw = new Date()
            tmrw.setDate(tmrw.getDate() + 1)
            tmrw.setHours(9, 0, 0, 0)
            const year = tmrw.getFullYear()
            const month = String(tmrw.getMonth() + 1).padStart(2, '0')
            const day = String(tmrw.getDate()).padStart(2, '0')
            actions.setScheduleTime(`${year}-${month}-${day}T09:00`)
          }
        }}
      >
        Schedule
      </button>
      {state.scheduleMode && (
        <SchedulePicker 
          value={state.scheduleTime} 
          onChange={val => actions.setScheduleTime(val)} 
          onClear={() => {
              actions.setScheduleMode(false)
              actions.setScheduleTime('')
          }} 
        />
      )}
    </div>
  )
}

export function RightPanel({ state, actions }: SidebarProps) {
  const renderPreview = () => {
    const firstImage = state.media.find(m => m.type === 'image')

    if (state.activeTab === 'TikTok') return (
      <div className={styles.tiktokCard}>
        {firstImage
          ? <img src={firstImage.url} alt="" className={styles.tiktokBg} />
          : <div className={styles.tiktokBgGradient} />
        }
        <div className={styles.tiktokTopBar}>
          <span className={styles.tiktokTopBarItem}>Following</span>
          <span className={`${styles.tiktokTopBarItem} ${styles.tiktokTopBarActive}`}>For You</span>
          <span className={styles.tiktokTopSearch}><Search size={18} /></span>
        </div>
        <div className={styles.tiktokActions}>
          <div className={styles.tiktokAvatarAction}>
            <div className={styles.tiktokAvatarRing}>{state.user?.avatar ?? 'U'}</div>
            <div className={styles.tiktokAvatarPlus}>+</div>
          </div>
          {[
            { icon: <Heart size={26} fill="#fff" color="#fff" />, count: '0' },
            { icon: <MessageCircle size={26} fill="#fff" color="#fff" />, count: '0' },
            { icon: <BookMarked size={26} fill="#fff" color="#fff" />, count: '0' },
            { icon: <Share2 size={26} color="#fff" />, count: 'Share' },
          ].map((a, i) => (
            <div key={i} className={styles.tiktokActionBtn}>{a.icon}<span>{a.count}</span></div>
          ))}
        </div>
        <div className={styles.tiktokOverlay}>
          <div className={styles.tiktokUser}>@{state.user?.handle ?? 'you'}</div>
          {state.caption && <div className={styles.tiktokCaption}>{state.caption}</div>}
          <div className={styles.tiktokSound}>
            <Music2 size={13} /> original sound · {state.user?.handle ?? 'you'}
          </div>
        </div>
      </div>
    )

    if (state.activeTab === 'Instagram') return (
      <div className={styles.igCard}>
        <div className={styles.igHeader}>
          <div className={styles.igAvatar}>{state.user?.avatar ?? 'U'}</div>
          <span className={styles.igUsername}>{state.user?.handle ?? 'you'}</span>
        </div>
        <div className={styles.igImage}>
          {firstImage
            ? <img src={firstImage.url} alt="" className={styles.igImageActual} />
            : <span><ImageIcon size={28} style={{ color: 'var(--text-muted)' }} /></span>
          }
        </div>
        <div className={styles.igActions}>
          <Heart size={18} className={styles.igActionIcon} />
          <MessageCircle size={18} className={styles.igActionIcon} />
          <Share2 size={18} className={styles.igActionIcon} />
        </div>
        {state.caption && <div className={styles.igCaption}><b>{state.user?.handle ?? 'you'}</b> {state.caption}</div>}
      </div>
    )

    if (state.activeTab === 'Facebook') return (
      <div className={styles.fbCard}>
        <div className={styles.fbHeader}>
          <div className={styles.fbAvatar}>{state.user?.avatar ?? 'U'}</div>
          <div className={styles.fbMeta}>
            <span className={styles.fbName}>{state.user?.name ?? 'You'}</span>
            <span className={styles.fbTime}>Just now · 🌐</span>
          </div>
        </div>
        {state.caption && <div className={styles.fbBody}>{state.caption}</div>}
        {firstImage && (
          <div className={styles.fbImage}><img src={firstImage.url} alt="" className={styles.fbImageActual} /></div>
        )}
        <div className={styles.fbActions}>
          {[{ icon: <ThumbsUp size={14} />, label: 'Like' }, { icon: <MessageCircle size={14} />, label: 'Comment' }, { icon: <Share2 size={14} />, label: 'Share' }].map((a, i) => (
            <div key={i} className={styles.fbActionBtn}>{a.icon}{a.label}</div>
          ))}
        </div>
      </div>
    )

    return (
      <div className={styles.xCard}>
        <div className={styles.xHeader}>
          <div className={styles.xAvatar}>{state.user?.avatar ?? 'U'}</div>
          <div className={styles.xMeta}>
            <span className={styles.xName}>{state.user?.name ?? 'You'}</span>
            <span className={styles.xHandle}>@{state.user?.handle ?? 'you'}</span>
          </div>
        </div>
        {state.caption && <div className={styles.xBody}>{state.caption}</div>}
        {firstImage && <img src={firstImage.url} alt="" style={{ width: '100%', borderRadius: 8, marginTop: 8 }} />}
        <div className={styles.xActions}>
          {[{ icon: <MessageCircle size={14} /> }, { icon: <Repeat2 size={14} /> }, { icon: <Heart size={14} /> }, { icon: <BarChart2 size={14} /> }, { icon: <BookMarked size={14} /> }].map((a, i) => (
            <div key={i} className={styles.xActionBtn}>{a.icon}</div>
          ))}
        </div>
      </div>
    )
  }

  if (state.showAI) {
    return (
      <div className={styles.preview}>
        <div className={styles.previewHeader}>
          <Sparkles size={16} style={{ marginRight: 6 }} /> AI Assistant
        </div>
        <div className={styles.previewBody}>
          {!state.hasPlatforms ? (
            <div className={styles.previewEmpty}>
              <div className={styles.previewEmptyIcon}>
                <Sparkles size={28} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className={styles.previewEmptyText}>
                Select a channel to use AI Assistant
              </span>
            </div>
          ) : (
            <div className={styles.aiSidePanel}>
              <div className={styles.aiPromptSection}>
                <label className={styles.aiPromptLabel}>What do you want to write about?</label>
                <textarea
                  className={styles.aiPromptTextarea}
                  placeholder="Eg. Promote my photography course to get new signups. Registration closes in 3 days."
                  value={state.aiPrompt}
                  onChange={e => actions.setAiPrompt(e.target.value)}
                  rows={4}
                />
                <div className={styles.aiTipText}>
                  <strong>Pro tip:</strong> Include key points, your target audience and your desired outcome for this post
                </div>
                <button
                  type="button"
                  className={styles.aiGenerateBtn}
                  onClick={actions.handleGenerateAI}
                  disabled={state.aiPrompt.trim() === '' || state.aiIsGenerating}
                >
                  <Sparkles size={14} />
                  {state.aiIsGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>

              {state.aiResults.length > 0 && (
                <div className={styles.aiResultsSection}>
                  <div className={styles.aiResultsHeader}>Suggestions</div>
                  <div className={styles.aiResultsList}>
                    {state.aiResults.map(s => (
                      <div
                        key={s.id}
                        className={styles.aiResultCard}
                        onClick={() => actions.applyAISuggestion(s.caption)}
                      >
                        <div className={styles.aiResultType}>{s.type}</div>
                        <div className={styles.aiResultCaption}>{s.caption}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (state.showPreview) {
    return (
      <div className={styles.preview}>
        <div className={styles.previewHeader}>
          <span>{state.activeTab}</span> Preview
        </div>
        <div className={styles.previewBody}>
          {!state.hasPlatforms ? (
            <div className={styles.previewEmpty}>
              <div className={styles.previewEmptyIcon}>
                <ImageIcon size={28} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className={styles.previewEmptyText}>
                Select a channel to see preview
              </span>
            </div>
          ) : (
            <div className={styles.previewStage}>
              <div className={styles.deviceFrame}>
                <div className={styles.deviceScreen}>
                  <div className={styles.deviceStatusBar}>
                    <span className={styles.deviceTime}>9:41</span>
                    <div className={styles.deviceStatusIcons}>
                      <Signal size={11} />
                      <Wifi size={11} />
                      <Battery size={11} />
                    </div>
                  </div>

                  <div className={styles.deviceContent}>
                    {state.caption.trim() === '' && state.media.length === 0 && state.activeTab !== 'TikTok' ? (
                      <div className={styles.previewEmpty}>
                        <div className={styles.previewEmptyIcon}>
                          <ImageIcon size={22} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <span className={styles.previewEmptyText}>See your post's preview here</span>
                      </div>
                    ) : renderPreview()}
                  </div>

                  {state.activeTab === 'TikTok' && (
                    <div className={styles.tiktokBottomNav}>
                      {[
                        { icon: <Home size={17} />, label: 'Home', active: true },
                        { icon: <Users size={17} />, label: 'Friends', active: false },
                        { icon: null, label: '', active: false },
                        { icon: <Inbox size={17} />, label: 'Inbox', active: false },
                        { icon: <User size={17} />, label: 'Profile', active: false },
                      ].map((item, i) =>
                        item.icon === null ? (
                          <div key={i} className={styles.tiktokBottomNavPlus}><span>+</span></div>
                        ) : (
                          <div key={i} className={`${styles.tiktokBottomNavItem} ${item.active ? styles.tiktokBottomNavItemActive : ''}`}>
                            {item.icon}
                            <span>{item.label}</span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
              <p className={styles.previewDisclaimer}>
                Previews are an approximation of how your post will look when published. The final post may look slightly different.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}