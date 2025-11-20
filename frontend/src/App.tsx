import { MapViewer } from './components/MapViewer'
import { BASE_HEIGHT, BASE_WIDTH, MAX_LAYER, MIN_LAYER } from './lib/constants'
import { fetchBitmap } from './lib/gl'
import { CssBaseline, GlobalStyles } from '@mui/material'
import { styled } from '@mui/material/styles'

const fetchTile = (bounds: { x0: number; x1: number; y0: number; y1: number }, layer: number, signal?: AbortSignal) =>
  fetchBitmap(bounds, layer, signal)

const AppContainer = styled('div')({
  maxWidth: 1100,
  margin: '0 auto',
  padding: '2rem 1.5rem 3rem',
  color: '#e2e8f0',
})

const Header = styled('header')({
  textAlign: 'center',
  marginBottom: '1.5rem',
  h1: {
    marginBottom: '0.5rem',
    fontSize: '2rem',
  },
  p: {
    margin: 0,
    color: '#cbd5f5',
  },
})

function App() {
  return (
    <>
      <CssBaseline />
      <GlobalStyles
        styles={{
          ':root': {
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: '#0f172a',
            backgroundColor: '#020617',
          },
          '*': { boxSizing: 'border-box' },
          body: {
            margin: 0,
            minHeight: '100vh',
            background: 'radial-gradient(circle at top, #0f172a 0%, #020617 60%)',
          },
        }}
      />
      <AppContainer>
        <Header>
          <h1>Interactive Image Map</h1>
          <p>Drag to pan, scroll to zoom, and right-drag to stretch. Tiles sharpen as you focus.</p>
        </Header>
      <MapViewer
        baseWidth={BASE_WIDTH}
        baseHeight={BASE_HEIGHT}
        minLayer={MIN_LAYER}
        maxLayer={MAX_LAYER}
        fetchTile={fetchTile}
      />
      </AppContainer>
    </>
  )
}

export default App
