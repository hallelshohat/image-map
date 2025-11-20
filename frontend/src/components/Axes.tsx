import './Axes.css'

type Tick = { pos: number; value: number }

type AxesProps = {
  xTicks: Tick[]
  yTicks: Tick[]
}

export function Axes({ xTicks, yTicks }: AxesProps) {
  return (
    <>
      <div className="axis x">
        <span>X</span>
        <div className="ticks horizontal">
          {xTicks.map((tick) => (
            <div key={tick.value} className="tick" style={{ left: `${tick.pos * 100}%` }} />
          ))}
          {xTicks.map((tick) => (
            <div key={`label-${tick.value}`} className="tick label" style={{ left: `${tick.pos * 100}%` }}>
              {Math.round(tick.value)}
            </div>
          ))}
        </div>
      </div>
      <div className="axis y">
        <span>Y</span>
        <div className="ticks vertical">
          {yTicks.map((tick) => (
            <div
              key={tick.value}
              className="tick"
              style={{ top: `${tick.pos * 100}%`, height: '1px', width: '12px' }}
            />
          ))}
          {yTicks.map((tick) => (
            <div key={`label-${tick.value}`} className="tick label" style={{ top: `${tick.pos * 100}%` }}>
              {Math.round(tick.value)}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
