import { useRepurpose } from '../../context/repurposeContextBase'
import type { RepurposePlatform } from '../../data/mockAI'
import styles from './RepurposeComponents.module.css'

const PLATFORMS: RepurposePlatform[] = ['LinkedIn', 'X', 'Instagram', 'Newsletter']
const TONES = [
    { id: 'default', label: 'Mặc định' },
    { id: 'professional', label: 'Chuyên nghiệp' },
    { id: 'casual', label: 'Gần gũi' },
]

export default function ConfigBar() {
    const { config, setConfig } = useRepurpose()

    const togglePlatform = (p: RepurposePlatform) => {
        setConfig(prev => {
            const active = prev.targetPlatforms.includes(p)
            const next = active
                ? prev.targetPlatforms.filter(t => t !== p)
                : [...prev.targetPlatforms, p]
            return { ...prev, targetPlatforms: next }
        })
    }

    return (
        <div className={styles.configBar}>
            <div className={styles.configGroup}>
                <span className={styles.configLabel}>Nền tảng:</span>
                <div className={styles.platformToggles}>
                    {PLATFORMS.map(p => (
                        <button
                            key={p}
                            className={`${styles.platformBtn} ${config.targetPlatforms.includes(p) ? styles.active : ''}`}
                            onClick={() => togglePlatform(p)}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.configGroup} style={{ marginLeft: 'auto' }}>
                <span className={styles.configLabel}>Giọng điệu:</span>
                <select
                    className={styles.selectInput}
                    value={config.tone}
                    onChange={(e) => setConfig(prev => ({ ...prev, tone: e.target.value }))}
                >
                    {TONES.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                </select>
            </div>

            <div className={styles.configGroup}>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={config.extractAtoms}
                        onChange={(e) => setConfig(prev => ({ ...prev, extractAtoms: e.target.checked }))}
                    />
                    Trích xuất Insights/Tips
                </label>
            </div>
        </div>
    )
}
