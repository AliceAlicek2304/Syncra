import { Twitter, Youtube, Instagram, Linkedin } from 'lucide-react'
import logo from '../assets/syncra-logo.png'

const LINKS = {
  'Sản phẩm': ['Tính năng', 'Bảng giá', 'Cập nhật', 'Lộ trình'],
  'Công ty': ['Giới thiệu', 'Blog', 'Tuyển dụng', 'Báo chí'],
  'Tài nguyên': ['Tài liệu', 'Trung tâm hỗ trợ', 'Trạng thái', 'Cộng đồng'],
  'Pháp lý': ['Chính sách bảo mật', 'Điều khoản dịch vụ', 'Chính sách cookie'],
}

export default function Footer() {
  return (
    <footer className="bg-brand-ink text-brand-canvas-soft pt-16 pb-12 border-t border-brand-border/15">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-16">
          <div className="lg:col-span-2 flex flex-col items-start gap-4">
            <a href="#" className="flex items-center gap-2.5 font-bold text-xl text-brand-on-primary tracking-tight">
              <img src={logo} alt="Syncra" className="h-8 w-8 object-contain" />
              <span>Syncra</span>
            </a>
            <p className="text-sm text-brand-mute leading-relaxed max-w-xs">
              Nền tảng all-in-one giúp creator viết nội dung, lên lịch và đăng bài đa kênh dễ dàng hơn.
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
            © {new Date().getFullYear()} Syncra. Đã đăng ký bản quyền.
          </p>
          <p className="flex items-center gap-1">
            Làm ra cho creator Việt Nam
          </p>
        </div>
      </div>
    </footer>
  )
}
