import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { listDocuments } from '../../api/documents'
import { useAuth } from '../../auth/AuthContext'

export default function UserDashboard() {
  const { user, isAuthenticated, isUser, logout } = useAuth()
  const [documents, setDocuments] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listDocuments({ limit: 50 })
      setDocuments(res.documents || [])
    } catch (err) {
      setError(err.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && isUser) load()
  }, [isAuthenticated, isUser, load])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isUser) return <Navigate to="/" replace />

  return (
    <main className="mx-auto min-h-svh max-w-4xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-heading">User dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            {user.name} · {user.email}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/" className="text-sm text-muted hover:text-body">
            Home
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm font-semibold text-heading hover:border-accent"
          >
            Log out
          </button>
        </div>
      </header>

      <section className="rounded-[10px] border border-border bg-gradient-to-b from-surface to-[#10141c] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">Assigned documents</h2>
          <button type="button" onClick={load} className="text-sm text-accent hover:text-accent-hover">
            Refresh
          </button>
        </div>

        {error ? (
          <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted">No documents assigned to you yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-heading">{doc.title}</p>
                  <p className="text-sm text-muted">
                    From {doc.created_by?.name} · {doc.status}
                  </p>
                </div>
                <Link
                  to={`/documents/${doc.id}`}
                  className="inline-flex min-h-[36px] items-center justify-center rounded-md bg-accent px-3 text-sm font-semibold text-[#04110f] hover:bg-accent-hover"
                >
                  {doc.status === 'UPLOADED' ? 'Open & sign' : 'Open'}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
