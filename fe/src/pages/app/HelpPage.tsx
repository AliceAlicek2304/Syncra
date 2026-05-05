import { useState } from 'react'
import {
  HelpCircle, BookOpen, Bug, Mail,
  ChevronDown, ChevronRight, Search, ExternalLink,
  CheckCircle, AlertCircle, MessageSquare, Clock, Send,
  PlayCircle, FileText, Zap, Shield, BarChart2, Calendar,
} from 'lucide-react'
import styles from './HelpPage.module.css'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    id: 'f1',
    category: 'Tài khoản & Thanh toán',
    q: 'Tôi có thể dùng thử Syncra miễn phí không?',
    a: 'Có! Syncra có gói Free với tối đa 1 social account, 10 bài lên lịch mỗi tháng và AI usage giới hạn. Không cần thẻ tín dụng khi đăng ký.',
  },
  {
    id: 'f2',
    category: 'Tài khoản & Thanh toán',
    q: 'Tôi có thể hủy subscription bất kỳ lúc nào không?',
    a: 'Hoàn toàn có thể. Bạn có thể hủy subscription ngay trong trang Settings > Billing. Tài khoản của bạn vẫn hoạt động đến hết chu kỳ thanh toán hiện tại.',
  },
  {
    id: 'f3',
    category: 'Tài khoản & Thanh toán',
    q: 'Syncra hỗ trợ những phương thức thanh toán nào?',
    a: 'Syncra chấp nhận thẻ Visa, Mastercard, JCB và thanh toán qua PayPal. Dành cho người dùng Việt Nam, chúng tôi sẽ sớm hỗ trợ VNPay và MoMo.',
  },
  {
    id: 'f4',
    category: 'Tính năng AI',
    q: 'AI tạo nội dung của Syncra hoạt động như thế nào?',
    a: 'Bạn nhập chủ đề, niche và tone giọng văn. AI sẽ phân tích trend hiện tại trên từng nền tảng và đề xuất hook, caption, hashtag phù hợp. Kết quả được tối ưu riêng cho TikTok, Instagram, YouTube, LinkedIn, X và Facebook.',
  },
  {
    id: 'f5',
    category: 'Tính năng AI',
    q: 'Tôi có thể dùng AI để repurpose nội dung cũ không?',
    a: 'Có! Tính năng AI Repurpose cho phép bạn chuyển đổi một bài đăng thành nhiều định dạng: thread Twitter → caption Instagram, blog post → TikTok script, v.v. Truy cập AI Repurpose trong sidebar.',
  },
  {
    id: 'f6',
    category: 'Tính năng AI',
    q: 'Trend Radar là gì?',
    a: 'Trend Radar theo dõi và phân tích các xu hướng nội dung đang hot trên mạng xã hội theo thời gian thực. Nó giúp bạn biết chủ đề nào đang được quan tâm để tạo content kịp thời và đạt reach cao hơn.',
  },
  {
    id: 'f7',
    category: 'Đăng bài & Lên lịch',
    q: 'Syncra hỗ trợ đăng bài trực tiếp lên mạng xã hội không?',
    a: 'Đây là tính năng đang được phát triển (coming soon). Hiện tại, Syncra giúp bạn lên lịch, quản lý và chuẩn bị nội dung. Tích hợp API trực tiếp với TikTok, Instagram và YouTube sẽ ra mắt trong Q2/2026.',
  },
  {
    id: 'f8',
    category: 'Đăng bài & Lên lịch',
    q: 'Tôi có thể lên lịch bao nhiêu bài một lúc?',
    a: 'Gói Free cho phép tối đa 10 bài lên lịch/tháng, Pro tối đa 100 bài/tháng và Team tối đa 1000 bài/tháng. Các gói cao hơn cũng hỗ trợ nhiều social account hơn theo đúng quota của workspace.',
  },
  {
    id: 'f9',
    category: 'Analytics',
    q: 'Dữ liệu analytics của tôi được cập nhật bao lâu một lần?',
    a: 'Analytics hiển thị dữ liệu theo workspace và tích hợp từ các nền tảng đã kết nối. Tần suất làm mới có thể thay đổi theo nền tảng và trạng thái đồng bộ, nhưng giao diện sẽ luôn phản ánh plan/quota hiện tại của bạn.',
  },
]

