import { useState, useRef, useEffect } from 'react'
import type { MapAnnotation, MapEntry } from '../types'
import { v4 as uuid } from '../uuid'
import { loadMapImage } from '../mapImageStore'

type Tool = 'pan' | 'draw' | 'pin' | 'text' | 'erase'

interface Props {
  map: MapEntry
  onAnnotationsChange: (annotations: MapAnnotation[]) => void
}

// Cardinal spline → cubic bezier path
function pointsToPath(pts: Array<{ x: number; y: number }>, W: number, H: number): string {
  if (pts.length < 2) return ''
  const p = pts.map(pt => ({ x: pt.x * W, y: pt.y * H }))
  if (p.length === 2) return `M ${p[0].x} ${p[0].y} L ${p[1].x} ${p[1].y}`
  let d = `M ${p[0].x} ${p[0].y}`
  const t = 0.4
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[Math.min(p.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) * t / 3
    const cp1y = p1.y + (p2.y - p0.y) * t / 3
    const cp2x = p2.x - (p3.x - p1.x) * t / 3
    const cp2y = p2.y - (p3.y - p1.y) * t / 3
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`
  }
  return d
}

export default function MapEditor({ map, onAnnotationsChange }: Props) {
  const [tool, setTool] = useState<Tool>('pan')
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  // pan state
  const [panning, setPanning] = useState(false)
  const panOrigin = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })
  // draw state
  const [drawing, setDrawing] = useState(false)
  const [livePoints, setLivePoints] = useState<Array<{ x: number; y: number }>>([])
  const [drawColor, setDrawColor] = useState('#f59e0b')
  const [drawWidth, setDrawWidth] = useState(3)
  // pin/text pending
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null)
  const [pinLabel, setPinLabel] = useState('')
  const [pinColor, setPinColor] = useState('#ef4444')
  const [pendingText, setPendingText] = useState<{ x: number; y: number } | null>(null)
  const [textContent, setTextContent] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const offsetRef = useRef(offset)
  const scaleRef = useRef(scale)
  useEffect(() => { offsetRef.current = offset }, [offset])
  useEffect(() => { scaleRef.current = scale }, [scale])

  // Load image from IndexedDB
  useEffect(() => {
    setImgSrc(null)
    setOffset({ x: 0, y: 0 })
    setScale(1)
    setImgSize({ w: 0, h: 0 })
    loadMapImage(map.id).then(src => setImgSrc(src))
  }, [map.id])

  function fitView(iw: number, ih: number) {
    const c = containerRef.current
    if (!c) return
    const s = Math.min(c.clientWidth / iw, c.clientHeight / ih, 1)
    setScale(s)
    setOffset({ x: (c.clientWidth - iw * s) / 2, y: (c.clientHeight - ih * s) / 2 })
  }

  function handleImageLoad() {
    const img = imgRef.current
    if (!img) return
    const { naturalWidth: w, naturalHeight: h } = img
    setImgSize({ w, h })
    fitView(w, h)
  }

  function toNorm(clientX: number, clientY: number) {
    const c = containerRef.current
    if (!c || imgSize.w === 0) return null
    const rect = c.getBoundingClientRect()
    const ix = (clientX - rect.left - offsetRef.current.x) / scaleRef.current
    const iy = (clientY - rect.top - offsetRef.current.y) / scaleRef.current
    return { x: ix / imgSize.w, y: iy / imgSize.h }
  }

  // Wheel zoom toward cursor
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const rect = el!.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      const ns = Math.min(Math.max(scaleRef.current * factor, 0.05), 15)
      const ratio = ns / scaleRef.current
      setOffset({ x: mx - (mx - offsetRef.current.x) * ratio, y: my - (my - offsetRef.current.y) * ratio })
      setScale(ns)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    // Dismiss popups on click outside them
    if (pendingPin || pendingText) { setPendingPin(null); setPendingText(null); return }

    if (tool === 'pan') {
      setPanning(true)
      panOrigin.current = { mx: e.clientX, my: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    const norm = toNorm(e.clientX, e.clientY)
    if (!norm) return

    if (tool === 'draw') {
      setDrawing(true)
      setLivePoints([norm])
      e.currentTarget.setPointerCapture(e.pointerId)
    } else if (tool === 'pin') {
      setPendingPin(norm)
      setPinLabel('')
    } else if (tool === 'text') {
      setPendingText(norm)
      setTextContent('')
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (tool === 'pan' && panning) {
      setOffset({
        x: panOrigin.current.ox + e.clientX - panOrigin.current.mx,
        y: panOrigin.current.oy + e.clientY - panOrigin.current.my,
      })
      return
    }
    if (tool === 'draw' && drawing) {
      const norm = toNorm(e.clientX, e.clientY)
      if (!norm) return
      setLivePoints(prev => {
        const last = prev[prev.length - 1]
        if (last) {
          const dx = (norm.x - last.x) * imgSize.w
          const dy = (norm.y - last.y) * imgSize.h
          if (dx * dx + dy * dy < 4) return prev
        }
        return [...prev, norm]
      })
    }
  }

  function handlePointerUp(_e: React.PointerEvent<HTMLDivElement>) {
    if (tool === 'pan' && panning) { setPanning(false); return }
    if (tool === 'draw' && drawing) {
      setDrawing(false)
      if (livePoints.length > 1) {
        onAnnotationsChange([...map.annotations, {
          id: uuid(), type: 'path',
          x: livePoints[0].x, y: livePoints[0].y,
          points: livePoints, strokeColor: drawColor, strokeWidth: drawWidth,
        }])
      }
      setLivePoints([])
    }
  }

  function commitPin() {
    if (!pendingPin) return
    onAnnotationsChange([...map.annotations, {
      id: uuid(), type: 'pin',
      x: pendingPin.x, y: pendingPin.y,
      label: pinLabel.trim() || undefined, pinColor,
    }])
    setPendingPin(null)
    setPinLabel('')
  }

  function commitText() {
    if (!pendingText || !textContent.trim()) return
    onAnnotationsChange([...map.annotations, {
      id: uuid(), type: 'text',
      x: pendingText.x, y: pendingText.y,
      text: textContent.trim(), textColor: drawColor,
      fontSize: Math.round(14 / scale),
    }])
    setPendingText(null)
    setTextContent('')
  }

  function erase(id: string) {
    onAnnotationsChange(map.annotations.filter(a => a.id !== id))
  }

  function zoomBy(factor: number) {
    const c = containerRef.current
    if (!c) return
    const cx = c.clientWidth / 2, cy = c.clientHeight / 2
    const ns = Math.min(Math.max(scaleRef.current * factor, 0.05), 15)
    const ratio = ns / scaleRef.current
    setOffset({ x: cx - (cx - offsetRef.current.x) * ratio, y: cy - (cy - offsetRef.current.y) * ratio })
    setScale(ns)
  }

  const TOOLS: { key: Tool; icon: string; title: string }[] = [
    { key: 'pan',   icon: '✋', title: 'Pan / Move (drag to pan, scroll to zoom)' },
    { key: 'draw',  icon: '✏️', title: 'Freehand draw' },
    { key: 'pin',   icon: '📍', title: 'Place pin marker' },
    { key: 'text',  icon: '🔤', title: 'Add text annotation' },
    { key: 'erase', icon: '🗑️', title: 'Erase annotation (click to remove)' },
  ]

  const cursorStyle = {
    pan: panning ? 'grabbing' : 'grab',
    draw: 'crosshair',
    pin: 'crosshair',
    text: 'text',
    erase: 'pointer',
  }[tool]

  const showColor = tool === 'draw' || tool === 'text'
  const isErase = tool === 'erase'

  return (
    <div className="flex flex-col h-full gap-2">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Tool buttons */}
        <div className="flex items-center gap-0.5 bg-amber-950/40 border border-amber-800/30 rounded-lg p-1">
          {TOOLS.map(t => (
            <button
              key={t.key}
              onClick={() => setTool(t.key)}
              title={t.title}
              className={`w-8 h-8 rounded text-base flex items-center justify-center transition-colors ${
                tool === t.key
                  ? 'bg-amber-700/60 text-amber-100'
                  : 'text-amber-600/50 hover:text-amber-300 hover:bg-amber-900/40'
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Color picker */}
        {(showColor || tool === 'pin') && (
          <label className="flex items-center gap-1.5 cursor-pointer" title="Color">
            <input
              type="color"
              value={tool === 'pin' ? pinColor : drawColor}
              onChange={e => tool === 'pin' ? setPinColor(e.target.value) : setDrawColor(e.target.value)}
              className="w-7 h-7 rounded border border-amber-700/30 cursor-pointer bg-transparent p-0.5"
            />
            <span className="text-[10px] text-amber-700/50">Color</span>
          </label>
        )}

        {/* Brush size */}
        {tool === 'draw' && (
          <select
            value={drawWidth}
            onChange={e => setDrawWidth(Number(e.target.value))}
            className="text-xs rounded-lg px-2 py-1 border border-amber-700/30"
            style={{ background: 'var(--color-amber-950)', color: 'var(--color-amber-300)' }}
          >
            <option value={1}>Fine</option>
            <option value={3}>Normal</option>
            <option value={6}>Thick</option>
            <option value={14}>Heavy</option>
          </select>
        )}

        {tool === 'erase' && (
          <span className="text-[10px] text-amber-600/40 italic">Click any annotation to remove it</span>
        )}

        <div className="flex-1" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button onClick={() => zoomBy(1.25)} className="w-7 h-7 bg-amber-900/30 hover:bg-amber-800/40 rounded text-amber-400 text-sm font-bold">+</button>
          <span className="text-[11px] text-amber-700/50 w-11 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button onClick={() => zoomBy(1 / 1.25)} className="w-7 h-7 bg-amber-900/30 hover:bg-amber-800/40 rounded text-amber-400 text-sm font-bold">−</button>
          <button
            onClick={() => fitView(imgSize.w, imgSize.h)}
            className="h-7 px-2 bg-amber-900/30 hover:bg-amber-800/40 rounded text-amber-400 text-[10px] ml-0.5"
            title="Fit to view"
          >
            Fit
          </button>
        </div>
      </div>

      {/* ── Viewport ── */}
      <div
        ref={containerRef}
        className="flex-1 bg-amber-950/20 border border-amber-800/20 rounded-xl overflow-hidden relative select-none"
        style={{ cursor: cursorStyle, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => { if (panning) setPanning(false); if (drawing) { setDrawing(false); setLivePoints([]) } }}
      >
        {imgSrc ? (
          <div
            style={{
              position: 'absolute',
              transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              width: imgSize.w || 'auto',
              height: imgSize.h || 'auto',
            }}
          >
            <img
              ref={imgRef}
              src={imgSrc}
              onLoad={handleImageLoad}
              draggable={false}
              style={{ display: 'block', width: imgSize.w || 'auto', height: imgSize.h || 'auto', userSelect: 'none' }}
            />

            {imgSize.w > 0 && (
              <svg
                style={{
                  position: 'absolute', inset: 0,
                  width: imgSize.w, height: imgSize.h,
                  overflow: 'visible',
                  pointerEvents: isErase ? 'all' : 'none',
                }}
              >
                {/* Saved annotations */}
                {map.annotations.map(ann => {
                  const erasable: React.SVGProps<any> = isErase
                    ? { onClick: () => erase(ann.id), style: { cursor: 'pointer', pointerEvents: 'all' } }
                    : { style: { pointerEvents: 'none' } }

                  if (ann.type === 'path' && ann.points) {
                    return (
                      <path
                        key={ann.id}
                        d={pointsToPath(ann.points, imgSize.w, imgSize.h)}
                        fill="none"
                        stroke={ann.strokeColor ?? '#f59e0b'}
                        strokeWidth={(ann.strokeWidth ?? 3) / scale}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        {...erasable}
                      />
                    )
                  }

                  if (ann.type === 'pin') {
                    const px = ann.x * imgSize.w, py = ann.y * imgSize.h
                    const r = 7 / scale
                    return (
                      <g key={ann.id} {...erasable}>
                        <circle cx={px} cy={py} r={r} fill={ann.pinColor ?? '#ef4444'} stroke="white" strokeWidth={1 / scale} />
                        <circle cx={px} cy={py - r * 0.35} r={r * 0.35} fill="white" opacity={0.5} />
                        {ann.label && (
                          <text
                            x={px + r * 1.5} y={py + r * 0.5}
                            fill="white" stroke="rgba(0,0,0,0.7)" strokeWidth={2 / scale} paintOrder="stroke"
                            fontSize={11 / scale} fontWeight="bold"
                            style={{ pointerEvents: 'none' }}
                          >
                            {ann.label}
                          </text>
                        )}
                      </g>
                    )
                  }

                  if (ann.type === 'text' && ann.text) {
                    return (
                      <text
                        key={ann.id}
                        x={ann.x * imgSize.w} y={ann.y * imgSize.h}
                        fill={ann.textColor ?? '#fef3c7'}
                        stroke="rgba(0,0,0,0.6)" strokeWidth={2 / scale} paintOrder="stroke"
                        fontSize={(ann.fontSize ?? 14) / scale}
                        fontFamily="sans-serif"
                        {...erasable}
                      >
                        {ann.text}
                      </text>
                    )
                  }
                  return null
                })}

                {/* Live draw preview */}
                {drawing && livePoints.length > 1 && (
                  <path
                    d={pointsToPath(livePoints, imgSize.w, imgSize.h)}
                    fill="none"
                    stroke={drawColor}
                    strokeWidth={drawWidth / scale}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
              </svg>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-amber-700/30 text-sm">
            Loading map…
          </div>
        )}

        {/* ── Pin label popup ── */}
        {pendingPin && (
          <div
            className="absolute z-30 bg-amber-950 border border-amber-700/50 rounded-lg p-2 shadow-2xl"
            style={{
              left: Math.min(pendingPin.x * imgSize.w * scale + offset.x + 12, (containerRef.current?.clientWidth ?? 400) - 180),
              top: Math.max(pendingPin.y * imgSize.h * scale + offset.y - 16, 4),
            }}
            onPointerDown={e => e.stopPropagation()}
          >
            <p className="text-[9px] uppercase tracking-widest text-amber-700/50 mb-1">Pin label</p>
            <input
              autoFocus
              value={pinLabel}
              onChange={e => setPinLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitPin(); if (e.key === 'Escape') setPendingPin(null) }}
              placeholder="Optional label…"
              className="bg-amber-900/30 border border-amber-700/30 rounded px-2 py-0.5 text-amber-100 text-xs outline-none w-36"
            />
            <div className="flex gap-1 mt-1.5">
              <button onClick={commitPin} className="flex-1 text-[10px] bg-amber-700/40 hover:bg-amber-600/50 rounded px-2 py-0.5 text-amber-200 transition-colors">Place</button>
              <button onClick={() => setPendingPin(null)} className="text-[10px] text-amber-700/50 hover:text-amber-400 px-1">✕</button>
            </div>
          </div>
        )}

        {/* ── Text input popup ── */}
        {pendingText && (
          <div
            className="absolute z-30 bg-amber-950 border border-amber-700/50 rounded-lg p-2 shadow-2xl"
            style={{
              left: Math.min(pendingText.x * imgSize.w * scale + offset.x + 8, (containerRef.current?.clientWidth ?? 400) - 200),
              top: Math.max(pendingText.y * imgSize.h * scale + offset.y - 12, 4),
            }}
            onPointerDown={e => e.stopPropagation()}
          >
            <p className="text-[9px] uppercase tracking-widest text-amber-700/50 mb-1">Add text</p>
            <input
              autoFocus
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitText(); if (e.key === 'Escape') setPendingText(null) }}
              placeholder="Enter text…"
              className="bg-amber-900/30 border border-amber-700/30 rounded px-2 py-0.5 text-amber-100 text-xs outline-none w-44"
            />
            <div className="flex gap-1 mt-1.5">
              <button onClick={commitText} className="flex-1 text-[10px] bg-amber-700/40 hover:bg-amber-600/50 rounded px-2 py-0.5 text-amber-200 transition-colors">Add</button>
              <button onClick={() => setPendingText(null)} className="text-[10px] text-amber-700/50 hover:text-amber-400 px-1">✕</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
