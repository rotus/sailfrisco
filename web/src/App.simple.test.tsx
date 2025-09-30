import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

// Mock MapLibre GL
vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      on: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      remove: vi.fn(),
    })),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn(),
      addTo: vi.fn(),
      remove: vi.fn(),
    })),
  },
  Map: vi.fn(() => ({
    on: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    remove: vi.fn(),
  })),
  Marker: vi.fn(() => ({
    setLngLat: vi.fn(),
    addTo: vi.fn(),
    remove: vi.fn(),
  })),
}))

// Mock react-icons
vi.mock('react-icons/wi', () => ({
  WiDaySunny: () => <div data-testid="sun-icon">☀️</div>,
  WiCloudy: () => <div data-testid="cloud-icon">☁️</div>,
  WiRain: () => <div data-testid="rain-icon">🌧️</div>,
}))

describe('App Simple Test', () => {
  it('renders the loading screen initially', () => {
    render(<App />)
    expect(screen.getByText('Loading SailFrisco...')).toBeInTheDocument()
  })
})
