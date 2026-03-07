import { Sparkles, Zap, Layers } from 'lucide-react'
import styles from './RepurposePage.module.css'
import InputSection from '../../components/repurpose/InputSection'
import ConfigBar from '../../components/repurpose/ConfigBar'
import ResultsGrid from '../../components/repurpose/ResultsGrid'
import { useRepurpose } from '../../context/repurposeContextBase'

export default function RepurposePage() {
  const { results, isGenerating } = useRepurpose()
  const hasOutput = results.length > 0 || isGenerating

  return (
    <div className={styles.page}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.aiPill}>
            <Sparkles size={11} />
            <span>AI-Powered Engine</span>
          </div>
          <h1 className={styles.title}>Repurpose Engine</h1>
          <p className={styles.subtitle}>
            Biến một nội dung dài thành hàng chục bài đăng đa nền tảng — tối ưu giọng điệu, tối ưu từng kênh.
          </p>
        </div>
        <div className={styles.headerMeta}>
          <div className={styles.metaChip}>
            <Layers size={13} />
            <span>4 Platforms</span>
          </div>
          <div className={styles.metaChip}>
            <Zap size={13} />
            <span>6 Content Types</span>
          </div>
          <div className={styles.metaChip}>
            <Sparkles size={13} />
            <span>AI-Optimized</span>
          </div>
        </div>
      </div>

      <div className={styles.inputArea}>
        <InputSection />
        <ConfigBar />
      </div>

      {hasOutput ? (
        <ResultsGrid />
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyGlow} />
          <Sparkles size={36} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Kết quả của bạn sẽ xuất hiện ở đây</p>
          <p className={styles.emptyDesc}>
            Dán nội dung, chọn nền tảng mục tiêu và nhấn <strong>Start Engine</strong> để AI phân tích &amp; tạo nội dung.
          </p>
          <div className={styles.formatHints}>
            <span>Blog post</span>
            <span>YouTube Script</span>
            <span>Newsletter</span>
            <span>Podcast Notes</span>
            <span>Article</span>
          </div>
        </div>
      )}
    </div>
  )
}
