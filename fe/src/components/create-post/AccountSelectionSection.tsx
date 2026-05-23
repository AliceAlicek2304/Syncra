import { Link } from 'react-router-dom'
import type { SocialAccountDto } from '../../api/socialAccounts'
import { ExtendedPlatformIcon } from './platformIcons'
import styles from './AccountSelectionSection.module.css'

interface AccountSelectionSectionProps {
  accounts: SocialAccountDto[]
  selectedAccountIds: string[]
  onChange: (ids: string[]) => void
}

export function AccountSelectionSection({
  accounts,
  selectedAccountIds,
  onChange,
}: AccountSelectionSectionProps) {
  const activeAccounts = accounts.filter((a) => a.isActive)

  const handleToggle = (id: string) => {
    if (selectedAccountIds.includes(id)) {
      onChange(selectedAccountIds.filter((selectedId) => selectedId !== id))
    } else {
      onChange([...selectedAccountIds, id])
    }
  }

  if (activeAccounts.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyText}>
          No social accounts connected. Connect accounts in Settings to schedule to multiple platforms.
        </p>
        <Link to="/app/settings/social-accounts" className={styles.settingsLink}>
          Go to Social Accounts
        </Link>
      </div>
    )
  }

  // Group accounts by platform
  const grouped: Record<string, SocialAccountDto[]> = {}
  activeAccounts.forEach((account) => {
    const platform = account.platform
    if (!grouped[platform]) {
      grouped[platform] = []
    }
    grouped[platform].push(account)
  })

  const uniquePlatforms = Object.keys(grouped)
  const showGroupHeaders = uniquePlatforms.length >= 2

  return (
    <div className={styles.container}>
      <div className={styles.sectionLabel}>Post to</div>
      <div className={styles.groupsContainer}>
        {uniquePlatforms.map((platform) => {
          const platformAccounts = grouped[platform]
          return (
            <div key={platform} className={styles.platformGroup}>
              {showGroupHeaders && (
                <div className={styles.groupHeader}>{platform.toUpperCase()}</div>
              )}
              <div className={styles.chipsRow}>
                {platformAccounts.map((account) => {
                  const isChecked = selectedAccountIds.includes(account.id)
                  return (
                    <label
                      key={account.id}
                      className={`${styles.chip} ${isChecked ? styles.chipActive : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggle(account.id)}
                        className={styles.checkboxInput}
                      />
                      <ExtendedPlatformIcon platform={account.platform} size={16} />
                      <span className={styles.displayName}>{account.displayName}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
