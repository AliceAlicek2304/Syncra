import { Twitter, Youtube, Instagram, Linkedin } from 'lucide-react'
import styles from './Footer.module.css'
import logo from '../assets/syncra-logo.png'

const LINKS = {
  Product: ['Features', 'Pricing', 'Changelog', 'Roadmap'],
  Company: ['About', 'Blog', 'Careers', 'Press'],
  Resources: ['Documentation', 'Help Center', 'Status', 'Community'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
}

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.top}>
          {/* Brand */}
          <div className={styles.brand}>
            <a href="#" className={styles.logo}>
              <img src={logo} alt="Syncra" className={styles.logoImg} />
              <span className={styles.logoText}>Syncra</span>
            </a>
            <p className={styles.tagline}>
              The all-in-one platform for content creators to write, schedule, and publish everywhere — effortlessly.
            </p>
            <div className={styles.socials}>
              <a href="#" aria-label="Twitter" className={styles.social}><Twitter size={16} /></a>
              <a href="#" aria-label="YouTube" className={styles.social}><Youtube size={16} /></a>
              <a href="#" aria-label="Instagram" className={styles.social}><Instagram size={16} /></a>
              <a href="#" aria-label="LinkedIn" className={styles.social}><Linkedin size={16} /></a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group} className={styles.linkGroup}>
              <h4 className={styles.groupTitle}>{group}</h4>
              <ul className={styles.linkList}>
                {items.map(item => (
                  <li key={item}>
                    <a href="#" className={styles.link}>{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>
            © {new Date().getFullYear()} Syncra. All rights reserved.
          </p>
          <p className={styles.madeWith}>
            Made with ❤️ for creators everywhere
          </p>
        </div>
      </div>
    </footer>
  )
}
