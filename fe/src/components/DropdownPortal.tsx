import { useEffect, useRef, useState, type ReactNode } from 'react'
import ReactDOM from 'react-dom'

interface DropdownPortalProps {
    anchorRef: React.RefObject<HTMLElement | null>
    isOpen: boolean
    children: ReactNode
    /** Preferred width of the dropdown (for right-align calculation). Default 160. */
    width?: number
}

/**
 * Renders children into document.body via a portal, positioned below and
 * right-aligned with the anchor element. Repositions on scroll/resize.
 */
export default function DropdownPortal({ anchorRef, isOpen, children, width = 160 }: DropdownPortalProps) {
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
    const frameRef = useRef<number | null>(null)

    useEffect(() => {
        if (!isOpen) return

        const compute = () => {
            if (!anchorRef.current) return
            const rect = anchorRef.current.getBoundingClientRect()
            setPos({
                top: rect.bottom + 6,
                left: rect.right - width,
            })
        }

        compute()

        const onScroll = () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current)
            frameRef.current = requestAnimationFrame(compute)
        }

        window.addEventListener('scroll', onScroll, true)
        window.addEventListener('resize', onScroll)
        return () => {
            window.removeEventListener('scroll', onScroll, true)
            window.removeEventListener('resize', onScroll)
            if (frameRef.current) cancelAnimationFrame(frameRef.current)
            setPos(null)
        }
    }, [isOpen, anchorRef, width])

    if (!isOpen || !pos) return null

    return ReactDOM.createPortal(
        <div
            style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                width,
                zIndex: 10000,
                pointerEvents: 'auto',
            }}
        >
            {children}
        </div>,
        document.body
    )
}
