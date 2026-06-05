import { Play, ArrowRight, TrendingUp, BarChart2, Globe } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-ink text-brand-on-primary py-16 md:py-24 border-b border-brand-border/10">
      {/* Visual background details */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full filter blur-[120px] opacity-40 -z-10 translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-canvas-soft/5 rounded-full filter blur-[120px] opacity-30 -z-10 -translate-x-1/4 translate-y-1/4" />

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Left: copy */}
        <div className="lg:col-span-7 flex flex-col items-start text-left z-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-ink-soft border border-brand-border/20 text-xs font-bold text-brand-mute mb-6 tracking-wide shadow-sm">
            <span className="h-2 w-2 rounded-full bg-brand-primary animate-pulse" />
            <span>New · AI content suggestions coming soon</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-brand-on-primary leading-[1.08] mb-6">
            Create once.<br />
            <span className="text-brand-primary">Post everywhere.</span><br />
            Grow faster.
          </h1>

          <p className="text-lg md:text-xl text-brand-mute max-w-lg mb-8 leading-relaxed">
            Syncra helps content creators write, schedule, and publish to
            every platform — all from one beautiful dashboard. No more
            copy-pasting. No more missed posts.
          </p>

          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto mb-10">
            <motion.a 
              whileTap={{ scale: 0.98 }}
              href="#pricing" 
              className="w-full sm:w-auto bg-brand-primary text-brand-on-primary font-bold text-base px-6 py-3.5 rounded-brand-md hover:bg-brand-primary-hover shadow hover:shadow-md transition-all duration-150 flex items-center justify-center gap-2"
            >
              Start for free <ArrowRight size={16} />
            </motion.a>
            <motion.a 
              whileTap={{ scale: 0.98 }}
              href="#how-it-works" 
              className="w-full sm:w-auto bg-brand-ink-soft border border-brand-border/20 text-brand-on-primary hover:bg-brand-border/10 font-bold text-base px-6 py-3.5 rounded-brand-md transition-all duration-150 flex items-center justify-center gap-2"
            >
              <Play size={14} className="fill-brand-on-primary" /> See how it works
            </motion.a>
          </div>

          <div className="flex items-center gap-4 py-2 border-t border-brand-border/10 w-full sm:w-auto">
            <div className="flex -space-x-3.5">
              {['pink', 'purple', 'amber', 'teal', 'blue'].map((c, i) => (
                <div 
                  key={c} 
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-brand-ink-soft border-2 border-brand-ink text-xs font-bold text-brand-on-primary shadow-sm uppercase`} 
                  style={{ zIndex: 5 - i }}
                >
                  {['A', 'B', 'C', 'D', 'E'][i]}
                </div>
              ))}
            </div>
            <p className="text-sm text-brand-mute">
              <strong className="text-brand-on-primary font-bold">+2,400</strong> creators already growing with Syncra
            </p>
          </div>
        </div>

        {/* Right: mock dashboard */}
        <div className="lg:col-span-5 relative w-full flex items-center justify-center lg:justify-end z-10">
          <div className="w-full max-w-[460px] border border-brand-border/60 bg-brand-canvas p-6 rounded-brand-md shadow-2xl flex flex-col gap-6 relative text-brand-ink">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-brand-ink">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Performance Overview
              </div>
              <span className="bg-brand-canvas-soft border border-brand-border text-[10px] font-bold text-brand-ink-mid px-2.5 py-0.5 rounded-full uppercase tracking-wider">Live</span>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <TrendingUp size={14} />, label: 'Reach', value: '128K', delta: '+24%', color: 'text-emerald-600' },
                { icon: <BarChart2 size={14} />, label: 'Engage', value: '8.4%', delta: '+11%', color: 'text-emerald-600' },
                { icon: <Globe size={14} />, label: 'Active', value: '6', delta: 'platforms', color: 'text-brand-primary' },
              ].map(c => (
                <div key={c.label} className="border border-brand-border bg-brand-canvas-soft rounded-brand-sm p-3 flex flex-col gap-1.5">
                  <div className="text-brand-ink-mid flex items-center justify-between">{c.icon}</div>
                  <div className="text-[10px] font-semibold text-brand-body-mid uppercase tracking-wide truncate">{c.label}</div>
                  <div className="text-lg font-bold text-brand-ink leading-tight">{c.value}</div>
                  <div className={`text-[10px] font-bold ${c.color}`}>{c.delta}</div>
                </div>
              ))}
            </div>

            {/* Chart bars */}
            <div className="border border-brand-border bg-brand-canvas-soft rounded-brand-sm p-4 flex flex-col gap-3">
              <div className="text-[10px] font-bold text-brand-body-mid uppercase tracking-wide">Weekly posts</div>
              <div className="flex items-end justify-between h-20 gap-2">
                {[40, 65, 50, 80, 55, 90, 72].map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05 }}
                      className="w-full bg-brand-primary hover:bg-brand-primary-hover rounded-t-[4px] cursor-pointer shadow-sm"
                    />
                    <span className="text-[10px] font-bold text-brand-body-mid">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform pills */}
            <div className="flex flex-wrap gap-2">
              {['TikTok', 'Instagram', 'YouTube', 'LinkedIn', 'X', 'Facebook'].map(p => (
                <span key={p} className="bg-brand-canvas-soft border border-brand-border text-xs font-semibold text-brand-ink px-2.5 py-1 rounded-brand-sm">
                  {p}
                </span>
              ))}
            </div>

            {/* Floating notifications */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -top-6 -right-6 md:-right-8 border border-brand-border bg-brand-canvas p-3 rounded-brand-md shadow-lg flex items-center gap-3 max-w-[190px]"
            >
              <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-sm">✅</div>
              <div className="leading-tight">
                <div className="text-xs font-bold text-brand-ink">Post published!</div>
                <div className="text-[10px] text-brand-body-mid">TikTok · 2s ago</div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="absolute -bottom-6 -left-6 md:-left-8 border border-brand-border bg-brand-canvas p-3 rounded-brand-md shadow-lg flex items-center gap-3 max-w-[190px]"
            >
              <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center text-sm">⏰</div>
              <div className="leading-tight">
                <div className="text-xs font-bold text-brand-ink">Scheduled</div>
                <div className="text-[10px] text-brand-body-mid">Insta · 3h from now</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
