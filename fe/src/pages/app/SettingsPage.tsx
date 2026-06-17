import { useState, useEffect } from 'react'
import { Settings, Sparkles, Save, ShieldCheck, User as UserIcon, Building, Lock, Plus, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useUpdateProfile, useUpdateZernioProfile, useCreateZernioProfile, useDeleteZernioProfile } from '../../hooks/useSettings'
import Skeleton from '../../components/Skeleton'
import RadarChart from '../../components/RadarChart'
import BillingSection from '../../components/billing/BillingSection'
import LinkedAccountsSection from '../../components/auth/LinkedAccountsSection'
import ChangePasswordForm from '../../components/auth/ChangePasswordForm'
import styles from './SettingsPage.module.css'
import AccountSecuritySection from '../../components/auth/AccountSecuritySection'
import SocialAccounts from '../Settings/SocialAccounts'


const profileSchema = z.object({
  displayName: z.string().min(2, 'Name too short'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  timezone: z.string().optional(),
})

const workspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name too short').max(100, 'Workspace name too long'),
})


export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const { activeWorkspace, profiles, isLoading: workspaceLoading } = useWorkspace()
  const updateProfile = useUpdateProfile()
  const updateWorkspace = useUpdateZernioProfile()
  const createProfile = useCreateZernioProfile()
  const deleteProfile = useDeleteZernioProfile()
  const [newZernioProfileName, setNewZernioProfileName] = useState('')

  const isLoading = authLoading || workspaceLoading;

  const { register: registerProfile, handleSubmit: handleSubmitProfile } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      timezone: user?.timezone || 'UTC',
    }
  })

  const { register: registerWorkspace, handleSubmit: handleSubmitWorkspace } = useForm({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: activeWorkspace?.name || '',
    }
  })

  const onProfileSubmit = (data: { displayName?: string; firstName?: string; lastName?: string; timezone?: string }) => {
    updateProfile.mutate(data)
  }

  const onWorkspaceSubmit = (data: { name: string }) => {
    if (activeWorkspace) {
      updateWorkspace.mutate({ id: activeWorkspace.id, data: { ...data } })
    }
  }

  const [workspaceColor, setWorkspaceColor] = useState(activeWorkspace?.color || '#fda4af');

  useEffect(() => {
    setWorkspaceColor(activeWorkspace?.color || '#fda4af');
  }, [activeWorkspace?.color]);

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
          {/* Profile Settings */}
          <section className={`glass-card ${styles.section}`}>
            <h2 className={styles.sectionTitle}><UserIcon size={18} /> Profile Settings</h2>
            {isLoading ? (
              <div className={styles.form}><Skeleton height="200px" /></div>
            ) : (
              <form onSubmit={handleSubmitProfile(onProfileSubmit)} className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>Display Name</label>
                    <input {...registerProfile('displayName')} className={styles.input} />
                  </div>
                  <div className={styles.field}>
                    <label>First Name</label>
                    <input {...registerProfile('firstName')} data-testid="profile-firstname" className={styles.input} />
                  </div>
                  <div className={styles.field}>
                    <label>Last Name</label>
                    <input {...registerProfile('lastName')} data-testid="profile-lastname" className={styles.input} />
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }} type="submit" data-testid="settings-submit" className="btn-primary" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                </motion.button>
              </form>
            )}
          </section>

          {/* Zernio Profiles */}
          <section className={`glass-card ${styles.section}`}>
            <h2 className={styles.sectionTitle}><UserIcon size={18} /> Publishing Profiles</h2>
            <p className={styles.sectionDesc}>Manage your profiles. Each profile can connect to different social accounts.</p>
            {isLoading ? (
              <div className={styles.form}><Skeleton height="100px" /></div>
            ) : (
              <div className={styles.form}>
                <div className={styles.profileList}>
                  {profiles.map(p => (
                    <div key={p.id} className={styles.profileRow}>
                      <span>{p.name}</span>
                      <button
                        className="btn-danger-outline"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => {
                          if (confirm(`Delete profile "${p.name}"?`)) {
                            deleteProfile.mutate(p.id)
                          }
                        }}
                        disabled={profiles.length <= 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="New profile name"
                    value={newZernioProfileName}
                    onChange={(e) => setNewZernioProfileName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.1 }}
                    className="btn-primary"
                    onClick={() => {
                      if (!newZernioProfileName.trim()) return;
                      createProfile.mutate({ name: newZernioProfileName.trim() })
                      setNewZernioProfileName('')
                    }}
                    disabled={createProfile.isPending || !newZernioProfileName.trim()}
                  >
                    <Plus size={14} /> Add Profile
                  </motion.button>
                </div>
              </div>
            )}
          </section>

          {/* Workspace Settings */}
          <section className={`glass-card ${styles.section}`}>
            <h2 className={styles.sectionTitle}><Building size={18} /> Workspace Settings</h2>
            {isLoading ? (
              <div className={styles.form}><Skeleton height="100px" /></div>
            ) : (
              <form onSubmit={handleSubmitWorkspace(onWorkspaceSubmit)} className={styles.form}>
                <div className={styles.field}>
                  <label>Workspace Name</label>
                  <input {...registerWorkspace('name')} data-testid="workspace-name" className={styles.input} />
                </div>
                <div className={styles.field}>
                  <label>Workspace Color</label>
                  <div className={styles.colorPickerContainer}>
                    <div className={styles.colorBox} style={{ backgroundColor: workspaceColor }} />
                    <div className={styles.colorPalette}>
                      {['#fda4af', '#f0abfc', '#c084fc', '#818cf8', '#93c5fd', '#86efac', '#fde047', '#fdba74'].map(color => (
                        <button
                          key={color}
                          type="button"
                          className={`${styles.colorPaletteBtn} ${workspaceColor === color ? styles.colorPaletteBtnActive : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setWorkspaceColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }} type="submit" data-testid="settings-submit" className="btn-primary" disabled={updateWorkspace.isPending}>
                  {updateWorkspace.isPending ? 'Saving...' : 'Save Workspace'}
                </motion.button>
              </form>
            )}
          </section>

          {/* Authentication Settings */}
          <section className={`glass-card ${styles.section}`}>
            <h2 className={styles.sectionTitle}><ShieldCheck size={18} /> Authentication</h2>
            <p className={styles.sectionDesc}>Quản lý các phương thức đăng nhập của bạn.</p>
            <LinkedAccountsSection />
          </section>

          <section className={`glass-card ${styles.section}`}>
            <AccountSecuritySection />
          </section>

          {/* Security Section */}
          <section className={`glass-card ${styles.section}`}>
            <h2 className={styles.sectionTitle}><Lock size={18} /> Security</h2>
            <p className={styles.sectionDesc}>Manage your account security settings, including changing your password.</p>
            <ChangePasswordForm />
          </section>

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
            <h2 className={styles.sectionTitle}><ShieldCheck size={18} /> Social Accounts</h2>
            <p className={styles.sectionDesc}>Connect and manage your social media platforms.</p>
            <SocialAccounts />
          </section>

          {/* Billing Section */}
          <BillingSection />
        </div>
      </div>
    </div>
  )
}