const DOC_CATEGORIES = [
  {
    id: 'dc1',
    icon: <Zap size={18} />,
    title: 'Bắt đầu nhanh',
    color: '#f59e0b',
    articles: [
      { id: 'a1', title: 'Thiết lập tài khoản và kết nối nền tảng', mins: 3 },
      { id: 'a2', title: 'Tạo bài đăng đầu tiên với AI', mins: 5 },
      { id: 'a3', title: 'Lên lịch bài đăng trên nhiều nền tảng', mins: 4 },
      { id: 'a4', title: 'Hiểu dashboard và các chỉ số cơ bản', mins: 6 },
    ],
  },
  {
    id: 'dc2',
    icon: <Zap size={18} />,
    title: 'AI Content Tools',
    color: '#8b5cf6',
    articles: [
      { id: 'a5', title: 'Cách dùng AI Ideas để tạo ý tưởng content', mins: 5 },
      { id: 'a6', title: 'AI Repurpose — chuyển đổi nội dung sang nhiều format', mins: 7 },
      { id: 'a7', title: 'Tùy chỉnh tone và phong cách viết', mins: 4 },
      { id: 'a8', title: 'Trend Radar — đọc và tận dụng xu hướng', mins: 6 },
    ],
  },
  {
    id: 'dc3',
    icon: <Calendar size={18} />,
    title: 'Calendar & Scheduling',
    color: '#06b6d4',
    articles: [
      { id: 'a9', title: 'Tổng quan Content Calendar', mins: 4 },
      { id: 'a10', title: 'Tạo và chỉnh sửa bài đăng trong calendar', mins: 5 },
      { id: 'a11', title: 'Kéo thả để thay đổi lịch đăng', mins: 3 },
      { id: 'a12', title: 'Quản lý trạng thái bài: Draft / Scheduled / Published', mins: 4 },
    ],
  },
  {
    id: 'dc4',
    icon: <BarChart2 size={18} />,
    title: 'Analytics & Báo cáo',
    color: '#10b981',
    articles: [
      { id: 'a13', title: 'Hiểu các chỉ số Analytics', mins: 6 },
      { id: 'a14', title: 'So sánh hiệu suất giữa các nền tảng', mins: 5 },
      { id: 'a15', title: 'Xuất báo cáo (coming soon)', mins: 3 },
    ],
  },
  {
    id: 'dc5',
    icon: <Shield size={18} />,
    title: 'Bảo mật & Tài khoản',
    color: '#ef4444',
    articles: [
      { id: 'a16', title: 'Đổi mật khẩu và bảo mật 2 lớp', mins: 4 },
      { id: 'a17', title: 'Kết nối và ngắt kết nối tài khoản mạng xã hội', mins: 5 },
      { id: 'a18', title: 'Xóa hoặc tạm khóa tài khoản', mins: 3 },
    ],
  },
]

const VIDEO_TUTORIALS = [
  { id: 'v1', title: 'Syncra Quick Start — Từ 0 đến bài đăng đầu tiên trong 10 phút', duration: '10:24', views: '4.2K', thumbnail: '🎬' },
  { id: 'v2', title: 'AI Content Assistant — Tạo content hàng loạt với AI', duration: '8:15', views: '3.8K', thumbnail: '🤖' },
  { id: 'v3', title: 'Repurpose Content — Một bài đăng, nhiều nền tảng', duration: '6:42', views: '2.9K', thumbnail: '♻️' },
  { id: 'v4', title: 'Content Calendar Pro Tips — Lên lịch hiệu quả', duration: '12:30', views: '5.1K', thumbnail: '📅' },
  { id: 'v5', title: 'Analytics Deep Dive — Đọc data và cải thiện hiệu suất', duration: '9:55', views: '3.3K', thumbnail: '📊' },
  { id: 'v6', title: 'Trend Radar — Nắm bắt xu hướng trước đối thủ', duration: '7:18', views: '2.7K', thumbnail: '🎯' },
]

