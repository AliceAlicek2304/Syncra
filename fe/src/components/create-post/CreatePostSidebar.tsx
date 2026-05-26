import { ExtendedPlatformIcon } from './platformIcons'
import type { UseCreatePostStateReturn } from './useCreatePostState'
import { useWorkspace } from '../../context/WorkspaceContext'
import styles from '../CreatePostModal.module.css'

type SidebarProps = Pick<UseCreatePostStateReturn, 'state' | 'refs' | 'actions'>

export function PlatformTabs() {
  return null
}

export function ScheduleRow() {
  return null
}

export function RightPanel({ state, actions }: SidebarProps) {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace()

  const platformCount = state.socialAccounts.filter(a => a.isActive).length

  return (
    <div className={styles.sidebar}>
      {/* Profiles section */}
      <div className={styles.inputGroup}>
        <label className={styles.fieldLabel}>profiles</label>
        <p className={styles.fieldDescription}>
          Select one or more profiles to post to their connected accounts
        </p>
        <div className={styles.profileSelectWrapper}>
          <span className={styles.profileYellowDot} />
          <select 
            value={activeWorkspace?.id || ''} 
            onChange={e => {
              const ws = workspaces.find(w => w.id === e.target.value)
              if (ws) {
                setActiveWorkspace(ws)
                // Clear selection or select all
                actions.setSelectedSocialAccountIds([])
              }
            }}
            className={styles.profileSelect}
          >
            {workspaces.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Platforms section */}
      <div className={styles.inputGroup}>
        <label className={styles.fieldLabel}>
          platforms (from {platformCount} profile{platformCount === 1 ? '' : 's'})
        </label>
        <div className={styles.platformCardsGrid}>
          {state.socialAccounts.filter(a => a.isActive).map(account => {
            const isChecked = state.selectedSocialAccountIds.includes(account.id)
            return (
              <div 
                key={account.id}
                className={`${styles.platformSelectCard} ${isChecked ? styles.platformSelectCardActive : ''}`}
                onClick={() => actions.setSelectedSocialAccountIds(
                  isChecked 
                    ? state.selectedSocialAccountIds.filter(id => id !== account.id)
                    : [...state.selectedSocialAccountIds, account.id]
                )}
              >
                <div className={`${styles.platformCardLogo} ${styles[`platformLogo_${account.platform}`]}`}>
                  <ExtendedPlatformIcon platform={account.platform} size={16} />
                </div>
                <div className={styles.platformCardMeta}>
                  <span className={styles.platformCardName}>
                    {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}
                  </span>
                  <span className={styles.platformCardHandle}>
                    @{account.displayName}
                  </span>
                </div>
                <div className={styles.platformCardCheckbox}>
                  <span className={`${styles.customCheckbox} ${isChecked ? styles.customCheckboxChecked : ''}`} />
                </div>
              </div>
            )
          })}
          {state.socialAccounts.filter(a => a.isActive).length === 0 && (
            <p className={styles.emptyStateText}>No active platform accounts connected.</p>
          )}
        </div>
      </div>

      {/* Publishing section */}
      <div className={styles.inputGroup}>
        <label className={styles.fieldLabel}>publishing</label>
        
        <div className={styles.publishingTabs}>
          {(['schedule', 'now', 'queue', 'draft'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              className={`${styles.publishingTabBtn} ${state.publishingTab === tab ? styles.publishingTabBtnActive : ''}`}
              onClick={() => {
                actions.setPublishingTab(tab)
                if (tab === 'schedule') {
                  actions.setScheduleMode(true)
                  if (!state.scheduleTime) {
                    const tmrw = new Date()
                    tmrw.setDate(tmrw.getDate() + 1)
                    tmrw.setHours(15, 50, 0, 0)
                    const year = tmrw.getFullYear()
                    const month = String(tmrw.getMonth() + 1).padStart(2, '0')
                    const day = String(tmrw.getDate()).padStart(2, '0')
                    const hours = String(tmrw.getHours()).padStart(2, '0')
                    const minutes = String(tmrw.getMinutes()).padStart(2, '0')
                    actions.setScheduleTime(`${year}-${month}-${day}T${hours}:${minutes}`)
                  }
                } else {
                  actions.setScheduleMode(false)
                }
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {state.publishingTab === 'schedule' && (
          <div className={styles.scheduleInputsRow}>
            <div className={styles.scheduleField}>
              <label className={styles.fieldSubLabel}>date & time</label>
              <input 
                type="datetime-local" 
                className={styles.datetimeInput}
                value={state.scheduleTime}
                onChange={e => actions.setScheduleTime(e.target.value)}
              />
            </div>
            <div className={styles.scheduleField}>
              <label className={styles.fieldSubLabel}>timezone</label>
              <select className={styles.timezoneSelect} defaultValue="Bangkok">
                <option value="Bangkok">Asia/Bangkok (GMT+7) (curre...</option>
                <option value="UTC">UTC (GMT+0)</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}