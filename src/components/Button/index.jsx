import { Link } from 'react-router-dom'

const VARIANTS = {
  primary:
    'bg-accent text-black hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60',
  secondary:
    'border border-border-strong text-heading hover:border-accent hover:text-accent disabled:opacity-60',
  danger:
    'border border-danger/40 text-danger hover:bg-danger/10 disabled:opacity-60',
  ghost:
    'border border-border-strong text-heading hover:border-accent hover:text-accent disabled:opacity-60',
  toggle:
    'border transition disabled:opacity-60',
}

const SIZES = {
  auth: 'inline-flex min-h-[48px] items-center justify-center rounded-xl px-4 text-[0.95rem] font-semibold shadow-[0_10px_28px_rgba(255,255,255,0.06)]',
  md: 'inline-flex min-h-[40px] items-center justify-center rounded-xl px-4 text-sm font-semibold',
  sm: 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold',
  icon: 'inline-flex h-10 w-10 items-center justify-center rounded-md',
  toggle: 'min-h-[44px] rounded-xl border px-3 text-sm font-semibold',
}

/**
 * Reusable button. Pass `to` to render as a React Router Link.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  selected = false,
  to,
  href,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  const toggleSelected = selected
    ? 'border-accent/70 bg-accent/20 text-accent-hover'
    : 'border-white/10 bg-black/25 text-body hover:border-border-strong hover:text-heading'

  const classes = [
    variant === 'toggle' ? SIZES.toggle : SIZES[size] || SIZES.md,
    variant === 'toggle' ? `${VARIANTS.toggle} ${toggleSelected}` : VARIANTS[variant] || VARIANTS.primary,
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    )
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}
