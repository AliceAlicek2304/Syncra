import { useRepurpose } from '../../context/repurposeContextBase'
import AtomCard from './AtomCard.tsx'
import styles from './RepurposeComponents.module.css'

export default function ResultsGrid() {
    const { results, isGenerating } = useRepurpose()

    if (isGenerating) {
        return (
            <div className={styles.resultsGrid}>
                <div className={styles.atomCard} style={{ opacity: 0.5 }}>Đang phân tích và tái tạo nội dung...</div>
                <div className={styles.atomCard} style={{ opacity: 0.3 }}>Đang phân tích và tái tạo nội dung...</div>
                <div className={styles.atomCard} style={{ opacity: 0.1 }}>Đang phân tích và tái tạo nội dung...</div>
            </div>
        )
    }

    if (results.length === 0) return null

    return (
        <div className={styles.resultsGrid}>
            {results.map(atom => (  
                <AtomCard key={atom.id} atom={atom} />
            ))}
        </div>
    )
}
