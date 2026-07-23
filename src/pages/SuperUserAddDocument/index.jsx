import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { listUsers, uploadDocument } from '../../api/documents'
import { ROLES, useAuth } from '../../auth/AuthContext'
import PdfSignaturePlacer from '../../components/PdfSignaturePlacer'
import UserMenu from '../../components/UserMenu'

const inputClass =
  'w-full rounded-md border border-border bg-input px-3 py-2.5 text-heading outline-none placeholder:text-muted focus:border-accent'
const labelClass = 'mb-1.5 block text-sm font-medium text-heading'

const emptyForm = {
  title: '',
  assigned_user_id: '',
}

export default function SuperUserAddDocument() {
  const { isAuthenticated, isSuperUser } = useAuth()
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
  if (!isSuperUser) return <Navigate to="/user" replace />

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
      setError('Add at least one signature canvas on the PDF')
      return
    }
    if (!placements.some((p) => p.role === 'USER')) {
      setError('At least one User canvas is required')
      return
    }
    if (!placements.some((p) => p.role === 'SUPER_USER')) {
      setError('At least one Super User canvas is required')
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
    <main className="mx-auto flex h-svh max-w-7xl flex-col overflow-hidden px-6 py-4">
      <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-heading">Upload & assign PDF</h1>
          <p className="mt-0.5 text-sm text-muted">
            Set title and assignee above, then place canvases on the preview.
          </p>
        </div>
        <UserMenu />
      </header>

      <form onSubmit={handleUpload} className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid shrink-0 gap-3 rounded-2xl border border-border bg-surface/80 p-3 sm:grid-cols-2">
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
              <p className="mt-2 text-xs text-muted">
                No users with role {ROLES.USER} yet. Create a User account first.
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <PdfSignaturePlacer
            file={file}
            placements={placements}
            onChange={setPlacements}
            sidebar={
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
                  className="w-full text-sm text-body file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:font-semibold file:text-black"
                />
                {file ? (
                  <p className="mt-1.5 truncate text-xs text-muted" title={file.name}>
                    {file.name}
                  </p>
                ) : null}
              </div>
            }
            footer={
              <>
                {error ? (
                  <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                ) : null}
                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex min-h-[40px] w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-black hover:bg-accent-hover disabled:opacity-60"
                  >
                    {loading ? 'Uploading…' : 'Upload & assign'}
                  </button>
                  <Link
                    to="/super-user"
                    className="inline-flex min-h-[40px] w-full items-center justify-center rounded-xl border border-border-strong px-4 text-sm font-semibold text-heading"
                  >
                    Cancel
                  </Link>
                </div>
              </>
            }
          />
        </div>
      </form>
    </main>
  )
}
