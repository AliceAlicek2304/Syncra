import { Sparkles, Loader2 } from 'lucide-react'
import { useRepurpose } from '../../context/repurposeContextBase'
import { mockGenerateRepurpose } from '../../data/mockAI'
import styles from './RepurposeComponents.module.css'

export default function InputSection() {
    const { config, setConfig, isGenerating, setIsGenerating, setResults, setError } = useRepurpose()

    const handleGenerate = async () => {
        if (!config.sourceText.trim()) return

        setIsGenerating(true)
        setError(null)

        try {
            const response = await mockGenerateRepurpose({
                sourceText: config.sourceText,
                platforms: config.targetPlatforms,
                tone: config.tone,
                extractAtoms: config.extractAtoms
            })
            setResults(response.atoms)
        } catch (err) {
            setError('An error occurred while generating content.')
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className={styles.section}>
            <div className={styles.textareaWrap}>
                <textarea
                    className={styles.textarea}
                    placeholder="Dán nội dung dài của bạn vào đây (blog post, script video, email...)"
                    value={config.sourceText}
                    onChange={(e) => setConfig(prev => ({ ...prev, sourceText: e.target.value }))}
                />
            </div>
            <div className={styles.actionRow}>
                <button
                    className={styles.generateBtn}
                    onClick={handleGenerate}
                    disabled={!config.sourceText.trim() || isGenerating || config.targetPlatforms.length === 0}
                >
                    {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    {isGenerating ? 'Đang phân tích...' : 'Start Repurpose Engine'}
                </button>
            </div>
        </div>
    )
}
