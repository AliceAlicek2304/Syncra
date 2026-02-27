import styles from './RepurposePage.module.css'
import InputSection from '../../components/repurpose/InputSection'
import ConfigBar from '../../components/repurpose/ConfigBar'
import ResultsGrid from '../../components/repurpose/ResultsGrid'

export default function RepurposePage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Repurpose Engine</h1>
          <p className={styles.subtitle}>Biến một nội dung dài thành nhiều bài đăng đa nền tảng trong tích tắc</p>
        </div>
      </div>

      <div className={styles.body}>
        <InputSection />
        <ConfigBar />
        <ResultsGrid />
      </div>
    </div>
  )
}
