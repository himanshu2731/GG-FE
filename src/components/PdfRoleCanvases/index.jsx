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
 * While awaiting user sign: show drawable USER canvases.
 * After user sign: hide USER overlays so the stamped PDF ink is visible.
 * SUPER_USER guides stay visible until SU has signed (when that flow exists).
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
  const [frameSize, setFrameSize] = useState({ width: 720, height: 560 })
  const layerRef = useRef(null)
  const frameRef = useRef(null)
  const padRefs = useRef({})

  const placements = useMemo(() => {
    if (doc?.signature_placements?.length) return doc.signature_placements
    return legacyPlacements(doc)
  }, [doc])

  const status = doc?.status || ''
  const awaitingUserSign = status === 'UPLOADED'
  const awaitingSuSign = status === 'USER_SIGNED'
  const suDone = status === 'SU_SIGNED' || status === 'VERIFIED'
  const userActive = activeRole === 'USER' && awaitingUserSign
  const suActive = activeRole === 'SUPER_USER' && awaitingSuSign
  const showSuGuides = viewerRole === 'SUPER_USER' && !suDone

  const pdfSrc = useMemo(() => {
    if (!fileUrl) return null
    const stamp = doc?.file_updated_at || doc?.user_signed_at || doc?.su_signed_at || doc?.updated_at || ''
    const join = fileUrl.includes('?') ? '&' : '?'
    return stamp ? `${fileUrl}${join}v=${encodeURIComponent(stamp)}` : fileUrl
  }, [fileUrl, doc?.file_updated_at, doc?.user_signed_at, doc?.su_signed_at, doc?.updated_at])

  useEffect(() => {
    const first =
      (suActive && placements.find((p) => p.role === 'SUPER_USER')) ||
      placements.find((p) => p.role === 'USER')
    if (first?.page) setPageNumber(first.page)
  }, [placements, suActive])

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
  }, [pdfSrc])

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

  // Fit PDF in the content frame (right padding leaves room for pager).
  const pageWidth = useMemo(() => {
    const pad = 8
    const availW = Math.max(160, frameSize.width - pad)
    const availH = Math.max(160, frameSize.height - pad)
    const pdfW = pageSize.width || 612
    const pdfH = pageSize.height || 792
    const aspect = pdfW / pdfH
    return Math.max(160, Math.min(availW, availH * aspect))
  }, [frameSize.width, frameSize.height, pageSize.width, pageSize.height])

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

  if (!pdfSrc || !doc) {
    return <p className="text-sm text-muted">No document loaded.</p>
  }

  const visible = placements.filter((p) => {
    if (p.page !== pageNumber) return false
    if (p.role === 'USER') {
      // Only overlay USER areas while signing — after that, ink is in the PDF.
      return userActive || (awaitingUserSign && viewerRole === 'SUPER_USER')
    }
    if (p.role === 'SUPER_USER') {
      if (suDone) return false
      return suActive || showSuGuides
    }
    return false
  })

  let hint = 'Viewing document.'
  if (userActive) {
    hint = 'Draw on any User canvas. Your signature is stamped into the PDF on submit.'
  } else if (suActive) {
    hint = 'Draw on any Super User canvas. Your signature is stamped into the PDF on submit.'
  } else if (suDone) {
    hint = 'Both signatures are on the PDF below.'
  } else if (awaitingSuSign) {
    hint =
      viewerRole === 'SUPER_USER'
        ? 'User has signed. Draw on the Super User canvas to complete signing.'
        : 'Waiting for Super User signature.'
  } else if (viewerRole === 'SUPER_USER') {
    hint = 'Preview of placed canvases before the user signs.'
  }

  return (
    <div className="flex h-full min-h-[360px] flex-col gap-2">
      <p className="shrink-0 text-sm text-muted">{hint}</p>

      <div
        ref={frameRef}
        className="relative flex min-h-0 flex-1 items-end justify-center overflow-hidden rounded-md border border-border bg-[#0a0a0c] p-1"
      >
        <div className="pointer-events-auto absolute right-3 top-3 z-40">
          <div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/75 px-1.5 py-1 shadow-[0_6px_16px_rgba(0,0,0,0.4)] backdrop-blur-md">
            <button
              type="button"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Prev
            </button>
            <span className="min-w-[3.5rem] text-center text-[11px] font-semibold tabular-nums text-white">
              {pageNumber} / {numPages || '—'}
            </span>
            <button
              type="button"
              disabled={!numPages || pageNumber >= numPages}
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Next
            </button>
          </div>
        </div>

        <div ref={layerRef} className="relative block w-fit max-w-full shrink-0">
          <Document
            key={pdfSrc}
            file={pdfSrc}
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
                  className="absolute z-20 overflow-hidden border-2 border-sky-400 bg-white shadow-md"
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

            if (!isUser && suActive) {
              return (
                <div
                  key={p.id || `su-${index}`}
                  className="absolute z-20 overflow-hidden border-2 border-emerald-400 bg-white shadow-md"
                  style={{
                    left: display.x,
                    top: display.y,
                    width: display.width,
                    height: display.height,
                  }}
                >
                  <SignatureCanvas
                    ref={(node) => setPadRef(p.id || `su-${index}`, node)}
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
                  className="pointer-events-none absolute z-10 overflow-hidden border border-dashed border-sky-300 bg-white/40"
                  style={{
                    left: display.x,
                    top: display.y,
                    width: display.width,
                    height: display.height,
                  }}
                >
                  <div className="flex h-full items-center justify-center text-[10px] text-slate-500">
                    {label} (awaiting)
                  </div>
                </div>
              )
            }

            return (
              <div
                key={p.id || `su-${index}`}
                className="pointer-events-none absolute z-10 overflow-hidden border border-dashed border-emerald-300 bg-white/50"
                style={{
                  left: display.x,
                  top: display.y,
                  width: display.width,
                  height: display.height,
                }}
              >
                <div className="flex h-full items-center justify-center text-[10px] text-slate-500">
                  {label} (pending)
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
