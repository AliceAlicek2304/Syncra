import { useState } from 'react'
import {
  Search, ExternalLink, PlayCircle, FileText,
  ChevronRight, Zap, Calendar, BarChart2, Shield,
} from 'lucide-react'
import styles from './DocsTab.module.css'
import pageStyles from '../../pages/app/HelpPage.module.css'
import type { DocCategory, VideoTutorial } from '../../pages/app/HelpPageData'

const iconMap: Record<string, React.ReactNode> = {
  zap: <Zap size={18} />,
  calendar: <Calendar size={18} />,
  barChart2: <BarChart2 size={18} />,
  shield: <Shield size={18} />,
}

export function DocsTab({
  categories,
  videos,
  onContact,
}: {
  categories: DocCategory[]
  videos: VideoTutorial[]
  onContact?: () => void
}) {
  const [docSearch, setDocSearch] = useState('')
  const [activeDoc, setActiveDoc] = useState<string | null>(null)

  const filteredDocs = docSearch.trim()
    ? categories.map(cat => ({
        ...cat,
        articles: cat.articles.filter(a =>
          a.title.toLowerCase().includes(docSearch.toLowerCase())
        ),
      })).filter(cat => cat.articles.length > 0)
    : categories

  return (
    <div className={pageStyles.section}>
      <div className={styles.docSearchWrap}>
        <Search size={16} className={styles.docSearchIcon} />
        <input
          className={styles.docSearch}
          placeholder="Tìm kiếm bài viết hướng dẫn..."
          value={docSearch}
          onChange={e => setDocSearch(e.target.value)}
        />
      </div>

      {!docSearch && (
        <div className={styles.videoSection}>
          <h3 className={styles.docCatTitle}>
            <PlayCircle size={16} /> Video hướng dẫn
          </h3>
          <div className={styles.videoGrid}>
            {videos.map(v => (
              <div key={v.id} className={styles.videoCard}>
                <div className={styles.videoThumb}>{v.thumbnail}</div>
                <div className={styles.videoInfo}>
                  <p className={styles.videoTitle}>{v.title}</p>
                  <div className={styles.videoMeta}>
                    <span>{v.duration}</span>
                    <span>·</span>
                    <span>{v.views} lượt xem</span>
                  </div>
                </div>
                <ExternalLink size={14} className={styles.videoExternal} />
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredDocs.length === 0 ? (
        <div className={pageStyles.emptySearch}>
          <FileText size={32} />
          <p>Không tìm thấy bài viết nào cho "<strong>{docSearch}</strong>"</p>
        </div>
      ) : (
        <div className={styles.docGrid}>
          {filteredDocs.map(cat => (
            <div key={cat.id} className={styles.docCat}>
              <h3 className={styles.docCatTitle} style={{ color: cat.color }}>
                {iconMap[cat.icon] ?? null} {cat.title}
              </h3>
              <ul className={styles.articleList}>
                {cat.articles.map(a => (
                  <li key={a.id}>
                    <button
                      className={`${styles.articleLink} ${activeDoc === a.id ? styles.articleLinkActive : ''}`}
                      onClick={() => setActiveDoc(activeDoc === a.id ? null : a.id)}
                    >
                      <ChevronRight size={13} className={styles.articleChevron} />
                      <span>{a.title}</span>
                      <span className={styles.articleMins}>{a.mins} phút</span>
                    </button>
                    {activeDoc === a.id && (
                      <div className={styles.articlePreview}>
                        <div className={styles.articlePreviewBadge}>Nội dung đầy đủ sẽ có trong tháng 3/2026</div>
                        <p>
                          Bài viết <strong>"{a.title}"</strong> đang được biên soạn bởi đội ngũ Syncra.
                          Trong thời gian chờ đợi, bạn có thể xem video hướng dẫn liên quan hoặc{' '}
                          <button className={pageStyles.inlineLink} onClick={onContact}>liên hệ support</button> để được hỗ trợ trực tiếp.
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
