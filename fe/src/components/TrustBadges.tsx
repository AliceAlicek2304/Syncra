import { Shield, Lock, RefreshCcw, Headphones, Award, CreditCard } from 'lucide-react'
import { ZERNIO_PLATFORMS } from '../data/platforms'
import { motion } from 'framer-motion'

const BADGES = [
  { icon: <Shield size={18} />, label: 'SOC 2 Compliant' },
  { icon: <Lock size={18} />, label: 'SSL Encrypted' },
  { icon: <RefreshCcw size={18} />, label: '99.9% Uptime' },
  { icon: <Headphones size={18} />, label: '24/7 Support' },
  { icon: <Award size={18} />, label: 'GDPR Ready' },
  { icon: <CreditCard size={18} />, label: 'No contracts' },
]

const PLATFORMS = ZERNIO_PLATFORMS
  .filter(p => ['tiktok', 'instagram', 'youtube', 'linkedin', 'twitter', 'facebook'].includes(p.id))
  .map(p => p.label)

export default function TrustBadges() {
  return (
    <section className="py-16 md:py-24 bg-brand-canvas-soft text-brand-ink border-b border-brand-border/40">
      <div className="max-w-7xl mx-auto px-6">
        {/* Trust badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto mb-20">
          {BADGES.map(b => (
            <div key={b.label} className="border border-brand-border bg-brand-canvas px-4 py-5 rounded-brand-md flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all duration-150">
              <span className="text-brand-primary shrink-0">{b.icon}</span>
              <span className="text-xs sm:text-sm font-bold text-brand-ink-soft">{b.label}</span>
            </div>
          ))}
        </div>

        {/* Platform logos strip */}
        <div className="text-center py-10 border-t border-b border-brand-border/60 max-w-5xl mx-auto mb-20">
          <p className="text-[10px] font-bold text-brand-body-mid uppercase tracking-widest mb-6">Works with all your favourite platforms</p>
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            {PLATFORMS.map(p => (
              <div key={p} className="text-xs sm:text-sm font-bold text-brand-ink px-4.5 py-2.5 bg-brand-canvas-soft border border-brand-border rounded-brand-sm shadow-xs select-none">
                {p}
              </div>
            ))}
          </div>
        </div>

        {/* CTA banner */}
        <div className="relative overflow-hidden border border-brand-ink bg-brand-ink text-brand-on-primary rounded-brand-md p-8 md:p-14 text-center max-w-5xl mx-auto shadow-md border-2">
          {/* Subtle orange accent glow behind content */}
          <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full bg-brand-primary/10 filter blur-[80px] -z-10 -translate-x-1/2 -translate-y-1/2" />
          
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-4 leading-tight max-w-2xl mx-auto">
              Ready to grow your audience <span className="text-brand-primary">10x faster?</span>
            </h2>
            <p className="text-sm sm:text-base text-brand-on-primary/80 max-w-xl mx-auto mb-8 leading-relaxed">
              Join 2,400+ creators who already trust Syncra. Free plan — no credit card required.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <motion.a 
                whileTap={{ scale: 0.98 }}
                href="#pricing" 
                className="w-full sm:w-auto bg-brand-primary hover:bg-brand-primary-hover text-brand-on-primary font-bold text-sm px-6 py-3.5 rounded-brand-md transition-all duration-150 shadow-sm hover:shadow"
              >
                Start for free today
              </motion.a>
              <motion.a 
                whileTap={{ scale: 0.98 }}
                href="#features" 
                className="w-full sm:w-auto bg-brand-ink-soft border border-brand-border/20 text-brand-on-primary hover:bg-brand-border/10 font-bold text-sm px-6 py-3.5 rounded-brand-md transition-all duration-150"
              >
                Explore features
              </motion.a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
