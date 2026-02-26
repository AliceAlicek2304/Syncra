import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, Wand2, Copy, Trash2, 
  Linkedin, Twitter, Instagram, ArrowRight,
  Sparkles, Check
} from 'lucide-react'
import styles from './RepurposePage.module.css'

interface RepurposeResult {
  id: string
  platform: string
  content: string
  icon: any
}

export default function RepurposePage() {
  const [sourceText, setSourceText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<RepurposeResult[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleRepurpose = () => {
    if (!sourceText.trim()) return
    
    setIsProcessing(true)
    setResults([])

    // Extract first few words for dynamic mocking
    const topic = sourceText.split('. ')[0].split(' ').slice(0, 5).join(' ') + '...'

    // Mock processing delay
    setTimeout(() => {
      const mockResults: RepurposeResult[] = [
        {
          id: 'rt-1',
          platform: 'LinkedIn (Thought Leadership)',
          icon: <Linkedin size={16} />,
          content: `Vừa qua mình có nghiên cứu sâu về "${topic}" và rút ra được 3 bài học đắt giá:\n\n1️⃣ [Insight 1]: Không chỉ là một phần của quy trình, mà là trái tim của sự sáng tạo.\n2️⃣ [Insight 2]: Sự khác biệt nằm ở cách chúng ta đặt câu hỏi.\n3️⃣ [Insight 3]: Đừng bao giờ dừng lại ở kết quả đầu tiên.\n\nHy vọng những chia sẻ này giúp ích cho bạn! Bạn nghĩ sao về điểm số 2? #Career #TechNest #Insights`
        },
        {
          id: 'rt-2',
          platform: 'X (Thread Split)',
          icon: <Twitter size={16} />,
          content: `1/3: 🧵 Cách để tối ưu "${topic}" mà 90% mọi người đang bỏ lỡ.\n\nDưới đây là bản tóm tắt nhanh từ nội dung mình vừa phân tích. 👇\n\n2/3: Điểm mấu chốt đầu tiên là việc thấu hiểu bối cảnh. Điều này thay đổi hoàn toàn cách chúng ta tiếp cận...\n\n3/3: Kết luận lại, hãy luôn giữ sự tò mò và kiểm chứng giả thuyết. Save lại nếu bạn thấy hữu ích! 🚀`
        },
        {
          id: 'rt-3',
          platform: 'Instagram (Carousel Hook)',
          icon: <Instagram size={16} />,
          content: `Slide 1: Bí mật về "${topic}" mà bạn chưa biết! 🤫\nSlide 2: Tại sao đa số đều thất bại trong việc thực hiện?\nSlide 3: Bước 1: Phân tích & Đánh giá đúng thực trạng.\nSlide 4: Bước 2: Triển khai với tư duy "Iterate fast".\nSlide 5: Save & Share nếu bạn muốn xem thêm tips về chủ đề này nhé! ❤️`
        }
      ]
      setResults(mockResults)
      setIsProcessing(false)
    }, 2000)
  }

  const handleOpenInEditor = (content: string) => {
    // Navigate to AI Assistant with pre-filled content
    // We can use state to pass the content
    navigate('/app/ai', { state: { repurposedContent: content } })
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>AI Repurposing Engine</h1>
        <p className={styles.subtitle}>Biến một nội dung dài thành "vũ khí" đa kênh chỉ trong 1 click.</p>
      </header>

      <main className={styles.container}>
        {/* Input area */}
        <section className={styles.sourceSection}>
          <div className={`glass-card ${styles.card}`}>
            <h2 className={styles.sectionTitle}>
              <FileText size={20} className="text-purple-400" />
              Nội dung gốc (Source)
            </h2>
            <div className={styles.textareaWrap}>
              <textarea
                className={styles.textarea}
                placeholder="Dán bài blog, kịch bản video hoặc một note dài vào đây..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
              />
            </div>
            <div className={styles.actions}>
              <button 
                className={`btn-primary ${styles.repurposeBtn}`}
                onClick={handleRepurpose}
                disabled={isProcessing || !sourceText.trim()}
              >
                {isProcessing ? (
                  <>Đang phân tích...</>
                ) : (
                  <>
                    <Wand2 size={18} />
                    Tái bản đa nền tảng
                    <Sparkles size={16} />
                  </>
                )}
              </button>
              <button 
                className={styles.iconBtn} 
                onClick={() => setSourceText('')}
                title="Xóa trắng"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* Results area */}
        <section className={styles.resultsSection}>
          <h2 className={styles.sectionTitle}>
            <Sparkles size={20} className="text-pink-400" />
            Kết quả tái bản (Repurposed)
          </h2>

          {isProcessing ? (
            <div className={`glass-card ${styles.loadingHud}`}>
              <div className={styles.spinner} />
              <p className="text-muted text-sm">AI đang bóc tách các ý chính...</p>
            </div>
          ) : results.length > 0 ? (
            <div className={styles.resultList}>
              {results.map((res, idx) => (
                <div 
                  key={res.id} 
                  className={`glass-card ${styles.resultCard}`}
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className={styles.resultHeader}>
                    <div className="flex items-center gap-2">
                       <span className="text-purple-400">{res.icon}</span>
                       <span className={styles.platformBadge}>{res.platform}</span>
                    </div>
                    <div className={styles.resultActions}>
                      <button 
                        className={styles.iconBtn}
                        onClick={() => handleCopy(res.id, res.content)}
                        title="Copy"
                      >
                        {copiedId === res.id ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                      </button>
                      <button 
                        className={styles.iconBtn} 
                        onClick={() => handleOpenInEditor(res.content)}
                        title="Mở trong Editor"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                  <pre className={styles.resultContent}>{res.content}</pre>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🤖</div>
              <div>
                <p className="font-bold text-lg mb-1">Sẵn sàng phục vụ!</p>
                <p className="text-sm">Hãy nhập nội dung bên trái để AI bắt đầu quá trình tái bản.</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
