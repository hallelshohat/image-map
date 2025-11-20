import { useEffect, useRef, useState } from 'react'

export type Size = {
  width: number
  height: number
}

// Track container width and derive a 2:1 height to keep the canvas proportional.
export function useContainerSize(initial: Size = { width: 960, height: 480 }) {
  const [size, setSize] = useState<Size>(initial)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const nextWidth = entry.contentRect.width
      setSize({
        width: nextWidth,
        height: nextWidth / 2,
      })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return { ref, size }
}
