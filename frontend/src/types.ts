export type Viewport = {
  x: number
  y: number
  width: number
  height: number
}

export type TileBounds = {
  x0: number
  x1: number
  y0: number
  y1: number
}

export type TileDescriptor = {
  key: string
  bounds: TileBounds
}

export type TextureEntry = {
  texture: WebGLTexture
  width: number
  height: number
}

export type TileCacheEntry = {
  layer: number
  texture: WebGLTexture
  width: number
  height: number
  bounds: TileBounds
}

export type GLContext = {
  gl: WebGLRenderingContext
  program: WebGLProgram
  buffers: {
    position: WebGLBuffer
    texCoord: WebGLBuffer
  }
  locations: {
    position: number
    texCoord: number
    sampler: WebGLUniformLocation
  }
}
