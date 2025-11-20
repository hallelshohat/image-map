import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BASE_HEIGHT, BASE_WIDTH } from '../lib/constants'
import { tileGridForLayer } from '../lib/view'
import type { GLContext, TileDescriptor, TileCacheEntry } from '../types'
import { createTextureFromBitmap, fetchBitmap } from '../lib/gl'

type UseTilesArgs = {
  viewport: { x: number; y: number; width: number; height: number }
  layer: number
  gl: GLContext | null
}

export function useTiles({ viewport, layer, gl }: UseTilesArgs) {
  // GPU-resident tiles keyed by layer/col/row.
  const tileCache = useRef<Map<string, TileCacheEntry>>(new Map())
  // Track in-flight fetches with abort support so stale requests can be cancelled.
  const inFlight = useRef<Map<string, { layer: number; controller: AbortController }>>(new Map())
  const [version, setVersion] = useState(0)

  const activeTiles = useMemo(() => {
    // Compute the minimal set of tiles covering the viewport plus a 1-tile gutter.
    const { tileWidth, tileHeight, tilesPerAxis } = tileGridForLayer(layer)
    const tiles: TileDescriptor[] = []
    const startCol = Math.max(Math.floor(viewport.x / tileWidth) - 1, 0)
    const endCol = Math.min(Math.floor((viewport.x + viewport.width) / tileWidth) + 1, tilesPerAxis - 1)
    const startRow = Math.max(Math.floor(viewport.y / tileHeight) - 1, 0)
    const endRow = Math.min(Math.floor((viewport.y + viewport.height) / tileHeight) + 1, tilesPerAxis - 1)

    for (let row = startRow; row <= endRow; row += 1) {
      for (let col = startCol; col <= endCol; col += 1) {
        const x0 = Math.floor(col * tileWidth)
        const x1 = col === tilesPerAxis - 1 ? BASE_WIDTH : Math.floor((col + 1) * tileWidth)
        const y0 = Math.floor(row * tileHeight)
        const y1 = row === tilesPerAxis - 1 ? BASE_HEIGHT : Math.floor((row + 1) * tileHeight)
        tiles.push({
          key: `${layer}:${col}:${row}`,
          bounds: { x0, x1, y0, y1 },
        })
      }
    }
    return tiles
  }, [layer, viewport])

  const requestTile = useCallback(
    (tile: TileDescriptor, tileLayer: number) => {
      if (!gl) return
      const cached = tileCache.current.get(tile.key)
      if (cached && cached.layer >= tileLayer) {
        return
      }
      const inflight = inFlight.current.get(tile.key)
      if (inflight && inflight.layer >= tileLayer) {
        return
      }
      inflight?.controller.abort()
      const controller = new AbortController()
      inFlight.current.set(tile.key, { layer: tileLayer, controller })
      fetchBitmap(tile.bounds, tileLayer, controller.signal)
        .then((bitmap) => {
          const nextTexture = createTextureFromBitmap(gl.gl, bitmap)
          const existing = tileCache.current.get(tile.key)
          if (existing) {
            gl.gl.deleteTexture(existing.texture)
          }
          tileCache.current.set(tile.key, {
            layer: tileLayer,
            texture: nextTexture.texture,
            width: nextTexture.width,
            height: nextTexture.height,
            bounds: tile.bounds,
          })
        })
        .catch((error) => {
          if ((error as DOMException)?.name !== 'AbortError') {
            console.error('Tile fetch failed', error)
          }
        })
        .finally(() => {
          const current = inFlight.current.get(tile.key)
          if (current && current.layer === tileLayer) {
            current.controller.abort()
            inFlight.current.delete(tile.key)
          }
          setVersion((prev) => prev + 1)
        })
    },
    [gl]
  )

  useEffect(() => {
    if (!gl) return
    const activeKeys = new Set(activeTiles.map((tile) => tile.key))

    inFlight.current.forEach((entry, key) => {
      if (!activeKeys.has(key)) {
        entry.controller.abort()
        inFlight.current.delete(key)
      }
    })

    activeTiles.forEach((tile) => requestTile(tile, layer))
  }, [activeTiles, layer, gl, requestTile])

  return { activeTiles, tileCache, version }
}
