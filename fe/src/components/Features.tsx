import {
  PenLine, CalendarClock, BarChart3, Globe2,
  Sparkles, Repeat2,
} from 'lucide-react'

const FEATURES = [
  {
    icon: <PenLine size={22} />,
    title: 'Trình soạn nội dung thông minh',
    desc: 'Viết một lần, Syncra tự gợi ý cách điều chỉnh giọng văn, độ dài và định dạng cho từng nền tảng như TikTok, LinkedIn, Instagram.',
    colorClass: 'bg-violet-100 text-violet-700',
  },
  {
    icon: <CalendarClock size={22} />,
    title: 'Lên lịch đăng tối ưu',
    desc: 'Chọn khung giờ đăng dựa trên thói quen hoạt động của người xem. Bạn lên lịch, Syncra xử lý phần còn lại.',
    colorClass: 'bg-pink-100 text-pink-700',
  },
  {
    icon: <Globe2 size={22} />,
    title: 'Đăng đa nền tảng',
    desc: 'Đăng đồng thời lên TikTok, Instagram, YouTube, LinkedIn, X và Facebook từ một dashboard duy nhất.',
    colorClass: 'bg-cyan-100 text-cyan-700',
  },
  {
    icon: <BarChart3 size={22} />,
    title: 'Phân tích tập trung',
    desc: 'Theo dõi lượt tiếp cận, tương tác và tăng trưởng follower trên mọi kênh trong một màn hình rõ ràng.',
    colorClass: 'bg-amber-100 text-amber-700',
  },
  {
    icon: <Sparkles size={22} />,
    title: 'Trợ lý viết bằng AI',
    desc: 'Nhận ý tưởng caption, hashtag và hook thân thiện SEO để tiết kiệm nhiều giờ làm nội dung mỗi tuần.',
    colorClass: 'bg-emerald-100 text-emerald-700',
    badge: 'Sắp ra mắt',
  },
  {
    icon: <Repeat2 size={22} />,
    title: 'Tái sử dụng nội dung tốt',
    desc: 'Tự động lên lịch lại các nội dung evergreen có hiệu quả cao để kéo dài vòng đời tiếp cận.',
    colorClass: 'bg-rose-100 text-rose-700',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-16 md:py-24 bg-brand-canvas-soft text-brand-ink border-b border-brand-border/40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl text-left">
          <span className="text-xs font-bold text-brand-primary uppercase tracking-widest block mb-3">Tính năng</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-brand-ink leading-tight">
            Mọi thứ creator cần.<br />
            <span className="text-brand-primary">Gọn, rõ, không thừa.</span>
          </h2>
          <p className="text-base sm:text-lg text-brand-body mt-4 leading-relaxed max-w-xl">
            Dành cho creator cá nhân, freelancer và team marketing nhỏ tại Việt Nam
            muốn làm nội dung chuyên nghiệp mà không phải vận hành rườm rà.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
          {FEATURES.map(f => (
            <div key={f.title} className="border border-brand-border bg-brand-canvas rounded-brand-md p-6 hover:shadow-md transition-all duration-150 flex flex-col items-start gap-4">
              <div className={`h-11 w-11 rounded-brand-sm flex items-center justify-center shadow-sm ${f.colorClass}`}>
                {f.icon}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-brand-ink tracking-tight">{f.title}</h3>
                  {f.badge && (
                    <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 bg-brand-canvas-soft border border-brand-border text-brand-body-mid rounded-full">
                      {f.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-brand-body leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