const ISSUE_CATEGORIES = [
  'Lỗi tính năng AI (Ideas / Repurpose / Trend)',
  'Lỗi Calendar / Lên lịch bài',
  'Lỗi Analytics / Dữ liệu không chính xác',
  'Vấn đề kết nối tài khoản mạng xã hội',
  'Lỗi thanh toán / Subscription',
  'Hiệu năng chậm / UI bị lỗi',
  'Vấn đề bảo mật / Tài khoản',
  'Khác',
]

type Tab = 'faq' | 'docs' | 'report' | 'contact'

// ─── Component ────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<Tab>('faq')
  const [openFaq, setOpenFaq] = useState<string | null>(null)
  const [docSearch, setDocSearch] = useState('')
  const [issueForm, setIssueForm] = useState({ title: '', category: '', description: '', severity: 'medium', email: '' })
  const [issueSubmitted, setIssueSubmitted] = useState(false)
  const [ticketId] = useState(() => Math.floor(Math.random() * 9000) + 1000)
  const [activeDoc, setActiveDoc] = useState<string | null>(null)

  const faqCategories = [...new Set(FAQ_ITEMS.map(f => f.category))]

  const filteredDocs = docSearch.trim()
    ? DOC_CATEGORIES.map(cat => ({
        ...cat,
        articles: cat.articles.filter(a =>
          a.title.toLowerCase().includes(docSearch.toLowerCase())
        ),
      })).filter(cat => cat.articles.length > 0)
    : DOC_CATEGORIES

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueForm.title || !issueForm.category || !issueForm.description) return
    setIssueSubmitted(true)
  }

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'faq', icon: <HelpCircle size={16} />, label: 'FAQ' },
    { id: 'docs', icon: <BookOpen size={16} />, label: 'Documentation' },
    { id: 'report', icon: <Bug size={16} />, label: 'Report Issue' },
    { id: 'contact', icon: <Mail size={16} />, label: 'Contact Support' },
  ]

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}><HelpCircle size={20} /></div>
        <div>
          <h1 className={styles.title}>Help Center</h1>
          <p className={styles.subtitle}>FAQ, tài liệu, video hướng dẫn và hỗ trợ kỹ thuật</p>
        </div>
      </div>

      {/* Tab bar */}
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

      {/* ── FAQ ────────────────────────────────────────────────── */}
      {activeTab === 'faq' && (
        <div className={styles.section}>
          <p className={styles.sectionDesc}>
            {FAQ_ITEMS.length} câu hỏi thường gặp. Không tìm thấy câu trả lời?{' '}
            <button className={styles.inlineLink} onClick={() => setActiveTab('contact')}>
              Liên hệ support →
            </button>
          </p>
          {faqCategories.map(cat => (
            <div key={cat} className={styles.faqGroup}>
              <h3 className={styles.faqGroupTitle}>{cat}</h3>
              {FAQ_ITEMS.filter(f => f.category === cat).map(item => (
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
      )}

      {/* ── DOCS ───────────────────────────────────────────────── */}
      {activeTab === 'docs' && (
        <div className={styles.section}>
          {/* Search */}
          <div className={styles.docSearchWrap}>
            <Search size={16} className={styles.docSearchIcon} />
            <input
              className={styles.docSearch}
              placeholder="Tìm kiếm bài viết hướng dẫn..."
              value={docSearch}
              onChange={e => setDocSearch(e.target.value)}
            />
          </div>

          {/* Video row */}
          {!docSearch && (
            <div className={styles.videoSection}>
              <h3 className={styles.docCatTitle}>
                <PlayCircle size={16} /> Video hướng dẫn
              </h3>
              <div className={styles.videoGrid}>
                {VIDEO_TUTORIALS.map(v => (
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

          {/* Doc categories */}
          {filteredDocs.length === 0 ? (
            <div className={styles.emptySearch}>
              <FileText size={32} />
              <p>Không tìm thấy bài viết nào cho "<strong>{docSearch}</strong>"</p>
            </div>
          ) : (
            <div className={styles.docGrid}>
              {filteredDocs.map(cat => (
                <div key={cat.id} className={styles.docCat}>
                  <h3 className={styles.docCatTitle} style={{ color: cat.color }}>
                    {cat.icon} {cat.title}
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
                              <button className={styles.inlineLink} onClick={() => setActiveTab('contact')}>liên hệ support</button> để được hỗ trợ trực tiếp.
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
      )}

      {/* ── REPORT ISSUE ───────────────────────────────────────── */}
      {activeTab === 'report' && (
        <div className={styles.section}>
          {issueSubmitted ? (
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
          ) : (
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
                        {ISSUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Mức độ nghiêm trọng</label>
                      <div className={styles.severityGroup}>
                        {(['low', 'medium', 'high', 'critical'] as const).map(s => (
                          <button
                            key={s}
                            type="button"
                            className={`${styles.severityBtn} ${styles[`severity_${s}`]} ${issueForm.severity === s ? styles.severityBtnActive : ''}`}
                            onClick={() => setIssueForm(f => ({ ...f, severity: s }))}
                          >
                            {s === 'low' ? 'Thấp' : s === 'medium' ? 'Trung bình' : s === 'high' ? 'Cao' : 'Nghiêm trọng'}
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
          )}
        </div>
      )}

      {/* ── CONTACT SUPPORT ────────────────────────────────────── */}
      {activeTab === 'contact' && (
        <div className={styles.section}>
          <div className={styles.contactGrid}>
            <div className={`glass-card ${styles.contactCard}`}>
              <div className={styles.contactIcon} style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)' }}>
                <Mail size={22} />
              </div>
              <h3>Email Support</h3>
              <p>Gửi câu hỏi hoặc yêu cầu hỗ trợ qua email. Đội ngũ Syncra sẽ phản hồi trong thời gian làm việc.</p>
              <div className={styles.contactMeta}>
                <span className={styles.contactMetaItem}><Clock size={13} /> Phản hồi trong 24–48 giờ</span>
                <span className={styles.contactMetaItem}><CheckCircle size={13} style={{ color: '#10b981' }} /> Thứ 2 – Thứ 6 (9:00 – 18:00 GMT+7)</span>
              </div>
              <a className={`btn-primary ${styles.contactBtn}`} href="mailto:support@syncra.io">
                Gửi email support
              </a>
              <p className={styles.contactEmail}>support@syncra.io</p>
            </div>

            <div className={`glass-card ${styles.contactCard}`}>
              <div className={styles.contactIcon} style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)' }}>
                <MessageSquare size={22} />
              </div>
              <h3>Community Discord</h3>
              <p>Tham gia cộng đồng Syncra trên Discord. Hỏi đáp với người dùng khác, nhận tips và cập nhật tính năng mới sớm nhất.</p>
              <div className={styles.contactMeta}>
                <span className={styles.contactMetaItem}><CheckCircle size={13} style={{ color: '#10b981' }} /> 1,200+ thành viên</span>
                <span className={styles.contactMetaItem}><Zap size={13} style={{ color: '#f59e0b' }} /> Phản hồi nhanh từ cộng đồng</span>
              </div>
              <button className={`btn-secondary ${styles.contactBtn}`}>
                Tham gia Discord
              </button>
            </div>

            <div className={`glass-card ${styles.contactCard}`}>
              <div className={styles.contactIcon} style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                <BookOpen size={22} />
              </div>
              <h3>Knowledge Base</h3>
              <p>Tìm kiếm câu trả lời trong thư viện bài viết hướng dẫn chi tiết. Được cập nhật thường xuyên bởi đội ngũ Syncra.</p>
              <div className={styles.contactMeta}>
                <span className={styles.contactMetaItem}><FileText size={13} /> 50+ bài viết hướng dẫn</span>
                <span className={styles.contactMetaItem}><PlayCircle size={13} /> 10+ video tutorial</span>
              </div>
              <button className={`btn-secondary ${styles.contactBtn}`} onClick={() => setActiveTab('docs')}>
                Xem tài liệu →
              </button>
            </div>
          </div>

          {/* Status banner */}
          <div className={`glass-card ${styles.statusBanner}`}>
            <div className={styles.statusDot} />
            <div>
              <strong>Tất cả hệ thống hoạt động bình thường</strong>
              <span className={styles.statusSub}> · Cập nhật lúc 07/03/2026, 14:30</span>
            </div>
            <button className={styles.statusLink}>Xem trạng thái hệ thống →</button>
          </div>
        </div>
      )}
    </div>
  )
}
