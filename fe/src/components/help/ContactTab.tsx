import { Mail, MessageSquare, BookOpen, Clock, CheckCircle, Zap, FileText, PlayCircle } from 'lucide-react'
import styles from './ContactTab.module.css'
import pageStyles from '../../pages/app/HelpPage.module.css'

export function ContactTab({ onDocs }: { onDocs?: () => void }) {
  return (
    <div className={pageStyles.section}>
      <div className={styles.contactGrid}>
        <div className={styles.contactCard}>
          <div className={styles.contactIcon} style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)' }}>
            <Mail size={22} />
          </div>
          <h3>Email Support</h3>
          <p>Gửi câu hỏi hoặc yêu cầu hỗ trợ qua email. Đội ngũ Syncra sẽ phản hồi trong thời gian làm việc.</p>
          <div className={styles.contactMeta}>
            <span className={styles.contactMetaItem}><Clock size={13} /> Phản hồi trong 24–48 giờ</span>
            <span className={styles.contactMetaItem}><CheckCircle size={13} style={{ color: '#10b981' }} /> Thứ 2 – Thứ 6 (9:00 – 18:00 GMT+7)</span>
          </div>
          <a className={styles.primaryBtn} href="mailto:support@syncra.io">
            Gửi email support
          </a>
          <p className={styles.contactEmail}>support@syncra.io</p>
        </div>

        <div className={styles.contactCard}>
          <div className={styles.contactIcon} style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)' }}>
            <MessageSquare size={22} />
          </div>
          <h3>Community Discord</h3>
          <p>Tham gia cộng đồng Syncra trên Discord. Hỏi đáp với người dùng khác, nhận tips và cập nhật tính năng mới sớm nhất.</p>
          <div className={styles.contactMeta}>
            <span className={styles.contactMetaItem}><CheckCircle size={13} style={{ color: '#10b981' }} /> 1,200+ thành viên</span>
            <span className={styles.contactMetaItem}><Zap size={13} style={{ color: '#f59e0b' }} /> Phản hồi nhanh từ cộng đồng</span>
          </div>
          <button className={styles.secondaryBtn}>
            Tham gia Discord
          </button>
        </div>

        <div className={styles.contactCard}>
          <div className={styles.contactIcon} style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            <BookOpen size={22} />
          </div>
          <h3>Knowledge Base</h3>
          <p>Tìm kiếm câu trả lời trong thư viện bài viết hướng dẫn chi tiết. Được cập nhật thường xuyên bởi đội ngũ Syncra.</p>
          <div className={styles.contactMeta}>
            <span className={styles.contactMetaItem}><FileText size={13} /> 50+ bài viết hướng dẫn</span>
            <span className={styles.contactMetaItem}><PlayCircle size={13} /> 10+ video tutorial</span>
          </div>
          <button className={styles.secondaryBtn} onClick={onDocs}>
            Xem tài liệu →
          </button>
        </div>
      </div>

      <div className={styles.statusBanner}>
        <div className={styles.statusDot} />
        <div>
          <strong>Tất cả hệ thống hoạt động bình thường</strong>
          <span className={styles.statusSub}> · Cập nhật lúc 07/03/2026, 14:30</span>
        </div>
        <button className={styles.statusLink}>Xem trạng thái hệ thống →</button>
      </div>
    </div>
  )
}
