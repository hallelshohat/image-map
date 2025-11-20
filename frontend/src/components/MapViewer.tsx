import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { Axes } from './Axes'
import { useAxisTicks } from '../hooks/useAxisTicks'
import { useContainerSize } from '../hooks/useContainerSize'
import { useTiles } from '../hooks/useTiles'
import { MIN_VIEW_HEIGHT, MIN_VIEW_WIDTH } from '../lib/constants'
import { createProgram, createTextureFromBitmap, toClipX, toClipY } from '../lib/gl'
import { clamp, layerForViewport } from '../lib/view'
import type { GLContext, TextureEntry, Viewport } from '../types'

type FetchFn = (bounds: { x0: number; x1: number; y0: number; y1: number }, layer: number) => Promise<ImageBitmap>

type MapViewerProps = {
  baseWidth: number
  baseHeight: number
  minLayer: number
  maxLayer: number
  previewLayer?: number
  fetchTile: FetchFn
}

export function MapViewer({
  baseWidth,
  baseHeight,
  minLayer,
  maxLayer,
  previewLayer = minLayer,
  fetchTile,
}: MapViewerProps) {
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    width: baseWidth,
    height: baseHeight,
  })
  const { ref: containerRef, size } = useContainerSize({ width: 960, height: 480 })
  const [status, setStatus] = useState('Initializing renderer…')
  const [dirty, setDirty] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const glRef = useRef<GLContext | null>(null)
  const previewRef = useRef<TextureEntry | null>(null)
  const pointerRef = useRef<{
    mode: 'pan' | 'stretch' | null
    startX: number
    startY: number
    viewport: Viewport
    pointerId: number
  } | null>(null)

  const currentLayer = useMemo(
    () => layerForViewport(viewport, { baseWidth, baseHeight, minLayer, maxLayer }),
    [viewport, baseWidth, baseHeight, minLayer, maxLayer]
  )
  const axisTicks = useAxisTicks(viewport)
  const { activeTiles, tileCache, version: tileVersion } = useTiles({
    viewport,
    layer: currentLayer,
    baseWidth,
    baseHeight,
    maxLayer,
    gl: glRef.current,
    fetchTile,
  })

  // Initialize WebGL context, program, and buffers once.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl')
    if (!gl) {
      setStatus('WebGL is not supported in this browser')
      return
    }
    try {
      const program = createProgram(gl)
      const positionBuffer = gl.createBuffer()
      const texCoordBuffer = gl.createBuffer()
      if (!positionBuffer || !texCoordBuffer) {
        throw new Error('Unable to create WebGL buffers')
      }
      const positionLocation = gl.getAttribLocation(program, 'a_position')
      const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord')
      const samplerLocation = gl.getUniformLocation(program, 'u_texture')
      if (samplerLocation === null) {
        throw new Error('Missing sampler uniform')
      }
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
      glRef.current = {
        gl,
        program,
        buffers: { position: positionBuffer, texCoord: texCoordBuffer },
        locations: { position: positionLocation, texCoord: texCoordLocation, sampler: samplerLocation },
      }
      setStatus('Loading world preview…')
    } catch (error) {
      console.error(error)
      setStatus(error instanceof Error ? error.message : 'Failed to initialize WebGL')
    }

    return () => {
      const ctx = glRef.current
      if (ctx) {
        tileCache.current.forEach((entry) => ctx.gl.deleteTexture(entry.texture))
        const preview = previewRef.current
        if (preview) ctx.gl.deleteTexture(preview.texture)
        ctx.gl.deleteBuffer(ctx.buffers.position)
        ctx.gl.deleteBuffer(ctx.buffers.texCoord)
        ctx.gl.deleteProgram(ctx.program)
      }
      glRef.current = null
    }
  }, [tileCache])

  // Load a preview layer to fill the screen while detailed tiles stream in.
  useEffect(() => {
    const ctx = glRef.current
    if (!ctx) return
    let cancelled = false
    fetchTile({ x0: 0, x1: baseWidth, y0: 0, y1: baseHeight }, previewLayer)
      .then((bitmap) => {
        if (cancelled) {
          bitmap.close()
          return
        }
        const tex = createTextureFromBitmap(ctx.gl, bitmap)
        if (previewRef.current) ctx.gl.deleteTexture(previewRef.current.texture)
        previewRef.current = tex
        setStatus('')
        setDirty((v) => v + 1)
      })
      .catch((error) => {
        if (!cancelled) setStatus(error instanceof Error ? error.message : 'Failed to load preview image')
      })
    return () => {
      cancelled = true
    }
  }, [baseWidth, baseHeight, fetchTile, previewLayer])

  // Draw preview + tiles whenever data changes.
  const renderScene = useCallback(() => {
    const ctx = glRef.current
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    const width = Math.max(1, Math.floor(size.width))
    const height = Math.max(1, Math.floor(size.height))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const { gl, program, buffers, locations } = ctx
    gl.viewport(0, 0, width, height)
    gl.clearColor(0.02, 0.04, 0.09, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(program)
    gl.enableVertexAttribArray(locations.position)
    gl.enableVertexAttribArray(locations.texCoord)

    const drawQuad = (
      texture: TextureEntry,
      dest: { x0: number; y0: number; x1: number; y1: number },
      uv: { u0: number; v0: number; u1: number; v1: number }
    ) => {
      const positions = new Float32Array([
        toClipX(dest.x0, viewport), toClipY(dest.y0, viewport),
        toClipX(dest.x1, viewport), toClipY(dest.y0, viewport),
        toClipX(dest.x0, viewport), toClipY(dest.y1, viewport),
        toClipX(dest.x0, viewport), toClipY(dest.y1, viewport),
        toClipX(dest.x1, viewport), toClipY(dest.y0, viewport),
        toClipX(dest.x1, viewport), toClipY(dest.y1, viewport),
      ])
      const texCoords = new Float32Array([
        uv.u0, uv.v0,
        uv.u1, uv.v0,
        uv.u0, uv.v1,
        uv.u0, uv.v1,
        uv.u1, uv.v0,
        uv.u1, uv.v1,
      ])
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position)
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW)
      gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texCoord)
      gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.DYNAMIC_DRAW)
      gl.vertexAttribPointer(locations.texCoord, 2, gl.FLOAT, false, 0, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture.texture)
      gl.uniform1i(locations.sampler, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    if (previewRef.current) {
      drawQuad(
        previewRef.current,
        { x0: viewport.x, y0: viewport.y, x1: viewport.x + viewport.width, y1: viewport.y + viewport.height },
        {
          u0: viewport.x / baseWidth,
          v0: viewport.y / baseHeight,
          u1: (viewport.x + viewport.width) / baseWidth,
          v1: (viewport.y + viewport.height) / baseHeight,
        }
      )
    }

    activeTiles.forEach((tile) => {
      const entry = tileCache.current.get(tile.key)
      if (!entry) return
      const clipX0 = Math.max(tile.bounds.x0, viewport.x)
      const clipY0 = Math.max(tile.bounds.y0, viewport.y)
      const clipX1 = Math.min(tile.bounds.x1, viewport.x + viewport.width)
      const clipY1 = Math.min(tile.bounds.y1, viewport.y + viewport.height)
      if (clipX1 <= clipX0 || clipY1 <= clipY0) return
      const tileWidth = tile.bounds.x1 - tile.bounds.x0
      const tileHeight = tile.bounds.y1 - tile.bounds.y0
      drawQuad(
        entry,
        { x0: clipX0, y0: clipY0, x1: clipX1, y1: clipY1 },
        {
          u0: (clipX0 - tile.bounds.x0) / tileWidth,
          v0: (clipY0 - tile.bounds.y0) / tileHeight,
          u1: (clipX1 - tile.bounds.x0) / tileWidth,
          v1: (clipY1 - tile.bounds.y0) / tileHeight,
        }
      )
    })
  }, [activeTiles, size, viewport, tileCache, baseWidth, baseHeight])

  useEffect(() => {
    renderScene()
  }, [renderScene, tileVersion, dirty, size])

  const clampViewport = useCallback(
    (next: Viewport) => {
      const width = clamp(next.width, MIN_VIEW_WIDTH, baseWidth)
      const height = clamp(next.height, MIN_VIEW_HEIGHT, baseHeight)
      const xMax = baseWidth - width
      const yMax = baseHeight - height
      return {
        x: clamp(next.x, 0, Math.max(0, xMax)),
        y: clamp(next.y, 0, Math.max(0, yMax)),
        width,
        height,
      }
    },
    [baseWidth, baseHeight]
  )

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const mode = event.button === 2 ? 'stretch' : 'pan'
    pointerRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      viewport,
      pointerId: event.pointerId,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!pointerRef.current) return
    const { mode, startX, startY, viewport: startViewport } = pointerRef.current
    const deltaX = event.clientX - startX
    const deltaY = event.clientY - startY
    const next = { ...startViewport }

    if (mode === 'pan') {
      const scaleX = startViewport.width / Math.max(1, size.width)
      const scaleY = startViewport.height / Math.max(1, size.height)
      next.x = startViewport.x - deltaX * scaleX
      next.y = startViewport.y - deltaY * scaleY
    } else if (mode === 'stretch') {
      const centerX = startViewport.x + startViewport.width / 2
      const centerY = startViewport.y + startViewport.height / 2
      const widthFactor = 1 - deltaX / Math.max(1, size.width)
      const heightFactor = 1 - deltaY / Math.max(1, size.height)
      const width = startViewport.width * clamp(widthFactor, 0.25, 4)
      const height = startViewport.height * clamp(heightFactor, 0.25, 4)
      next.width = width
      next.height = height
      next.x = centerX - width / 2
      next.y = centerY - height / 2
    }

    setViewport(clampViewport(next))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerRef.current?.pointerId === event.pointerId) {
      pointerRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    const zoomFactor = event.deltaY > 0 ? 1.12 : 0.88
    const offsetX = event.nativeEvent.offsetX / Math.max(1, size.width)
    const offsetY = event.nativeEvent.offsetY / Math.max(1, size.height)

    setViewport((prev) => {
      const nextWidth = clamp(prev.width * zoomFactor, MIN_VIEW_WIDTH, baseWidth)
      const nextHeight = clamp(prev.height * zoomFactor, MIN_VIEW_HEIGHT, baseHeight)
      const focusX = prev.x + prev.width * offsetX
      const focusY = prev.y + prev.height * offsetY
      const nextX = focusX - nextWidth * offsetX
      const nextY = focusY - nextHeight * offsetY
      return clampViewport({ x: nextX, y: nextY, width: nextWidth, height: nextHeight })
    })
  }

  return (
    <div className="map-shell" ref={containerRef}>
      <Axes xTicks={axisTicks.x} yTicks={axisTicks.y} />
      <div className="map-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="map-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
          onContextMenu={(event) => event.preventDefault()}
        />
      </div>
      <div className="hud">
        <span>
          Viewport: {viewport.width.toFixed(0)} × {viewport.height.toFixed(0)} px
        </span>
        <span>Layer: {currentLayer}</span>
      </div>
      {status && <div className="status">{status}</div>}
    </div>
  )
}
