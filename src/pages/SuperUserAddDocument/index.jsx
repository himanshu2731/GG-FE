import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { listUsers, uploadDocument } from '../../api/documents'
import { ROLES, useAuth } from '../../auth/AuthContext'
import Button from '../../components/Button'
import Container, { Alert } from '../../components/Container'
import Input from '../../components/Input'
import PdfSignaturePlacer from '../../components/PdfSignaturePlacer'
import UserMenu from '../../components/UserMenu'

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
    <Container variant="workspace">
      <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-heading">Upload & assign PDF</h1>
          <p className="mt-0.5 text-sm text-muted">
            Set title and assignee on the left, then place canvases on the preview.
          </p>
        </div>
        <UserMenu />
      </header>

      <form onSubmit={handleUpload} className="min-h-0 flex-1">
        <PdfSignaturePlacer
          file={file}
          placements={placements}
          onChange={setPlacements}
          sidebar={
            <div className="space-y-3">
              <Input
                label="Title"
                id="title"
                required
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Contract agreement"
              />

              <div>
                <Input
                  label="Assign to user"
                  id="assigned_user_id"
                  as="select"
                  required
                  value={form.assigned_user_id}
                  onChange={(e) => updateField('assigned_user_id', e.target.value)}
                >
                  <option value="">Select a user</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </Input>
                {!loadingUsers && users.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">
                    No users with role {ROLES.USER} yet. Create a User account first.
                  </p>
                ) : null}
              </div>

              <div className="border-t border-border pt-3">
                <Input
                  label="PDF file"
                  id="file"
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                  onChange={onFileChange}
                />
              </div>
            </div>
          }
          footer={
            <>
              {error ? <Alert className="rounded-md px-3 py-2">{error}</Alert> : null}
              <div className="flex flex-col gap-2">
                <Button type="submit" fullWidth disabled={loading}>
                  {loading ? 'Uploading…' : 'Upload & assign'}
                </Button>
                <Button to="/super-user" variant="secondary" fullWidth>
                  Cancel
                </Button>
              </div>
            </>
          }
        />
      </form>
    </Container>
  )
}
