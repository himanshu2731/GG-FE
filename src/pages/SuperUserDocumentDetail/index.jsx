import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  deleteDocument,
  getDocument,
  listUsers,
  updateDocument,
} from '../../api/documents'
import { useAuth } from '../../auth/AuthContext'

const inputClass =
  'w-full rounded-md border border-border bg-input px-3 py-2.5 text-heading outline-none placeholder:text-muted focus:border-accent'
const labelClass = 'mb-1.5 block text-sm font-medium text-heading'

export default function SuperUserDocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isSuperUser, logout } = useAuth()
  const [doc, setDoc] = useState(null)
  const [users, setUsers] = useState([])
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [assignedUserId, setAssignedUserId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !isSuperUser) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [detail, usersRes] = await Promise.all([getDocument(id), listUsers()])
        if (cancelled) return
        setDoc(detail)
        setTitle(detail.title || '')
        setAssignedUserId(detail.assigned_user?.id || '')
        setUsers(usersRes.users || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load document')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, isAuthenticated, isSuperUser])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isSuperUser) return <Navigate to="/" replace />

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const updated = await updateDocument(id, {
        title,
        assigned_user_id: assignedUserId,
      })
      setDoc(updated)
      setEditing(false)
      setSuccess('Document updated')
    } catch (err) {
      setError(err.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this document? This cannot be undone.')) return
    setError('')
    setDeleting(true)
    try {
      await deleteDocument(id)
      navigate('/super-user', { replace: true })
    } catch (err) {
      setError(err.message || 'Delete failed')
      setDeleting(false)
    }
  }

  const assigned = doc?.assigned_user

  return (
    <main className="mx-auto min-h-svh max-w-3xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-heading">
            {doc?.title || 'Document'}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted">{id}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/super-user" className="text-sm text-muted hover:text-body">
            Documents
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm font-semibold text-heading"
          >
            Log out
          </button>
        </div>
      </header>

      {error ? (
        <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mb-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          {success}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : doc ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setEditing((v) => !v)
                setSuccess('')
                setError('')
                setTitle(doc.title || '')
                setAssignedUserId(doc.assigned_user?.id || '')
              }}
              className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-heading hover:border-accent"
            >
              {editing ? 'Cancel edit' : 'Edit'}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="rounded-md border border-danger/40 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <Link
              to={`/documents/${doc.id}`}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[#04110f] hover:bg-accent-hover"
            >
              View PDF / canvases
            </Link>
            <a
              href={doc.file_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-heading"
            >
              Open PDF
            </a>
          </div>

          {editing ? (
            <form
              onSubmit={handleSave}
              className="space-y-4 rounded-[10px] border border-border bg-gradient-to-b from-surface to-[#10141c] p-6"
            >
              <h2 className="text-lg font-semibold text-heading">Edit document</h2>
              <div>
                <label className={labelClass} htmlFor="title">
                  PDF name / title
                </label>
                <input
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="assigned_user_id">
                  Assign to user
                </label>
                <select
                  id="assigned_user_id"
                  required
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  disabled={doc.status !== 'UPLOADED'}
                  className={inputClass}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                {doc.status !== 'UPLOADED' ? (
                  <p className="mt-2 text-xs text-muted">
                    Reassignment is only allowed while status is UPLOADED.
                  </p>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[#04110f] hover:bg-accent-hover disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          ) : null}

          <section className="rounded-[10px] border border-border bg-gradient-to-b from-surface to-[#10141c] p-6">
            <h2 className="mb-4 text-lg font-semibold text-heading">Assigned user</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Name</dt>
                <dd className="text-heading">{assigned?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="text-heading">{assigned?.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">User ID</dt>
                <dd className="break-all font-mono text-xs text-body">{assigned?.id || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">Role</dt>
                <dd className="text-heading">{assigned?.role || 'USER'}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[10px] border border-border bg-gradient-to-b from-surface to-[#10141c] p-6">
            <h2 className="mb-4 text-lg font-semibold text-heading">Document</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">PDF name</dt>
                <dd className="text-heading">{doc.title}</dd>
              </div>
              <div>
                <dt className="text-muted">State</dt>
                <dd className="text-heading">{doc.status}</dd>
              </div>
              <div>
                <dt className="text-muted">Assigned at</dt>
                <dd className="text-body">
                  {doc.assigned_at ? new Date(doc.assigned_at).toLocaleString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">User signed at</dt>
                <dd className="text-body">
                  {doc.user_signed_at ? new Date(doc.user_signed_at).toLocaleString() : '—'}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      ) : (
        <p className="text-sm text-muted">Document not found.</p>
      )}
    </main>
  )
}
