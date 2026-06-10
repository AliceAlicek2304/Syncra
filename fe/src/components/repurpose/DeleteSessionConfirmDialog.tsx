import { Trash2 } from 'lucide-react'

interface DeleteSessionConfirmDialogProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function DeleteSessionConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: DeleteSessionConfirmDialogProps) {
  if (!open) return null

  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <div
      className="fixed inset-0 z-[9500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={onCancel}
    >
      <div
        className="w-full max-w-[420px] flex flex-col items-center text-center p-6 bg-card border border-border rounded-xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Delete Session History Dialog"
      >
        <div className="mb-5">
          <div className="size-14 rounded-full bg-destructive/10 border border-destructive/30 text-destructive flex items-center justify-center">
            <Trash2 size={28} />
          </div>
        </div>

        <h3 className="text-lg font-bold text-foreground font-title mb-3">
          Delete Session History
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Are you sure you want to delete this session? All generated social media posts for this session will be permanently removed.
        </p>

        <div className="text-xs text-destructive font-semibold leading-relaxed mb-6 px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/30">
          This action cannot be undone.
        </div>

        <div className="flex gap-3 self-stretch justify-center">
          <button
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold border-0 bg-destructive text-destructive-foreground cursor-pointer transition-colors hover:bg-destructive/90"
            onClick={handleConfirm}
          >
            Yes, Delete Session
          </button>
          <button
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-medium border border-border bg-background text-foreground cursor-pointer transition-colors hover:bg-accent"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
