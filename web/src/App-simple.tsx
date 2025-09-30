import React, { useState, useEffect } from 'react'
import './App.css'

interface MarineData {
  lat: number
  lon: number
  updatedAt: string
  windSpeedKts: number
  windGustKts: number
  windDirectionDeg: number
  waveHeightM: number
  temperatureC: number
  humidity: number
  pressureHpa: number
  visibilityKm: number
}

interface TideData {
  station: string
  upcoming: Array<{
    time: string
    valueFt: number
    type: 'High' | 'Low'
  }>
  rawCount: number
}

const HARBORS = [
  { name: 'San Francisco', lat: 37.8060, lon: -122.4659 },
  { name: 'Sausalito', lat: 37.8591, lon: -122.4853 },
  { name: 'Alameda', lat: 37.7799, lon: -122.2822 },
  { name: 'Berkeley', lat: 37.8715, lon: -122.2730 },
  { name: 'Richmond', lat: 37.9358, lon: -122.3477 },
]

function getWindDirection(degrees: number): string {
  if (degrees === null || degrees === undefined || isNaN(degrees)) return 'N/A'
  
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

function App() {
  const [selectedHarbor, setSelectedHarbor] = useState('San Francisco')
  const [selectedBoat, setSelectedBoat] = useState('30ft')
  const [marine, setMarine] = useState<MarineData | null>(null)
  const [tides, setTides] = useState<TideData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selectedHarborData = HARBORS.find(h => h.name === selectedHarbor)

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedHarborData) return
      
      setLoading(true)
      setError(null)
      
      try {
        const [marineResponse, tidesResponse] = await Promise.all([
          fetch(`/api/marine?lat=${selectedHarborData.lat}&lon=${selectedHarborData.lon}`),
          fetch(`/api/tides?lat=${selectedHarborData.lat}&lon=${selectedHarborData.lon}`)
        ])
        
        if (!marineResponse.ok || !tidesResponse.ok) {
          throw new Error('Failed to fetch data')
        }
        
        const marineData = await marineResponse.json()
        const tidesData = await tidesResponse.json()
        
        setMarine(marineData.data)
        setTides(tidesData.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [selectedHarborData])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⛵</div>
          <h1 className="text-2xl font-bold text-gray-900">Loading SailFrisco...</h1>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">SailFrisco</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Harbor:</label>
                <select
                  value={selectedHarbor}
                  onChange={(e) => setSelectedHarbor(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  {HARBORS.map(harbor => (
                    <option key={harbor.name} value={harbor.name}>{harbor.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Boat:</label>
                <select
                  value={selectedBoat}
                  onChange={(e) => setSelectedBoat(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="20ft">20 ft</option>
                  <option value="30ft">30 ft</option>
                  <option value="40ft">40 ft</option>
                </select>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Weather Information */}
      <section className="bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Wind Card */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">🌬️ Wind & Weather</h3>
              {marine ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Wind Speed</span>
                    <span className="font-semibold text-blue-900">
                      {marine.windSpeedKts?.toFixed(1) || 'N/A'} kts
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Wind Gust</span>
                    <span className="font-semibold text-blue-900">
                      {marine.windGustKts?.toFixed(1) || 'N/A'} kts
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Direction</span>
                    <span className="font-semibold text-blue-900">
                      {getWindDirection(marine.windDirectionDeg)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-blue-600">No wind data available</p>
              )}
            </div>

            {/* Tides Card */}
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-4">🌊 Tides</h3>
              {tides ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Next High</span>
                    <span className="font-semibold text-green-900">
                      {tides.upcoming.find(t => t.type === 'High')?.valueFt.toFixed(1) || 'N/A'} ft
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Next Low</span>
                    <span className="font-semibold text-green-900">
                      {tides.upcoming.find(t => t.type === 'Low')?.valueFt.toFixed(1) || 'N/A'} ft
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Station</span>
                    <span className="font-semibold text-green-900">{tides.station}</span>
                  </div>
                </div>
              ) : (
                <p className="text-green-600">No tide data available</p>
              )}
            </div>

            {/* Temperature Card */}
            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <h3 className="text-lg font-semibold text-orange-900 mb-4">🌡️ Temperature</h3>
              {marine ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-orange-700">Current</span>
                    <span className="font-semibold text-orange-900">
                      {marine.temperatureC?.toFixed(1) || 'N/A'}°C
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-orange-700">Humidity</span>
                    <span className="font-semibold text-orange-900">
                      {marine.humidity?.toFixed(0) || 'N/A'}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-orange-700">Visibility</span>
                    <span className="font-semibold text-orange-900">
                      {marine.visibilityKm ? (marine.visibilityKm * 0.621371).toFixed(1) : 'N/A'} mi
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-orange-600">No temperature data available</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Route Planner */}
      <section className="bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Planner</h3>
            <p className="text-gray-600">Route planning features coming soon...</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
