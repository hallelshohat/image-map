import { BASE_HEIGHT, BASE_WIDTH, MAX_LAYER, MIN_LAYER, TILE_TARGET_SIZE } from './constants'

// Basic clamp utility shared across viewport math.
export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

// Derive tile grid sizing for a given layer based on a fixed target pixel size.
// Higher layers still use more detailed pixels, but tile count is bounded by world size / target size.
export const tileGridForLayer = (
  layer: number,
  baseWidth: number = BASE_WIDTH,
  baseHeight: number = BASE_HEIGHT,
  maxLayer: number = MAX_LAYER
) => {
  const stride = 4 ** (maxLayer - layer) // pixel stride relative to full-res
  const targetSize = TILE_TARGET_SIZE * stride
  const tilesPerAxisX = Math.max(1, Math.ceil(baseWidth / targetSize))
  const tilesPerAxisY = Math.max(1, Math.ceil(baseHeight / targetSize))
  return {
    tilesPerAxisX,
    tilesPerAxisY,
    tileWidth: baseWidth / tilesPerAxisX,
    tileHeight: baseHeight / tilesPerAxisY,
  }
}

// Convert viewport area to a layer index: each layer represents a 4x jump in pixel density.
export const layerForViewport = (
  viewport: { width: number; height: number },
  opts: { baseWidth?: number; baseHeight?: number; minLayer?: number; maxLayer?: number } = {}
) => {
  const baseWidth = opts.baseWidth ?? BASE_WIDTH
  const baseHeight = opts.baseHeight ?? BASE_HEIGHT
  const minLayer = opts.minLayer ?? MIN_LAYER
  const maxLayer = opts.maxLayer ?? MAX_LAYER
  const viewportArea = Math.max(1, viewport.width * viewport.height)
  const baseArea = baseWidth * baseHeight
  const ratio = Math.max(1, baseArea / viewportArea)
  const layer = 1 + Math.floor(Math.log(ratio) / Math.log(4))
  return clamp(layer, minLayer, maxLayer)
}
