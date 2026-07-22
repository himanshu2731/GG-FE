import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import SignatureCanvas from 'react-signature-canvas'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const ROLE_STYLE = {
  user: {
    short: 'USER',
    title: 'User signature',
    border: 'border-emerald-400',
    badge: 'bg-emerald-500 text-[#04110f]',
    ring: 'ring-emerald-400/40',
    label: 'text-emerald-300',
  },
  su: {
    short: 'SUPER USER',
    title: 'Super User signature',
    border: 'border-sky-400',
    badge: 'bg-sky-400 text-[#04110f]',
    ring: 'ring-sky-400/40',
    label: 'text-sky-300',
  },
}

/**
 * Shows PDF with signature canvases.
 * - Super User: both canvases visible
 * - User: both may be shown for context, but only USER canvas is active/drawable
 */
export default function PdfRoleCanvases({
  fileUrl,
  document: doc,
  viewerRole, // 'USER' | 'SUPER_USER'
  activeRole = null, // which canvas can be drawn: 'USER' | 'SUPER_USER' | null
  signatureRef,
}) {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const layerRef = useRef(null)

  const showUser = true
  const showSu = viewerRole === 'SUPER_USER' // SU sees both; User only sees user canvas
  const userActive = activeRole === 'USER'
  const suActive = activeRole === 'SUPER_USER'

  useEffect(() => {
    if (!doc) return
    const preferred =
      viewerRole === 'USER' ? doc.signature_page : doc.su_signature_page || doc.signature_page
    if (preferred) setPageNumber(preferred)
  }, [doc, viewerRole])

  const pageWidth = Math.min(720, typeof window !== 'undefined' ? window.innerWidth - 96 : 720)

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

  const userBox = useMemo(() => {
    if (!doc) return null
    return {
      page: doc.signature_page,
      x: doc.signature_x,
      y: doc.signature_y,
      width: doc.signature_width || 160,
      height: doc.signature_height || 56,
    }
  }, [doc])

  const suBox = useMemo(() => {
    if (!doc) return null
    return {
      page: doc.su_signature_page,
      x: doc.su_signature_x,
      y: doc.su_signature_y,
      width: doc.su_signature_width || 160,
      height: doc.su_signature_height || 56,
    }
  }, [doc])

  if (!fileUrl || !doc) {
    return <p className="text-sm text-muted">No document loaded.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap gap-3">
          {showUser ? (
            <span className={ROLE_STYLE.user.label}>
              USER canvas {userActive ? '(active — draw here)' : '(visible)'}
            </span>
          ) : null}
          {showSu ? (
            <span className={ROLE_STYLE.su.label}>
              SUPER USER canvas {suActive ? '(active — draw here)' : '(visible)'}
            </span>
          ) : null}
          {!showSu && viewerRole === 'USER' ? (
            <span className="text-muted">Super User canvas is hidden for your role</span>
          ) : null}
        </div>
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
        <div ref={layerRef} className="relative inline-block max-w-full">
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

          {showUser && userBox?.page === pageNumber ? (
            <CanvasOverlay
              role="user"
              display={toDisplay(userBox)}
              active={userActive}
              signatureRef={userActive ? signatureRef : null}
            />
          ) : null}

          {showSu && suBox?.page === pageNumber ? (
            <CanvasOverlay
              role="su"
              display={toDisplay(suBox)}
              active={suActive}
              signatureRef={suActive ? signatureRef : null}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function CanvasOverlay({ role, display, active, signatureRef }) {
  const style = ROLE_STYLE[role]
  if (!display) return null

  return (
    <div
      className={`absolute overflow-hidden rounded-md border-2 shadow-lg ring-2 ${style.border} ${style.ring} ${
        active ? 'z-20' : 'z-10 opacity-80'
      }`}
      style={{
        left: display.x,
        top: display.y,
        width: display.width,
        height: display.height,
        pointerEvents: active ? 'auto' : 'none',
      }}
    >
      <div className="flex h-full flex-col bg-white">
        <div className="flex items-center justify-between bg-slate-100 px-1.5 py-0.5">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${style.badge}`}>
            {style.short}
          </span>
          <span className="text-[9px] font-medium text-slate-600">
            {active ? 'draw signature' : 'locked'}
          </span>
        </div>
        <div className="min-h-0 flex-1">
          {active ? (
            <SignatureCanvas
              ref={signatureRef}
              penColor="#111827"
              canvasProps={{
                width: Math.max(1, Math.round(display.width)),
                height: Math.max(1, Math.round(display.height - 18)),
                className: 'h-full w-full bg-white',
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%)] bg-[length:12px_12px] text-[11px] font-semibold text-slate-400">
              {style.title}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
