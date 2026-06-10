import { Clock, CheckCircle2, AlertCircle, RotateCw, Trash2, ChevronRight } from 'lucide-react'
import type { RepurposeSessionSummary } from '../../context/repurposeContextBase'
import { cn } from '@/lib/utils'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function statusIcon(status: string) {
  switch (status) {
    case 'Completed': return <CheckCircle2 size={12} className="text-green-500" />
    case 'Failed': return <AlertCircle size={12} className="text-destructive" />
    default: return <RotateCw size={12} className="text-yellow-500 animate-spin" />
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'Completed': return 'text-green-500'
    case 'Failed': return 'text-destructive'
    default: return 'text-yellow-500'
  }
}

interface Props {
  sessions: RepurposeSessionSummary[]
  activeSessionId: string | null
  onSwitch: (id: string) => void
  onDelete: (id: string) => void
}

export default function GenerationHistoryTable({ sessions, activeSessionId, onSwitch, onDelete }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
          Generation History
          {sessions.length > 0 && (
            <span className="ml-1.5 text-muted-foreground font-semibold">({sessions.length})</span>
          )}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="h-9 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Source</th>
              <th className="h-9 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Platform</th>
              <th className="h-9 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="h-9 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Created</th>
              <th className="h-9 px-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No sessions yet</td>
              </tr>
            ) : (
              sessions.map(s => (
                <tr
                  key={s.id}
                  onClick={() => onSwitch(s.id)}
                  className={cn(
                    "border-b border-border/50 transition-colors cursor-pointer",
                    s.id === activeSessionId
                      ? "bg-primary/5 [box-shadow:inset_2px_0_0_hsl(var(--primary))]"
                      : "hover:bg-accent/30"
                  )}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground line-clamp-1 max-w-[140px]">
                        {s.sourceText || '(empty)'}
                      </span>
                      <ChevronRight size={10} className="text-muted-foreground shrink-0" />
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className="text-xs text-muted-foreground">{s.targetPlatforms}</span>
                  </td>
                  <td className="p-3">
                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide", statusClass(s.status))}>
                      {statusIcon(s.status)}
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock size={10} />
                      {formatDate(s.createdAtUtc)}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(s.id) }}
                      className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete session"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
