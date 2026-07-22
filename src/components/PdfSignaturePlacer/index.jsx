import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const DEFAULT_BOX = { width: 180, height: 70 }

const ROLE = {
  user: {
    key: 'user',
    title: 'User signature',
    short: 'USER',
    hint: 'Assigned user will sign here',
    border: 'border-emerald-400',
    bg: 'bg-emerald-500/10',
    badge: 'bg-emerald-500 text-[#04110f]',
    ring: 'ring-emerald-400/50',
    canvasBg: 'bg-white',
    label: 'text-emerald-300',
  },
  su: {
    key: 'su',
    title: 'Super User signature',
    short: 'SUPER USER',
    hint: 'You will sign here later',
    border: 'border-sky-400',
    bg: 'bg-sky-500/10',
    badge: 'bg-sky-400 text-[#04110f]',
    ring: 'ring-sky-400/50',
    canvasBg: 'bg-white',
    label: 'text-sky-300',
  },
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function PlacedCanvas({ displayBox, role, selected, onPointerDown }) {
  const style = ROLE[role]
  if (!displayBox) return null

  return (
    <div
      role="presentation"
      onPointerDown={onPointerDown}
      className={`absolute touch-none select-none overflow-hidden rounded-md border-2 shadow-lg ring-2 ${style.border} ${style.ring} ${
        selected ? 'z-20' : 'z-10'
      }`}
      style={{
        left: displayBox.x,
        top: displayBox.y,
        width: displayBox.width,
        height: displayBox.height,
      }}
    >
      <div className={`flex h-full flex-col ${style.canvasBg}`}>
        <div className={`flex items-center justify-between px-1.5 py-0.5 ${style.bg}`}>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${style.badge}`}>
            {style.short}
          </span>
          <span className="text-[9px] font-medium text-slate-600">signature canvas</span>
        </div>
        <div className="relative min-h-0 flex-1">
          <canvas
            width={Math.max(1, Math.round(displayBox.width))}
            height={Math.max(1, Math.round(displayBox.height - 18))}
            className="pointer-events-none h-full w-full bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:12px_12px] bg-[position:0_0,0_6px,6px_-6px,-6px_0]"
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-slate-400">
            {style.title}
          </span>
        </div>
      </div>
    </div>
  )
}

function PaletteCard({ role, placed, active, onSelect, onDragStart }) {
  const style = ROLE[role]
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => onDragStart(e, role)}
      onClick={() => onSelect(role)}
      className={`w-full rounded-lg border-2 p-3 text-left transition ${style.border} ${style.bg} ${
        active ? `ring-2 ${style.ring}` : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${style.badge}`}>
          {style.short}
        </span>
        <span className="text-[11px] text-muted">{placed ? 'Placed — drag to move' : 'Drag onto PDF'}</span>
      </div>
      <div className={`h-14 rounded border border-dashed ${style.border} bg-white/95`}>
        <p className="flex h-full items-center justify-center text-xs font-semibold text-slate-500">
          {style.title} canvas
        </p>
      </div>
      <p className={`mt-2 text-xs ${style.label}`}>{style.hint}</p>
    </button>
  )
}

export default function PdfSignaturePlacer({ file, userBox, suBox, onChange }) {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const [active, setActive] = useState('user')
  const layerRef = useRef(null)
  const boxesRef = useRef({ userBox, suBox })
  const dragRef = useRef(null)

  boxesRef.current = { userBox, suBox }

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

  function commit(nextUser, nextSu) {
    onChange({ userBox: nextUser, suBox: nextSu })
  }

  function placeAtPdfCoords(pdfX, pdfY, kind) {
    if (!pageSize.width) return
    const width = DEFAULT_BOX.width
    const height = DEFAULT_BOX.height
    const x = clamp(pdfX - width / 2, 0, Math.max(0, pageSize.width - width))
    const y = clamp(pdfY - height / 2, 0, Math.max(0, pageSize.height - height))
    const next = { page: pageNumber, x, y, width, height }
    const { userBox: u, suBox: s } = boxesRef.current
    if (kind === 'user') commit(next, s)
    else commit(u, next)
  }

  function clientToPdf(clientX, clientY) {
    const layer = layerRef.current
    if (!layer || !pageSize.width) return null
    const rect = layer.getBoundingClientRect()
    const scaleX = pageSize.width / rect.width
    const scaleY = pageSize.height / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      rect,
      scaleX,
      scaleY,
    }
  }

  function onLayerClick(e) {
    if (dragRef.current) return
    const pt = clientToPdf(e.clientX, e.clientY)
    if (!pt) return
    placeAtPdfCoords(pt.x, pt.y, active)
  }

  function onPaletteDragStart(e, role) {
    e.dataTransfer.setData('application/x-sig-role', role)
    e.dataTransfer.effectAllowed = 'copy'
    setActive(role)
  }

  function onPdfDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function onPdfDrop(e) {
    e.preventDefault()
    const role = e.dataTransfer.getData('application/x-sig-role')
    if (role !== 'user' && role !== 'su') return
    const pt = clientToPdf(e.clientX, e.clientY)
    if (!pt) return
    setActive(role)
    placeAtPdfCoords(pt.x, pt.y, role)
  }

  function startMove(kind, e) {
    e.stopPropagation()
    e.preventDefault()
    const box = kind === 'user' ? boxesRef.current.userBox : boxesRef.current.suBox
    if (!box || box.page !== pageNumber) return

    const pt = clientToPdf(e.clientX, e.clientY)
    if (!pt) return

    dragRef.current = {
      kind,
      offsetX: pt.x - box.x,
      offsetY: pt.y - box.y,
    }
    setActive(kind)

    function onMove(ev) {
      const drag = dragRef.current
      if (!drag) return
      const p = clientToPdf(ev.clientX, ev.clientY)
      if (!p) return
      const current = drag.kind === 'user' ? boxesRef.current.userBox : boxesRef.current.suBox
      if (!current) return

      const x = clamp(p.x - drag.offsetX, 0, Math.max(0, pageSize.width - current.width))
      const y = clamp(p.y - drag.offsetY, 0, Math.max(0, pageSize.height - current.height))
      const next = { ...current, page: pageNumber, x, y }
      const { userBox: u, suBox: s } = boxesRef.current
      if (drag.kind === 'user') commit(next, s)
      else commit(u, next)
    }

    function onUp() {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function toDisplay(box) {
    if (!box || !pageSize.width || !displaySize.width) return null
    const scaleX = displaySize.width / pageSize.width
    const scaleY = displaySize.height / pageSize.height
    return {
      x: box.x * scaleX,
      y: box.y * scaleY,
      width: box.width * scaleX,
      height: box.height * scaleY,
    }
  }

  if (!fileUrl) {
    return (
      <p className="rounded-md border border-border bg-input px-3 py-4 text-sm text-muted">
        Select a PDF first. Then drag the User and Super User canvases onto the signature fields.
      </p>
    )
  }

  const pageWidth = Math.min(720, typeof window !== 'undefined' ? window.innerWidth - 96 : 720)

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <p className="text-sm font-medium text-heading">Signature canvases</p>
        <p className="text-xs text-muted">
          Drag a canvas onto the PDF (or select one and click the page). Each role has its own
          canvas.
        </p>
        <PaletteCard
          role="user"
          placed={Boolean(userBox)}
          active={active === 'user'}
          onSelect={setActive}
          onDragStart={onPaletteDragStart}
        />
        <PaletteCard
          role="su"
          placed={Boolean(suBox)}
          active={active === 'su'}
          onSelect={setActive}
          onDragStart={onPaletteDragStart}
        />
      </aside>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            Active:{' '}
            <span className={active === 'user' ? ROLE.user.label : ROLE.su.label}>
              {ROLE[active].title}
            </span>
          </p>
          <div className="flex items-center gap-2 text-sm text-muted">
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

        <div
          className="overflow-auto rounded-md border border-border bg-[#0a0c10] p-3"
          onDragOver={onPdfDragOver}
          onDrop={onPdfDrop}
        >
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
                  if (el) {
                    setDisplaySize({ width: el.clientWidth, height: el.clientHeight })
                  }
                }}
                onLoadSuccess={(page) => {
                  const viewport = page.getViewport({ scale: 1 })
                  setPageSize({ width: viewport.width, height: viewport.height })
                }}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>

            <PlacedCanvas
              role="user"
              selected={active === 'user'}
              displayBox={userBox?.page === pageNumber ? toDisplay(userBox) : null}
              onPointerDown={(e) => startMove('user', e)}
            />
            <PlacedCanvas
              role="su"
              selected={active === 'su'}
              displayBox={suBox?.page === pageNumber ? toDisplay(suBox) : null}
              onPointerDown={(e) => startMove('su', e)}
            />
          </div>
        </div>

        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <p className={ROLE.user.label}>
            USER canvas:{' '}
            {userBox
              ? `page ${userBox.page} · (${Math.round(userBox.x)}, ${Math.round(userBox.y)})`
              : 'not placed'}
          </p>
          <p className={ROLE.su.label}>
            SUPER USER canvas:{' '}
            {suBox
              ? `page ${suBox.page} · (${Math.round(suBox.x)}, ${Math.round(suBox.y)})`
              : 'not placed'}
          </p>
        </div>
      </div>
    </div>
  )
}
