import { useState, useEffect } from 'react'
import { Settings, Sparkles, Save, ShieldCheck, Twitter, Facebook, Youtube, Music2, RefreshCw, Lock } from 'lucide-react'
import RadarChart from '../../components/RadarChart'
import DisconnectConfirm from '../../components/DisconnectConfirm'
import FacebookConnectModal from '../../components/FacebookConnectModal'
import { api } from '../../api/axios'
import { useIntegrations } from '../../hooks/useIntegrations'
import { useToast } from '../../context/ToastContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import styles from './SettingsPage.module.css'

const normalizeIntegrationError = (raw: string): string => {
  if (!raw) return 'Lỗi kết nối mạng xã hội không xác định.'

  if (raw.includes('Syncra.Domain.Models.Social.ProviderError')) {
    return 'Lỗi xác thực từ nhà cung cấp mạng xã hội. Vui lòng thử kết nối lại.'
  }

  return raw
}

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877f2', bg: 'rgba(24,119,242,0.12)' },
  { id: 'x', name: 'X / Twitter', icon: Twitter, color: '#ffffff', bg: 'rgba(255,255,255,0.08)', comingSoon: true },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#ff0000', bg: 'rgba(255,0,0,0.12)', comingSoon: true },
  { id: 'tiktok', name: 'TikTok', icon: Music2, color: '#00f2ea', bg: 'rgba(0,242,234,0.12)', comingSoon: true },
] satisfies Array<{
  id: string
  name: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  color: string
  bg: string
  comingSoon?: boolean
}>

type CurrentSubscriptionDto = {
  status: string
  planCode: string | null
  planName: string | null
  maxSocialAccounts: number | null
  isDefault: boolean
}

