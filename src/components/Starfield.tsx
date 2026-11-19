import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  speed: number
  phase: number
  hue: number
}

export default function Starfield({ density = 0.00012 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    let stars: Array<Star> = []
    let width = 0
    let height = 0
    let frame = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.floor(width * height * density)
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.4 + 0.2,
        speed: Math.random() * 0.15 + 0.03,
        phase: Math.random() * Math.PI * 2,
        hue: [280, 330, 45, 190][Math.floor(Math.random() * 4)],
      }))
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height)
      for (const s of stars) {
        if (!reduceMotion) {
          s.y -= s.speed
          if (s.y < -2) {
            s.y = height + 2
            s.x = Math.random() * width
          }
        }
        const alpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.001 + s.phase))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${s.hue}, 100%, 85%, ${alpha})`
        ctx.fill()
      }
      frame = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [density])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
}
