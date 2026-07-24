export function StatusBadge({ signed, signedLabel = 'Signed', pendingLabel = 'Pending' }) {
  return signed ? (
    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
      {signedLabel}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-slate-500/30 bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400">
      {pendingLabel}
    </span>
  )
}

/**
 * Reusable data table.
 * columns: [{ key, header, className?, cellClassName?, render?(row) }]
 */
export default function Table({
  columns,
  rows = [],
  getRowKey = (row) => row.id,
  onRowClick,
  loading = false,
  empty,
  minWidth = '760px',
}) {
  if (loading) {
    return <p className="p-8 text-sm text-muted">Loading…</p>
  }

  if (!rows.length) {
    return (
      empty || <p className="p-10 text-center text-sm text-muted">No data.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[0.95rem]" style={{ minWidth }}>
        <thead className="border-b border-border bg-[#0f141a] text-xs uppercase tracking-wide text-muted">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`px-5 py-3.5 font-medium ${col.className || ''}`.trim()}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'link' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onRowClick(row)
                      }
                    }
                  : undefined
              }
              className={
                onRowClick
                  ? 'cursor-pointer transition-colors hover:bg-white/[0.04]'
                  : undefined
              }
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-5 py-4 ${col.cellClassName || 'text-body'}`.trim()}
                  title={col.title?.(row)}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
