import {
  PenLine, CalendarClock, BarChart3, Globe2,
  Sparkles, Repeat2,
} from 'lucide-react'

const FEATURES = [
  {
    icon: <PenLine size={22} />,
    title: 'Smart Content Editor',
    desc: 'Write once and auto-adapt your copy for each platform\'s tone, length, and format — TikTok, LinkedIn, Instagram, and beyond.',
    colorClass: 'bg-violet-100 text-violet-700',
  },
  {
    icon: <CalendarClock size={22} />,
    title: 'Intelligent Scheduling',
    desc: 'Pick the best time to post based on your audience activity. Set it and forget it — Syncra handles the rest.',
    colorClass: 'bg-pink-100 text-pink-700',
  },
  {
    icon: <Globe2 size={22} />,
    title: 'Multi-Platform Publishing',
    desc: 'Publish to TikTok, Instagram, YouTube, LinkedIn, X, and Facebook simultaneously from a single dashboard.',
    colorClass: 'bg-cyan-100 text-cyan-700',
  },
  {
    icon: <BarChart3 size={22} />,
    title: 'Unified Analytics',
    desc: 'Track reach, engagement, and follower growth across every platform in one clean real-time dashboard.',
    colorClass: 'bg-amber-100 text-amber-700',
  },
  {
    icon: <Sparkles size={22} />,
    title: 'AI Writing Assistant',
    desc: 'Get caption ideas, hashtag suggestions, and SEO-friendly hooks powered by AI. Save hours every week.',
    colorClass: 'bg-emerald-100 text-emerald-700',
    badge: 'Coming soon',
  },
  {
    icon: <Repeat2 size={22} />,
    title: 'Content Recycling',
    desc: 'Automatically re-schedule high-performing evergreen content to maximize its long-term reach.',
    colorClass: 'bg-rose-100 text-rose-700',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-16 md:py-24 bg-brand-canvas-soft text-brand-ink border-b border-brand-border/40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl text-left">
          <span className="text-xs font-bold text-brand-primary uppercase tracking-widest block mb-3">Features</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-brand-ink leading-tight">
            Everything a creator needs.<br />
            <span className="text-brand-primary">Nothing they don't.</span>
          </h2>
          <p className="text-base sm:text-lg text-brand-body mt-4 leading-relaxed max-w-xl">
            Built specifically for solo creators and small teams who want
            professional-grade tools without enterprise complexity.
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
