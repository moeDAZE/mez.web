import { Link, createFileRoute } from '@tanstack/react-router'

import AuroraBackground from '#/components/AuroraBackground'
import GlowCard from '#/components/GlowCard'
import { navLinks } from '#/lib/catalog'

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'Mez' }] }),
  component: Home,
})

function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-16 sm:px-8">
      <AuroraBackground />

      <h1 className="animate-fade-up text-[clamp(4.5rem,22vw,11rem)] leading-none font-black tracking-tight">
        <span className="text-shimmer animate-shimmer">Mez</span>
      </h1>

      {navLinks.length > 0 && (
        <nav className="mt-14 flex w-full max-w-5xl flex-wrap justify-center gap-4 sm:mt-20 sm:gap-6">
          {navLinks.map((link, index) => (
            <Link
              key={link.id}
              to={link.to}
              className="block w-full transition-transform active:scale-[0.98] sm:w-[calc(50%-0.75rem)] lg:w-[calc((100%-3rem)/3)]"
            >
              <GlowCard delay={200 + index * 120} className="p-6 sm:p-8">
                <div
                  className={`flex h-14 w-14 animate-float items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-lg ${link.gradient}`}
                >
                  {link.emoji}
                </div>
                <h2 className="mt-6 text-xl font-bold text-white">
                  {link.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {link.description}
                </p>
              </GlowCard>
            </Link>
          ))}
        </nav>
      )}
    </main>
  )
}
