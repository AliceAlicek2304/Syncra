import { useState } from 'react'
import { Settings, Instagram, Linkedin, Twitter, Sparkles, Save, ShieldCheck } from 'lucide-react'
import RadarChart from '../../components/RadarChart'
import BillingSection from '../../components/billing/BillingSection'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const [brandTone, setBrandTone] = useState({
    professional: 0.8,
    friendly: 0.6,
    technical: 0.4,
    simple: 0.7,
    creative: 0.9,
    minimalist: 0.5
  })

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

          {/* Social Accounts */}
          <section className={`glass-card ${styles.section}`}>
            <h2 className={styles.sectionTitle}><ShieldCheck size={18} /> Linked Accounts</h2>
            <p className={styles.sectionDesc}>Kết nối và quản lý các nền tảng mạng xã hội của bạn.</p>
            
            <div className={styles.socialGrid}>
              {[
                { name: 'LinkedIn', icon: <Linkedin size={20} />, color: '#0077b5', status: 'Connected' },
                { name: 'X / Twitter', icon: <Twitter size={20} />, color: '#fff', status: 'Connected' },
                { name: 'Instagram', icon: <Instagram size={20} />, color: '#e4405f', status: 'Disconnected' },
              ].map(item => (
                <div key={item.name} className={styles.socialCard}>
                  <div className={styles.socialIcon} style={{ background: item.color + '20', color: item.color }}>
                    {item.icon}
                  </div>
                  <div className={styles.socialMeta}>
                    <span className={styles.socialName}>{item.name}</span>
                    <span className={`${styles.socialStatus} ${item.status === 'Connected' ? styles.statusActive : ''}`}>
                      {item.status}
                    </span>
                  </div>
                  <button className={styles.socialAction}>
                    {item.status === 'Connected' ? 'Manage' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Billing Section */}
          <BillingSection />
        </div>
      </div>
    </div>
  )
}
