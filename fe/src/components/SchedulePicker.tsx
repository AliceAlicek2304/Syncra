import { useState, useRef, useEffect } from 'react'
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  isSameDay, 
  isToday as isDateToday 
} from 'date-fns'
import { CalendarDays, ChevronUp, ChevronDown } from 'lucide-react'
import styles from './SchedulePicker.module.css'

interface SchedulePickerProps {
  value: string
  onChange: (val: string) => void
  onClear?: () => void
  align?: 'start' | 'end'
  onlyDate?: boolean
}

export default function SchedulePicker({ value, onChange, onClear, align = 'start', onlyDate = false }: SchedulePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})

  const hourListRef = useRef<HTMLDivElement>(null)
  const minuteListRef = useRef<HTMLDivElement>(null)
  const amPmListRef = useRef<HTMLDivElement>(null)

  const parseValue = (val: string) => {
    if (!val) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return { date: tomorrow, hour: 9, minute: 0, isPM: false }
    }
    const [d, t] = val.split('T')
    if (!d) return { date: new Date(), hour: 9, minute: 0, isPM: false }
    const [y, m, day] = d.split('-').map(Number)
    
    if (!t) {
      return {
        date: new Date(y, m - 1, day),
        hour: 9,
        minute: 0,
        isPM: false
      }
    }

    const [hr, min] = t.split(':').map(Number)
    const isPM = hr >= 12
    const displayHour = hr % 12 === 0 ? 12 : hr % 12
    return {
      date: new Date(y, m - 1, day),
      hour: displayHour,
      minute: min,
      isPM
    }
  }

  const { date: selectedDate, hour, minute, isPM } = parseValue(value)
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date())

  // Keep track of the current month view centered on selected date
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate)
    }
  }, [value])

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Scroll time columns into view when popover opens
  useEffect(() => {
    if (isOpen && !onlyDate) {
      const timer = setTimeout(() => {
        hourListRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
        minuteListRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
        amPmListRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [isOpen, hour, minute, isPM, onlyDate])

  // Position alignment
  useEffect(() => {
    if (isOpen && popoverRef.current) {
      const rect = popoverRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const padding = 16
      
      const parentRect = popoverRef.current.parentElement?.getBoundingClientRect()
      if (!parentRect) return

      let style: React.CSSProperties = {}

      if (align === 'end') {
        const projectedLeft = parentRect.right - rect.width
        if (projectedLeft < padding) {
          const shift = padding - projectedLeft
          style.right = -shift
        } else {
          style.right = 0
        }
      } else {
        const projectedRight = parentRect.left + rect.width
        if (projectedRight > viewportWidth - padding) {
          const shift = projectedRight - (viewportWidth - padding)
          style.left = -shift
        } else {
          style.left = 0
        }
      }
      setPopoverStyle(style)
    } else {
      setPopoverStyle({})
    }
  }, [isOpen, align])

  const handleUpdate = (newDate: Date, newHour: number, newMin: number, pm: boolean) => {
    const year = newDate.getFullYear()
    const month = String(newDate.getMonth() + 1).padStart(2, '0')
    const day = String(newDate.getDate()).padStart(2, '0')
    
    if (onlyDate) {
      onChange(`${year}-${month}-${day}`)
      return
    }

    let militaryHour = newHour
    if (pm && newHour < 12) militaryHour += 12
    if (!pm && newHour === 12) militaryHour = 0
    
    const hh = String(militaryHour).padStart(2, '0')
    const mm = String(newMin).padStart(2, '0')
    onChange(`${year}-${month}-${day}T${hh}:${mm}`)
  }

  const handleDateSelect = (d: Date) => {
    handleUpdate(d, hour, minute, isPM)
  }

  const handleHourSelect = (h: number) => {
    handleUpdate(selectedDate || new Date(), h, minute, isPM)
  }

  const handleMinuteSelect = (m: number) => {
    handleUpdate(selectedDate || new Date(), hour, m, isPM)
  }

  const handleAmPmSelect = (pm: boolean) => {
    handleUpdate(selectedDate || new Date(), hour, minute, pm)
  }

  // Format trigger display value
  const displayValue = value
    ? onlyDate
      ? format(selectedDate, 'MM/dd/yyyy')
      : format(selectedDate, 'MM/dd/yyyy') + ` ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`
    : onlyDate ? 'Select date' : 'Select date & time'

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const hoursArray = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutesArray = Array.from({ length: 60 }, (_, i) => i)

  return (
    <div className={styles.container} ref={containerRef}>
      <button 
        type="button" 
        className={styles.trigger} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{displayValue}</span>
        <CalendarDays size={16} className={styles.triggerIcon} />
      </button>

      {isOpen && (
        <div 
          className={styles.popover} 
          ref={popoverRef} 
          style={{
            ...popoverStyle,
            width: onlyDate ? '280px' : '460px',
            maxWidth: onlyDate ? '280px' : '460px'
          }}
        >
          <div className={styles.popoverBody}>
            {/* Left side: Calendar */}
            <div className={styles.calendarSection}>
              <div className={styles.calendarHeader}>
                <span className={styles.monthLabel}>{format(currentMonth, 'MMMM yyyy')}</span>
                <div className={styles.navButtons}>
                  <button 
                    type="button" 
                    className={styles.navBtn} 
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronUp size={16} style={{ transform: 'rotate(-90deg)' }} />
                  </button>
                  <button 
                    type="button" 
                    className={styles.navBtn} 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className={styles.daysGridHeader}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className={styles.dayOfWeek}>{d}</div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className={styles.daysGrid}>
                {calendarDays.map((day, idx) => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate)
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                  const isTodayDate = isDateToday(day)

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDateSelect(day)}
                      className={`${styles.dayButton} ${isSelected ? styles.daySelected : ''} ${!isCurrentMonth ? styles.dayOutside : ''} ${isTodayDate && !isSelected ? styles.dayToday : ''}`}
                    >
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>

              {/* Calendar Footer */}
              <div className={styles.calendarFooter}>
                <button 
                  type="button" 
                  className={styles.footerLink}
                  onClick={() => {
                    if (onClear) {
                      onClear()
                    } else {
                      onChange('')
                    }
                    setIsOpen(false)
                  }}
                >
                  Clear
                </button>
                <button 
                  type="button" 
                  className={styles.footerLink}
                  onClick={() => {
                    const today = new Date()
                    handleDateSelect(today)
                    setCurrentMonth(today)
                  }}
                >
                  Today
                </button>
              </div>
            </div>

            {!onlyDate && (
              <>
                {/* Vertical Line Separator */}
                <div className={styles.divider} />

                {/* Right side: Time columns */}
                <div className={styles.timeSection}>
                  {/* Hours Column */}
                  <div className={styles.timeColumn} ref={hourListRef}>
                    {hoursArray.map(h => {
                      const active = hour === h
                      return (
                        <button
                          key={h}
                          type="button"
                          data-selected={active}
                          className={`${styles.timeItem} ${active ? styles.timeItemActive : ''}`}
                          onClick={() => handleHourSelect(h)}
                        >
                          {String(h).padStart(2, '0')}
                        </button>
                      )
                    })}
                  </div>

                  {/* Minutes Column */}
                  <div className={styles.timeColumn} ref={minuteListRef}>
                    {minutesArray.map(m => {
                      const active = minute === m
                      return (
                        <button
                          key={m}
                          type="button"
                          data-selected={active}
                          className={`${styles.timeItem} ${active ? styles.timeItemActive : ''}`}
                          onClick={() => handleMinuteSelect(m)}
                        >
                          {String(m).padStart(2, '0')}
                        </button>
                      )
                    })}
                  </div>

                  {/* AM/PM Column */}
                  <div className={styles.timeColumn} ref={amPmListRef}>
                    <button
                      type="button"
                      data-selected={!isPM}
                      className={`${styles.timeItem} ${!isPM ? styles.timeItemActive : ''}`}
                      onClick={() => handleAmPmSelect(false)}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      data-selected={isPM}
                      className={`${styles.timeItem} ${isPM ? styles.timeItemActive : ''}`}
                      onClick={() => handleAmPmSelect(true)}
                    >
                      PM
                </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}