import { Star } from 'lucide-react'

const TESTIMONIALS = [
  {
    name: 'Minh Anh',
    handle: '@minhanh.creates',
    platform: 'TikTok Creator · 280K followers',
    avatar: 'MA',
    colorClass: 'bg-pink-100 text-pink-700 border-pink-200/50',
    text: 'Syncra changed how I work. I used to spend 3 hours a day copying content across platforms. Now it takes 20 minutes and my engagement actually went up.',
    stars: 5,
  },
  {
    name: 'Quoc Bao',
    handle: '@quocbao.vlogs',
    platform: 'YouTube & Instagram · 120K',
    avatar: 'QB',
    colorClass: 'bg-violet-100 text-violet-700 border-violet-200/50',
    text: 'The scheduling feature alone is worth every penny. I batch-create content on Sundays and it automatically posts throughout the week. My audience grew 40% in 2 months.',
    stars: 5,
  },
  {
    name: 'Lan Huong',
    handle: '@lanhuong.food',
    platform: 'Food Creator · Multi-platform',
    avatar: 'LH',
    colorClass: 'bg-cyan-100 text-cyan-700 border-cyan-200/50',
    text: 'I tried 4 other tools before Syncra. None of them felt made for solo creators. This one actually gets it — simple, fast, and genuinely useful.',
    stars: 5,
  },
  {
    name: 'Tuan Kiet',
    handle: '@kietchanh.dev',
    platform: 'Tech Educator · 50K',
    avatar: 'TK',
    colorClass: 'bg-amber-100 text-amber-700 border-amber-200/50',
    text: 'As a developer I\'m picky about tools. Syncra\'s reliability is excellent — never missed a scheduled post. The unified analytics dashboard is Chef\'s kiss.',
    stars: 5,
  },
  {
    name: 'Thu Ha',
    handle: '@thuha.lifestyle',
    platform: 'Lifestyle Creator · 95K',
    avatar: 'TH',
    colorClass: 'bg-emerald-100 text-emerald-700 border-emerald-200/50',
    text: 'I started with the free plan and upgraded after one week. The best-time scheduling is genuinely smart — my posts now get 2x the views they used to.',
    stars: 5,
  },
  {
    name: 'Duc Long',
    handle: '@duclong.fitness',
    platform: 'Fitness Coach · 200K',
    avatar: 'DL',
    colorClass: 'bg-rose-100 text-rose-700 border-rose-200/50',
    text: 'Managing 6 platforms used to feel impossible. Now it\'s my secret weapon. I spend more time creating and less time managing — exactly what I needed.',
    stars: 5,
  },
]

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-16 md:py-24 bg-brand-canvas-soft text-brand-ink border-b border-brand-border/40">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-bold text-brand-primary uppercase tracking-widest block mb-3">Testimonials</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-brand-ink leading-tight">
            Creators love Syncra.<br />
            <span className="text-brand-primary">See why.</span>
          </h2>
        </div>

        {/* Grid */}
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
