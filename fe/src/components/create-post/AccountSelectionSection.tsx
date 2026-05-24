import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
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

  const getPlatformLabel = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'tiktok': return 'TikTok Profile'
      case 'facebook': return 'Facebook Page'
      case 'instagram': return 'Instagram Business'
      case 'twitter': return 'X Account'
      case 'linkedin': return 'LinkedIn Profile'
      case 'youtube': return 'YouTube Channel'
      case 'pinterest': return 'Pinterest Board'
      default: return `${platform} Account`
    }
  }

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
              <div className={styles.accountsGrid}>
                {platformAccounts.map((account) => {
                  const isChecked = selectedAccountIds.includes(account.id)
                  const initials = (account.displayName || 'U').charAt(0).toUpperCase()
                  
                  return (
                    <label
                      key={account.id}
                      className={`${styles.accountCard} ${isChecked ? styles.accountCardActive : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggle(account.id)}
                        className={styles.checkboxInput}
                      />
                      
                      <div className={styles.avatarContainer}>
                        {account.avatarUrl ? (
                          <img src={account.avatarUrl} alt={account.displayName} className={styles.avatar} />
                        ) : (
                          <div className={styles.avatarFallback}>{initials}</div>
                        )}
                        <div className={`${styles.platformBadge} ${styles[`badge_${account.platform}`] || styles.badge_default}`}>
                          <ExtendedPlatformIcon platform={account.platform} size={8} />
                        </div>
                      </div>

                      <div className={styles.accountInfo}>
                        <span className={styles.accountName}>{account.displayName}</span>
                        <span className={styles.platformName}>{getPlatformLabel(account.platform)}</span>
                      </div>

                      {isChecked && (
                        <div className={styles.checkmark}>
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
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
