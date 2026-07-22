import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { listDocuments, listUsers, uploadDocument } from '../../api/documents'
import { ROLES, useAuth } from '../../auth/AuthContext'
import PdfSignaturePlacer, { newCanvas } from '../../components/PdfSignaturePlacer'

const inputClass =
  'w-full rounded-md border border-border bg-input px-3 py-2.5 text-heading outline-none placeholder:text-muted focus:border-accent'
const labelClass = 'mb-1.5 block text-sm font-medium text-heading'

const emptyForm = {
  title: '',
  assigned_user_id: '',
}

export default function SuperUserDashboard() {
  const { user, isAuthenticated, isSuperUser, logout } = useAuth()
  const [users, setUsers] = useState([])
  const [documents, setDocuments] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState(null)
  const [canvases, setCanvases] = useState(() => [newCanvas('USER')])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingLists, setLoadingLists] = useState(true)

  const loadLists = useCallback(async () => {
    setLoadingLists(true)
    setError('')
    try {
      const [usersRes, docsRes] = await Promise.all([listUsers(), listDocuments({ limit: 50 })])
      setUsers(usersRes.users || [])
      setDocuments(docsRes.documents || [])
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoadingLists(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && isSuperUser) {
      loadLists()
    }
  }, [isAuthenticated, isSuperUser, loadLists])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (!isSuperUser) {
    return <Navigate to="/" replace />
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function onFileChange(e) {
    const next = e.target.files?.[0] || null
    setFile(next)
    setCanvases([newCanvas('USER')])
    setError('')
    setSuccess('')
  }

  async function handleUpload(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!file) {
      setError('PDF file is required')
      return
    }
    if (!form.assigned_user_id) {
      setError('Select a user to assign')
      return
    }
    if (canvases.length === 0) {
      setError('Add at least one signature canvas')
      return
    }
    const unplaced = canvases.filter((c) => !c.placed)
    if (unplaced.length > 0) {
      setError('Place every canvas on the PDF before uploading')
      return
    }
    if (!canvases.some((c) => c.role === 'USER')) {
      setError('At least one canvas must be assigned to the User')
      return
    }

    const placements = canvases.map((c) => ({
      id: c.id,
      role: c.role,
      page: c.page,
      x: c.x,
      y: c.y,
      width: c.width,
      height: c.height,
      label: c.label || (c.role === 'USER' ? 'User' : 'Super User'),
    }))

    const body = new FormData()
    body.append('title', form.title)
    body.append('assigned_user_id', form.assigned_user_id)
    body.append('file', file)
    body.append('placements', JSON.stringify(placements))

    setLoading(true)
    try {
      await uploadDocument(body)
      setSuccess('Document uploaded and assigned')
      setForm(emptyForm)
      setFile(null)
      setCanvases([newCanvas('USER')])
      e.target.reset()
      await loadLists()
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto min-h-svh max-w-5xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-heading">Super User dashboard</h1>
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

      <section className="mb-8 rounded-[10px] border border-border bg-gradient-to-b from-surface to-[#10141c] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
        <h2 className="mb-4 text-lg font-semibold text-heading">Upload & assign PDF</h2>
        <p className="mb-5 text-sm text-body">
          Add as many white signature canvases as you need. Set each to User or Super User, place
          and resize them on the PDF. Canvases stay independent of each other.
        </p>

        <form className="grid gap-4" onSubmit={handleUpload}>
          <div>
            <label className={labelClass} htmlFor="title">
              Title
            </label>
            <input
              id="title"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className={inputClass}
              placeholder="Contract agreement"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="assigned_user_id">
              Assign to user
            </label>
            <select
              id="assigned_user_id"
              required
              value={form.assigned_user_id}
              onChange={(e) => updateField('assigned_user_id', e.target.value)}
              className={inputClass}
            >
              <option value="">Select a user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            {!loadingLists && users.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                No users with role {ROLES.USER} yet. Create a User account first.
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="file">
              PDF file
            </label>
            <input
              id="file"
              type="file"
              accept="application/pdf,.pdf"
              required
              onChange={onFileChange}
              className="w-full text-sm text-body file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:font-semibold file:text-[#04110f]"
            />
          </div>

          <div>
            <p className={`${labelClass} mb-2`}>Signature canvases</p>
            <PdfSignaturePlacer file={file} canvases={canvases} onChange={setCanvases} />
          </div>

          {error ? (
            <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
              {success}
            </p>
          ) : null}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-accent px-4 font-semibold text-[#04110f] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Uploading…' : 'Upload & assign'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[10px] border border-border bg-gradient-to-b from-surface to-[#10141c] p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-heading">Uploaded documents</h2>
          <button
            type="button"
            onClick={loadLists}
            className="text-sm text-accent hover:text-accent-hover"
          >
            Refresh
          </button>
        </div>

        {loadingLists ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted">No documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-heading">{doc.title}</p>
                  <p className="text-sm text-muted">
                    Assigned to {doc.assigned_user?.name} ({doc.assigned_user?.email}) ·{' '}
                    {doc.status}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    to={`/documents/${doc.id}`}
                    className="text-sm text-accent hover:text-accent-hover"
                  >
                    View canvases
                  </Link>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-muted hover:text-body"
                  >
                    Open PDF
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
