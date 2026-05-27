import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import styles from './SchedulePicker.module.css'

interface SchedulePickerProps {
  value: string
  onChange: (val: string) => void
  onClear?: () => void
  align?: 'start' | 'end'
}

export default function SchedulePicker({ value, onChange, onClear, align = 'start' }: SchedulePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

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

  const getInitialValues = () => {
    if (!value) {
      const tmrw = new Date()
      tmrw.setDate(tmrw.getDate() + 1)
      const y = tmrw.getFullYear()
      const m = String(tmrw.getMonth() + 1).padStart(2, '0')
      const d = String(tmrw.getDate()).padStart(2, '0')
      return { date: `${y}-${m}-${d}`, time: '09:00' }
    }
    const [d, t] = value.split('T')
    return { date: d || '', time: t ? t.substring(0, 5) : '09:00' }
  }

  const { date: dateString, time: timeString } = getInitialValues()

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    onChange(`${newDate}T${timeString}`)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    onChange(`${dateString}T${newTime}`)
  }

  const parseDate = (dStr: string) => {
    if (!dStr) return null
    const [y, m, d] = dStr.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  const formatDisplayTime = (tStr: string) => {
    if (!tStr) return ''
    const [hStr, mStr] = tStr.split(':')
    const h = parseInt(hStr, 10)
    const m = parseInt(mStr, 10)
    const isPM = h >= 12
    const displayHour = h % 12 === 0 ? 12 : h % 12
    return `${String(displayHour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`
  }

  const parsedDate = parseDate(dateString)
  const displayValue = (value && parsedDate) 
    ? format(parsedDate, 'MMM d, yyyy') + ` at ${formatDisplayTime(timeString)}` 
    : 'Select date & time'

  return (
    <div className={styles.container} ref={containerRef}>
      <button 
        type="button" 
        className={styles.trigger} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarDays size={14} />
        {displayValue}
      </button>

      {isOpen && (
        <div className={styles.popover} ref={popoverRef} style={popoverStyle}>
          <div className={styles.customDateInputs}>
            <label className={styles.dateLabel}>Date:</label>
            <input 
              type="date" 
              value={dateString} 
              onChange={handleDateChange}
              className={styles.datePickerInput}
            />
            <label className={styles.dateLabel}>Time:</label>
            <input 
              type="time" 
              value={timeString} 
              onChange={handleTimeChange}
              className={styles.datePickerInput}
            />
            <div className={styles.actionButtons}>
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                className={styles.applyDateBtn}
              >
                Apply
              </button>
              {onClear && (
                <button 
                  type="button" 
                  className={styles.clearBtn}
                  onClick={() => {
                    onClear()
                    setIsOpen(false)
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}