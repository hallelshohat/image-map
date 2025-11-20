import { useMemo } from 'react'

// Generate evenly spaced ticks over the current viewport span so axes reflect what is visible.
export const useAxisTicks = (viewport: { x: number; y: number; width: number; height: number }) =>
  useMemo(() => {
    const makeTicks = (start: number, span: number, count: number) => {
      const step = span / count
      const ticks = []
      for (let i = 0; i <= count; i += 1) {
        ticks.push({ pos: i / count, value: start + i * step })
      }
      return ticks
    }
    return {
      x: makeTicks(viewport.x, viewport.width, 5),
      y: makeTicks(viewport.y, viewport.height, 5),
    }
  }, [viewport])
