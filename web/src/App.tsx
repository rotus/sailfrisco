import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { Map, Marker, type LngLatLike } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

type HarborKey = 'Sausalito' | 'Berkeley' | 'Alameda' | 'San Francisco' | 'Richmond'

const HARBORS: Record<HarborKey, { lat: number; lon: number }> = {
  'Sausalito': { lat: 37.8591, lon: -122.4853 },
  'Berkeley': { lat: 37.8659, lon: -122.3114 },
  'Alameda': { lat: 37.7726, lon: -122.2760 },
  'San Francisco': { lat: 37.8060, lon: -122.4659 },
  'Richmond': { lat: 37.9120, lon: -122.3593 },
}

// const COMMON_WAYPOINTS = {
//   'Alcatraz Island': { lat: 37.8267, lon: -122.4230 },
//   'Golden Gate Bridge': { lat: 37.8199, lon: -122.4783 },
//   'Bay Bridge': { lat: 37.7983, lon: -122.3778 },
//   'Angel Island': { lat: 37.8661, lon: -122.4306 },
//   'Treasure Island': { lat: 37.8256, lon: -122.3708 },
// }

type MarineData = {
  lat: number
  lon: number
  updatedAt: string | null
  windSpeedKts: number | null
  windGustKts: number | null
  windDirectionDeg: number | null
  waveHeightM: number | null
  temperatureC: number | null
  units: { windSpeed: string | null; windGust: string | null; windDirection: string | null; waveHeight: string | null; temperature: string | null }
}

type TidesData = {
  station: string
  upcoming: Array<{ time: string; valueFt: number; type?: 'High' | 'Low' }>
  rawCount: number
}

