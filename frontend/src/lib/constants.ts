// Default world dimensions (can be overridden by MapViewer props).
export const BASE_WIDTH = 21600
export const BASE_HEIGHT = 10800

// Layer bounds (can be overridden by MapViewer props).
export const MIN_LAYER = 1
export const MAX_LAYER = 6

// Smallest viewport dimensions (prevents zooming into nothing).
export const MIN_VIEW_WIDTH = 80
export const MIN_VIEW_HEIGHT = 40

// Target per-tile pixel size at full resolution (higher layers adjust stride).
export const TILE_TARGET_SIZE = 1024
