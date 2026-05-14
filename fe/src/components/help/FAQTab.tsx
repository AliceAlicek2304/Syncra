import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './FAQTab.module.css'
import pageStyles from '../../pages/app/HelpPage.module.css'
import type { FAQItem } from '../../pages/app/HelpPageData'

export function FAQTab({ items, onContact }: { items: FAQItem[]; onContact?: () => void }) {
  const [openFaq, setOpenFaq] = useState<string | null>(null)
  const categories = [...new Set(items.map(f => f.category))]

  return (
    <div className={pageStyles.section}>
      <p className={pageStyles.sectionDesc}>
        {items.length} câu hỏi thường gặp. Không tìm thấy câu trả lời?{' '}
        <button className={pageStyles.inlineLink} onClick={onContact}>
          Liên hệ support →
        </button>
      </p>
      {categories.map(cat => (
        <div key={cat} className={styles.faqGroup}>
          <h3 className={styles.faqGroupTitle}>{cat}</h3>
          {items.filter(f => f.category === cat).map(item => (
            <div key={item.id} className={`${styles.faqItem} ${openFaq === item.id ? styles.faqItemOpen : ''}`}>
              <button
                className={styles.faqQuestion}
                onClick={() => setOpenFaq(openFaq === item.id ? null : item.id)}
              >
                <span>{item.q}</span>
                <ChevronDown size={16} className={`${styles.faqChevron} ${openFaq === item.id ? styles.faqChevronOpen : ''}`} />
              </button>
              {openFaq === item.id && (
                <div className={styles.faqAnswer}>{item.a}</div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
