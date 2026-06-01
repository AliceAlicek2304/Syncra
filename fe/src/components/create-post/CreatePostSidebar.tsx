import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown, Check } from 'lucide-react'
import { ExtendedPlatformIcon } from './platformIcons'
import { getSocialAvatarUrl } from '../../utils/social'
import type { UseCreatePostStateReturn } from './useCreatePostState'
import { useWorkspace } from '../../context/WorkspaceContext'
import { getPlatformValidationError } from './useCreatePostState'
import type { Platform } from './types'
import SchedulePicker from '../SchedulePicker'
import styles from '../CreatePostModal.module.css'

const getPlatformBrandColor = (platform: string): string => {
  switch (platform) {
    case 'facebook': return '#1877F2'
    case 'tiktok': return '#000000'
    case 'instagram': return '#E4405F'
    case 'twitter': return '#000000'
    case 'linkedin': return '#0A66C2'
    case 'youtube': return '#FF0000'
    case 'pinterest': return '#E60023'
    default: return '#6b7280'
  }
}

type SidebarProps = Pick<UseCreatePostStateReturn, 'state' | 'refs' | 'actions'>

export function RightPanel({ state, actions }: SidebarProps) {
  const { workspaces } = useWorkspace()
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false)
  const [workspaceSearch, setWorkspaceSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close workspace dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setWorkspaceDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter workspaces based on search query
  const filteredWorkspaces = workspaces.filter(w =>
    w.name.toLowerCase().includes(workspaceSearch.toLowerCase())
  )

  const selectedWorkspaceNames = workspaces
    .filter(w => state.selectedWorkspaceIds.includes(w.id))
    .map(w => w.name)
    .join(', ')

  const workspaceCount = state.selectedWorkspaceIds.length

  const activeAccounts = state.socialAccounts.filter(a => a.isActive)

  const toggleWorkspace = (wsId: string) => {
    const isSelected = state.selectedWorkspaceIds.includes(wsId)
    let nextIds: string[]
    if (isSelected) {
      nextIds = state.selectedWorkspaceIds.filter(id => id !== wsId)
      // Deselect accounts belonging to this workspace
      const accountsToDeselect = state.socialAccounts
        .filter(a => {
          const ws = workspaces.find(w => w.zernioProfileId === a.zernioProfileId || w.id === a.zernioProfileId)
          return ws?.id === wsId
        })
        .map(a => a.id)
      actions.setSelectedSocialAccountIds(prev => prev.filter(id => !accountsToDeselect.includes(id)))
    } else {
      nextIds = [...state.selectedWorkspaceIds, wsId]
    }
    actions.setSelectedWorkspaceIds(nextIds)
  }

  const handleSelectAllWorkspaces = () => {
    actions.setSelectedWorkspaceIds(workspaces.map(w => w.id))
  }

  const handleClearAllWorkspaces = () => {
    actions.setSelectedWorkspaceIds([])
    actions.setSelectedSocialAccountIds([])
  }

  return (
    <div className={styles.sidebar}>
      {/* Workspaces Section */}
      <div className={styles.inputGroup} ref={dropdownRef}>
        <label className={styles.fieldLabel}>workspaces</label>
        <p className={styles.fieldDescription}>
          Select one or more workspaces to post to their connected accounts
        </p>

        <div className={styles.profileSelectWrapper}>
          <button
            type="button"
            className={styles.workspaceDropdownToggle}
            onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
          >
            {workspaceCount === 1 ? (
              <>
                <span
                  className={styles.profileYellowDot}
                  style={{ background: workspaces.find(w => w.id === state.selectedWorkspaceIds[0])?.color || '#fdba74' }}
                />
                <span className={styles.workspaceDropdownLabel}>
                  {selectedWorkspaceNames}
                </span>
              </>
            ) : workspaceCount > 1 ? (
              <>
                <div className={styles.profileYellowDotsRow}>
                  {state.selectedWorkspaceIds.map(id => {
                    const ws = workspaces.find(w => w.id === id)
                    return (
                      <span
                        key={id}
                        className={styles.profileYellowDot}
                        style={{ background: ws?.color || '#fdba74' }}
                      />
                    )
                  })}
                </div>
                <span className={styles.workspaceDropdownLabel}>
                  {workspaceCount} workspaces selected
                </span>
                <span className={styles.workspaceCountBadge}>
                  {workspaceCount}
                </span>
              </>
            ) : (
              <>
                <span className={styles.profileYellowDot} style={{ opacity: 0.5 }} />
                <span className={styles.workspaceDropdownLabel} style={{ opacity: 0.5 }}>
                  Select workspaces...
                </span>
              </>
            )}
            <ChevronDown size={16} className={styles.dropdownIcon} />
          </button>

          {workspaceDropdownOpen && (
            <div className={styles.workspaceDropdownPopover}>
              <div className={styles.dropdownSearchContainer}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search workspaces..."
                  value={workspaceSearch}
                  onChange={e => setWorkspaceSearch(e.target.value)}
                  className={styles.dropdownSearchInput}
                  autoFocus
                />
              </div>

              <div className={styles.dropdownActionsRow}>
                <button
                  type="button"
                  onClick={handleSelectAllWorkspaces}
                  className={styles.dropdownActionLink}
                >
                  Select All ({workspaces.length})
                </button>
                <span className={styles.dividerDot}>•</span>
                <button
                  type="button"
                  onClick={handleClearAllWorkspaces}
                  className={styles.dropdownActionLink}
                >
                  Clear
                </button>
                <span className={styles.selectionCount}>
                  {workspaceCount}/{workspaces.length}
                </span>
              </div>

              <div className={styles.workspaceCheckboxList}>
                {filteredWorkspaces.map(ws => {
                  const isChecked = state.selectedWorkspaceIds.includes(ws.id)
                  return (
                    <label key={ws.id} className={styles.workspaceCheckboxLabel}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleWorkspace(ws.id)}
                        className={styles.workspaceCheckboxInput}
                      />
                      <span
                        className={styles.profileYellowDot}
                        style={{ background: ws.color || '#fdba74', marginRight: '8px', marginLeft: '2px', flexShrink: 0 }}
                      />
                      <div className={styles.workspaceMeta}>
                        <div className={styles.workspaceName}>{ws.name}</div>
                        <div className={styles.workspaceId}>{ws.id}</div>
                      </div>
                    </label>
                  )
                })}
                {filteredWorkspaces.length === 0 && (
                  <div className={styles.dropdownEmptyText}>No workspaces found</div>
                )}
              </div>

              {selectedWorkspaceNames && (
                <div className={styles.dropdownSelectedBar}>
                  Selected: {selectedWorkspaceNames}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Platforms Section */}
      <div className={styles.inputGroup}>
        <div className={styles.platformsHeader}>
          <label className={styles.fieldLabel}>
            platforms (from {workspaceCount} workspace{workspaceCount === 1 ? '' : 's'})
          </label>
          <button
            type="button"
            className={styles.saveAsGroupLink}
            onClick={() => actions.setIsCreatingGroup(true)}
            disabled={state.selectedSocialAccountIds.length === 0}
          >
            save as group
          </button>
        </div>

        {/* Group Creation Inline UI */}
        {state.isCreatingGroup && (
          <div className={styles.createGroupRow}>
            <span className={styles.groupLabel}>groups</span>
            <input
              type="text"
              placeholder="group name"
              value={state.newGroupName}
              onChange={e => actions.setNewGroupName(e.target.value)}
              className={styles.groupNameInput}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  actions.savePlatformGroup(state.newGroupName)
                } else if (e.key === 'Escape') {
                  actions.setIsCreatingGroup(false)
                }
              }}
            />
            <button
              type="button"
              className={styles.groupActionBtn}
              onClick={() => actions.savePlatformGroup(state.newGroupName)}
            >
              ✓
            </button>
            <button
              type="button"
              className={styles.groupActionBtn}
              onClick={() => actions.setIsCreatingGroup(false)}
            >
              ✕
            </button>
          </div>
        )}

        {/* Group Tags List */}
        {state.platformGroups.length > 0 && (
          <div className={styles.groupTagsContainer}>
            {state.platformGroups.map(g => (
              <div key={g.name} className={styles.groupTag}>
                <button
                  type="button"
                  className={styles.groupTagSelectBtn}
                  onClick={() => actions.selectPlatformGroup(g)}
                >
                  {g.name} ({g.accountIds.length})
                </button>
                <button
                  type="button"
                  className={styles.groupTagDeleteBtn}
                  onClick={() => actions.deletePlatformGroup(g.name)}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.platformGrid}>
          {activeAccounts.map(account => {
            const isChecked = state.selectedSocialAccountIds.includes(account.id)
            const validationError = getPlatformValidationError(account.platform as Platform, state.media)
            const hasError = isChecked && !!validationError
            const brandColor = getPlatformBrandColor(account.platform)

            return (
              <button
                key={account.id}
                type="button"
                title={validationError || undefined}
                className={`${styles.platformButtonCard} ${isChecked ? styles.platformButtonCardActive : ''} ${hasError ? styles.platformButtonCardError : ''}`}
                onClick={() => actions.setSelectedSocialAccountIds(
                  isChecked
                    ? state.selectedSocialAccountIds.filter(id => id !== account.id)
                    : [...state.selectedSocialAccountIds, account.id]
                )}
              >
                <div className={styles.platformCardAvatar}>
                  {getSocialAvatarUrl(account) ? (
                    <img
                      src={getSocialAvatarUrl(account)}
                      alt={`${account.displayName} profile`}
                      className={styles.platformAvatarImg}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className={styles.platformAvatarFallback}
                      style={{ backgroundColor: brandColor }}
                    >
                      <ExtendedPlatformIcon platform={account.platform} size={17} />
                    </div>
                  )}
                  <div
                    className={styles.platformAvatarBadge}
                    style={{ backgroundColor: brandColor }}
                  >
                    <ExtendedPlatformIcon platform={account.platform} size={17} />
                  </div>
                </div>

                <div className={styles.platformCardBody}>
                  <div className={styles.platformCardName}>
                    {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}
                  </div>
                  <div className={styles.platformCardUsername}>
                    @{account.displayName}
                  </div>
                </div>

                {hasError ? (
                  <div className={styles.errorBadge} title={validationError!}>
                    !
                  </div>
                ) : isChecked ? (
                  <div className={styles.checkedBadge}>
                    <Check size={10} strokeWidth={3} />
                  </div>
                ) : null}
              </button>
            )
          })}
          {activeAccounts.length === 0 && (
            <p className={styles.emptyStateText}>No active platform accounts connected to selected workspaces.</p>
          )}
        </div>
      </div>

      {/* Publishing Section */}
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
                if (tab === 'schedule' || tab === 'draft') {
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

        {/* main schedule input details */}
        {(state.publishingTab === 'schedule' || state.publishingTab === 'draft') && (
          <>
            {state.publishingTab === 'draft' && (
              <div className={styles.draftNoticeCallout}>
                Post will be saved as a draft and can be scheduled or published later
              </div>
            )}
            <div className={styles.scheduleTimeSection}>
              <div className={styles.scheduleInputsRow}>
                <div className={styles.scheduleField}>
                  <label className={styles.fieldSubLabel}>date & time</label>
                  <SchedulePicker
                    value={state.scheduleTime}
                    onChange={actions.setScheduleTime}
                  />
                </div>
                <div className={styles.scheduleField}>
                  <label className={styles.fieldSubLabel}>timezone</label>
                  <select
                    className={styles.timezoneSelect}
                    value={state.timezone}
                    onChange={e => actions.setTimezone(e.target.value)}
                  >
                    <option value="Bangkok">Asia/Bangkok (GMT+7) (current)</option>
                    <option value="UTC">UTC (GMT+0)</option>
                    <option value="New_York">America/New_York (GMT-5)</option>
                    <option value="London">Europe/London (GMT+0)</option>
                    <option value="Tokyo">Asia/Tokyo (GMT+9)</option>
                  </select>
                </div>
              </div>

              {/* Overrides section */}
              {state.selectedSocialAccountIds.length > 1 && (
                <div className={styles.overridesSection}>
                  <div className={styles.overridesHeader}>
                    Override schedule time for specific platforms (leave empty to use main time above):
                  </div>
                  <div className={styles.overridesList}>
                    {state.selectedSocialAccountIds.map(id => {
                      const acc = state.socialAccounts.find(a => a.id === id)
                      if (!acc) return null
                      const val = state.platformTimeOverrides[id] || ''

                      return (
                        <div key={id} className={styles.overrideRow}>
                          <div className={styles.overrideAccountInfo}>
                            <ExtendedPlatformIcon platform={acc.platform} size={13} />
                            <span className={styles.overrideDisplayName}>
                              @{acc.displayName}
                            </span>
                          </div>
                          <SchedulePicker
                            value={val}
                            onChange={v => {
                              actions.setPlatformTimeOverrides(prev => ({
                                ...prev,
                                [id]: v
                              }))
                            }}
                            align="end"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {state.publishingTab === 'now' && (
          <div className={styles.publishingNoticeCallout}>
            Post will be published immediately to all selected platforms
          </div>
        )}

        {state.publishingTab === 'queue' && (
          <div className={styles.publishingNoticeCallout} style={{ color: 'var(--clr-body-mid)' }}>
            Queue scheduling features are currently being implemented and will be available in a future update.
          </div>
        )}
      </div>
    </div>
  )
}