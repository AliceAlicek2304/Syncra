import { useState, useRef, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight,
  CalendarDays, List, LayoutGrid,
  ChevronDown, Minimize2,
} from 'lucide-react'
import type { ViewMode } from '../../types/calendar'
import { MONTHS, MONTHS_SHORT, CURRENT_YEAR } from '../../types/calendar'

const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)
import styles from '../../pages/app/CalendarPage.module.css'

interface CalendarToolbarProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  year: number
  month: number
  platformFilter: string
  onPlatformFilterChange: (filter: string) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  onSelectedDayChange: (day: number | null) => void
  compactMode: boolean
  onCompactModeChange: (compact: boolean) => void
}

export default function CalendarToolbar({
  viewMode,
  onViewModeChange,
  year,
  month,
  platformFilter,
  onPlatformFilterChange,
  onPrev,
  onNext,
  onToday,
  onMonthChange,
  onYearChange,
  onSelectedDayChange,
  compactMode,
  onCompactModeChange
}: CalendarToolbarProps) {
  // Picker dropdown state
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const monthPickerRef = useRef<HTMLDivElement>(null)
  const yearPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setShowMonthPicker(false)
      }
      if (yearPickerRef.current && !yearPickerRef.current.contains(e.target as Node)) {
        setShowYearPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={styles.toolbar}>
        {/* View mode */}
        <div className={styles.viewSwitcher}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'month' ? styles.viewBtnActive : ''}`}
            onClick={() => onViewModeChange('month')}
            title="Month view"
          >
            <LayoutGrid size={14} /> Month
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'week' ? styles.viewBtnActive : ''}`}
            onClick={() => onViewModeChange('week')}
            title="Week view"
          >
            <CalendarDays size={14} /> Week
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'day' ? styles.viewBtnActive : ''}`}
            onClick={() => onViewModeChange('day')}
            title="Day view"
          >
            <List size={14} /> Day
          </button>
          {viewMode === 'month' && (
            <button
              className={`${styles.viewBtn} ${compactMode ? styles.viewBtnActive : ''}`}
              onClick={() => onCompactModeChange(!compactMode)}
              title={compactMode ? "Switch to expanded view" : "Switch to compact view"}
            >
              <Minimize2 size={14} /> {compactMode ? "Compact" : "Expanded"}
            </button>
          )}
        </div>

      {/* Nav controls with month/year picker */}
      <div className={styles.navControls}>
        <button className={styles.navBtn} onClick={onPrev} aria-label="Previous"><ChevronLeft size={15} /></button>

        {/* Month/Year picker */}
        <div className={styles.pickerContainer}>
          <div className={styles.pickerTrigger}>
            <button
              className={styles.monthPickerBtn}
              onClick={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false) }}
              aria-label="Select month"
            >
              {MONTHS_SHORT[month]}
              <ChevronDown size={12} />
            </button>
            <button
              className={styles.yearPickerBtn}
              onClick={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false) }}
              aria-label="Select year"
            >
              {year}
              <ChevronDown size={12} />
            </button>
          </div>

          {/* Month dropdown */}
          {showMonthPicker && (
            <div className={styles.pickerDropdown} ref={monthPickerRef} role="listbox" aria-label="Select month">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  className={`${styles.pickerOption} ${i === month ? styles.pickerOptionActive : ''}`}
                  onClick={() => { onMonthChange(i); setShowMonthPicker(false); onSelectedDayChange(null) }}
                  role="option"
                  aria-selected={i === month}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* Year dropdown */}
          {showYearPicker && (
            <div className={styles.pickerDropdown} ref={yearPickerRef} role="listbox" aria-label="Select year">
              {YEARS.map(y => (
                <button
                  key={y}
                  className={`${styles.pickerOption} ${y === year ? styles.pickerOptionActive : ''}`}
                  onClick={() => { onYearChange(y); setShowYearPicker(false); onSelectedDayChange(null) }}
                  role="option"
                  aria-selected={y === year}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className={styles.navBtn} onClick={onNext} aria-label="Next"><ChevronRight size={15} /></button>
        <button className={styles.todayBtn} onClick={onToday}>Today</button>
      </div>

      {/* Platform filter */}
      <div className={styles.platformFilter}>
        {[
          { id: 'all', label: 'All', color: '#8b5cf6' },
          { id: 'TikTok', label: 'TikTok', color: '#8b5cf6' },
          { id: 'Instagram', label: 'Instagram', color: '#ec4899' },
          { id: 'Facebook', label: 'Facebook', color: '#3b82f6' },
          { id: 'X', label: 'X', color: '#f59e0b' },
          { id: 'LinkedIn', label: 'LinkedIn', color: '#22d3ee' },
          { id: 'YouTube', label: 'YouTube', color: '#ef4444' },
        ].map(p => (
          <button
            key={p.id}
            className={`${styles.filterChip} ${platformFilter === p.id ? styles.filterChipActive : ''}`}
            style={platformFilter === p.id ? { borderColor: p.color, color: p.color, background: `${p.color}18` } : {}}
            onClick={() => onPlatformFilterChange(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}