import { useState, useRef, useEffect } from 'react'
import { format, isValid } from 'date-fns'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { CalendarDays, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './SchedulePicker.module.css'

interface SchedulePickerProps {
  value: string
  onChange: (val: string) => void
  onClear?: () => void
}

export default function SchedulePicker({ value, onChange, onClear }: SchedulePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const parseValue = (val: string) => {
    if (!val) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return { date: tomorrow, hours: 9, minutes: 0 }
    }
    const [d, t] = val.split('T')
    if (!d || !t) return { date: new Date(), hours: 9, minutes: 0 }
    const [y, m, day] = d.split('-').map(Number)
    const [hr, min] = t.split(':').map(Number)
    return {
      date: new Date(y, m - 1, day),
      hours: hr,
      minutes: min
    }
  }

  const currentParsed = parseValue(value)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value ? currentParsed.date : undefined)
  const [hours, setHours] = useState(currentParsed.hours)
  const [minutes, setMinutes] = useState(currentParsed.minutes)

  useEffect(() => {
    if (!value) {
      setSelectedDate(undefined)
      return
    }
    const parsed = parseValue(value)
    if (isValid(parsed.date)) {
      setSelectedDate(parsed.date)
      setHours(parsed.hours)
      setMinutes(parsed.minutes)
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleUpdate = (d: Date | undefined, h: number, m: number) => {
    if (!d) return
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    onChange(`${year}-${month}-${day}T${hh}:${mm}`)
  }

  const handleDateSelect = (d: Date | undefined) => {
    if (d) {
      setSelectedDate(d)
      handleUpdate(d, hours, minutes)
    }
  }

  const handleTimeChange = (h: number, m: number) => {
    setHours(h)
    setMinutes(m)
    if (selectedDate) handleUpdate(selectedDate, h, m)
  }

  const isPM = hours >= 12
  const displayHour = hours % 12 === 0 ? 12 : hours % 12

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    let newH = parseInt(e.target.value, 10)
    if (isPM && newH < 12) newH += 12
    if (!isPM && newH === 12) newH = 0
    handleTimeChange(newH, minutes)
  }

  const handleAmPmChange = (pm: boolean) => {
    if (pm && !isPM) handleTimeChange(hours + 12, minutes)
    if (!pm && isPM) handleTimeChange(hours - 12, minutes)
  }

  const displayValue = (value && selectedDate) 
    ? format(selectedDate, 'MMM d, yyyy') + ` at ${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}` 
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
        <div className={styles.popover}>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            showOutsideDays
            fixedWeeks /* Always render exactly 6 weeks (42 days) to prevent layout shifts */
            components={{
              IconLeft: () => <ChevronLeft size={16} />,
              IconRight: () => <ChevronRight size={16} />
            }}
          />

          <div className={styles.timeSection}>
            <div className={styles.timeLabel}>
              <Clock size={13} /> Time
            </div>
            <div className={styles.timeControls}>
              <select className={styles.timeSelect} value={displayHour} onChange={handleHourChange}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                ))}
              </select>
              <span className={styles.timeColon}>:</span>
              <select className={styles.timeSelect} value={minutes} onChange={e => handleTimeChange(hours, parseInt(e.target.value, 10))}>
                {Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
              
              <div className={styles.amPmToggle}>
                <button 
                  type="button" 
                  className={`${styles.amPmBtn} ${!isPM ? styles.amPmActive : ''}`}
                  onClick={() => handleAmPmChange(false)}
                >AM</button>
                <button 
                  type="button" 
                  className={`${styles.amPmBtn} ${isPM ? styles.amPmActive : ''}`}
                  onClick={() => handleAmPmChange(true)}
                >PM</button>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <button 
              type="button" 
              className={styles.footerBtn}
              onClick={() => handleDateSelect(new Date())}
            >Today</button>
            {onClear && (
              <button 
                type="button" 
                className={styles.footerBtn}
                onClick={() => {
                  onClear();
                  setIsOpen(false);
                }}
              >Clear</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}