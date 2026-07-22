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

function newCanvas(role = 'USER') {
  return {
    id: crypto.randomUUID(),
    role,
    page: 1,
    x: 72,
    y: 72,
    width: DEFAULT_BOX.width,
    height: DEFAULT_BOX.height,
    placed: false,
    label: role === 'USER' ? 'User' : 'Super User',
  }
}

/**
 * Super User can add as many white canvases as needed.
 * Select one, place/move/resize on the PDF; others stay put.
 */
export default function PdfSignaturePlacer({ file, canvases, onChange }) {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const [activeId, setActiveId] = useState(canvases[0]?.id || null)
  const layerRef = useRef(null)
  const canvasesRef = useRef(canvases)
  const interactionRef = useRef(null)

  canvasesRef.current = canvases

  useEffect(() => {
    if (!activeId && canvases[0]) setActiveId(canvases[0].id)
    if (activeId && !canvases.find((c) => c.id === activeId)) {
      setActiveId(canvases[0]?.id || null)
    }
  }, [canvases, activeId])

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
  }, [fileUrl])

  function updateList(next) {
    onChange(next)
  }

  function patchCanvas(id, patch) {
    updateList(canvasesRef.current.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function addCanvas(role = 'USER') {
    const c = newCanvas(role)
    const next = [...canvasesRef.current, c]
    updateList(next)
    setActiveId(c.id)
  }

  function removeCanvas(id) {
    updateList(canvasesRef.current.filter((c) => c.id !== id))
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

  function placeActiveAt(clientX, clientY) {
    if (!activeId) return
    const current = canvasesRef.current.find((c) => c.id === activeId)
    if (!current) return
    const pt = clientToPdf(clientX, clientY)
    if (!pt) return

    const width = current.width || DEFAULT_BOX.width
    const height = current.height || DEFAULT_BOX.height
    const x = clamp(pt.x - width / 2, 0, Math.max(0, pageSize.width - width))
    const y = clamp(pt.y - height / 2, 0, Math.max(0, pageSize.height - height))
    patchCanvas(activeId, { page: pageNumber, x, y, width, height, placed: true })
  }

  function onLayerClick(e) {
    if (interactionRef.current) return
    placeActiveAt(e.clientX, e.clientY)
  }

  function startMove(id, e) {
    e.stopPropagation()
    e.preventDefault()
    const current = canvasesRef.current.find((c) => c.id === id)
    if (!current?.placed || current.page !== pageNumber) return
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
    const current = canvasesRef.current.find((c) => c.id === id)
    if (!current?.placed || current.page !== pageNumber) return
    setActiveId(id)
    interactionRef.current = { type: 'resize', id, startX: current.x, startY: current.y }
    bindPointer()
  }

  function bindPointer() {
    function onMove(ev) {
      const interaction = interactionRef.current
      if (!interaction) return
      const current = canvasesRef.current.find((c) => c.id === interaction.id)
      if (!current) return
      const pt = clientToPdf(ev.clientX, ev.clientY)
      if (!pt) return

      if (interaction.type === 'move') {
        const x = clamp(pt.x - interaction.offsetX, 0, Math.max(0, pageSize.width - current.width))
        const y = clamp(pt.y - interaction.offsetY, 0, Math.max(0, pageSize.height - current.height))
        patchCanvas(interaction.id, { x, y, page: pageNumber, placed: true })
        return
      }

      const width = clamp(pt.x - interaction.startX, MIN_W, pageSize.width - interaction.startX)
      const height = clamp(pt.y - interaction.startY, MIN_H, pageSize.height - interaction.startY)
      patchCanvas(interaction.id, {
        x: interaction.startX,
        y: interaction.startY,
        width,
        height,
        page: pageNumber,
        placed: true,
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
        Select a PDF, then add and place as many signature canvases as you need.
      </p>
    )
  }

  const pageWidth = Math.min(720, typeof window !== 'undefined' ? window.innerWidth - 96 : 720)

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-heading">Canvases</p>
          <button
            type="button"
            onClick={() => addCanvas('USER')}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-[#04110f] hover:bg-accent-hover"
          >
            + Add canvas
          </button>
        </div>
        <p className="text-xs text-muted">
          Add any number of white canvases. Select one, then click the PDF to place it. Changing
          one does not move the others.
        </p>

        <ul className="max-h-80 space-y-2 overflow-auto">
          {canvases.map((c, index) => (
            <li
              key={c.id}
              className={`rounded-md border bg-white p-2.5 ${
                activeId === c.id ? 'border-accent ring-2 ring-accent/30' : 'border-slate-300'
              }`}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setActiveId(c.id)}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Canvas {index + 1}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {c.placed ? 'Placed' : 'Not placed'}
                  </span>
                </div>
                <div className="mb-2 h-10 rounded border border-dashed border-slate-300 bg-white" />
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={c.role}
                  onChange={(e) =>
                    patchCanvas(c.id, {
                      role: e.target.value,
                      label: e.target.value === 'USER' ? 'User' : 'Super User',
                    })
                  }
                  className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  <option value="USER">For User</option>
                  <option value="SUPER_USER">For Super User</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeCanvas(c.id)}
                  className="text-xs text-danger hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted">
            Active:{' '}
            <span className="font-medium text-heading">
              {canvases.find((c) => c.id === activeId)
                ? `Canvas ${canvases.findIndex((c) => c.id === activeId) + 1}`
                : 'none'}
            </span>
          </p>
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
            className="relative inline-block max-w-full cursor-crosshair"
            onClick={onLayerClick}
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

            {canvases
              .filter((c) => c.placed && c.page === pageNumber)
              .map((c) => {
                const display = toDisplay(c)
                if (!display) return null
                const listIndex = canvases.findIndex((x) => x.id === c.id)
                return (
                  <div
                    key={c.id}
                    role="presentation"
                    onPointerDown={(e) => startMove(c.id, e)}
                    className={`absolute touch-none select-none border bg-white shadow-md ${
                      activeId === c.id ? 'z-20 border-accent' : 'z-10 border-slate-400'
                    }`}
                    style={{
                      left: display.x,
                      top: display.y,
                      width: display.width,
                      height: display.height,
                    }}
                  >
                    <span className="pointer-events-none absolute left-1 top-1 text-[10px] font-medium text-slate-500">
                      #{listIndex + 1} · {c.role === 'USER' ? 'User' : 'SU'}
                    </span>
                    <button
                      type="button"
                      aria-label="Resize"
                      onPointerDown={(e) => startResize(c.id, e)}
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

export { newCanvas }
