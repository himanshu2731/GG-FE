import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import SignatureCanvas from 'react-signature-canvas'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

function legacyPlacements(doc) {
  if (!doc) return []
  const items = []
  if (doc.signature_page != null) {
    items.push({
      id: 'legacy-user',
      role: 'USER',
      page: doc.signature_page,
      x: doc.signature_x,
      y: doc.signature_y,
      width: doc.signature_width || 160,
      height: doc.signature_height || 56,
      label: 'User',
    })
  }
  if (doc.su_signature_page != null) {
    items.push({
      id: 'legacy-su',
      role: 'SUPER_USER',
      page: doc.su_signature_page,
      x: doc.su_signature_x,
      y: doc.su_signature_y,
      width: doc.su_signature_width || 160,
      height: doc.su_signature_height || 56,
      label: 'Super User',
    })
  }
  return items
}

/**
 * Renders all signature placements from the document.
 * USER canvases are active for signing; SUPER_USER canvases are disabled for users.
 */
export default function PdfRoleCanvases({
  fileUrl,
  document: doc,
  viewerRole,
  activeRole = null,
  signaturePadsRef,
}) {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const layerRef = useRef(null)
  const padRefs = useRef({})

  const placements = useMemo(() => {
    if (doc?.signature_placements?.length) return doc.signature_placements
    return legacyPlacements(doc)
  }, [doc])

  const userActive = activeRole === 'USER'
  const showSuCanvas = viewerRole === 'SUPER_USER'

  useEffect(() => {
    const firstUser = placements.find((p) => p.role === 'USER')
    if (firstUser?.page) setPageNumber(firstUser.page)
  }, [placements])

  useEffect(() => {
    if (!signaturePadsRef) return
    signaturePadsRef.current = {
      getPads: () => padRefs.current,
      clearAll: () => {
        Object.values(padRefs.current).forEach((pad) => pad?.clear?.())
      },
      firstDrawnDataUrl: () => {
        for (const pad of Object.values(padRefs.current)) {
          if (pad && !pad.isEmpty()) {
            return pad.toDataURL('image/png')
          }
        }
        return null
      },
    }
  })

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

  function setPadRef(id, node) {
    if (node) padRefs.current[id] = node
    else delete padRefs.current[id]
  }

  if (!fileUrl || !doc) {
    return <p className="text-sm text-muted">No document loaded.</p>
  }

  const visible = placements.filter((p) => {
    if (p.page !== pageNumber) return false
    if (p.role === 'SUPER_USER' && !showSuCanvas) return false
    return true
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted">
          {viewerRole === 'USER'
            ? 'Draw on any User canvas. The same signature is applied to all User areas.'
            : `${placements.length} canvas${placements.length === 1 ? '' : 'es'} on this document.`}
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

          {visible.map((p, index) => {
            const display = toDisplay(p)
            if (!display) return null
            const isUser = p.role === 'USER'
            const label = p.label || (isUser ? 'User' : 'Super User')

            if (isUser && userActive) {
              return (
                <div
                  key={p.id || `user-${index}`}
                  className="absolute z-20 overflow-hidden border border-slate-400 bg-white shadow-md"
                  style={{
                    left: display.x,
                    top: display.y,
                    width: display.width,
                    height: display.height,
                  }}
                >
                  <SignatureCanvas
                    ref={(node) => setPadRef(p.id || `user-${index}`, node)}
                    penColor="#111827"
                    canvasProps={{
                      width: Math.max(1, Math.round(display.width)),
                      height: Math.max(1, Math.round(display.height)),
                      className: 'h-full w-full bg-white',
                    }}
                  />
                </div>
              )
            }

            if (isUser) {
              return (
                <div
                  key={p.id || `user-${index}`}
                  className="pointer-events-none absolute z-10 overflow-hidden border border-slate-400 bg-white shadow-md"
                  style={{
                    left: display.x,
                    top: display.y,
                    width: display.width,
                    height: display.height,
                  }}
                >
                  <div className="flex h-full items-center justify-center text-[11px] text-slate-400">
                    {label}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={p.id || `su-${index}`}
                className="pointer-events-none absolute z-10 overflow-hidden border border-dashed border-slate-300 bg-white/70 opacity-60"
                style={{
                  left: display.x,
                  top: display.y,
                  width: display.width,
                  height: display.height,
                }}
              >
                <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                  {label} (disabled)
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
