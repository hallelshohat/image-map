import { BASE_HEIGHT, BASE_WIDTH, MAX_LAYER, MIN_LAYER } from './constants'

// Basic clamp utility shared across viewport math.
export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

// Derive tile grid sizing for a given layer (tiles double each axis per layer).
export const tileGridForLayer = (layer: number) => {
  const tilesPerAxis = 2 ** layer
  return {
    tilesPerAxis,
    tileWidth: BASE_WIDTH / tilesPerAxis,
    tileHeight: BASE_HEIGHT / tilesPerAxis,
  }
}

// Convert viewport area to a layer index: each layer represents a 4x jump in pixel density.
export const layerForViewport = (viewport: { width: number; height: number }) => {
  const viewportArea = Math.max(1, viewport.width * viewport.height)
  const baseArea = BASE_WIDTH * BASE_HEIGHT
  const ratio = Math.max(1, baseArea / viewportArea)
  const layer = 1 + Math.floor(Math.log(ratio) / Math.log(4))
  return clamp(layer, MIN_LAYER, MAX_LAYER)
}
