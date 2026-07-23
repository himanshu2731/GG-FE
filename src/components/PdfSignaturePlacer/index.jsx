import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const DEFAULT_BOX = { width: 180, height: 70 }
const MIN_W = 80
const MIN_H = 40

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function normalizeRole(role) {
  const r = String(role || '').trim().toUpperCase().replace(/\s+/g, '_')
  if (r === 'SUPER_USER' || r === 'SUPERUSER') return 'SUPER_USER'
  if (r === 'USER') return 'USER'
  return null
}

function makePlacement(role, page, x, y) {
  const normalized = normalizeRole(role) || 'USER'
  return {
    id: crypto.randomUUID(),
    role: normalized,
    page,
    x,
    y,
    width: DEFAULT_BOX.width,
    height: DEFAULT_BOX.height,
    label: normalized === 'USER' ? 'User' : 'Super User',
  }
}

function TrashIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

const RESIZE_HANDLES = [
  { handle: 'nw', cursor: 'cursor-nwse-resize', className: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2' },
  { handle: 'n', cursor: 'cursor-ns-resize', className: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2' },
  { handle: 'ne', cursor: 'cursor-nesw-resize', className: 'right-0 top-0 translate-x-1/2 -translate-y-1/2' },
  { handle: 'e', cursor: 'cursor-ew-resize', className: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2' },
  { handle: 'se', cursor: 'cursor-nwse-resize', className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2' },
  { handle: 's', cursor: 'cursor-ns-resize', className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' },
  { handle: 'sw', cursor: 'cursor-nesw-resize', className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2' },
  { handle: 'w', cursor: 'cursor-ew-resize', className: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2' },
]

/**
 * Place User / Super User signature boxes on a PDF via buttons, then drag to position.
 * Pass either `file` (File) or `url` (remote PDF URL).
 * Optional `sidebar` / `footer` render into the left actions column.
 */
export default function PdfSignaturePlacer({ file, url, placements, onChange, sidebar, footer }) {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const [activeId, setActiveId] = useState(null)
  const [frameSize, setFrameSize] = useState({ width: 720, height: 560 })
  const layerRef = useRef(null)
  const frameRef = useRef(null)
  const placementsRef = useRef(placements)
  const interactionRef = useRef(null)

  placementsRef.current = placements

  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  const fileUrl = objectUrl || url || null

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  useEffect(() => {
    setPageNumber(1)
    setNumPages(0)
    setPageSize({ width: 0, height: 0 })
    setDisplaySize({ width: 0, height: 0 })
    setActiveId(null)
  }, [fileUrl])

  useEffect(() => {
    const el = frameRef.current
    if (!el) return undefined
    function measure() {
      setFrameSize({ width: el.clientWidth, height: el.clientHeight })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fileUrl])

  // Fit PDF inside the 60% preview panel without scroll.
  const pageWidth = useMemo(() => {
    const pad = 16
    const availW = Math.max(160, frameSize.width - pad)
    const availH = Math.max(160, frameSize.height - pad)
    const pdfW = pageSize.width || 612
    const pdfH = pageSize.height || 792
    const aspect = pdfW / pdfH
    return Math.max(160, Math.min(availW, availH * aspect))
  }, [frameSize.width, frameSize.height, pageSize.width, pageSize.height])

  function updateList(next) {
    onChange(next)
  }

  function patchPlacement(id, patch) {
    updateList(placementsRef.current.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function removePlacement(id) {
    updateList(placementsRef.current.filter((p) => p.id !== id))
    if (activeId === id) setActiveId(null)
  }

  function clientToPdf(clientX, clientY) {
    const layer = layerRef.current
    if (!layer || !pageSize.width) return null
    const rect = layer.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) * pageSize.width) / rect.width,
      y: ((clientY - rect.top) * pageSize.height) / rect.height,
    }
  }

  function placeCanvas(role) {
    const normalized = normalizeRole(role)
    if (!normalized) return

    // Fall back to US Letter points so buttons work as soon as a PDF is selected,
    // even before page metrics finish loading.
    const pageW = pageSize.width || 612
    const pageH = pageSize.height || 792
    const width = DEFAULT_BOX.width
    const height = DEFAULT_BOX.height
    const sameRoleOnPage = placementsRef.current.filter(
      (p) => p.page === pageNumber && normalizeRole(p.role) === normalized,
    ).length
    const stagger = sameRoleOnPage * 24

    const x = clamp(pageW / 2 - width / 2 + stagger, 0, Math.max(0, pageW - width))
    const y = clamp(pageH / 2 - height / 2 + stagger, 0, Math.max(0, pageH - height))

    const next = makePlacement(normalized, pageNumber, x, y)
    updateList([...placementsRef.current, next])
    setActiveId(next.id)
  }

  function startMove(id, e) {
    e.stopPropagation()
    e.preventDefault()
    const current = placementsRef.current.find((p) => p.id === id)
    if (!current || current.page !== pageNumber) return
    const pt = clientToPdf(e.clientX, e.clientY)
    if (!pt) return
    setActiveId(id)
    interactionRef.current = {
      type: 'move',
      id,
      offsetX: pt.x - current.x,
      offsetY: pt.y - current.y,
    }
    bindPointer()
  }

  function startResize(id, handle, e) {
    e.stopPropagation()
    e.preventDefault()
    const current = placementsRef.current.find((p) => p.id === id)
    if (!current || current.page !== pageNumber) return
    setActiveId(id)
    interactionRef.current = {
      type: 'resize',
      id,
      handle,
      origin: {
        x: current.x,
        y: current.y,
        width: current.width,
        height: current.height,
      },
    }
    bindPointer()
  }

  function bindPointer() {
    function onMove(ev) {
      const interaction = interactionRef.current
      if (!interaction) return
      const current = placementsRef.current.find((p) => p.id === interaction.id)
      if (!current) return
      const pt = clientToPdf(ev.clientX, ev.clientY)
      if (!pt) return

      if (interaction.type === 'move') {
        const x = clamp(pt.x - interaction.offsetX, 0, Math.max(0, pageSize.width - current.width))
        const y = clamp(pt.y - interaction.offsetY, 0, Math.max(0, pageSize.height - current.height))
        patchPlacement(interaction.id, { x, y, page: pageNumber })
        return
      }

      const { handle, origin } = interaction
      const right = origin.x + origin.width
      const bottom = origin.y + origin.height
      let x = origin.x
      let y = origin.y
      let width = origin.width
      let height = origin.height

      if (handle.includes('e')) {
        width = clamp(pt.x - origin.x, MIN_W, pageSize.width - origin.x)
      }
      if (handle.includes('s')) {
        height = clamp(pt.y - origin.y, MIN_H, pageSize.height - origin.y)
      }
      if (handle.includes('w')) {
        const nextX = clamp(pt.x, 0, right - MIN_W)
        width = right - nextX
        x = nextX
      }
      if (handle.includes('n')) {
        const nextY = clamp(pt.y, 0, bottom - MIN_H)
        height = bottom - nextY
        y = nextY
      }

      patchPlacement(interaction.id, { x, y, width, height, page: pageNumber })
    }

    function onUp() {
      interactionRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function toDisplay(b) {
    if (!b || !pageSize.width || !displaySize.width) return null
    const scaleX = displaySize.width / pageSize.width
    const scaleY = displaySize.height / pageSize.height
    return {
      x: b.x * scaleX,
      y: b.y * scaleY,
      width: b.width * scaleX,
      height: b.height * scaleY,
    }
  }

  const pagePlacements = placements.filter((p) => p.page === pageNumber)
  const userCount = placements.filter((p) => normalizeRole(p.role) === 'USER').length
  const suCount = placements.filter((p) => normalizeRole(p.role) === 'SUPER_USER').length

  return (
    <div className="grid h-full min-h-[360px] items-stretch gap-3 lg:grid-cols-[2fr_3fr]">
      <aside className="flex h-full min-h-0 w-full flex-col gap-2.5 overflow-y-auto rounded-2xl border border-border bg-surface/80 p-3">
        {sidebar}

        <div className="space-y-2 border-t border-border pt-2.5">
          <p className="text-sm font-medium text-heading">Signature canvases</p>
          <button
            type="button"
            disabled={!fileUrl}
            onClick={() => placeCanvas('USER')}
            className="w-full rounded-xl border border-sky-400/40 bg-sky-500/15 px-3 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add User canvas
          </button>
          <button
            type="button"
            disabled={!fileUrl}
            onClick={() => placeCanvas('SUPER_USER')}
            className="w-full rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add Super User canvas
          </button>
          <p className="text-xs text-muted">
            User: <span className="text-heading">{userCount}</span>
            {' · '}
            Super User:{' '}
            <span className={suCount === 0 ? 'font-semibold text-danger' : 'text-heading'}>
              {suCount}
            </span>
            {placements.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  updateList([])
                  setActiveId(null)
                }}
                className="ml-2 text-danger hover:underline"
              >
                Clear all
              </button>
            ) : null}
          </p>
          <p className="text-xs leading-relaxed text-muted">
            {fileUrl
              ? 'Press a button to place a canvas on the preview, then drag to position.'
              : 'Upload a PDF to enable canvas placement.'}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 text-sm text-muted">
          <button
            type="button"
            disabled={!fileUrl || pageNumber <= 1}
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-border px-2.5 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            Page {fileUrl ? pageNumber : '—'} / {numPages || '—'}
          </span>
          <button
            type="button"
            disabled={!fileUrl || !numPages || pageNumber >= numPages}
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            className="rounded-lg border border-border px-2.5 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>

        {footer ? <div className="mt-auto space-y-2 border-t border-border pt-2.5">{footer}</div> : null}
      </aside>

      <div
        ref={frameRef}
        className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border-strong bg-[#0a0a0c] p-2"
      >
        {!fileUrl ? (
          <div className="px-6 text-center">
            <p className="text-base font-medium text-heading">PDF preview</p>
            <p className="mt-2 text-sm text-muted">
              Upload a PDF on the left — it will appear here.
            </p>
          </div>
        ) : (
          <div ref={layerRef} className="relative block w-fit max-w-full shrink-0">
            <Document
              file={fileUrl}
              loading={<p className="p-4 text-sm text-muted">Loading PDF…</p>}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            >
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                onRenderSuccess={() => {
                  const el = layerRef.current?.querySelector('.react-pdf__Page')
                  if (el) setDisplaySize({ width: el.clientWidth, height: el.clientHeight })
                }}
                onLoadSuccess={(page) => {
                  const viewport = page.getViewport({ scale: 1 })
                  setPageSize({ width: viewport.width, height: viewport.height })
                }}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>

            {pagePlacements.map((p) => {
              const display = toDisplay(p)
              if (!display) return null
              const isUser = normalizeRole(p.role) !== 'SUPER_USER'
              const isActive = activeId === p.id
              return (
                <div
                  key={p.id}
                  data-placement-box
                  role="presentation"
                  onPointerDown={(e) => startMove(p.id, e)}
                  className={`absolute touch-none select-none border-2 bg-white shadow-md ${
                    isActive ? 'z-20' : 'z-10'
                  } ${
                    isUser
                      ? isActive
                        ? 'border-sky-500'
                        : 'border-sky-400'
                      : isActive
                        ? 'border-emerald-500'
                        : 'border-emerald-400'
                  }`}
                  style={{
                    left: display.x,
                    top: display.y,
                    width: display.width,
                    height: display.height,
                  }}
                >
                  <span
                    className={`absolute left-1 top-1 z-20 rounded px-1 py-0.5 text-[10px] font-semibold ${
                      isUser ? 'bg-sky-500 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isUser ? 'User' : 'Super User'}
                  </span>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => removePlacement(p.id)}
                    className="absolute right-1 top-1 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
                    aria-label="Remove canvas"
                    title="Remove"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                  {RESIZE_HANDLES.map(({ handle, cursor, className }) => (
                    <button
                      key={handle}
                      type="button"
                      aria-label={`Resize ${handle}`}
                      onPointerDown={(e) => startResize(p.id, handle, e)}
                      className={`absolute z-30 h-3 w-3 rounded-sm border bg-white ${cursor} ${className} ${
                        isUser ? 'border-sky-500' : 'border-emerald-500'
                      }`}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
