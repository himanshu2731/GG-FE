import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { listDocuments } from '../../api/documents'
import { useAuth } from '../../auth/AuthContext'
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
    key: 'assigned_by',
    header: 'Assigned by',
    render: (doc) => doc.created_by?.email || '—',
  },
  {
    key: 'user_status',
    header: 'User status',
    render: (doc) => <StatusBadge signed={isUserSigned(doc)} />,
  },
  {
    key: 'su_status',
    header: 'Super User status',
    render: (doc) => <StatusBadge signed={isSuSigned(doc)} />,
  },
]

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
    <Container variant="dashboard">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-heading">
          Documents
        </h1>
        <UserMenu />
      </header>

      {error ? <Alert className="mb-4 rounded-xl px-3 py-2">{error}</Alert> : null}

      <Card variant="table" as="section">
        <Table
          columns={columns}
          rows={documents}
          loading={loading}
          onRowClick={openDocument}
          empty={
            <p className="p-10 text-center text-sm text-muted">
              No documents assigned to you yet.
            </p>
          }
        />
      </Card>
    </Container>
  )
}
