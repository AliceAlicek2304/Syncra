const STATS = [
  { value: '2.400+', label: 'Creator đang dùng' },
  { value: '6', label: 'Nền tảng hỗ trợ' },
  { value: '98%', label: 'Mức ổn định' },
  { value: '12M+', label: 'Bài đã lên lịch' },
]

export default function Stats() {
  return (
    <section className="py-8 bg-brand-canvas-soft border-b border-brand-border/40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-brand-border bg-brand-canvas rounded-brand-md shadow-sm divide-y lg:divide-y-0 lg:divide-x divide-brand-border">
          {STATS.map((s) => (
            <div key={s.label} className="py-8 px-4 flex flex-col items-center justify-center text-center">
              <div className="text-3xl sm:text-4xl font-black text-brand-primary tracking-tight mb-1.5">{s.value}</div>
              <div className="text-[11px] sm:text-xs font-bold text-brand-body uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
