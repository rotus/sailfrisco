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

// Beaufort Wind Scale data with color coding and wave heights
const BEAUFORT_SCALE = [
  { force: 0, name: 'Calm', minKts: 0, maxKts: 1, color: '#E3F2FD', textColor: '#1976D2', description: 'Calm', waveHeight: '0 ft' },
  { force: 1, name: 'Light Air', minKts: 1, maxKts: 3, color: '#BBDEFB', textColor: '#1565C0', description: 'Light Air', waveHeight: '0-1 ft' },
  { force: 2, name: 'Light Breeze', minKts: 4, maxKts: 6, color: '#C8E6C9', textColor: '#2E7D32', description: 'Light Breeze', waveHeight: '1-2 ft' },
  { force: 3, name: 'Gentle Breeze', minKts: 7, maxKts: 10, color: '#A5D6A7', textColor: '#388E3C', description: 'Gentle Breeze', waveHeight: '2-4 ft' },
  { force: 4, name: 'Moderate Breeze', minKts: 11, maxKts: 16, color: '#DCEDC8', textColor: '#689F38', description: 'Moderate Breeze', waveHeight: '3-5 ft' },
  { force: 5, name: 'Fresh Breeze', minKts: 17, maxKts: 21, color: '#F0F4C3', textColor: '#827717', description: 'Fresh Breeze', waveHeight: '4-8 ft' },
  { force: 6, name: 'Strong Breeze', minKts: 22, maxKts: 27, color: '#FFF9C4', textColor: '#F57F17', description: 'Strong Breeze', waveHeight: '6-10 ft' },
  { force: 7, name: 'Near Gale', minKts: 28, maxKts: 33, color: '#FFE0B2', textColor: '#F57C00', description: 'Near Gale', waveHeight: '9-13 ft' },
  { force: 8, name: 'Gale', minKts: 34, maxKts: 40, color: '#FFCCBC', textColor: '#D84315', description: 'Gale', waveHeight: '13-20 ft' },
  { force: 9, name: 'Strong Gale', minKts: 41, maxKts: 47, color: '#FFAB91', textColor: '#BF360C', description: 'Strong Gale', waveHeight: '18-25 ft' },
  { force: 10, name: 'Storm', minKts: 48, maxKts: 55, color: '#FF8A65', textColor: '#D32F2F', description: 'Storm', waveHeight: '23-32 ft' },
  { force: 11, name: 'Violent Storm', minKts: 56, maxKts: 63, color: '#FF5722', textColor: '#FFFFFF', description: 'Violent Storm', waveHeight: '29-41 ft' },
  { force: 12, name: 'Hurricane', minKts: 64, maxKts: Infinity, color: '#D32F2F', textColor: '#FFFFFF', description: 'Hurricane', waveHeight: '37+ ft' },
]

