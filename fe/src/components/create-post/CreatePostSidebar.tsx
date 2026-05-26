import { useState, useRef, useEffect } from 'react'
import { Search, AlertCircle, X, ChevronDown } from 'lucide-react'
import { ExtendedPlatformIcon } from './platformIcons'
import type { UseCreatePostStateReturn } from './useCreatePostState'
import { useWorkspace } from '../../context/WorkspaceContext'
import { getPlatformValidationError } from './useCreatePostState'
import type { Platform } from './types'
import styles from '../CreatePostModal.module.css'

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
            <span className={styles.profileYellowDot} />
            <span className={styles.workspaceDropdownLabel}>
              {selectedWorkspaceNames || 'Select workspaces...'}
            </span>
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

        <div className={styles.platformCardsGrid}>
          {activeAccounts.map(account => {
            const isChecked = state.selectedSocialAccountIds.includes(account.id)
            const validationError = getPlatformValidationError(account.platform as Platform, state.media)
            const hasError = isChecked && !!validationError

            return (
              <div
                key={account.id}
                title={validationError || undefined}
                className={`${styles.platformSelectCard} ${isChecked ? styles.platformSelectCardActive : ''} ${hasError ? styles.platformSelectCardError : ''}`}
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
                  {hasError ? (
                    <div className={styles.warningBadge} title={validationError!}>
                      <AlertCircle size={14} className={styles.warningBadgeIcon} />
                    </div>
                  ) : (
                    <span className={`${styles.customCheckbox} ${isChecked ? styles.customCheckboxChecked : ''}`} />
                  )}
                </div>
              </div>
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
          <div className={styles.scheduleTimeSection}>
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
            {state.selectedSocialAccountIds.length > 0 && (
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
                          <span className={styles.overridePlatformLogo}>
                            <ExtendedPlatformIcon platform={acc.platform} size={13} />
                          </span>
                          <span className={styles.overrideDisplayName}>
                            @{acc.displayName}
                          </span>
                        </div>
                        <input
                          type="datetime-local"
                          className={styles.overrideDatetimeInput}
                          value={val}
                          onChange={e => {
                            const val = e.target.value
                            actions.setPlatformTimeOverrides(prev => ({
                              ...prev,
                              [id]: val
                            }))
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
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