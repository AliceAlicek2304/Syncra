import { Star } from 'lucide-react'

const TESTIMONIALS = [
  {
    name: 'Minh Anh',
    handle: '@minhanh.creates',
    platform: 'TikTok Creator · 280K follower',
    avatar: 'MA',
    colorClass: 'bg-pink-100 text-pink-700 border-pink-200/50',
    text: 'Syncra thay đổi hẳn cách mình làm việc. Trước đây mình mất 3 tiếng mỗi ngày để copy nội dung qua nhiều nền tảng, giờ chỉ còn khoảng 20 phút.',
    stars: 5,
  },
  {
    name: 'Quốc Bảo',
    handle: '@quocbao.vlogs',
    platform: 'YouTube & Instagram · 120K',
    avatar: 'QB',
    colorClass: 'bg-violet-100 text-violet-700 border-violet-200/50',
    text: 'Tính năng lên lịch rất đáng tiền. Mình batch content vào Chủ nhật và Syncra tự đăng trong tuần, tệp người xem tăng rõ sau 2 tháng.',
    stars: 5,
  },
  {
    name: 'Lan Hương',
    handle: '@lanhuong.food',
    platform: 'Food Creator · đa nền tảng',
    avatar: 'LH',
    colorClass: 'bg-cyan-100 text-cyan-700 border-cyan-200/50',
    text: 'Mình đã thử vài công cụ khác nhưng Syncra là cái đầu tiên cảm giác thật sự dành cho creator độc lập: đơn giản, nhanh và dễ dùng.',
    stars: 5,
  },
  {
    name: 'Tuấn Kiệt',
    handle: '@kietchanh.dev',
    platform: 'Tech Educator · 50K',
    avatar: 'TK',
    colorClass: 'bg-amber-100 text-amber-700 border-amber-200/50',
    text: 'Mình khá kỹ tính với tool, nhưng Syncra chạy ổn định và chưa bỏ lỡ bài đăng đã lên lịch. Dashboard phân tích cũng rất dễ đọc.',
    stars: 5,
  },
  {
    name: 'Thu Hà',
    handle: '@thuha.lifestyle',
    platform: 'Lifestyle Creator · 95K',
    avatar: 'TH',
    colorClass: 'bg-emerald-100 text-emerald-700 border-emerald-200/50',
    text: 'Mình bắt đầu bằng gói dùng thử rồi nâng cấp sau một tuần. Gợi ý giờ đăng giúp bài của mình có view tốt hơn trước khá nhiều.',
    stars: 5,
  },
  {
    name: 'Đức Long',
    handle: '@duclong.fitness',
    platform: 'Fitness Coach · 200K',
    avatar: 'DL',
    colorClass: 'bg-rose-100 text-rose-700 border-rose-200/50',
    text: 'Quản lý 6 nền tảng từng rất mệt. Giờ mình dành nhiều thời gian hơn để sáng tạo và ít phải xoay sở với lịch đăng.',
    stars: 5,
  },
]

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-16 md:py-24 bg-brand-canvas-soft text-brand-ink border-b border-brand-border/40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-bold text-brand-primary uppercase tracking-widest block mb-3">Khách hàng</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-brand-ink leading-tight">
            Creator Việt tin dùng Syncra.<br />
            <span className="text-brand-primary">Vì mọi thứ nhẹ hơn.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="border border-brand-border bg-brand-canvas p-6 rounded-brand-md flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-150">
              <div>
                <div className="flex items-center gap-0.5 text-amber-500 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" className="stroke-none" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-brand-body leading-relaxed mb-6 font-medium italic">
                  "{t.text}"
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-brand-border/50">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border shrink-0 ${t.colorClass}`}>
                  {t.avatar}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-bold text-brand-ink">{t.name}</div>
                  <div className="text-xs font-semibold text-brand-primary mb-0.5">{t.handle}</div>
                  <div className="text-[9px] font-bold text-brand-body-mid uppercase tracking-wide">{t.platform}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
