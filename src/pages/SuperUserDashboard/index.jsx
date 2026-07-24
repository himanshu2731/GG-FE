import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { listDocuments } from '../../api/documents'
import { useAuth } from '../../auth/AuthContext'
import Button from '../../components/Button'
import Container, { Alert, Card } from '../../components/Container'
import Table, { StatusBadge } from '../../components/Table'
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

const columns = [
  {
    key: 'id',
    header: 'ID',
    cellClassName: 'font-mono text-xs text-heading',
    title: (doc) => doc.id,
    render: (doc) => shortId(doc.id),
  },
  {
    key: 'title',
    header: 'PDF name',
    cellClassName: 'font-semibold text-heading',
  },
  {
    key: 'assigned',
    header: 'Assigned to',
    render: (doc) => doc.assigned_user?.email || '—',
  },
  {
    key: 'user_state',
    header: 'User state',
    render: (doc) => <StatusBadge signed={isUserSigned(doc)} />,
  },
  {
    key: 'su_state',
    header: 'SU state',
    render: (doc) => <StatusBadge signed={isSuSigned(doc)} />,
  },
]

export default function SuperUserDashboard() {
  const { isAuthenticated, isSuperUser } = useAuth()
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
  if (!isSuperUser) return <Navigate to="/user" replace />

  return (
    <Container variant="dashboard">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-heading">
          Documents
        </h1>
        <UserMenu />
      </header>

      <div className="mb-4">
        <Button to="/super-user/documents/new" size="sm" className="rounded-xl px-3.5 py-2">
          Add document
        </Button>
      </div>

      {error ? <Alert className="mb-4 rounded-xl px-3 py-2">{error}</Alert> : null}

      <Card variant="table" as="section">
        <Table
          columns={columns}
          rows={documents}
          loading={loading}
          onRowClick={(doc) => navigate(`/super-user/documents/${doc.id}`)}
          empty={
            <div className="p-10 text-center">
              <p className="mb-4 text-sm text-muted">No documents yet.</p>
              <Button to="/super-user/documents/new" size="sm" className="rounded-xl">
                Add document
              </Button>
            </div>
          }
        />
      </Card>
    </Container>
  )
}
