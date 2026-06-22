import { PenSquare, Clock4, Rocket } from 'lucide-react'

const STEPS = [
  {
    step: '01',
    icon: <PenSquare size={28} />,
    title: 'Tạo nội dung',
    desc: 'Viết bài một lần trong editor. Syncra hỗ trợ định dạng lại để phù hợp từng nền tảng.',
  },
  {
    step: '02',
    icon: <Clock4 size={28} />,
    title: 'Lên lịch hoặc đăng ngay',
    desc: 'Chọn đăng ngay hoặc đặt lịch vào khung giờ phù hợp để tăng cơ hội tiếp cận.',
  },
  {
    step: '03',
    icon: <Rocket size={28} />,
    title: 'Tăng trưởng tệp người xem',
    desc: 'Theo dõi hiệu quả trên mọi nền tảng trong một màn hình và tập trung vào nội dung đang hiệu quả.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-brand-ink text-brand-on-primary border-b border-brand-border/10 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full bg-brand-primary/5 filter blur-[120px] opacity-40 -z-10 -translate-x-1/2 -translate-y-1/2" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-bold text-brand-primary uppercase tracking-widest block mb-3">Cách hoạt động</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-brand-on-primary leading-tight">
            Từ ý tưởng đến bài đăng<br />
            <span className="text-brand-primary">chỉ trong 3 bước.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {STEPS.map((s) => (
            <div key={s.step} className="relative border border-brand-border/10 bg-brand-ink-soft p-8 rounded-brand-md flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all duration-150">
              <div className="absolute top-4 right-6 text-3xl font-black text-brand-primary/20 font-mono tracking-tight select-none">{s.step}</div>
              <div className="h-16 w-16 bg-brand-ink border border-brand-border/15 text-brand-primary rounded-full flex items-center justify-center mb-6 shadow-sm">
                {s.icon}
              </div>
              <h3 className="text-xl font-bold text-brand-on-primary mb-3 tracking-tight">{s.title}</h3>
              <p className="text-sm text-brand-mute leading-relaxed max-w-xs">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
