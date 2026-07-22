import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { listUsers, uploadDocument } from '../../api/documents'
import { ROLES, useAuth } from '../../auth/AuthContext'
import PdfSignaturePlacer from '../../components/PdfSignaturePlacer'

const inputClass =
  'w-full rounded-md border border-border bg-input px-3 py-2.5 text-heading outline-none placeholder:text-muted focus:border-accent'
const labelClass = 'mb-1.5 block text-sm font-medium text-heading'

const emptyForm = {
  title: '',
  assigned_user_id: '',
}

export default function SuperUserAddDocument() {
  const { isAuthenticated, isSuperUser, logout } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState(null)
  const [placements, setPlacements] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !isSuperUser) return
    let cancelled = false
    async function load() {
      setLoadingUsers(true)
      try {
        const res = await listUsers()
        if (!cancelled) setUsers(res.users || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load users')
      } finally {
        if (!cancelled) setLoadingUsers(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isSuperUser])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isSuperUser) return <Navigate to="/" replace />

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function onFileChange(e) {
    setFile(e.target.files?.[0] || null)
    setPlacements([])
    setError('')
  }

  async function handleUpload(e) {
    e.preventDefault()
    setError('')

    if (!file) {
      setError('PDF file is required')
      return
    }
    if (!form.assigned_user_id) {
      setError('Select a user to assign')
      return
    }
    if (placements.length === 0) {
      setError('Drag the signature canvas onto the PDF at least once')
      return
    }
    if (!placements.some((p) => p.role === 'USER')) {
      setError('At least one placement must be assigned to the User')
      return
    }

    const payload = placements.map((p) => ({
      id: p.id,
      role: p.role,
      page: p.page,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      label: p.label || (p.role === 'USER' ? 'User' : 'Super User'),
    }))

    const body = new FormData()
    body.append('title', form.title)
    body.append('assigned_user_id', form.assigned_user_id)
    body.append('file', file)
    body.append('placements', JSON.stringify(payload))

    setLoading(true)
    try {
      await uploadDocument(body)
      navigate('/super-user', { replace: true })
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
          <h1 className="text-2xl font-semibold text-heading">Upload & assign PDF</h1>
          <p className="mt-1 text-sm text-muted">
            Drag the signature canvas onto the PDF as many times as you need.
          </p>
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

      <section className="rounded-[10px] border border-border bg-gradient-to-b from-surface to-[#10141c] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
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
            {!loadingUsers && users.length === 0 ? (
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
            <p className={`${labelClass} mb-2`}>Signature canvas</p>
            <PdfSignaturePlacer file={file} placements={placements} onChange={setPlacements} />
          </div>

          {error ? (
            <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-accent px-4 font-semibold text-[#04110f] hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? 'Uploading…' : 'Upload & assign'}
            </button>
            <Link
              to="/super-user"
              className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-border-strong px-4 text-sm font-semibold text-heading"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </main>
  )
}
