import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { listDocuments } from '../../api/documents'
import { useAuth } from '../../auth/AuthContext'

function shortId(id) {
  if (!id) return '—'
  return id.slice(0, 8)
}

export default function SuperUserDashboard() {
  const { user, isAuthenticated, isSuperUser, logout } = useAuth()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listDocuments({ limit: 100 })
      setDocuments(res.documents || [])
    } catch (err) {
      setError(err.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && isSuperUser) loadDocuments()
  }, [isAuthenticated, isSuperUser, loadDocuments])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isSuperUser) return <Navigate to="/" replace />

  return (
    <main className="mx-auto min-h-svh max-w-5xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-heading">Documents</h1>
          <p className="mt-1 text-sm text-muted">
            {user.name} · {user.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadDocuments}
            className="text-sm text-muted hover:text-body"
          >
            Refresh
          </button>
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
          <Link
            to="/super-user/documents/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-[#04110f] hover:bg-accent-hover"
          >
            Add document
          </Link>
        </div>
      </header>

      {error ? (
        <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-[10px] border border-border bg-gradient-to-b from-surface to-[#10141c]">
        {loading ? (
          <p className="p-6 text-sm text-muted">Loading…</p>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center">
            <p className="mb-4 text-sm text-muted">No documents yet.</p>
            <Link
              to="/super-user/documents/new"
              className="inline-flex rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[#04110f] hover:bg-accent-hover"
            >
              Add document
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-[#0c1018] text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">PDF name</th>
                  <th className="px-4 py-3 font-medium">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    tabIndex={0}
                    role="link"
                    onClick={() => navigate(`/super-user/documents/${doc.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/super-user/documents/${doc.id}`)
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-heading" title={doc.id}>
                      {shortId(doc.id)}
                    </td>
                    <td className="px-4 py-3 text-body">{doc.assigned_user?.email || '—'}</td>
                    <td className="px-4 py-3 font-medium text-heading">{doc.title}</td>
                    <td className="px-4 py-3">
                      <span className="rounded border border-border px-2 py-0.5 text-xs text-muted">
                        {doc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