export default function SettingsPage() {
  const [brandTone, setBrandTone] = useState({
    professional: 0.8,
    friendly: 0.6,
    technical: 0.4,
    simple: 0.7,
    creative: 0.9,
    minimalist: 0.5
  })
  const [disconnectTarget, setDisconnectTarget] = useState<
    | { scope: 'provider'; providerId: string; name: string }
    | { scope: 'integration'; integrationId: string; providerId: string; name: string }
    | null
  >(null)
  const [showFacebookModal, setShowFacebookModal] = useState(false)
  const [subscription, setSubscription] = useState<CurrentSubscriptionDto | null>(null)

  const { addToast } = useToast()
  const { activeWorkspace } = useWorkspace()
  const {
    isConnecting,
    isDisconnecting,
    isUpdatingPage,
    error,
    connect,
    disconnect,
    disconnectById,
    setActivePage,
    getIntegrations,
    getPagesForIntegration,
    loadPagesForIntegration,
    isLoadingPages,
    getIntegration,
    getIntegrationStatus,
  } = useIntegrations()

  useEffect(() => {
    const activeFacebookConnections = getIntegrations('facebook').filter(i => i.isActive)
    activeFacebookConnections.forEach(conn => {
      void loadPagesForIntegration(conn.id)
    })
  }, [getIntegrations, loadPagesForIntegration])

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!activeWorkspace) {
        setSubscription(null)
        return
      }

      try {
        const res = await api.get<CurrentSubscriptionDto>(`/workspaces/${activeWorkspace.id}/subscription`)
        setSubscription(res.data)
      } catch {
        setSubscription(null)
      }
    }

    fetchSubscription()
  }, [activeWorkspace])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const integrationId = params.get('integrationId')
    if (connected) {
      const platform = PLATFORMS.find(p => p.id === connected)
      addToast({
        message: integrationId
          ? `Đã thêm kết nối ${platform?.name ?? connected} thành công!`
          : `Đã kết nối ${platform?.name ?? connected} thành công!`,
        type: 'success',
      })
      window.history.replaceState({}, '', '/Syncra/app/settings')
    }
    const integrationError = params.get('integration_error')
    if (integrationError) {
      addToast({ message: `Kết nối thất bại: ${normalizeIntegrationError(integrationError)}`, type: 'error' })
      window.history.replaceState({}, '', '/Syncra/app/settings')
    }
  }, [addToast])

  const maxSocialAccounts = subscription?.maxSocialAccounts ?? 1
  const planName = subscription?.planName ?? 'Free'

  const radarData = [
    { label: 'Professional', value: brandTone.professional },
    { label: 'Friendly', value: brandTone.friendly },
    { label: 'Technical', value: brandTone.technical },
    { label: 'Simple', value: brandTone.simple },
    { label: 'Creative', value: brandTone.creative },
    { label: 'Minimal', value: brandTone.minimalist }
  ]

  const handleSliderChange = (key: keyof typeof brandTone, val: string) => {
    setBrandTone(prev => ({ ...prev, [key]: parseFloat(val) }))
  }

  const handleConnect = async (providerId: string) => {
    if (providerId === 'facebook') {
      setShowFacebookModal(true)
      return
    }
    addToast({ message: `Tích hợp ${providerId} sẽ sớm ra mắt!`, type: 'info' })
  }

  const handleFacebookConfirm = async () => {
    try {
      const result = await connect('facebook')
      if (result?.data.url) {
        window.location.href = result.data.url
      }
    } catch {
      addToast({ message: 'Kết nối thất bại. Vui lòng thử lại.', type: 'error' })
    } finally {
      setShowFacebookModal(false)
    }
  }

  const handleDisconnectConfirm = async () => {
    if (!disconnectTarget) return
    try {
      if (disconnectTarget.scope === 'provider') {
        await disconnect(disconnectTarget.providerId)
      } else {
        await disconnectById(disconnectTarget.integrationId)
      }
      addToast({
        message: `Đã ngắt kết nối ${disconnectTarget.name} thành công.`,
        type: 'success',
      })
    } catch {
      addToast({ message: 'Ngắt kết nối thất bại. Vui lòng thử lại.', type: 'error' })
    } finally {
      setDisconnectTarget(null)
    }
  }

  const getHealthLabel = (status: string) => {
    switch (status) {
      case 'Healthy': return 'Ổn định'
      case 'NeedsRefresh': return 'Cần làm mới'
      case 'Failed': return 'Lỗi'
      default: return null
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerIcon}><Settings size={22} /></div>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Thiết lập danh tính thương hiệu và kết nối nền tảng</p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainCol}>
          {/* Brand Voice Section */}
          <section className={`glass-card ${styles.section}`}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionInfo}>
                <h2 className={styles.sectionTitle}><Sparkles size={18} /> Brand Voice Radar</h2>
                <p className={styles.sectionDesc}>Phác họa tính cách thương hiệu của bạn để AI tối ưu hóa nội dung.</p>
              </div>
              <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                <Save size={14} /> Save Changes
              </button>
            </div>

            <div className={styles.radarLayout}>
              <div className={styles.radarWrap}>
                <RadarChart data={radarData} size={320} />
              </div>

              <div className={styles.controls}>
                {Object.entries(brandTone).map(([key, value]) => (
                  <div key={key} className={styles.sliderField}>
                    <div className={styles.sliderLabel}>
                      <span className={styles.capitalize}>{key}</span>
                      <span className={styles.sliderValue}>{Math.round(value * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={value}
                      onChange={(e) => handleSliderChange(key as keyof typeof brandTone, e.target.value)}
                      className={styles.slider}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Linked Accounts */}
          <section className={`glass-card ${styles.section}`}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionInfo}>
                <h2 className={styles.sectionTitle}><ShieldCheck size={18} /> Linked Accounts</h2>
                <p className={styles.sectionDesc}>Kết nối và quản lý các nền tảng mạng xã hội của bạn.</p>
                <div className={styles.planPill}>
                  Gói hiện tại: {planName} - Tối đa {maxSocialAccounts} tài khoản mạng xã hội
                </div>
              </div>
            </div>

            {error && (
              <div className={styles.errorBanner}>
                {error}
              </div>
            )}

            <div className={styles.socialGrid}>
              {PLATFORMS.map(platform => {
                const providerIntegrations = getIntegrations(platform.id)
                const activeIntegrations = providerIntegrations.filter(i => i.isActive)
                const integration = getIntegration(platform.id)
                const status = getIntegrationStatus(platform.id)
                const isActive = status === 'connected'
                const isExpired = status === 'expired'
                const isPending = isConnecting === platform.id || isDisconnecting === `provider:${platform.id}`
                const healthStatus = integration?.tokenRefreshHealthStatus
                const username = integration?.metadata?.['username'] ?? integration?.metadata?.['name']
                const isComingSoon = platform.comingSoon ?? false
                const isFacebook = platform.id === 'facebook'
                const facebookLimitReached = isFacebook && activeIntegrations.length >= maxSocialAccounts
                const canAddFacebookAccount = isFacebook && !isComingSoon && !facebookLimitReached

                return (
                  <div key={platform.id} className={styles.socialCard}>
                    <div
                      className={styles.socialIcon}
                      style={{ background: platform.bg, color: platform.color }}
                    >
                      <platform.icon size={20} />
                    </div>

                    <div className={styles.socialMeta}>
                      <span className={styles.socialName}>
                        {platform.name}
                        {isComingSoon && (
                          <span className={styles.comingSoonBadge}>
                            <Lock size={10} />
                            Coming Soon
                          </span>
                        )}
                      </span>
                      {!isComingSoon && (
                        <span className={styles.socialStatus}>
                          {isFacebook && (
                            <>
                              <span className={styles.statusDot} data-status={activeIntegrations.length > 0 ? 'connected' : 'disconnected'} />
                              {activeIntegrations.length}/{maxSocialAccounts} tài khoản Facebook
                            </>
                          )}
                          {!isFacebook && isActive && (
                            <>
                              <span className={styles.statusDot} data-status="connected" />
                              {providerIntegrations.length > 1
                                ? `${providerIntegrations.length} kết nối`
                                : username
                                ? `@${username}`
                                : isExpired
                                ? 'Kết nối đã hết hạn'
                                : 'Đã kết nối'}
                            </>
                          )}
                          {isExpired && !isActive && (
                            <>
                              <span className={styles.statusDot} data-status="expired" />
                              Kết nối đã hết hạn
                            </>
                          )}
                          {!isActive && !isExpired && (
                            <>
                              <span className={styles.statusDot} data-status="disconnected" />
                              Chưa kết nối
                            </>
                          )}
                        </span>
                      )}
                      {isActive && healthStatus && (
                        <span className={`${styles.healthBadge}`} data-health={healthStatus}>
                          <RefreshCw size={10} />
                          {getHealthLabel(healthStatus)}
                        </span>
                      )}
                    </div>

                    <button
                      className={`${styles.socialAction} ${(isFacebook || !isActive) ? styles.actionConnect : styles.actionDisconnect}`}
                      onClick={() =>
                        isFacebook
                          ? handleConnect(platform.id)
                          : isActive
                          ? setDisconnectTarget({ scope: 'provider', providerId: platform.id, name: `${platform.name} (all connections)` })
                          : handleConnect(platform.id)
                      }
                      disabled={isPending || isComingSoon || (isFacebook && !canAddFacebookAccount)}
                      aria-label={isActive ? `Disconnect ${platform.name}` : `Connect ${platform.name}`}
                    >
                      {isPending ? (
                        <span className={styles.spinner} />
                      ) : isComingSoon ? (
                        'Sớm'
                      ) : isFacebook ? (
                        canAddFacebookAccount
                          ? activeIntegrations.length > 0
                            ? 'Thêm tài khoản'
                            : 'Kết nối'
                          : 'Đã đạt giới hạn'
                      ) : isActive ? (
                        isExpired ? 'Kết nối lại' : 'Ngắt kết nối'
                      ) : (
                        'Kết nối'
                      )}
                    </button>

                    {!isComingSoon && platform.id === 'facebook' && activeIntegrations.length > 0 && (
                      <div className={styles.connectionList}>
                        {activeIntegrations.map(conn => {
                          const accountName = conn.metadata?.['name']
                            ?? conn.metadata?.['username']
                            ?? conn.externalAccountId
                            ?? `Tài khoản Facebook ${conn.id.slice(0, 6)}`
                          const itemPending = isDisconnecting === `integration:${conn.id}`
                          const pages = getPagesForIntegration(conn.id)
                          const loadingPages = isLoadingPages[conn.id] === true

                          return (
                            <div key={conn.id} className={styles.connectionItem}>
                              <div className={styles.connectionMain}>
                                <div className={styles.connectionText}>
                                  <span className={styles.connectionTitle}>{accountName}</span>
                                  <span className={styles.connectionSub}>Mã kết nối: {conn.id.slice(0, 8)}</span>
                                </div>
                                {pages.length > 0 && (
                                  <div className={styles.pageList}>
                                    {pages.map(page => {
                                      const switching = isUpdatingPage === `${conn.id}:${page.pageId}`
                                      return (
                                        <button
                                          key={page.pageId}
                                          className={`${styles.pageChip} ${page.isActive ? styles.pageChipActive : ''}`}
                                          onClick={() => setActivePage(conn.id, page.pageId)}
                                          disabled={switching}
                                          title={page.category ?? undefined}
                                        >
                                          {switching ? 'Đang chuyển...' : page.pageName ?? page.pageId}
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                                {loadingPages && pages.length === 0 && (
                                  <span className={styles.connectionSub}>
                                    Đang tải danh sách trang Facebook...
                                  </span>
                                )}
                                {!loadingPages && pages.length === 0 && (
                                  <span className={styles.connectionSub}>
                                    Chưa đồng bộ danh sách trang. Hãy kết nối lại Facebook để tải Pages.
                                  </span>
                                )}
                              </div>
                              <button
                                className={`${styles.socialAction} ${styles.actionDisconnect} ${styles.connectionAction}`}
                                onClick={() => setDisconnectTarget({
                                  scope: 'integration',
                                  integrationId: conn.id,
                                  providerId: platform.id,
                                  name: `${platform.name} connection ${accountName}`
                                })}
                                disabled={itemPending}
                              >
                                {itemPending ? <span className={styles.spinner} /> : 'Ngắt kết nối'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      {disconnectTarget && (
        <DisconnectConfirm
          platformName={disconnectTarget.name}
          onConfirm={handleDisconnectConfirm}
          onCancel={() => setDisconnectTarget(null)}
          isLoading={isDisconnecting !== null}
        />
      )}

      <FacebookConnectModal
        isOpen={showFacebookModal}
        onClose={() => setShowFacebookModal(false)}
        onConfirm={handleFacebookConfirm}
        isLoading={isConnecting === 'facebook'}
      />
    </div>
  )
}
