const SHELL = {
  auth: 'grid min-h-svh place-items-center p-6',
  dashboard: 'mx-auto min-h-svh max-w-6xl px-6 py-8',
  workspace: 'mx-auto flex h-svh max-w-7xl flex-col overflow-hidden px-6 py-4',
}

const CARD = {
  auth: 'w-full max-w-[440px] rounded-3xl border border-border bg-surface/80 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-10',
  table:
    'overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-surface to-[#12171e] shadow-[0_14px_40px_rgba(0,0,0,0.3)]',
  panel: 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface/80 p-3',
}

/**
 * Page layout shell (auth | dashboard | workspace).
 */
export default function Container({
  variant = 'dashboard',
  as: Tag = 'main',
  className = '',
  children,
  ...props
}) {
  return (
    <Tag className={`${SHELL[variant] || SHELL.dashboard} ${className}`.trim()} {...props}>
      {children}
    </Tag>
  )
}

export function Card({ variant = 'panel', as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag className={`${CARD[variant] || CARD.panel} ${className}`.trim()} {...props}>
      {children}
    </Tag>
  )
}

export function Alert({ variant = 'error', className = '', children }) {
  const styles =
    variant === 'success'
      ? 'border-accent/30 bg-accent/10 text-accent'
      : 'border-danger/30 bg-danger/10 text-danger'

  return (
    <p className={`rounded-xl border px-3.5 py-2.5 text-sm ${styles} ${className}`.trim()}>
      {children}
    </p>
  )
}
