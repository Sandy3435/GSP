interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  withWordmark?: boolean
}

const sizes = {
  sm: { tile: 'h-7 w-7 rounded-md', icon: 'text-[16px]', text: 'text-base' },
  md: { tile: 'h-8 w-8 rounded-lg', icon: 'text-[20px]', text: 'text-base' },
  lg: { tile: 'h-10 w-10 rounded-xl', icon: 'text-[26px]', text: 'text-lg' },
}

/**
 * GSP campfire mark — recreates the flame logo tile from the design kit
 * using the Material Symbols flame on a deep-pine rounded square.
 */
export default function Logo({ size = 'md', withWordmark = false }: LogoProps) {
  const s = sizes[size]
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex ${s.tile} items-center justify-center bg-primary-container shadow-sm`}
      >
        <span
          className={`material-symbols-outlined ${s.icon} text-secondary-fixed`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          local_fire_department
        </span>
      </div>
      {withWordmark && (
        <span className={`${s.text} font-bold tracking-wide text-primary`}>
          GSP
        </span>
      )}
    </div>
  )
}
