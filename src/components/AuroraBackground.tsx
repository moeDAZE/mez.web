import Starfield from './Starfield'

const blobs = [
  'absolute -top-1/3 -left-1/3 h-[85vmax] w-[85vmax] bg-[radial-gradient(circle,rgba(217,70,239,0.55),transparent_68%)]',
  'absolute top-1/4 -right-1/3 h-[75vmax] w-[75vmax] bg-[radial-gradient(circle,rgba(34,211,238,0.4),transparent_68%)] [animation-delay:-6s]',
  'absolute -bottom-1/3 left-1/4 h-[75vmax] w-[75vmax] bg-[radial-gradient(circle,rgba(251,191,36,0.35),transparent_68%)] [animation-delay:-12s]',
]

export default function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05030f]">
      {blobs.map((className) => (
        <div key={className} className={`absolute animate-aurora ${className}`} />
      ))}
      <Starfield />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,#05030f_100%)]" />
    </div>
  )
}
