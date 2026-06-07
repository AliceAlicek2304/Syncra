import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-brand-canvas-soft border border-brand-border/40", className)}
      {...props}
    />
  )
}

export { Skeleton }
