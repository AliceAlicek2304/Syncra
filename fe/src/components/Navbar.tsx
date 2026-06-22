import { useState, useEffect } from 'react'
import { Menu, X, Plug, Lightbulb, Calendar, BarChart2, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import logo from '../assets/syncra-logo.png'

import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu'

const NAV_LINKS = [
  { label: 'Tính năng', href: '#features' },
  { label: 'Cách hoạt động', href: '#how-it-works' },
  { label: 'Bảng giá', href: '#pricing' },
  { label: 'Khách hàng', href: '#testimonials' },
]

const USER_MENU = [
  { label: 'Kết nối', icon: Plug, path: '/app/connections' },
  { label: 'Ý tưởng', icon: Lightbulb, path: '/app/ideas' },
  { label: 'Lịch đăng', icon: Calendar, path: '/app/posts-all?view=calendar' },
  { label: 'Phân tích', icon: BarChart2, path: '/app/analytics' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogin = () => {
    navigate('/login')
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className={`sticky top-0 z-50 w-full transition-all duration-200 border-b ${
      scrolled
        ? 'bg-brand-canvas-soft/90 backdrop-blur-md border-brand-border/60 py-3 shadow-sm'
        : 'bg-transparent border-transparent py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <motion.a
          href="#"
          className="flex items-center gap-2.5 font-sans font-bold text-xl text-brand-ink tracking-tight focus:outline-none"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <img src={logo} alt="Syncra" className="h-8 w-8 object-contain" />
          <span>Syncra</span>
        </motion.a>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(l => (
            <li key={l.label}>
              <a
                href={l.href}
                className="text-brand-body hover:text-brand-primary font-medium text-sm transition-colors duration-150"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA / Avatar */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 text-left focus:outline-none hover:opacity-90 group transition-all">
                  <Avatar className="h-9 w-9 border border-brand-border group-hover:border-brand-primary transition-colors">
                    {user.avatarUrl ? (
                      <AvatarImage src={user.avatarUrl} alt={user.displayName ?? user.email ?? 'User'} />
                    ) : null}
                    <AvatarFallback className="bg-brand-primary/10 text-brand-primary font-bold">
                      {(user.displayName ?? user.email ?? '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-brand-ink max-w-[120px] truncate">{user.displayName ?? user.email ?? 'Người dùng'}</div>
                    <div className="text-[10px] text-brand-body-mid font-medium uppercase tracking-wider">Gói miễn phí</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 border border-brand-border bg-brand-canvas shadow-lg rounded-brand-md p-1.5 animate-in fade-in-50 slide-in-from-top-1">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5 py-1">
                    <p className="text-[10px] font-semibold text-brand-body-mid uppercase tracking-wider">Tài khoản</p>
                    <p className="text-sm font-bold text-brand-ink truncate">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-brand-border my-1" />
                {USER_MENU.map(item => (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium text-brand-body hover:bg-brand-canvas-soft hover:text-brand-ink rounded-md transition-colors"
                  >
                    <item.icon size={16} className="text-brand-body-mid" />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-brand-border my-1" />
                <DropdownMenuItem
                  className="flex items-center gap-2.5 px-2.5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.1 }}
                className="text-brand-ink hover:text-brand-primary font-semibold text-sm px-4 py-2 transition-colors duration-150"
                onClick={handleLogin}
              >
                Đăng nhập
              </motion.button>
              <motion.a
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.1 }}
                href="#pricing"
                className="bg-brand-primary text-brand-on-primary font-bold text-sm px-5 py-2.5 rounded-brand-md hover:bg-brand-primary-hover shadow-sm hover:shadow transition-all duration-200"
              >
                Dùng thử miễn phí
              </motion.a>
            </>
          )}
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden p-2 text-brand-ink hover:text-brand-primary focus:outline-none transition-colors"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Mở hoặc đóng menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="absolute top-full left-0 w-full bg-brand-canvas border-b border-brand-border/60 px-6 py-6 flex flex-col gap-4 md:hidden shadow-lg animate-in fade-in slide-in-from-top-4 duration-200 z-50">
          {NAV_LINKS.map(l => (
            <a
              key={l.label}
              href={l.href}
              className="text-brand-ink hover:text-brand-primary font-semibold text-base py-2 border-b border-brand-canvas-soft transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            {user ? (
              <button
                className="w-full bg-brand-canvas-soft border border-brand-border text-brand-ink font-semibold py-3 rounded-brand-md hover:bg-brand-border/20 transition-all flex items-center justify-center gap-2"
                onClick={() => { navigate('/app/connections'); setMenuOpen(false) }}
              >
                <Plug size={16} /> Kết nối
              </button>
            ) : (
              <>
                <button
                  className="w-full bg-brand-canvas-soft border border-brand-border text-brand-ink font-semibold py-3 rounded-brand-md hover:bg-brand-border/20 transition-all"
                  onClick={() => { handleLogin(); setMenuOpen(false) }}
                >
                  Đăng nhập
                </button>
                <a
                  href="#pricing"
                  className="w-full bg-brand-primary text-brand-on-primary font-bold py-3 rounded-brand-md hover:bg-brand-primary-hover shadow-sm transition-all flex items-center justify-center"
                  onClick={() => setMenuOpen(false)}
                >
                  Dùng thử miễn phí
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
