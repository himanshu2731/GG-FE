import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

function avatarLetter(name, email) {
  const fromName = (name || '').trim()
  if (fromName) return fromName.charAt(0).toUpperCase()
  const local = (email || '').split('@')[0]?.trim() || ''
  if (local) return local.charAt(0).toUpperCase()
  return '?'
}

export default function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const closeTimer = useRef(null)

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user) return null

  // Prefer first letter of email (local part), then name.
  const initial = (() => {
    const local = (user.email || '').split('@')[0]?.trim() || ''
    if (local) return local.charAt(0).toUpperCase()
    return avatarLetter(user.name, user.email)
  })()

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function openMenu() {
    clearCloseTimer()
    setOpen(true)
  }

  function scheduleClose() {
    clearCloseTimer()
    closeTimer.current = setTimeout(() => setOpen(false), 160)
  }

  function handleLogout() {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onFocus={openMenu}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/50 bg-accent text-sm font-semibold text-black shadow-sm transition hover:bg-accent-hover"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open profile menu"
      >
        {initial}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-[#12171e] shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm text-body">
              <span className="font-medium text-heading">{user.name}</span>
              <span className="text-muted"> · {user.email}</span>
            </p>
          </div>
          <div className="p-2">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-heading hover:bg-white/5"
            >
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
