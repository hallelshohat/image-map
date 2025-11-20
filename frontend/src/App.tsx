import './App.css'
import { MapViewer } from './components/MapViewer'
import { BASE_HEIGHT, BASE_WIDTH, MAX_LAYER, MIN_LAYER } from './lib/constants'
import { fetchBitmap } from './lib/gl'

const fetchTile = (bounds: { x0: number; x1: number; y0: number; y1: number }, layer: number, signal?: AbortSignal) =>
  fetchBitmap(bounds, layer, signal)

function App() {
  return (
    <div className="app">
      <header>
        <h1>Interactive Image Map</h1>
        <p>Drag to pan, scroll to zoom, and right-drag to stretch. Tiles sharpen as you focus.</p>
      </header>
      <MapViewer
        baseWidth={BASE_WIDTH}
        baseHeight={BASE_HEIGHT}
        minLayer={MIN_LAYER}
        maxLayer={MAX_LAYER}
        fetchTile={fetchTile}
      />
    </div>
  )
}

export default App
