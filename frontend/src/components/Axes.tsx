import { styled } from '@mui/material/styles'

type Tick = { pos: number; value: number }

type AxesProps = {
  xTicks: Tick[]
  yTicks: Tick[]
}

export function Axes({ xTicks, yTicks }: AxesProps) {
  return (
    <>
      <AxisX>
        <span>X</span>
        <TicksHorizontal>
          {xTicks.map((tick) => (
            <Tick key={tick.value} style={{ left: `${tick.pos * 100}%` }} />
          ))}
          {xTicks.map((tick) => (
            <TickLabel key={`label-${tick.value}`} style={{ left: `${tick.pos * 100}%` }}>
              {Math.round(tick.value)}
            </TickLabel>
          ))}
        </TicksHorizontal>
      </AxisX>
      <AxisY>
        <span>Y</span>
        <TicksVertical>
          {yTicks.map((tick) => (
            <Tick
              key={tick.value}
              style={{ top: `${tick.pos * 100}%`, height: '1px', width: '12px' }}
            />
          ))}
          {yTicks.map((tick) => (
            <TickLabelVertical key={`label-${tick.value}`} style={{ top: `${tick.pos * 100}%` }}>
              {Math.round(tick.value)}
            </TickLabelVertical>
          ))}
        </TicksVertical>
      </AxisY>
    </>
  )
}

const Axis = styled('div')({
  background: 'rgba(15, 23, 42, 0.8)',
  color: '#cbd5f5',
  fontSize: '0.75rem',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px',
  whiteSpace: 'nowrap',
  zIndex: 2,
})

const AxisX = styled(Axis)({
  gridArea: '1 / 2 / 2 / 3',
  justifyContent: 'center',
  paddingBottom: 4,
})

const AxisY = styled(Axis)({
  gridArea: '2 / 1 / 3 / 2',
  flexDirection: 'column',
  justifyContent: 'center',
  paddingRight: 4,
})

const Ticks = styled('div')({
  position: 'relative',
  flex: 1,
  height: 12,
})

const TicksHorizontal = styled(Ticks)({
  height: 20,
  overflow: 'visible',
})

const TicksVertical = styled(Ticks)({
  height: '100%',
  width: 36,
  overflow: 'visible',
})

const Tick = styled('div')({
  position: 'absolute',
  width: 1,
  height: '100%',
  background: 'rgba(148, 163, 184, 0.8)',
})

const TickLabel = styled('div')({
  position: 'absolute',
  width: 'auto',
  height: 'auto',
  background: 'none',
  color: '#cbd5f5',
  transform: 'translateX(-50%)',
  top: '100%',
  fontSize: '0.7rem',
})

const TickLabelVertical = styled(TickLabel)({
  transform: 'translate(-10%, -50%)',
  left: '100%',
})
