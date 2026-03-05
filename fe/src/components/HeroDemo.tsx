import { useState } from 'react'
import { Sparkles, Copy } from 'lucide-react'
import styles from './HeroDemo.module.css'

export default function HeroDemo() {
  const [topic, setTopic] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<null | { hook: string; caption: string }>(null)

  const handleDemo = () => {
    if (!topic.trim()) return
    setIsGenerating(true)
    setResult(null)
    
    setTimeout(() => {
      setIsGenerating(false)
      setResult({
        hook: `🚀 ${topic}: Bí mật mà ít creator nào tiết lộ...`,
        caption: `Bạn đang loay hoay với ${topic}? Đừng lo, mình đã tổng hợp 3 bước để tối ưu quy trình này chỉ trong 15 phút mỗi ngày. \n\n1. Tập trung vào chất lượng thay vì số lượng.\n2. Sử dụng công cụ hỗ trợ thông minh.\n3. Luôn theo dõi xu hướng.\n\nLưu ngay lại nếu thấy hữu ích nhé! 🔥`
      })
    }, 1500)
  }

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.wrapper}>
          <div className={styles.header}>
            <span className="section-label">Live Demo</span>
            <h2 className={styles.title}>Thử sức mạnh của AI ngay bây giờ</h2>
            <p className={styles.sub}>Không cần đăng ký, trải nghiệm thử cách Syncra biến ý tưởng của bạn thành nội dung chất lượng.</p>
          </div>

          <div className={`glass-card ${styles.demoBox}`}>
            <div className={styles.inputArea}>
              <input 
                type="text" 
                className={styles.input}
                placeholder="Nhập chủ đề bạn muốn tạo... (VD: Tips làm vlog, AI Tools...)"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDemo()}
              />
              <button 
                className={`btn-primary ${styles.btn}`} 
                onClick={handleDemo}
                disabled={isGenerating || !topic.trim()}
              >
                {isGenerating ? 'Đang tạo...' : 'Tạo thử ngay'}
                <Sparkles size={16} />
              </button>
            </div>

            {isGenerating && (
              <div className={styles.loading}>
                <div className={styles.pulse} />
                <span>AI đang chuẩn bị nội dung cho bạn...</span>
              </div>
            )}

            {result && (
              <div className={styles.result}>
                <div className={styles.resultHeader}>
                  <span className={styles.badge}>Dự thảo bởi AI</span>
                  <button className={styles.copyBtn}><Copy size={14} /> Copy</button>
                </div>
                <div className={styles.hookBox}>
                  <strong>Hook:</strong> {result.hook}
                </div>
                <div className={styles.captionBox}>
                  <strong>Caption:</strong>
                  <p>{result.caption}</p>
                </div>
                <div className={styles.footer}>
                  <p>✨ Đây chỉ là bản preview. Đăng ký để mở khóa toàn bộ tính năng!</p>
                  <a href="#pricing" className={styles.cta}>Bắt đầu miễn phí →</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
