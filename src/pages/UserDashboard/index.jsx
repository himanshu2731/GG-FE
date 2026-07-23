import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { listDocuments } from '../../api/documents'
import { useAuth } from '../../auth/AuthContext'
import UserMenu from '../../components/UserMenu'

function shortId(id) {
  if (!id) return '—'
  return id.slice(0, 8)
}

function isUserSigned(doc) {
  if (doc.user_signed_at) return true
  return (
    doc.status === 'USER_SIGNED' ||
    doc.status === 'SU_SIGNED' ||
    doc.status === 'VERIFIED'
  )
}

function isSuSigned(doc) {
  if (doc.su_signed === true) return true
  if (doc.su_signed_at) return true
  return doc.status === 'SU_SIGNED' || doc.status === 'VERIFIED'
}

function SignedBadge({ signed }) {
  return signed ? (
    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
      Signed
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-slate-500/30 bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400">
      Pending
    </span>
  )
}

export default function UserDashboard() {
  const { isAuthenticated, isUser } = useAuth()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
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
    if (isAuthenticated && isUser) load()
  }, [isAuthenticated, isUser, load])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isUser) return <Navigate to="/super-user" replace />

  function openDocument(doc) {
    if (doc.status === 'SU_SIGNED' || doc.status === 'VERIFIED') {
      window.open(doc.file_url, '_blank', 'noopener,noreferrer')
      return
    }
    navigate(`/documents/${doc.id}`)
  }

  return (
    <main className="mx-auto min-h-svh max-w-6xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-heading">
          Documents
        </h1>
        <UserMenu />
      </header>

      {error ? (
        <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-surface to-[#12171e] shadow-[0_14px_40px_rgba(0,0,0,0.3)]">
        {loading ? (
          <p className="p-8 text-sm text-muted">Loading…</p>
        ) : documents.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">No documents assigned to you yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[0.95rem]">
              <thead className="border-b border-border bg-[#0f141a] text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3.5 font-medium">ID</th>
                  <th className="px-5 py-3.5 font-medium">PDF name</th>
                  <th className="px-5 py-3.5 font-medium">Assigned by</th>
                  <th className="px-5 py-3.5 font-medium">User status</th>
                  <th className="px-5 py-3.5 font-medium">Super User status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    tabIndex={0}
                    role="link"
                    onClick={() => openDocument(doc)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openDocument(doc)
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-white/[0.04]"
                  >
                    <td className="px-5 py-4 font-mono text-xs text-heading" title={doc.id}>
                      {shortId(doc.id)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-heading">{doc.title}</td>
                    <td className="px-5 py-4 text-body">{doc.created_by?.email || '—'}</td>
                    <td className="px-5 py-4">
                      <SignedBadge signed={isUserSigned(doc)} />
                    </td>
                    <td className="px-5 py-4">
                      <SignedBadge signed={isSuSigned(doc)} />
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
