import type { TextureEntry, TileBounds } from '../types'

export const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`

export const fragmentShaderSource = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_texture;
  void main() {
    gl_FragColor = texture2D(u_texture, v_texCoord);
  }
`

export const compileShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type)
  if (!shader) {
    throw new Error('Unable to create shader')
  }
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(info ?? 'Shader compilation failed')
  }
  return shader
}

export const createProgram = (
  gl: WebGLRenderingContext,
  vertexSrc: string = vertexShaderSource,
  fragmentSrc: string = fragmentShaderSource
) => {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSrc)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc)
  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    throw new Error('Unable to create WebGL program')
  }
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(info ?? 'WebGL program link failed')
  }
  return program
}

export const createTextureFromBitmap = (gl: WebGLRenderingContext, bitmap: ImageBitmap): TextureEntry => {
  const texture = gl.createTexture()
  if (!texture) {
    bitmap.close()
    throw new Error('Unable to create texture')
  }
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap)
  gl.bindTexture(gl.TEXTURE_2D, null)
  bitmap.close()
  return { texture, width: bitmap.width, height: bitmap.height }
}

export const fetchBitmap = async (bounds: TileBounds, layer: number, signal?: AbortSignal): Promise<ImageBitmap> => {
  const params = new URLSearchParams({
    x0: Math.floor(bounds.x0).toString(),
    x1: Math.ceil(bounds.x1).toString(),
    y0: Math.floor(bounds.y0).toString(),
    y1: Math.ceil(bounds.y1).toString(),
    layer: layer.toString(),
  })

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/crop?${params.toString()}`, {
    signal,
  })
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.detail ?? response.statusText)
  }

  const blob = await response.blob()
  return createImageBitmap(blob)
}

// Convert world coords to clip-space for WebGL (aligns with current viewport).
export const toClipX = (worldX: number, viewport: { x: number; width: number }) =>
  (2 * (worldX - viewport.x)) / viewport.width - 1

export const toClipY = (worldY: number, viewport: { y: number; height: number }) =>
  1 - (2 * (worldY - viewport.y)) / viewport.height
