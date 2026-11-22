interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  withWordmark?: boolean
}

const sizes = {
  sm: { tile: 'h-7 w-7 rounded-md', icon: 'text-[16px]', text: 'text-base' },
  md: { tile: 'h-8 w-8 rounded-lg', icon: 'text-[20px]', text: 'text-lg' },
  lg: { tile: 'h-10 w-10 rounded-xl', icon: 'text-[24px]', text: 'text-xl' },
}

/**
 * Eureka mark — a lightbulb ("I have found it") on the brand-blue tile.
 * Wordmark is "Eureka" in the Eureka blue.
 */
export default function Logo({ size = 'md', withWordmark = false }: LogoProps) {
  const s = sizes[size]
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex ${s.tile} items-center justify-center bg-primary-container shadow-sm`}
      >
        <span
          className={`material-symbols-outlined ${s.icon} text-on-primary`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          lightbulb
        </span>
      </div>
      {withWordmark && (
        <span className={`${s.text} font-bold tracking-tight text-primary`}>
          Eureka
        </span>
      )}
    </div>
  )
}
