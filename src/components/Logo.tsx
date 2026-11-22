interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  withWordmark?: boolean
}

const sizes = {
  sm: { tile: 'h-7 w-7', text: 'text-base' },
  md: { tile: 'h-8 w-8', text: 'text-lg' },
  lg: { tile: 'h-11 w-11', text: 'text-xl' },
}

/**
 * Eureka mark — the real logo from `public/eureka-logo.png`, with an optional
 * wordmark. The mark is Eureka blue, so the wordmark is kept in ink navy to
 * keep the lockup balanced.
 */
export default function Logo({ size = 'md', withWordmark = false }: LogoProps) {
  const s = sizes[size]
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/eureka-logo.png"
        alt="Eureka"
        className={`${s.tile} object-contain`}
        draggable={false}
      />
      {withWordmark && (
        <span className={`${s.text} font-bold tracking-tight text-primary`}>
          Eureka
        </span>
      )}
    </div>
  )
}
