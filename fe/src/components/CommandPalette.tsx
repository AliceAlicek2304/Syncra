import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, LayoutDashboard, Sparkles, Repeat,
  TrendingUp, CalendarDays, BarChart3, Settings,
  PlusSquare, Command
} from 'lucide-react'
import styles from './CommandPalette.module.css'

interface CommandItem {
  id: string
  label: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
  category: 'Navigation' | 'Actions'
}

export default function CommandPalette({ onNewPost }: { onNewPost: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: CommandItem[] = [
    { id: 'dash', label: 'Go to Dashboard', icon: <LayoutDashboard size={18} />, action: () => navigate('/app/dashboard'), category: 'Navigation' },
    { id: 'ideas', label: 'Ideas', icon: <Sparkles size={18} />, action: () => navigate('/app/ideas'), category: 'Navigation' },
    { id: 'repurpose', label: 'AI Repurpose Engine', icon: <Repeat size={18} />, action: () => navigate('/app/repurpose'), category: 'Navigation' },
    { id: 'trends', label: 'Trend Radar', icon: <TrendingUp size={18} />, action: () => navigate('/app/trends'), category: 'Navigation' },
    { id: 'calendar', label: 'Content Calendar', icon: <CalendarDays size={18} />, action: () => navigate('/app/calendar'), category: 'Navigation' },
    { id: 'analytics', label: 'Analytics Insights', icon: <BarChart3 size={18} />, action: () => navigate('/app/analytics'), category: 'Navigation' },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} />, action: () => navigate('/app/settings'), category: 'Navigation' },
    { id: 'new-post', label: 'Create New Post', icon: <PlusSquare size={18} />, action: () => onNewPost(), category: 'Actions', shortcut: 'N' },
  ]

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => {
          if (!prev) {
            setSearch('')
            setSelectedIndex(0)
          }
          return !prev
        })
      }
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleAction = (cmd: CommandItem) => {
    cmd.action()
    setIsOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length)
    } else if (e.key === 'Enter') {
      if (filteredCommands[selectedIndex]) handleAction(filteredCommands[selectedIndex])
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={() => setIsOpen(false)}>
      <div className={styles.container} onClick={e => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className={styles.searchWrap}>
          <Search size={20} className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            className={styles.input}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className={styles.hint}>
            <Command size={12} /> K
          </div>
        </div>

        <div className={styles.results}>
          {filteredCommands.length === 0 ? (
            <div className={styles.empty}>No results found for "{search}"</div>
          ) : (
            <>
              {['Navigation', 'Actions'].map(cat => {
                const group = filteredCommands.filter(c => c.category === cat)
                if (group.length === 0) return null
                return (
                  <div key={cat} className={styles.group}>
                    <div className={styles.groupLabel}>{cat}</div>
                    {group.map(cmd => {
                      const globalIndex = filteredCommands.indexOf(cmd)
                      const isActive = globalIndex === selectedIndex
                      return (
                        <div
                          key={cmd.id}
                          className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                          onClick={() => handleAction(cmd)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <span className={styles.itemIcon}>{cmd.icon}</span>
                          <span className={styles.itemLabel}>{cmd.label}</span>
                          {cmd.shortcut && <span className={styles.itemShortcut}>{cmd.shortcut}</span>}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </>
          )}
        </div>

        <div className={styles.footer}>
          <span><kbd>↑↓</kbd> to navigate</span>
          <span><kbd>↵</kbd> to select</span>
          <span><kbd>esc</kbd> to close</span>
        </div>
      </div>
    </div>
  )
}
