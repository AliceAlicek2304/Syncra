import { useState, useEffect } from 'react'
import { Settings, Sparkles, Save, ShieldCheck, Twitter, Facebook, Youtube, Music2, RefreshCw } from 'lucide-react'
import RadarChart from '../../components/RadarChart'
import DisconnectConfirm from '../../components/DisconnectConfirm'
import { useIntegrations } from '../../hooks/useIntegrations'
import { useToast } from '../../context/ToastContext'
import styles from './SettingsPage.module.css'

const PLATFORMS = [
  { id: 'x', name: 'X / Twitter', icon: Twitter, color: '#ffffff', bg: 'rgba(255,255,255,0.08)' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877f2', bg: 'rgba(24,119,242,0.12)' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#ff0000', bg: 'rgba(255,0,0,0.12)' },
  { id: 'tiktok', name: 'TikTok', icon: Music2, color: '#00f2ea', bg: 'rgba(0,242,234,0.12)' },
] as const

export default function SettingsPage() {
  const [brandTone, setBrandTone] = useState({
    professional: 0.8,
    friendly: 0.6,
    technical: 0.4,
    simple: 0.7,
    creative: 0.9,
    minimalist: 0.5
  })
  const [disconnectTarget, setDisconnectTarget] = useState<{ id: string; name: string } | null>(null)

  const { addToast } = useToast()
  const {
    isConnecting,
    isDisconnecting,
    error,
    connect,
    disconnect,
    getIntegration,
    getIntegrationStatus,
  } = useIntegrations()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    if (connected) {
      const platform = PLATFORMS.find(p => p.id === connected)
      addToast({
        message: `${platform?.name ?? connected} connected successfully!`,
        type: 'success',
      })
      window.history.replaceState({}, '', '/Syncra/app/settings')
    }
    const integrationError = params.get('integration_error')
    if (integrationError) {
      addToast({ message: `Failed to connect: ${integrationError}`, type: 'error' })
      window.history.replaceState({}, '', '/Syncra/app/settings')
    }
  }, [addToast])

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
    try {
      await connect(providerId)
    } catch {
      addToast({ message: 'Failed to connect. Please try again.', type: 'error' })
    }
  }

  const handleDisconnectConfirm = async () => {
    if (!disconnectTarget) return
    try {
      await disconnect(disconnectTarget.id)
      addToast({
        message: `${disconnectTarget.name} disconnected successfully.`,
        type: 'success',
      })
    } catch {
      addToast({ message: 'Failed to disconnect. Please try again.', type: 'error' })
    } finally {
      setDisconnectTarget(null)
    }
  }

  const getHealthLabel = (status: string) => {
    switch (status) {
      case 'Healthy': return 'Healthy'
      case 'NeedsRefresh': return 'Needs refresh'
      case 'Failed': return 'Error'
      default: return null
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerIcon}><Settings size={22} /></div>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Thiet lap danh tinh thuong hieu va ket noi nen tang</p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainCol}>
          {/* Brand Voice Section */}
          <section className={`glass-card ${styles.section}`}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionInfo}>
                <h2 className={styles.sectionTitle}><Sparkles size={18} /> Brand Voice Radar</h2>
                <p className={styles.sectionDesc}>Phac hoa tinh cach thuong hieu cua ban de AI toi uu hoa noi dung.</p>
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
                <p className={styles.sectionDesc}>Ket noi va quan ly cac nen tang mang xa hoi cua ban.</p>
              </div>
            </div>

            {error && (
              <div className={styles.errorBanner}>
                {error}
              </div>
            )}

            <div className={styles.socialGrid}>
              {PLATFORMS.map(platform => {
                const integration = getIntegration(platform.id)
                const status = getIntegrationStatus(platform.id)
                const isActive = status === 'connected'
                const isExpired = status === 'expired'
                const isPending = isConnecting === platform.id || isDisconnecting === platform.id
                const healthStatus = integration?.tokenRefreshHealthStatus
                const username = integration?.metadata?.['username'] ?? integration?.metadata?.['name']

                return (
                  <div key={platform.id} className={styles.socialCard}>
                    <div
                      className={styles.socialIcon}
                      style={{ background: platform.bg, color: platform.color }}
                    >
                      <platform.icon size={20} />
                    </div>

                    <div className={styles.socialMeta}>
                      <span className={styles.socialName}>{platform.name}</span>
                      <span className={styles.socialStatus}>
                        {isActive && (
                          <>
                            <span className={styles.statusDot} data-status="connected" />
                            {username
                              ? `@${username}`
                              : isExpired
                              ? 'Connection expired'
                              : 'Connected'}
                          </>
                        )}
                        {isExpired && !isActive && (
                          <>
                            <span className={styles.statusDot} data-status="expired" />
                            Connection expired
                          </>
                        )}
                        {!isActive && !isExpired && (
                          <>
                            <span className={styles.statusDot} data-status="disconnected" />
                            Not connected
                          </>
                        )}
                      </span>
                      {isActive && healthStatus && (
                        <span className={`${styles.healthBadge}`} data-health={healthStatus}>
                          <RefreshCw size={10} />
                          {getHealthLabel(healthStatus)}
                        </span>
                      )}
                    </div>

                    <button
                      className={`${styles.socialAction} ${isActive ? styles.actionDisconnect : styles.actionConnect}`}
                      onClick={() =>
                        isActive
                          ? setDisconnectTarget({ id: platform.id, name: platform.name })
                          : handleConnect(platform.id)
                      }
                      disabled={isPending}
                      aria-label={isActive ? `Disconnect ${platform.name}` : `Connect ${platform.name}`}
                    >
                      {isPending ? (
                        <span className={styles.spinner} />
                      ) : isActive ? (
                        isExpired ? 'Reconnect' : 'Disconnect'
                      ) : (
                        'Connect'
                      )}
                    </button>
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
    </div>
  )
}
