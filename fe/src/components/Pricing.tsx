import { Check } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import logo from '../assets/syncra-logo.png'

const PLANS = [
  {
    name: 'Basic',
    icon: <img src={logo} alt="Syncra" className="w-5 h-5 object-contain" />,
    price: { monthly: 99, yearly: 79 },
    desc: 'Perfect for testing the platform.',
    features: [
      '20 Social Media Connections',
      'Unlimited scheduled posts',
      'Basic analytics',
      'Content editor',
      'Community support',
      'AI assistant (limited)',
    ],
    cta: 'Start 14-day trial',
    highlight: false,
  },
  {
    name: 'Pro',
    icon: <img src={logo} alt="Syncra" className="w-5 h-5 object-contain invert" />,
    price: { monthly: 149, yearly: 119 },
    desc: 'For serious content creators.',
    features: [
      'Up to 50 Social Media Connections',
      'Unlimited scheduled posts',
      'Advanced analytics',
      'Best-time scheduling',
      'Content recycling',
      'Priority support',
      'AI assistant',
    ],
    cta: 'Start 14-day trial',
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Max',
    icon: <img src={logo} alt="Syncra" className="w-5 h-5 object-contain" />,
    price: { monthly: 199, yearly: 159 },
    desc: 'For teams & power creators.',
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Custom brand kits',
      'White-label reports',
      'API access',
      'Dedicated support',
      'Custom integrations',
    ],
    cta: 'Start 14-day trial',
    highlight: false,
  },
]

export default function Pricing() {
  const [yearly, setYearly] = useState(false)

  return (
    <section id="pricing" className="py-16 md:py-24 bg-brand-canvas-soft text-brand-ink border-b border-brand-border/40">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="text-xs font-bold text-brand-primary uppercase tracking-widest block mb-3">Pricing</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-brand-ink leading-tight">
            Simple, transparent pricing.<br />
            <span className="text-brand-primary">Scale when you're ready.</span>
          </h2>
          <p className="text-base sm:text-lg text-brand-body mt-4 max-w-xl mx-auto leading-relaxed">
            Start with a 14-day free trial. No credit card required. Cancel anytime.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <span 
              className={`text-sm font-bold select-none cursor-pointer transition-colors duration-150 ${!yearly ? 'text-brand-ink' : 'text-brand-body-mid'}`}
              onClick={() => setYearly(false)}
            >
              Monthly
            </span>
            <button
              className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 outline-none relative flex items-center ${yearly ? 'bg-brand-primary' : 'bg-brand-mute'}`}
              onClick={() => setYearly(y => !y)}
              aria-label="Toggle billing period"
            >
              <motion.span 
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`w-4.5 h-4.5 rounded-full bg-brand-on-primary shadow-sm absolute ${yearly ? 'right-1' : 'left-1'}`} 
              />
            </button>
            <span 
              className={`text-sm font-bold select-none cursor-pointer transition-colors duration-150 flex items-center gap-2 ${yearly ? 'text-brand-ink' : 'text-brand-body-mid'}`}
              onClick={() => setYearly(true)}
            >
              Yearly 
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded-full">Save 20%</span>
            </span>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`rounded-brand-md p-8 flex flex-col shadow-sm relative transition-all duration-150 hover:shadow-md border ${
                plan.highlight 
                  ? 'border-brand-ink bg-brand-ink text-brand-on-primary' 
                  : 'border-brand-border bg-brand-canvas text-brand-ink'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary text-brand-on-primary text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-sm">
                  {plan.badge}
                </div>
              )}
              
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-brand-sm flex items-center justify-center p-1.5 border ${
                    plan.highlight 
                      ? 'bg-brand-ink-soft border-brand-ink-soft' 
                      : 'bg-brand-canvas border-brand-border'
                  }`}>
                    {plan.icon}
                  </div>
                  <span className="text-2xl font-black tracking-tight">{plan.name}</span>
                </div>
                <p className={`text-sm leading-relaxed ${plan.highlight ? 'text-brand-on-primary/80' : 'text-brand-body-mid'}`}>
                  {plan.desc}
                </p>
              </div>

              <div className={`mb-8 border-b pb-6 flex items-baseline gap-1 ${
                plan.highlight ? 'border-brand-border/20' : 'border-brand-border/60'
              }`}>
                <span className="text-4xl font-extrabold tracking-tight">
                  {yearly ? plan.price.yearly : plan.price.monthly}.000
                </span>
                <span className={`text-xs font-semibold ${plan.highlight ? 'text-brand-on-primary/60' : 'text-brand-body-mid'}`}>
                  đ / tháng
                </span>
              </div>

              <ul className="flex flex-col gap-3.5 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm font-medium">
                    <Check size={16} className="text-brand-primary shrink-0 mt-0.5" />
                    <span className={plan.highlight ? 'text-brand-on-primary/95' : 'text-brand-body'}>{f}</span>
                  </li>
                ))}
              </ul>

              <motion.a
                whileTap={{ scale: 0.98 }}
                href="#"
                className={`w-full py-3 font-bold rounded-brand-md text-sm transition-all inline-flex items-center justify-center shadow-sm hover:shadow ${
                  plan.highlight 
                    ? 'bg-brand-primary text-brand-on-primary hover:bg-brand-primary-hover' 
                    : 'bg-brand-canvas border border-brand-border text-brand-ink hover:bg-brand-canvas-soft'
                }`}
              >
                {plan.cta}
              </motion.a>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-brand-body-mid mt-10">
          All plans include a 14-day money-back guarantee. No contracts.
        </p>
      </div>
    </section>
  )
}
