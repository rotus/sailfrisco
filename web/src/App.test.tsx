import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

// Mock MapLibre GL
vi.mock('maplibre-gl', () => ({
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

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            windSpeedKts: 15.5,
            windGustKts: 22.3,
            windDirectionDeg: 180,
            temperatureC: 18.5,
            pressureHpa: 1013.25,
            visibilityKm: 10.0,
            weatherCode: 1,
            waveHeightFt: 2.1
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            upcoming: [
              { type: 'High', valueFt: 3.2, time: '2024-01-01T12:00:00Z' },
              { type: 'Low', valueFt: 0.8, time: '2024-01-01T18:00:00Z' }
            ]
          }
        })
      })
  })

  // Helper function to wait for app initialization
  const waitForAppToLoad = async () => {
    await waitFor(() => {
      expect(screen.queryByText('Loading SailFrisco...')).not.toBeInTheDocument()
    }, { timeout: 3000 })
  }

  it('renders the main navigation bar', async () => {
    render(<App />)
    await waitForAppToLoad()
    
    expect(screen.getByText('SailFrisco')).toBeInTheDocument()
    expect(screen.getByText('🔄')).toBeInTheDocument()
  })

  it('renders harbor selection dropdown', async () => {
    render(<App />)
    await waitForAppToLoad()
    
    const harborSelect = screen.getByDisplayValue('San Francisco')
    expect(harborSelect).toBeInTheDocument()
  })

  it('renders boat type selection', async () => {
    render(<App />)
    await waitForAppToLoad()
    
    const boatSelect = screen.getByDisplayValue('Sailboat')
    expect(boatSelect).toBeInTheDocument()
  })

  it('renders weather information cards', async () => {
    render(<App />)
    await waitForAppToLoad()
    
    expect(screen.getByText('Wind & Waves')).toBeInTheDocument()
    expect(screen.getByText('Tides')).toBeInTheDocument()
    expect(screen.getByText('Temperature')).toBeInTheDocument()
  })

  it('cards start expanded by default', async () => {
    render(<App />)
    await waitForAppToLoad()
    
    // Wind & Waves card should be expanded
    expect(screen.getByText('Wind Scale')).toBeInTheDocument()
    
    // Tides card should be expanded
    expect(screen.getByText('Tide Chart')).toBeInTheDocument()
    
    // Temperature card should be expanded
    expect(screen.getByText('Temperature Visualization')).toBeInTheDocument()
  })

  it('can toggle card expansion', async () => {
    render(<App />)
    await waitForAppToLoad()
    
    // Click on Wind & Waves card header to collapse
    const windHeader = screen.getByText('Wind & Waves').closest('div')
    if (windHeader) {
      fireEvent.click(windHeader)
      
      // Wait for the card to collapse
      await waitFor(() => {
        expect(screen.queryByText('Wind Scale')).not.toBeInTheDocument()
      })
    }
  })

  it('displays wind data when available', async () => {
    render(<App />)
    await waitForAppToLoad()
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('15.5 kts')).toBeInTheDocument()
    })
  })

  it('displays tide data when available', async () => {
    render(<App />)
    await waitForAppToLoad()
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('3.2 ft')).toBeInTheDocument()
    })
  })

  it('displays temperature data when available', async () => {
    render(<App />)
    await waitForAppToLoad()
    
    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('18.5°C')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    // Mock API error
    mockFetch.mockRejectedValue(new Error('API Error'))
    
    render(<App />)
    await waitForAppToLoad()
    
    // Should still render the basic UI
    expect(screen.getByText('SailFrisco')).toBeInTheDocument()
  })

  it('can change harbor selection', async () => {
    render(<App />)
    await waitForAppToLoad()
    
    const harborSelect = screen.getByDisplayValue('San Francisco')
    fireEvent.change(harborSelect, { target: { value: 'Sausalito' } })
    
    expect(harborSelect).toHaveValue('Sausalito')
  })

  it('can change boat type selection', async () => {
    render(<App />)
    await waitForAppToLoad()
    
    const boatSelect = screen.getByDisplayValue('Sailboat')
    fireEvent.change(boatSelect, { target: { value: 'Powerboat' } })
    
    expect(boatSelect).toHaveValue('Powerboat')
  })

  it('renders map section', async () => {
    render(<App />)
    await waitForAppToLoad()
    
    expect(screen.getByText('Route Planner')).toBeInTheDocument()
    expect(screen.getByText('Bay Area Map')).toBeInTheDocument()
  })
})

describe('Beaufort Scale', () => {
  // Helper function to wait for app initialization
  const waitForAppToLoad = async () => {
    await waitFor(() => {
      expect(screen.queryByText('Loading SailFrisco...')).not.toBeInTheDocument()
    }, { timeout: 3000 })
  }

  it('displays correct wind scale visualization', async () => {
    render(<App />)
    await waitForAppToLoad()
    
    // Wait for wind data to load
    await waitFor(() => {
      expect(screen.getByText('Wind Scale')).toBeInTheDocument()
    })
  })
})

describe('Tide Visualization', () => {
  // Helper function to wait for app initialization
  const waitForAppToLoad = async () => {
    await waitFor(() => {
      expect(screen.queryByText('Loading SailFrisco...')).not.toBeInTheDocument()
    }, { timeout: 3000 })
  }

  it('displays tide chart', async () => {
    render(<App />)
    await waitForAppToLoad()
    
    // Wait for tide data to load
    await waitFor(() => {
      expect(screen.getByText('Tide Chart')).toBeInTheDocument()
    })
  })
})

describe('Temperature Visualization', () => {
  // Helper function to wait for app initialization
  const waitForAppToLoad = async () => {
    await waitFor(() => {
      expect(screen.queryByText('Loading SailFrisco...')).not.toBeInTheDocument()
    }, { timeout: 3000 })
  }

  it('displays temperature data', async () => {
    render(<App />)
    await waitForAppToLoad()
    
    // Wait for temperature data to load
    await waitFor(() => {
      expect(screen.getByText('Temperature Visualization')).toBeInTheDocument()
    })
  })
})
