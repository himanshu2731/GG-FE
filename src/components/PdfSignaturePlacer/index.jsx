import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const DEFAULT_BOX = { width: 180, height: 70 }
const MIN_W = 80
const MIN_H = 40
const DRAG_TYPE = 'application/x-signature-canvas'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function makePlacement(role, page, x, y) {
  return {
    id: crypto.randomUUID(),
    role,
    page,
    x,
    y,
    width: DEFAULT_BOX.width,
    height: DEFAULT_BOX.height,
    label: role === 'USER' ? 'User' : 'Super User',
  }
}

/**
 * One signature canvas in the sidebar. Drag it onto the PDF as many times as needed.
 * Each drop creates a placement that can be moved, resized, or removed.
 */
export default function PdfSignaturePlacer({ file, placements, onChange }) {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const [placeRole, setPlaceRole] = useState('USER')
  const [activeId, setActiveId] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const layerRef = useRef(null)
  const placementsRef = useRef(placements)
  const interactionRef = useRef(null)

  placementsRef.current = placements

  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl)
    }
  }, [fileUrl])

  useEffect(() => {
    setPageNumber(1)
    setNumPages(0)
    setPageSize({ width: 0, height: 0 })
    setDisplaySize({ width: 0, height: 0 })
    setActiveId(null)
  }, [fileUrl])

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

  function dropAt(clientX, clientY, role = placeRole) {
    const pt = clientToPdf(clientX, clientY)
    if (!pt) return

    const width = DEFAULT_BOX.width
    const height = DEFAULT_BOX.height
    const x = clamp(pt.x - width / 2, 0, Math.max(0, pageSize.width - width))
    const y = clamp(pt.y - height / 2, 0, Math.max(0, pageSize.height - height))
    const next = makePlacement(role, pageNumber, x, y)
    updateList([...placementsRef.current, next])
    setActiveId(next.id)
  }

  function onSourceDragStart(e) {
    e.dataTransfer.setData(DRAG_TYPE, placeRole)
    e.dataTransfer.effectAllowed = 'copy'
  }

  function onLayerDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOver(true)
  }

  function onLayerDragLeave(e) {
    if (!layerRef.current?.contains(e.relatedTarget)) setDragOver(false)
  }

  function onLayerDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const role = e.dataTransfer.getData(DRAG_TYPE) || placeRole
    dropAt(e.clientX, e.clientY, role)
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

  function startResize(id, e) {
    e.stopPropagation()
    e.preventDefault()
    const current = placementsRef.current.find((p) => p.id === id)
    if (!current || current.page !== pageNumber) return
    setActiveId(id)
    interactionRef.current = { type: 'resize', id, startX: current.x, startY: current.y }
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

      const width = clamp(pt.x - interaction.startX, MIN_W, pageSize.width - interaction.startX)
      const height = clamp(pt.y - interaction.startY, MIN_H, pageSize.height - interaction.startY)
      patchPlacement(interaction.id, {
        x: interaction.startX,
        y: interaction.startY,
        width,
        height,
        page: pageNumber,
      })
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

  if (!fileUrl) {
    return (
      <p className="rounded-md border border-border bg-input px-3 py-4 text-sm text-muted">
        Select a PDF, then drag the signature canvas onto it as many times as you need.
      </p>
    )
  }

  const pageWidth = Math.min(720, typeof window !== 'undefined' ? window.innerWidth - 96 : 720)
  const pagePlacements = placements.filter((p) => p.page === pageNumber)

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <p className="text-sm font-medium text-heading">Signature canvas</p>
        <p className="text-xs text-muted">
          Drag this canvas onto the PDF. Drop it again for another placement. One canvas, many
          drops.
        </p>

        <label className="block text-xs text-muted">
          Role for next drop
          <select
            value={placeRole}
            onChange={(e) => setPlaceRole(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-input px-2 py-1.5 text-sm text-heading"
          >
            <option value="USER">User</option>
            <option value="SUPER_USER">Super User</option>
          </select>
        </label>

        <div
          draggable
          onDragStart={onSourceDragStart}
          className="cursor-grab rounded-md border-2 border-dashed border-slate-400 bg-white p-3 active:cursor-grabbing"
          title="Drag onto the PDF"
        >
          <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold">Canvas</span>
            <span>Drag me</span>
          </div>
          <div className="h-16 rounded border border-slate-300 bg-white shadow-sm" />
        </div>

        <p className="text-xs text-muted">
          Placed: <span className="text-heading">{placements.length}</span>
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
      </aside>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted">Drop the canvas on the PDF to place it.</p>
          <div className="flex items-center gap-2 text-muted">
            <button
              type="button"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              className="rounded border border-border px-2 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {pageNumber} / {numPages || '—'}
            </span>
            <button
              type="button"
              disabled={!numPages || pageNumber >= numPages}
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              className="rounded border border-border px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        <div className="overflow-auto rounded-md border border-border bg-[#0a0c10] p-3">
          <div
            ref={layerRef}
            className={`relative inline-block max-w-full ${dragOver ? 'ring-2 ring-accent' : ''}`}
            onDragOver={onLayerDragOver}
            onDragLeave={onLayerDragLeave}
            onDrop={onLayerDrop}
          >
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
              const listIndex = placements.findIndex((x) => x.id === p.id)
              return (
                <div
                  key={p.id}
                  role="presentation"
                  onPointerDown={(e) => startMove(p.id, e)}
                  className={`absolute touch-none select-none border bg-white shadow-md ${
                    activeId === p.id ? 'z-20 border-accent' : 'z-10 border-slate-400'
                  }`}
                  style={{
                    left: display.x,
                    top: display.y,
                    width: display.width,
                    height: display.height,
                  }}
                >
                  <div className="pointer-events-none absolute left-1 top-1 flex items-center gap-1 text-[10px] font-medium text-slate-500">
                    <span>
                      #{listIndex + 1} · {p.role === 'USER' ? 'User' : 'SU'}
                    </span>
                  </div>
                  <div className="absolute right-1 top-1 flex gap-1">
                    <select
                      value={p.role}
                      onPointerDown={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        patchPlacement(p.id, {
                          role: e.target.value,
                          label: e.target.value === 'USER' ? 'User' : 'Super User',
                        })
                      }
                      className="rounded border border-slate-300 bg-white px-1 py-0.5 text-[10px] text-slate-700"
                    >
                      <option value="USER">User</option>
                      <option value="SUPER_USER">SU</option>
                    </select>
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => removePlacement(p.id)}
                      className="rounded border border-slate-300 bg-white px-1 py-0.5 text-[10px] text-danger"
                      aria-label="Remove placement"
                    >
                      ×
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label="Resize"
                    onPointerDown={(e) => startResize(p.id, e)}
                    className="absolute bottom-0 right-0 h-3.5 w-3.5 cursor-se-resize border border-slate-500 bg-white"
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
