import { File, Link, FileText, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react'
import type { SupportingSource } from '../../context/repurposeContextBase'

interface Props {
  source: SupportingSource
  onRemove: (id: string) => void
}

export default function SourceChip({ source, onRemove }: Props) {
  const statusIcon = () => {
    switch (source.status) {
      case 'processing': return <Loader2 size={10} className="animate-spin" />
      case 'ready': return <CheckCircle2 size={10} className="text-green-500" />
      case 'error': return <AlertCircle size={10} className="text-destructive" />
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-border bg-accent/5 text-foreground shadow-sm">
      {source.type === 'url' ? <Link size={10} /> : source.type === 'post' ? <FileText size={10} /> : <File size={10} />}
      <span className="max-w-[120px] truncate">{source.label}</span>
      {statusIcon()}
      <button
        onClick={() => onRemove(source.id)}
        className="ml-0.5 hover:text-destructive transition-colors"
      >
        <X size={10} />
      </button>
    </div>
  )
}