// Helper function to get Beaufort scale info for wind speed
function getBeaufortInfo(windSpeedKts: number | null | undefined) {
  if (windSpeedKts === null || windSpeedKts === undefined || isNaN(windSpeedKts)) {
    return BEAUFORT_SCALE[0] // Default to Calm
  }
  
  console.log('Wind speed for Beaufort:', windSpeedKts, 'kts')
  
  // FIXED LOGIC: Find the first scale where windSpeedKts is less than or equal to maxKts
  // This handles gaps in ranges properly
  for (let i = 0; i < BEAUFORT_SCALE.length; i++) {
    const scale = BEAUFORT_SCALE[i]
    if (windSpeedKts <= scale.maxKts) {
      console.log(`Matched Force ${scale.force}: ${scale.description}`)
      return scale
    }
  }
  
  // If we get here, it's hurricane force
  const result = BEAUFORT_SCALE[BEAUFORT_SCALE.length - 1]
  console.log('Beaufort result:', result.description, 'Force', result.force)
  return result
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
  const [useLogarithmic, setUseLogarithmic] = useState(true)
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
      const timestamp = Date.now() // Cache busting
      const [marineRes, tidesRes] = await Promise.all([
        fetch(`/api/marine?lat=${lat}&lon=${lon}&t=${timestamp}`),
        fetch(`/api/tides?station=9414290&t=${timestamp}`),
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
              {marine ? (
                <>
                  {/* Wind Scale Visualization */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                        <span className="mr-2">🌬️</span>
                        Wind Scale
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-blue-700">Scale:</span>
                        <button
                          onClick={() => setUseLogarithmic(false)}
                          className={`px-2 py-1 text-xs rounded ${
                            !useLogarithmic 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          Linear
                        </button>
                        <button
                          onClick={() => setUseLogarithmic(true)}
                          className={`px-2 py-1 text-xs rounded ${
                            useLogarithmic 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          Log
                        </button>
                      </div>
                    </div>
                    
                    {/* NEW: Beaufort Gauge */}
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <div className="text-center mb-3">
                        <div className="text-lg font-bold text-gray-800">{getBeaufortInfo(marine.windSpeedKts).description}</div>
                        <div className="text-sm text-gray-600">Force {getBeaufortInfo(marine.windSpeedKts).force} • {marine.windSpeedKts && !isNaN(marine.windSpeedKts) ? marine.windSpeedKts.toFixed(1) : 'N/A'} kts</div>
                      </div>
                      
                      {/* Gauge Container */}
                      <div className="relative h-8 bg-white rounded-full border-2 border-gray-200 overflow-hidden shadow-inner">
                        {/* Gauge Segments */}
                        {BEAUFORT_SCALE.map((scale, index) => {
                          let leftPercent, widthPercent
                          
                          if (useLogarithmic) {
                            // Logarithmic scaling: log(1 + wind_speed) for better distribution
                            const logMin = Math.log(1 + scale.minKts)
                            const logMax = scale.maxKts === Infinity ? Math.log(1 + 64) : Math.log(1 + scale.maxKts)
                            const logTotal = Math.log(1 + 64)
                            
                            leftPercent = (logMin / logTotal) * 100
                            widthPercent = scale.maxKts === Infinity ? 
                              (100 - leftPercent) : 
                              ((logMax - logMin) / logTotal) * 100
                          } else {
                            // Linear scaling
                            leftPercent = (scale.minKts / 64) * 100
                            widthPercent = scale.maxKts === Infinity ? 
                              (100 - leftPercent) : 
                              ((scale.maxKts - scale.minKts) / 64) * 100
                          }
                          
                          const isActive = marine.windSpeedKts && !isNaN(marine.windSpeedKts) && 
                            marine.windSpeedKts <= scale.maxKts && 
                            (scale.force === 0 || marine.windSpeedKts > BEAUFORT_SCALE[scale.force - 1].maxKts)
                          
                          return (
                            <div
                              key={scale.force}
                              className="absolute h-full transition-all duration-500"
                              style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                                backgroundColor: isActive ? scale.color : `${scale.color}40`,
                                borderRight: index < BEAUFORT_SCALE.length - 1 ? '1px solid rgba(255,255,255,0.3)' : 'none',
                                boxShadow: isActive ? `0 0 10px ${scale.color}80` : 'none',
                                zIndex: isActive ? 10 : 1
                              }}
                            />
                          )
                        })}
                        
                        {/* Current Wind Speed Indicator */}
                        {marine.windSpeedKts && !isNaN(marine.windSpeedKts) && (
                          <div
                            className="absolute top-0 w-1 h-full bg-white border border-gray-400 shadow-lg z-20"
                            style={{
                              left: `${Math.min(useLogarithmic 
                                ? (Math.log(1 + marine.windSpeedKts) / Math.log(1 + 64)) * 100
                                : (marine.windSpeedKts / 64) * 100, 100)}%`,
                              transform: 'translateX(-50%)'
                            }}
                          />
                        )}
                      </div>
                      
                      {/* Scale Labels */}
                      <div className="flex justify-between text-xs text-gray-600 mt-2">
                        {useLogarithmic ? (
                          <>
                            <span>0</span>
                            <span>3</span>
                            <span>7</span>
                            <span>15</span>
                            <span>30</span>
                            <span>50</span>
                            <span>60+</span>
                          </>
                        ) : (
                          <>
                            <span>0</span>
                            <span>10</span>
                            <span>20</span>
                            <span>30</span>
                            <span>40</span>
                            <span>50</span>
                            <span>60+</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* ORIGINAL: Button List (kept for rollback) */}
                    <div className="space-y-1" style={{ display: 'none' }}>
                      {BEAUFORT_SCALE.map((scale) => {
                        // Use the same fixed logic as getBeaufortInfo
                        const isCurrent = marine.windSpeedKts && !isNaN(marine.windSpeedKts) && 
                          marine.windSpeedKts <= scale.maxKts && 
                          (scale.force === 0 || marine.windSpeedKts > BEAUFORT_SCALE[scale.force - 1].maxKts)
                        return (
                          <div 
                            key={scale.force}
                            className={`beaufort-scale-item flex items-center justify-between px-3 py-2 rounded text-xs transition-all duration-200 ${
                              isCurrent ? 'beaufort-scale-current ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                            }`}
                            style={{ 
                              backgroundColor: isCurrent ? scale.color : `${scale.color}60`,
                              color: isCurrent ? '#1f2937' : `${scale.textColor}80`,
                              borderColor: isCurrent ? '#3b82f6' : 'transparent'
                            }}
                          >
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: scale.textColor }}></div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{scale.name}</span>
                                <span className="text-xs opacity-75">{scale.waveHeight}</span>
                              </div>
                            </div>
                            <span className="text-xs">{scale.minKts}-{scale.maxKts === Infinity ? '∞' : scale.maxKts} kts</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Wind Data */}
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
                        {(() => {
                          const beaufortInfo = getBeaufortInfo(marine.windSpeedKts)
                          return beaufortInfo.waveHeight
                        })()}
                      </span>
                    </div>
                  </div>
                </>
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