import { Link } from 'react-router-dom'
import { ROLES, useAuth } from '../../auth/AuthContext'

export default function Home() {
  const { user, isAuthenticated, isSuperUser, logout } = useAuth()

  const roleLabel =
    user?.role === ROLES.SUPER_USER ? 'Super User' : user?.role === ROLES.USER ? 'User' : ''

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <div className="w-full max-w-md rounded-[10px] border border-border bg-gradient-to-b from-surface to-[#10141c] p-8 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
        <h1 className="mb-2.5 text-[1.85rem] font-semibold tracking-tight text-heading">
          PDF Signing
        </h1>

        {isAuthenticated ? (
          <>
            <p className="mb-2 text-body">
              Signed in as <span className="text-heading">{user.name}</span>
            </p>
            <p className="mb-7 text-sm text-muted">
              {user.email} · {roleLabel}
            </p>
            <div className="flex flex-wrap gap-3">
              {isSuperUser ? (
                <Link
                  to="/super-user"
                  className="inline-flex min-h-[42px] items-center justify-center rounded-md bg-accent px-[18px] font-semibold text-[#04110f] hover:bg-accent-hover"
                >
                  Open dashboard
                </Link>
              ) : null}
              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-[42px] items-center justify-center rounded-md border border-border-strong px-[18px] font-semibold text-heading hover:border-accent hover:text-accent-hover"
              >
                Log out
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-7 text-body">
              Log in or create an account to continue.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex min-h-[42px] items-center justify-center rounded-md bg-accent px-[18px] font-semibold text-[#04110f] hover:bg-accent-hover"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="inline-flex min-h-[42px] items-center justify-center rounded-md border border-border-strong bg-transparent px-[18px] font-semibold text-heading hover:border-accent hover:text-accent-hover"
              >
                Sign up
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
