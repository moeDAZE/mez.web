import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { createChristmasTree } from '#/features/christmas-tree/scene'

export const Route = createFileRoute('/lab/christmas-tree')({
  head: () => ({ meta: [{ title: 'Merry Christmas' }] }),
  component: ChristmasTreePage,
})

function ChristmasTreePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    try {
      const controller = createChristmasTree(container)
      return () => controller.dispose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  return (
    <main className="fixed inset-0 h-dvh overflow-hidden bg-black">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+2.5rem)] flex justify-center px-4 text-center sm:top-[calc(env(safe-area-inset-top)+3.5rem)]">
        <h1 className="animate-fade-up text-shimmer animate-shimmer font-serif text-[clamp(1.5rem,8.5vw,4rem)] leading-tight font-bold whitespace-nowrap italic">
          Merry Christmas
        </h1>
      </div>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white/70">
          当前浏览器无法初始化 WebGL：{error}
        </div>
      )}
    </main>
  )
}
