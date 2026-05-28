import { useState } from 'react'
import { HelpCircle, BookOpen, Bug, Mail } from 'lucide-react'
import styles from './HelpPage.module.css'
import { FAQTab } from '../../components/help/FAQTab'
import { DocsTab } from '../../components/help/DocsTab'
import { ReportTab } from '../../components/help/ReportTab'
import { ContactTab } from '../../components/help/ContactTab'
import { FAQ_ITEMS, DOC_CATEGORIES, VIDEO_TUTORIALS, ISSUE_CATEGORIES } from './HelpPageData'
import type { Tab } from './HelpPageData'

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: 'faq', icon: <HelpCircle size={16} />, label: 'FAQ' },
  { id: 'docs', icon: <BookOpen size={16} />, label: 'Documentation' },
  { id: 'report', icon: <Bug size={16} />, label: 'Report Issue' },
  { id: 'contact', icon: <Mail size={16} />, label: 'Contact Support' },
]

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<Tab>('faq')
  const onContact = () => setActiveTab('contact')
  const onDocs = () => setActiveTab('docs')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>Support</div>
        <h1 className={styles.title}>Help Center</h1>
        <p className={styles.subtitle}>FAQ, tài liệu, video hướng dẫn và hỗ trợ kỹ thuật</p>
      </div>

      <div className={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'faq' && <FAQTab items={FAQ_ITEMS} onContact={onContact} />}
      {activeTab === 'docs' && <DocsTab categories={DOC_CATEGORIES} videos={VIDEO_TUTORIALS} onContact={onContact} />}
      {activeTab === 'report' && <ReportTab categories={ISSUE_CATEGORIES} />}
      {activeTab === 'contact' && <ContactTab onDocs={onDocs} />}
    </div>
  )
}
