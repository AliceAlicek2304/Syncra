import { useState } from 'react'
import {
  Bug, CheckCircle, AlertCircle, Clock,
  Send, FileText,
} from 'lucide-react'
import styles from './ReportTab.module.css'
import pageStyles from '../../pages/app/HelpPage.module.css'

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
const SEVERITY_LABELS: Record<string, string> = {
  low: 'Thấp', medium: 'Trung bình', high: 'Cao', critical: 'Nghiêm trọng',
}

export function ReportTab({ categories }: { categories: string[] }) {
  const [issueForm, setIssueForm] = useState({
    title: '', category: '', description: '', severity: 'medium', email: '',
  })
  const [issueSubmitted, setIssueSubmitted] = useState(false)
  const [ticketId] = useState(() => Math.floor(Math.random() * 9000) + 1000)

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueForm.title || !issueForm.category || !issueForm.description) return
    setIssueSubmitted(true)
  }

  if (issueSubmitted) {
    return (
      <div className={pageStyles.section}>
        <div className={styles.successCard}>
          <CheckCircle size={40} className={styles.successIcon} />
          <h2>Báo lỗi đã được gửi!</h2>
          <p>Ticket ID: <strong>#SYN-{ticketId}</strong></p>
          <p>Đội ngũ kỹ thuật Syncra sẽ xem xét và phản hồi trong vòng <strong>24–48 giờ</strong> qua email của bạn.</p>
          <button
            className={`btn-secondary ${styles.resetBtn}`}
            onClick={() => { setIssueSubmitted(false); setIssueForm({ title: '', category: '', description: '', severity: 'medium', email: '' }) }}
          >
            Báo lỗi khác
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={pageStyles.section}>
      <div className={styles.reportWrap}>
        <div className={`glass-card ${styles.reportCard}`}>
          <h2 className={styles.cardTitle}>
            <Bug size={18} /> Báo cáo sự cố
          </h2>
          <p className={styles.cardDesc}>
            Mô tả lỗi bạn gặp phải càng chi tiết càng tốt. Chúng tôi sẽ điều tra và phản hồi trong 24–48h.
          </p>

          <form className={styles.reportForm} onSubmit={handleIssueSubmit}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Tiêu đề lỗi <span className={styles.required}>*</span></label>
              <input
                className={styles.formInput}
                placeholder="VD: Không thể lưu bài trong Calendar..."
                value={issueForm.title}
                onChange={e => setIssueForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Danh mục <span className={styles.required}>*</span></label>
                <select
                  className={styles.formSelect}
                  value={issueForm.category}
                  onChange={e => setIssueForm(f => ({ ...f, category: e.target.value }))}
                >
                  <option value="">Chọn danh mục...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Mức độ nghiêm trọng</label>
                <div className={styles.severityGroup}>
                  {SEVERITIES.map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.severityBtn} ${styles[`severity_${s}`]} ${issueForm.severity === s ? styles.severityBtnActive : ''}`}
                      onClick={() => setIssueForm(f => ({ ...f, severity: s }))}
                    >
                      {SEVERITY_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Mô tả chi tiết <span className={styles.required}>*</span></label>
              <textarea
                className={styles.formTextarea}
                rows={5}
                placeholder="Mô tả các bước tái hiện lỗi, kết quả mong đợi và kết quả thực tế..."
                value={issueForm.description}
                onChange={e => setIssueForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Email nhận phản hồi</label>
              <input
                className={styles.formInput}
                type="email"
                placeholder="email@example.com (mặc định là email tài khoản của bạn)"
                value={issueForm.email}
                onChange={e => setIssueForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className={styles.uploadPlaceholder}>
              <FileText size={20} />
              <span>Đính kèm screenshot / recording (coming soon)</span>
            </div>

            <button
              type="submit"
              className={`btn-primary ${styles.submitBtn}`}
              disabled={!issueForm.title || !issueForm.category || !issueForm.description}
            >
              <Send size={15} />
              Gửi báo cáo lỗi
            </button>
          </form>
        </div>

        <div className={styles.reportSidebar}>
          <div className={`glass-card ${styles.tipCard}`}>
            <h4><AlertCircle size={15} /> Tips báo lỗi hiệu quả</h4>
            <ul>
              <li>Mô tả chính xác các bước để tái hiện lỗi</li>
              <li>Đính kèm screenshot nếu có</li>
              <li>Ghi rõ OS và trình duyệt bạn đang dùng</li>
              <li>Kiểm tra xem lỗi có tái hiện sau khi refresh không</li>
            </ul>
          </div>
          <div className={`glass-card ${styles.tipCard}`}>
            <h4><Clock size={15} /> Thời gian phản hồi</h4>
            <div className={styles.responseTable}>
              <div><span>Critical</span><span className={styles.responseTime} style={{ color: '#ef4444' }}>&lt; 4 giờ</span></div>
              <div><span>High</span><span className={styles.responseTime} style={{ color: '#f59e0b' }}>8–12 giờ</span></div>
              <div><span>Medium</span><span className={styles.responseTime} style={{ color: '#8b5cf6' }}>24–48 giờ</span></div>
              <div><span>Low</span><span className={styles.responseTime} style={{ color: '#64748b' }}>3–5 ngày</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
