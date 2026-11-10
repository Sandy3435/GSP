import { useState } from 'react'
import type { ReactNode } from 'react'

/* ---------------------------------- Avatar --------------------------------- */

const avatarTones: Record<string, string> = {
  pine: 'bg-primary-container text-on-primary',
  sage: 'bg-secondary-container text-on-secondary-container',
  amber: 'bg-tertiary-fixed text-on-tertiary-fixed',
  slate: 'bg-surface-container-high text-primary',
}

const avatarSizes: Record<string, string> = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-[11px]',
  md: 'h-8 w-8 text-label-xs',
  lg: 'h-9 w-9 text-label-sm',
}

export function Avatar({
  name,
  tone = 'pine',
  size = 'md',
}: {
  name: string
  tone?: keyof typeof avatarTones
  size?: keyof typeof avatarSizes
}) {
  const initials = name
    .replace(/^u\//, '')
    .split(/[\s_]+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${avatarTones[tone]} ${avatarSizes[size]}`}
      aria-hidden="true"
    >
      {initials || name.slice(0, 1).toUpperCase()}
    </div>
  )
}

/* ------------------------------- Match badge ------------------------------- */

export function MatchBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 font-label-xs text-label-xs font-bold text-on-secondary-container">
      <span
        className="material-symbols-outlined text-[13px]"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        auto_awesome
      </span>
      {score}% Match
    </span>
  )
}

/* ------------------------------ Section header ----------------------------- */

export function SectionHeader({
  icon,
  title,
  action,
}: {
  icon?: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {icon && (
          <span
            className="material-symbols-outlined text-[22px] text-secondary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        )}
        <h3 className="text-headline-sm font-semibold text-primary">{title}</h3>
      </div>
      {action}
    </div>
  )
}

export function SeeAllLink({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-0.5 font-label-sm text-label-sm font-semibold text-secondary hover:underline"
    >
      {label}
      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
    </button>
  )
}

/* ------------------------------ Progress bar ------------------------------- */

export function ProgressBar({
  value,
  className = '',
}: {
  value: number
  className?: string
}) {
  return (
    <div
      className={`h-2.5 w-full overflow-hidden rounded-full bg-surface-container-highest p-0.5 ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary-container to-secondary transition-all duration-500 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

/* ------------------------------ Progress ring ------------------------------ */

export function ProgressRing({ value }: { value: number }) {
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-primary-container">
      <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
        <path
          className="stroke-current text-surface-container-highest"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          strokeWidth="3"
        />
        <path
          className="stroke-current text-secondary"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          strokeDasharray={`${value}, 100`}
          strokeLinecap="round"
          strokeWidth="3.2"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-primary">{value}%</span>
    </div>
  )
}

/* -------------------------------- Vote widget ------------------------------ */

export function VoteWidget({ initial }: { initial: number }) {
  const [score, setScore] = useState(initial)
  const [state, setState] = useState<0 | 1 | -1>(0)

  const toggleUp = () => {
    if (state === 1) {
      setState(0)
      setScore((s) => s - 1)
    } else {
      setScore((s) => s + (state === -1 ? 2 : 1))
      setState(1)
    }
  }

  const toggleDown = () => {
    if (state === -1) {
      setState(0)
      setScore((s) => s + 1)
    } else {
      setScore((s) => s - (state === 1 ? 2 : 1))
      setState(-1)
    }
  }

  return (
    <div className="flex min-w-[42px] select-none flex-col items-center justify-center rounded-xl bg-surface-container-low px-2 py-1.5 text-primary">
      <button
        type="button"
        aria-label="Upvote"
        onClick={toggleUp}
        className={`p-0.5 transition-all active:scale-125 ${
          state === 1
            ? 'font-bold text-primary'
            : 'text-on-surface-variant hover:text-primary'
        }`}
      >
        <span className="material-symbols-outlined text-[20px] leading-none">
          keyboard_arrow_up
        </span>
      </button>
      <span
        key={score}
        className="my-0.5 font-label-sm text-label-sm font-bold text-primary"
      >
        {score}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        onClick={toggleDown}
        className={`p-0.5 transition-all active:scale-125 ${
          state === -1
            ? 'font-bold text-error'
            : 'text-on-surface-variant hover:text-error'
        }`}
      >
        <span className="material-symbols-outlined text-[20px] leading-none">
          keyboard_arrow_down
        </span>
      </button>
    </div>
  )
}

/* --------------------------------- Chips ----------------------------------- */

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 font-label-xs text-label-xs font-bold transition-all ${
        active
          ? 'bg-primary-container text-on-primary shadow-sm'
          : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
      }`}
    >
      {children}
    </button>
  )
}
