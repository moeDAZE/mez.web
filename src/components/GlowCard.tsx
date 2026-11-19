import type { PointerEvent, ReactNode } from 'react'

interface GlowCardProps {
  children: ReactNode
  className?: string
  delay?: number
  disabled?: boolean
}

export default function GlowCard({
  children,
  className = '',
  delay = 0,
  disabled = false,
}: GlowCardProps) {
  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || e.pointerType !== 'mouse') return
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    el.style.setProperty('--mx', `${px * 100}%`)
    el.style.setProperty('--my', `${py * 100}%`)
    el.style.setProperty('--rx', `${(0.5 - py) * 10}deg`)
    el.style.setProperty('--ry', `${(px - 0.5) * 12}deg`)
  }

  const handleLeave = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty('--rx', '0deg')
    e.currentTarget.style.setProperty('--ry', '0deg')
  }

  return (
    <div
      className="animate-fade-up h-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        className={`glow-card relative h-full rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/40 backdrop-blur-xl ${
          disabled ? 'opacity-60' : '[@media(hover:hover)]:hover:shadow-fuchsia-500/20'
        } ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
