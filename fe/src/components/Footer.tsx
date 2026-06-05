import { Twitter, Youtube, Instagram, Linkedin } from 'lucide-react'
import logo from '../assets/syncra-logo.png'

const LINKS = {
  Product: ['Features', 'Pricing', 'Changelog', 'Roadmap'],
  Company: ['About', 'Blog', 'Careers', 'Press'],
  Resources: ['Documentation', 'Help Center', 'Status', 'Community'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
}

export default function Footer() {
  return (
    <footer className="bg-brand-ink text-brand-canvas-soft pt-16 pb-12 border-t border-brand-border/15">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-16">
          {/* Brand */}
          <div className="lg:col-span-2 flex flex-col items-start gap-4">
            <a href="#" className="flex items-center gap-2.5 font-bold text-xl text-brand-on-primary tracking-tight">
              <img src={logo} alt="Syncra" className="h-8 w-8 object-contain" />
              <span>Syncra</span>
            </a>
            <p className="text-sm text-brand-mute leading-relaxed max-w-xs">
              The all-in-one platform for content creators to write, schedule, and publish everywhere — effortlessly.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <a href="#" aria-label="Twitter" className="h-8.5 w-8.5 rounded-brand-sm border border-brand-border/10 bg-brand-ink-soft flex items-center justify-center text-brand-mute hover:text-brand-on-primary hover:border-brand-primary/30 hover:bg-brand-primary/10 transition-all duration-150">
                <Twitter size={15} />
              </a>
              <a href="#" aria-label="YouTube" className="h-8.5 w-8.5 rounded-brand-sm border border-brand-border/10 bg-brand-ink-soft flex items-center justify-center text-brand-mute hover:text-brand-on-primary hover:border-brand-primary/30 hover:bg-brand-primary/10 transition-all duration-150">
                <Youtube size={15} />
              </a>
              <a href="#" aria-label="Instagram" className="h-8.5 w-8.5 rounded-brand-sm border border-brand-border/10 bg-brand-ink-soft flex items-center justify-center text-brand-mute hover:text-brand-on-primary hover:border-brand-primary/30 hover:bg-brand-primary/10 transition-all duration-150">
                <Instagram size={15} />
              </a>
              <a href="#" aria-label="LinkedIn" className="h-8.5 w-8.5 rounded-brand-sm border border-brand-border/10 bg-brand-ink-soft flex items-center justify-center text-brand-mute hover:text-brand-on-primary hover:border-brand-primary/30 hover:bg-brand-primary/10 transition-all duration-150">
                <Linkedin size={15} />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group} className="flex flex-col gap-4 col-span-1">
              <h4 className="text-xs font-black uppercase tracking-widest text-brand-on-primary">{group}</h4>
              <ul className="flex flex-col gap-2.5">
                {items.map(item => (
                  <li key={item}>
                    <a href="#" className="text-sm text-brand-mute hover:text-brand-on-primary transition-colors duration-150">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-brand-border/10 pt-8 text-xs text-brand-body-mid">
          <p className="mb-2 sm:mb-0">
            © {new Date().getFullYear()} Syncra. All rights reserved.
          </p>
          <p className="flex items-center gap-1">
            Made with ❤️ for creators everywhere
          </p>
        </div>
      </div>
    </footer>
  )
}