function App() {
  const [harbor, setHarbor] = useState<HarborKey>('San Francisco')
  const [boat, setBoat] = useState<'20ft' | '30ft' | '40ft'>('30ft')
  const [marine, setMarine] = useState<MarineData | null>(null)
  const [tides, setTides] = useState<TidesData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  // const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets')

  const mapRef = useRef<Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const waypointMarkersRef = useRef<Marker[]>([])
  const harborMarkersRef = useRef<Marker[]>([])
  const [waypoints, setWaypoints] = useState<[number, number][]>([])

  const center = useMemo(() => {
    const c = HARBORS[harbor]
    return [c.lon, c.lat] as [number, number]
  }, [harbor])

  // Map initialization
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current || isInitializing) return
    
    try {
      const styleUrl = 'https://demotiles.maplibre.org/style.json'
      
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: styleUrl,
        center,
        zoom: 10.5,
      })
      mapRef.current = map

      map.on('click', (e) => {
        const lngLat = e.lngLat
        setWaypoints((prev) => [...prev, [lngLat.lng, lngLat.lat]])
      })

      map.on('load', () => {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        })
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          paint: {
            'line-color': '#1d4ed8',
            'line-width': 3,
          },
        })

        // Add harbor markers
        Object.entries(HARBORS).forEach(([harborName, coords]) => {
          const el = document.createElement('div')
          el.className = 'harbor-marker bg-blue-600 text-white text-xs px-2 py-1 rounded-full border-2 border-white shadow-lg font-medium'
          el.innerText = harborName
          el.style.cursor = 'pointer'
          
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([coords.lon, coords.lat] as LngLatLike)
            .addTo(map)
          
          harborMarkersRef.current.push(marker)
        })

  //       // Add common waypoints (temporarily disabled for debugging)
  //       // Object.entries(COMMON_WAYPOINTS).forEach(([waypointName, coords]) => {
  //       //   const el = document.createElement('div')
  //       //   el.className = 'waypoint-marker bg-green-600 text-white text-xs px-2 py-1 rounded-full border-2 border-white shadow-lg font-medium'
  //       //   el.innerText = waypointName
  //       //   el.style.cursor = 'pointer'
  //       //   
  //       //   const marker = new maplibregl.Marker({ element: el })
  //       //     .setLngLat([coords.lon, coords.lat] as LngLatLike)
  //       //     .addTo(map)
  //       //   
  //       //   harborMarkersRef.current.push(marker)
  //       // })
      })

      map.on('error', (e) => {
        console.error('Map error:', e)
        setError('Failed to load map. Please refresh the page.')
      })
    } catch (error) {
      console.error('Map initialization error:', error)
      setError('Failed to initialize map. Please refresh the page.')
    }
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      harborMarkersRef.current = []
    }
  }, [isInitializing, center])

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center, zoom: 10.5, essential: true })
    }
  }, [center])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear existing markers
    waypointMarkersRef.current.forEach((m) => m.remove())
    waypointMarkersRef.current = []

    // Add markers
    waypoints.forEach(([lng, lat], idx) => {
      const el = document.createElement('div')
      el.className = 'rounded-full bg-blue-600 text-white text-[10px] w-5 h-5 flex items-center justify-center border border-white shadow'
      el.innerText = String(idx + 1)
      const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat] as LngLatLike).addTo(map)
      waypointMarkersRef.current.push(marker)
    })

    // Update route line
    const src = map.getSource('route') as any
    if (src) {
      const line = {
        type: 'FeatureCollection',
        features: waypoints.length >= 2 ? [
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: waypoints },
            properties: {},
          },
        ] : [],
      }
      src.setData(line)
    }
  }, [waypoints])

  // Simple ETA estimate: great-circle distance and fixed hull speed by boat size
  const etaSummary = useMemo(() => {
    if (waypoints.length < 2) return null
    const nm = totalDistanceNm(waypoints)
    const hullSpeed = boatHullSpeedKts(boat)
    const hours = nm / Math.max(hullSpeed, 0.1)
    return { distanceNm: nm, hours }
  }, [waypoints, boat])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const { lat, lon } = HARBORS[harbor]
      const [marineRes, tidesRes] = await Promise.all([
        fetch(`/api/marine?lat=${lat}&lon=${lon}`),
        fetch(`/api/tides?station=9414290`),
      ])
      if (!marineRes.ok) throw new Error('Marine fetch failed')
      if (!tidesRes.ok) throw new Error('Tides fetch failed')
      const marineJson = await marineRes.json()
      const tidesJson = await tidesRes.json()
      setMarine(marineJson.data as MarineData)
      setTides(tidesJson.data as TidesData)
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [harbor])

  // Initialize app
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false)
    }, 1500) // Give time for map container to be ready
    return () => clearTimeout(timer)
  }, [])

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-900">Loading SailFrisco...</div>
          <div className="text-sm text-gray-600 mt-2">Initializing harbor selection and map</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">SailFrisco</h1>
            </div>
            
            {/* Controls */}
            <div className="flex items-center space-x-4">
              {/* Harbor Selection */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Harbor:</label>
                <select
                  className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={harbor}
                  onChange={(e) => setHarbor(e.target.value as HarborKey)}
                >
                  {Object.keys(HARBORS).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Boat Selection */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Boat:</label>
                <select
                  className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={boat}
                  onChange={(e) => setBoat(e.target.value as any)}
                >
                  <option value="20ft">20 ft</option>
                  <option value="30ft">30 ft</option>
                  <option value="40ft">40 ft</option>
                </select>
              </div>

              {/* Map Style Selection - temporarily disabled */}
              {/* <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Map:</label>
                <select
                  className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={mapStyle}
                  onChange={(e) => setMapStyle(e.target.value as 'streets' | 'satellite')}
                >
                  <option value="streets">Streets</option>
                  <option value="satellite">Satellite</option>
                </select>
              </div> */}

              {/* Refresh Button */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center space-x-2"
              >
                <span>🔄</span>
                <span>{loading ? 'Loading...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weather Information Section */}
      <section className="bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Weather/Wind Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                <span className="mr-2">🌬️</span>
                Wind & Weather
              </h3>
              {marine ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-800">Wind Speed</span>
                    <span className="text-xl font-bold text-blue-600">
                      {marine.windSpeedKts && !isNaN(marine.windSpeedKts) ? marine.windSpeedKts.toFixed(1) : 'N/A'} {marine.units.windSpeed || ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-800">Wind Gust</span>
                    <span className="text-xl font-bold text-blue-600">
                      {marine.windGustKts && !isNaN(marine.windGustKts) ? marine.windGustKts.toFixed(1) : 'N/A'} {marine.units.windGust || ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-800">Direction</span>
                    <span className="text-xl font-bold text-blue-600">
                      {getWindDirection(marine.windDirectionDeg)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-800">Wave Height</span>
                    <span className="text-xl font-bold text-blue-600">
                      {marine.waveHeightM && !isNaN(marine.waveHeightM) ? marine.waveHeightM.toFixed(1) : 'N/A'} {marine.units.waveHeight || ''}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🌊</div>
                  <p className="text-sm text-blue-600">No weather data available</p>
                </div>
              )}
            </div>

            {/* Tides Card */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                <span className="mr-2">🌊</span>
                Tides
              </h3>
              {tides && tides.upcoming.length > 0 ? (
                <div className="space-y-3">
                  {tides.upcoming.slice(0, 3).map((tide, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-green-900">{tide.type || 'Tide'}</div>
                          <div className="text-sm text-green-700">
                            {tide.time ? new Date(tide.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A'}
                          </div>
                        </div>
                        <div className="text-xl font-bold text-green-600">
                          {tide.valueFt && !isNaN(tide.valueFt) ? tide.valueFt.toFixed(1) : 'N/A'} ft
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🌊</div>
                  <p className="text-sm text-green-600">No tide data available</p>
                </div>
              )}
            </div>

            {/* Temperature Card */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200 p-6">
              <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
                <span className="mr-2">🌡️</span>
                Temperature
              </h3>
              {marine && marine.temperatureC !== null && !isNaN(marine.temperatureC) ? (
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-600 mb-2">
                    {marine.temperatureC.toFixed(1)}°C
                  </div>
                  <div className="text-sm text-orange-700">
                    {((marine.temperatureC * 9/5) + 32).toFixed(1)}°F
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🌡️</div>
                  <p className="text-sm text-orange-600">No temperature data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Route Planner Section */}
      <section className="bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Route Planner Controls */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Planner</h3>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Waypoints: {waypoints.length}
                    {etaSummary && (
                      <span className="ml-2">• Distance: {etaSummary.distanceNm.toFixed(1)} nm</span>
                    )}
                  </div>
                  {etaSummary && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">ETA @ hull speed</div>
                      <div className="text-xl font-bold text-gray-900">{etaSummary.hours.toFixed(1)} hours</div>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setWaypoints([])}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 text-sm"
                    >
                      Clear All
                    </button>
                  </div>
                  {waypoints.length > 0 && (
                    <div className="max-h-32 overflow-y-auto">
                      <div className="text-sm font-medium text-gray-900 mb-2">Waypoints:</div>
                      <div className="space-y-1">
                        {waypoints.map(([lng, lat], i) => (
                          <div key={i} className="flex justify-between text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                            <span>WP {i + 1}</span>
                            <span className="font-mono">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bay Area Map */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Bay Area Map</h2>
                  <p className="text-sm text-gray-600">Click to add waypoints, select harbor to center map</p>
                </div>
                <div className="p-4">
                  <div 
                    ref={mapContainerRef} 
                    className="map-container h-96 w-full rounded-lg"
                    style={{ minHeight: '384px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default App

function boatHullSpeedKts(size: '20ft' | '30ft' | '40ft'): number {
  // Simple fixed estimates
  switch (size) {
    case '20ft': return 5.4
    case '30ft': return 7.3
    case '40ft': return 8.5
  }
}

function totalDistanceNm(coords: [number, number][]): number {
  let total = 0
  for (let i = 1; i < coords.length; i++) {
    total += haversineNm(coords[i - 1], coords[i])
  }
  return total
}

function haversineNm(a: [number, number], b: [number, number]): number {
  const R_km = 6371
  const toRad = (d: number) => d * Math.PI / 180
  const [lon1, lat1] = a
  const [lon2, lat2] = b
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const la1 = toRad(lat1)
  const la2 = toRad(lat2)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  const d_km = 2 * R_km * Math.asin(Math.sqrt(h))
  const d_nm = d_km * 0.539957
  return d_nm
}

function getWindDirection(degrees: number | null | undefined): string {
  if (degrees === null || degrees === undefined || isNaN(degrees)) return 'N/A'
  
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  return directions[index] || 'N/A'
}