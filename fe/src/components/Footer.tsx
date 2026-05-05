import { Twitter, Youtube, Instagram, Linkedin } from 'lucide-react'
import styles from './Footer.module.css'
import logo from '../assets/syncra-logo.png'

const LINKS = {
  'Sản phẩm': ['Tính năng', 'Bảng giá', 'Nhật ký thay đổi', 'Lộ trình'],
  'Công ty': ['Giới thiệu', 'Blog', 'Tuyển dụng', 'Báo chí'],
  'Tài nguyên': ['Tài liệu', 'Trung tâm trợ giúp', 'Trạng thái', 'Cộng đồng'],
  'Pháp lý': ['Chính sách quyền riêng tư', 'Điều khoản dịch vụ', 'Chính sách cookie'],
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
              Nền tảng tất cả trong một giúp creator viết, lên lịch và đăng bài khắp nơi một cách dễ dàng.
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
                {items.map((item: string) => (
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
            © {new Date().getFullYear()} Syncra. Bảo lưu mọi quyền.
          </p>
          <p className={styles.madeWith}>
            Được tạo ra cho creator ở khắp mọi nơi
          </p>
        </div>
      </div>
    </footer>
  )
}
