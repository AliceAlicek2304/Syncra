import type { RepurposeAtom } from '../../data/mockAI'
import styles from './RepurposeComponents.module.css'

interface Props {
    atom: RepurposeAtom
}

export default function AtomCard({ atom }: Props) {

    const handleEditClick = () => {
        // MVP: Prompt standard alert. We will wire up actual CreatePostModal integration later.
        alert(`Opening modal to editing:\n\nPlatform: ${atom.platform}\nType: ${atom.type}\nContent: ${atom.content.slice(0, 30)}...`)
    }

    return (
        <div className={styles.atomCard} onClick={handleEditClick}>
            <div className={styles.cardHeader}>
                <div className={styles.badgeGroup}>
                    <span className={`${styles.badge} ${styles.badgePlatform}`}>{atom.platform}</span>
                    <span className={`${styles.badge} ${styles.badgeType}`}>{atom.type}</span>
                </div>
            </div>

            {atom.title && <h3 className={styles.cardTitle}>{atom.title}</h3>}
            <p className={styles.cardContent}>{atom.content}</p>

            <div className={styles.cardFooter}>
                {atom.suggestedCTA && (
                    <span className={styles.hashtag} style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>
                        CTA: {atom.suggestedCTA}
                    </span>
                )}
                {atom.suggestedHashtags.map(tag => (
                    <span key={tag} className={styles.hashtag}>{tag}</span>
                ))}
            </div>
        </div>
    )
}
