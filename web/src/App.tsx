import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { Map, Marker, type LngLatLike } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'
import { 
  WiDaySunny, WiCloudy, WiRain, WiSnow, WiThunderstorm, WiFog,
  WiNightClear, WiNightCloudy, WiNightRain, WiNightSnow, WiNightThunderstorm
} from 'react-icons/wi'
import { 
  // Font Awesome - final selections
  FaWind, FaThermometerHalf, FaWater, FaRedo, FaSun, FaMoon, FaSatellite
} from 'react-icons/fa'
import { 
  // Material Design - main logo
  MdSailing
} from 'react-icons/md'
import BeaufortHeaderOptions from './BeaufortHeaderOptions'

type HarborKey = 'Sausalito' | 'Berkeley' | 'Alameda' | 'San Francisco' | 'Richmond'

const HARBORS: Record<HarborKey, { lat: number; lon: number; tideStation: string }> = {
  'Sausalito': { lat: 37.8591, lon: -122.4853, tideStation: '9414806' }, // Sausalito station
  'Berkeley': { lat: 37.8659, lon: -122.3114, tideStation: '9414816' }, // Berkeley station
  'Alameda': { lat: 37.7726, lon: -122.2760, tideStation: '9414750' }, // Alameda station
  'San Francisco': { lat: 37.8060, lon: -122.4659, tideStation: '9414290' }, // San Francisco station
  'Richmond': { lat: 37.9120, lon: -122.3593, tideStation: '9414849' }, // Richmond Inner Harbor
}

// Beaufort Wind Scale data with color coding and wave heights
// Note: Force 0 eliminated - any wind < 1 kt is rounded up to Force 1
const BEAUFORT_SCALE = [
  { force: 1, name: 'Light Air', minKts: 0, maxKts: 3, color: '#BBDEFB', textColor: '#1565C0', description: 'Light Air', waveHeight: '0-1 ft' },
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
// Force 0 eliminated: any wind < 1 kt is rounded up to Force 1
function getBeaufortInfo(windSpeedKts: number | null | undefined) {
  if (windSpeedKts === null || windSpeedKts === undefined || isNaN(windSpeedKts)) {
    return BEAUFORT_SCALE[0] // Default to Force 1 (Light Air)
  }
  
  // Round up any wind < 1 kt to Force 1 (eliminate Force 0)
  const adjustedWindSpeed = windSpeedKts < 1 ? 1 : windSpeedKts
  
  console.log('Wind speed for Beaufort:', windSpeedKts, 'kts (adjusted:', adjustedWindSpeed, 'kts)')
  
  // FIXED LOGIC: Find the first scale where adjustedWindSpeed is less than or equal to maxKts
  // This handles gaps in ranges properly
  for (let i = 0; i < BEAUFORT_SCALE.length; i++) {
    const scale = BEAUFORT_SCALE[i]
    if (adjustedWindSpeed <= scale.maxKts) {
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
  humidity: number | null
  pressureHpa: number | null
  visibilityKm: number | null
  weatherCode: number | null
  units: { 
    windSpeed: string | null
    windGust: string | null
    windDirection: string | null
    waveHeight: string | null
    temperature: string | null
    humidity: string | null
    pressure: string | null
    visibility: string | null
  }
}

type TidesData = {
  station: string
  upcoming: Array<{ time: string; valueFt: number; type?: 'High' | 'Low' }>
  rawCount: number
}



function App() {
  const [harbor, setHarbor] = useState<HarborKey>('San Francisco')
  const [boat, setBoat] = useState<'20ft' | '30ft' | '40ft' | '50ft'>('30ft')
  const [marine, setMarine] = useState<MarineData | null>(null)
  const [tides, setTides] = useState<TidesData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [tideViewHours, setTideViewHours] = useState(24)
  const [isWindExpanded, setIsWindExpanded] = useState(false)
  const [isTidesExpanded, setIsTidesExpanded] = useState(false)
  const [isTemperatureExpanded, setIsTemperatureExpanded] = useState(false)
  const [temperatureUnit, setTemperatureUnit] = useState<'celsius' | 'fahrenheit'>('fahrenheit')
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showBeaufortHeaderOptions, setShowBeaufortHeaderOptions] = useState(false)
  const [showHarborInstruction, setShowHarborInstruction] = useState(true)
  const [showBoatInstruction, setShowBoatInstruction] = useState(false)
  const [isHarborInstructionPopping, setIsHarborInstructionPopping] = useState(false)
  const [isBoatInstructionPopping, setIsBoatInstructionPopping] = useState(false)

  // Apply dark mode styles - simple color inversion
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  // Show harbor instruction on initial load, then hide after 5 seconds
  // Show boat instruction at 4 seconds, both disappear at same time (5 seconds)
  useEffect(() => {
    if (showHarborInstruction) {
      // Show boat instruction at 4 seconds
      const boatTimer = setTimeout(() => {
        setShowBoatInstruction(true)
      }, 4000)
      
      // Start pop animation for both at 4.5 seconds
      const popTimer = setTimeout(() => {
        setIsHarborInstructionPopping(true)
        setIsBoatInstructionPopping(true)
      }, 4500)
      
      // Hide both instructions after 5 seconds (same time)
      const hideTimer = setTimeout(() => {
        setShowHarborInstruction(false)
        setShowBoatInstruction(false)
        setIsHarborInstructionPopping(false)
        setIsBoatInstructionPopping(false)
      }, 5000)
      
      return () => {
        clearTimeout(boatTimer)
        clearTimeout(popTimer)
        clearTimeout(hideTimer)
      }
    }
  }, [showHarborInstruction])

  const mapRef = useRef<Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const waypointMarkersRef = useRef<Marker[]>([])
  const harborMarkersRef = useRef<Marker[]>([])
  const tidalBuoyMarkersRef = useRef<Marker[]>([])
  const weatherStationMarkersRef = useRef<Marker[]>([])
  const [waypoints, setWaypoints] = useState<[number, number][]>([])


  const center = useMemo(() => {
    const c = HARBORS[harbor]
    return [c.lon, c.lat] as [number, number]
  }, [harbor])

  // Map initialization
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current || isInitializing) return
    
    try {
      let styleUrl
      if (mapStyle === 'satellite') {
        styleUrl = 'https://api.maptiler.com/maps/satellite/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
      } else {
        // Use dark or light streets based on dark mode
        styleUrl = isDarkMode 
          ? 'https://api.maptiler.com/maps/dark/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
        : 'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
      }
      
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
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
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

      // Add route line source
    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      })
      
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 3
        }
      })
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
      tidalBuoyMarkersRef.current = []
      weatherStationMarkersRef.current = []
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

    // Update route line - include harbor to first waypoint
    const src = map.getSource('route') as any
    if (src) {
      const routeCoordinates = waypoints.length > 0 
        ? [[HARBORS[harbor].lon, HARBORS[harbor].lat], ...waypoints]
        : []
      
      const line = {
        type: 'FeatureCollection',
        features: routeCoordinates.length >= 2 ? [
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: routeCoordinates },
            properties: {},
          },
        ] : [],
      }
      src.setData(line)
    } else {
      // Re-add route source if it doesn't exist
      const routeCoordinates = waypoints.length > 0 
        ? [[HARBORS[harbor].lon, HARBORS[harbor].lat], ...waypoints]
        : []
        
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: routeCoordinates.length >= 2 ? [
            {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: routeCoordinates },
              properties: {},
            },
          ] : [],
        }
      })
      
      if (!map.getLayer('route-line')) {
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 3,
          },
        })
      }
    }
  }, [waypoints])

  // Realistic sailing ETA with wind, tacking, and harbor considerations
  const etaSummary = useMemo(() => {
    if (waypoints.length < 2) return null
    
    const directDistance = totalDistanceNm(waypoints)
    const windData = marine
    
    // Calculate realistic sailing time
    const sailingTime = calculateRealisticSailingTime(
      waypoints, 
      boat, 
      windData, 
      harbor
    )
    
    return { 
      distanceNm: directDistance, 
      hours: sailingTime.totalHours,
      breakdown: sailingTime.breakdown
    }
  }, [waypoints, boat, marine, harbor])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const { lat, lon, tideStation } = HARBORS[harbor]
      const timestamp = Date.now() // Cache busting
      const [marineRes, tidesRes] = await Promise.all([
        fetch(`/api/marine?lat=${lat}&lon=${lon}&t=${timestamp}`),
        fetch(`/api/tides?station=${tideStation}&t=${timestamp}`),
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

  // Update map style when changed (NO DARK MODE - map stays the same)
  useEffect(() => {
    if (!mapRef.current) return
    
    let styleUrl
    if (mapStyle === 'satellite') {
      styleUrl = 'https://api.maptiler.com/maps/satellite/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
    } else {
      // Always use light streets - no dark mode for map
      styleUrl = 'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
    }
    
    // Simple style change without dark mode complications
    const timeoutId = setTimeout(() => {
      if (mapRef.current && mapRef.current.isStyleLoaded && mapRef.current.isStyleLoaded()) {
          mapRef.current.setStyle(styleUrl)
        
        // Redraw route line after style change
        mapRef.current.once('styledata', () => {
          if (waypoints.length > 0 && mapRef.current) {
            const routeCoordinates = [[HARBORS[harbor].lon, HARBORS[harbor].lat], ...waypoints]
            
            // Add route source if it doesn't exist
            if (!mapRef.current.getSource('route')) {
      mapRef.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
                  features: routeCoordinates.length >= 2 ? [
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                        coordinates: routeCoordinates
                      },
                      properties: {}
                    }
                  ] : []
                }
              })
    } else {
              // Update existing route source
              const source = mapRef.current.getSource('route') as any
              source.setData({
            type: 'FeatureCollection',
                features: routeCoordinates.length >= 2 ? [
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                      coordinates: routeCoordinates
                    },
                    properties: {}
                  }
                ] : []
              })
            }
            
            // Add route line layer if it doesn't exist
            if (!mapRef.current.getLayer('route-line')) {
              mapRef.current.addLayer({
                id: 'route-line',
          type: 'line',
                source: 'route',
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round'
                },
          paint: {
                  'line-color': '#3b82f6',
                  'line-width': 3,
                  'line-opacity': 0.8
                }
              })
            }
          }
        })
      }
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [mapStyle, waypoints, harbor]) // Added waypoints and harbor dependencies





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
      <nav className="bg-gradient-to-r from-slate-800 to-slate-900 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg header-logo">
                  <MdSailing className="w-6 h-6 text-blue-600" />
                </div>
                <h1 className="text-xl font-bold text-white">SailFrisco</h1>
            </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center space-x-4 relative">
            {/* Harbor Selection */}
              <div className="flex items-center space-x-2 relative">
                <label className="text-sm font-medium text-gray-300">Harbor:</label>
              <select
                  className="p-2 border border-gray-600 bg-slate-700 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm hover:bg-slate-600 hover:border-blue-400 transition-all duration-200"
                value={harbor}
                onChange={(e) => setHarbor(e.target.value as HarborKey)}
              >
                {Object.keys(HARBORS).map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              
              {/* Harbor Instruction Tooltip */}
              {showHarborInstruction && (
                <div className={`absolute top-full right-0 mt-2 z-50 ${isHarborInstructionPopping ? 'animate-balloon-pop' : 'animate-pop-in'}`}>
                  <div className="relative bg-yellow-100 border-2 border-yellow-400 rounded-lg shadow-2xl px-4 py-3 max-w-xs">
                    <div className="absolute -top-2 right-6 w-4 h-4 bg-yellow-100 border-l-2 border-t-2 border-yellow-400 transform rotate-45"></div>
                    <p className="text-sm text-gray-800 font-handwritten">
                      👋 Start here! Select your harbor to get started
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Boat Selection */}
              <div className="flex items-center space-x-2 relative">
                <label className="text-sm font-medium text-gray-300">Boat:</label>
              <select
                  className="p-2 border border-gray-600 bg-slate-700 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm hover:bg-slate-600 hover:border-blue-400 transition-all duration-200"
                value={boat}
                onChange={(e) => setBoat(e.target.value as any)}
              >
                  <option value="20ft">20 ft</option>
                  <option value="30ft">30 ft</option>
                  <option value="40ft">40 ft</option>
                  <option value="50ft">50 ft</option>
              </select>
              
              {/* Boat Instruction Tooltip */}
              {showBoatInstruction && (
                <div className={`absolute top-full right-0 mt-2 z-50 ${isBoatInstructionPopping ? 'animate-balloon-pop' : 'animate-pop-in'}`}>
                  <div className="relative bg-blue-100 border-2 border-blue-400 rounded-lg shadow-2xl px-4 py-3 max-w-xs">
                    <div className="absolute -top-2 right-6 w-4 h-4 bg-blue-100 border-l-2 border-t-2 border-blue-400 transform rotate-45"></div>
                    <p className="text-sm text-gray-800 font-handwritten">
                      ⛵ Now select your boat size!
                    </p>
                  </div>
                </div>
              )}
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

              {/* Dark Mode Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="bg-slate-600 text-white p-2 rounded-md border border-slate-600 hover:bg-slate-600 hover:border-blue-400 transition-all duration-200"
        >
          {isDarkMode ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
        </button>


              {/* Refresh Button */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="bg-blue-600 text-white p-2 rounded-md border border-blue-600 hover:bg-blue-500 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <FaRedo className="w-4 h-4" />
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

      {/* Weather Information Section - Simplified */}
      <section className="bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-0">
            {/* Weather/Wind Card */}
            <div className={`bg-gradient-to-br rounded-lg shadow-sm border transition-all duration-300 ${
              isWindExpanded 
                ? 'from-blue-50 to-blue-100 border-blue-300 shadow-lg ring-2 ring-blue-100' 
                : 'from-slate-50 to-slate-100 border-slate-200 hover:shadow-2xl hover:scale-102 hover:animate-pulse hover:from-blue-50 hover:to-blue-100 hover:border-blue-200'
            }`}>
              {/* Collapsible Header */}
              <div 
                className={`p-6 cursor-pointer transition-colors duration-200 ${
                  isWindExpanded 
                    ? 'hover:bg-blue-100' 
                    : 'hover:bg-slate-100'
                }`}
                onClick={() => setIsWindExpanded(!isWindExpanded)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <FaWind className="w-5 h-5 mr-2 text-blue-600" />
                    {marine?.windSpeedKts && !isNaN(marine.windSpeedKts) && marine?.windGustKts && !isNaN(marine.windGustKts) && marine?.windDirectionDeg && !isNaN(marine.windDirectionDeg) ? (
                      <>
                        Winds of {marine.windSpeedKts.toFixed(1)} knots out of the {getWindDirection(marine.windDirectionDeg)}, gusting to {marine.windGustKts.toFixed(1)} knots with {(() => {
                          const beaufortInfo = getBeaufortInfo(marine.windSpeedKts)
                          return beaufortInfo.waveHeight
                        })()} waves
                      </>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <FaWind className="w-5 h-5 text-blue-600" />
                        <span>Wind & Waves</span>
                      </div>
                    )}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-600">
                      {isWindExpanded ? 'Collapse' : 'Expand'}
                    </span>
                    <svg 
                      className={`w-5 h-5 text-blue-600 transition-transform duration-200 ${
                        isWindExpanded ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Collapsible Content */}
              {isWindExpanded && (
                <div className="px-6 pb-6 animate-bounceIn">
              {marine ? (
                <>
                  {/* Wind Scale Visualization */}
                  <div className="mb-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-blue-900">
                        Wind Scale
                      </h3>
                          <button
                        onClick={() => setShowBeaufortHeaderOptions(true)}
                        className="px-3 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                      >
                        Header Options
                          </button>
                  </div>
                    
                    {/* Option 10: Wind Range Slider */}
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <div className="text-center mb-3">
                        <div className="text-lg font-bold text-gray-800">{getBeaufortInfo(marine.windSpeedKts).description}</div>
                        <div className="text-sm text-gray-600">Force {getBeaufortInfo(marine.windSpeedKts).force} • {marine.windSpeedKts && !isNaN(marine.windSpeedKts) ? marine.windSpeedKts.toFixed(1) : 'N/A'} kts</div>
                      </div>
                      
                      {/* Wind Range Slider Visualization */}
                      {marine.windSpeedKts && !isNaN(marine.windSpeedKts) && marine.windGustKts && !isNaN(marine.windGustKts) && (() => {
                        const currentWind = Number(marine.windSpeedKts)
                        const gustWind = Number(marine.windGustKts)
                        
                        // Adjust wind speed for display (round up < 1 kt to 1 kt to eliminate Force 0)
                        const adjustedCurrentWind = currentWind < 1 ? 1 : currentWind
                        const adjustedGustWind = gustWind < 1 ? 1 : gustWind
                        
                        // Calculate position with compressed high segments (9-12)
                        // Segments 1-8 (0-48 kts) use 90% of space, segments 9-12 (48-64 kts) use 10%
                        const calculatePosition = (speed: number) => {
                          const compressedBreakpoint = 48 // kts
                          const compressedSpace = 0.90 // 90% for 0-48 kts
                          const highSpace = 0.10 // 10% for 48-64 kts
                          
                          if (speed <= compressedBreakpoint) {
                            // Linear mapping for 0-48 kts into 0-90% of visual space
                            return (speed / compressedBreakpoint) * compressedSpace * 100
                          } else {
                            // Compressed mapping for 48-64 kts into 90-100% of visual space
                            const compressedRange = 64 - compressedBreakpoint // 16 kts
                            const positionInHighRange = (speed - compressedBreakpoint) / compressedRange
                            return (compressedSpace + (positionInHighRange * highSpace)) * 100
                          }
                        }
                        
                        // Calculate segment boundaries for header alignment
                        // Filter out Force 0 (eliminated)
                        const calculateSegmentBoundaries = () => {
                          const compressedBreakpoint = 48
                          const compressedSpace = 0.90
                          const highSpace = 0.10
                          
                          const filteredScales = BEAUFORT_SCALE.filter(scale => scale.force !== 0)
                          return filteredScales.map((scale, index) => {
                            let left
                            if (scale.minKts <= compressedBreakpoint) {
                              left = (scale.minKts / compressedBreakpoint) * compressedSpace * 100
                            } else {
                              const compressedRange = 64 - compressedBreakpoint
                              const positionInHighRange = (scale.minKts - compressedBreakpoint) / compressedRange
                              left = (compressedSpace + (positionInHighRange * highSpace)) * 100
                            }
                            
                            let width
                            const nextScale = filteredScales[index + 1]
                            if (nextScale) {
                              let nextLeft
                              if (nextScale.minKts <= compressedBreakpoint) {
                                nextLeft = (nextScale.minKts / compressedBreakpoint) * compressedSpace * 100
                              } else {
                                const compressedRange = 64 - compressedBreakpoint
                                const positionInHighRange = (nextScale.minKts - compressedBreakpoint) / compressedRange
                                nextLeft = (compressedSpace + (positionInHighRange * highSpace)) * 100
                              }
                              width = nextLeft - left
                            } else {
                              // Last scale (Force 12) - ensure it extends to 100% and is visible
                              // If left is at or near 100%, ensure minimum width for visibility
                              if (left >= 100) {
                                // Force 12 starts at 100%, make it visible by starting slightly earlier
                                width = 2 // Minimum 2% width for visibility
                                left = 98 // Adjust left position to accommodate width
                              } else {
                                width = 100 - left
                              }
                            }
                            
                            return { scale, left, width, center: left + (width / 2) }
                          })
                        }
                        
                        const segments = calculateSegmentBoundaries()
                        const adjustedCurrentPos = calculatePosition(adjustedCurrentWind)
                        const adjustedGustPos = calculatePosition(adjustedGustWind)
                        
                        return (
                          <>
                            {/* Option 2: Colored header */}
                            <div>
                                <div className="relative h-8 bg-gray-50 border-l border-r border-t border-b-0 border-gray-200">
                                  {segments.map(({ scale, left, width }) => (
                                    <div
                                      key={`opt2-${scale.force}`}
                                      className="absolute top-0 h-full flex flex-col items-center justify-center"
                                      style={{
                                        left: `${left}%`,
                                        width: `${width}%`,
                                        borderRight: '1px solid rgba(0,0,0,0.1)',
                                        backgroundColor: scale.color,
                                      }}
                                      title={`Force ${scale.force}: ${scale.description}`}
                                    >
                                      <span style={{ color: scale.textColor }} className="text-[11px] font-bold">{scale.force}</span>
                                      {width > 4 && (
                                        <span style={{ color: scale.textColor }} className="text-[9px]">{scale.description.split(' ')[0]}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <div className="relative h-16 bg-gray-100 border-l border-r border-t-0 border-b border-gray-200 -mt-[1px]">
                                  <div className="absolute inset-0">
                                    {BEAUFORT_SCALE.filter(scale => scale.force !== 0).map((scale, index) => {
                                      const compressedBreakpoint = 48
                                      const compressedSpace = 0.90
                                      const highSpace = 0.10
                                      
                                      let left
                                      if (scale.minKts <= compressedBreakpoint) {
                                        left = (scale.minKts / compressedBreakpoint) * compressedSpace * 100
                                      } else {
                                        const compressedRange = 64 - compressedBreakpoint
                                        const positionInHighRange = (scale.minKts - compressedBreakpoint) / compressedRange
                                        left = (compressedSpace + (positionInHighRange * highSpace)) * 100
                                      }
                                      
                                      let width
                                      const filteredScales = BEAUFORT_SCALE.filter(s => s.force !== 0)
                                      const nextScale = filteredScales[index + 1]
                                      if (nextScale) {
                                        let nextLeft
                                        if (nextScale.minKts <= compressedBreakpoint) {
                                          nextLeft = (nextScale.minKts / compressedBreakpoint) * compressedSpace * 100
                                        } else {
                                          const compressedRange = 64 - compressedBreakpoint
                                          const positionInHighRange = (nextScale.minKts - compressedBreakpoint) / compressedRange
                                          nextLeft = (compressedSpace + (positionInHighRange * highSpace)) * 100
                                        }
                                        width = nextLeft - left
                                      } else {
                                        // Last scale (Force 12) - ensure it extends to 100% and is visible
                                        // If left is at or near 100%, ensure minimum width for visibility
                                        if (left >= 100) {
                                          // Force 12 starts at 100%, make it visible by starting slightly earlier
                                          width = 2 // Minimum 2% width for visibility
                                          left = 98 // Adjust left position to accommodate width
                                        } else {
                                          width = 100 - left
                                        }
                                      }
                                      
                                      return (
                                        <div
                                          key={`opt2-seg-${scale.force}`}
                                          className="absolute h-full"
                                          style={{
                                            left: `${left}%`,
                                            width: `${width}%`,
                                            backgroundColor: scale.color,
                                          }}
                                        />
                                      )
                                    })}
                                    
                                    <div
                                      className="absolute top-1/2 left-0 h-2 bg-blue-500 opacity-60 rounded transform -translate-y-1/2"
                                      style={{
                                        left: `${Math.min(adjustedCurrentPos, 100)}%`,
                                        width: `${Math.max(adjustedGustPos - adjustedCurrentPos, 2)}%`,
                                      }}
                                    />
                                    
                                    <div
                                      className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-lg z-20"
                                      style={{ left: `${Math.min(adjustedCurrentPos, 100)}%` }}
                                      title={`Current Wind: ${currentWind.toFixed(1)} kts`}
                                    />
                                    
                                    <div
                                      className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-red-600 border-2 border-white rounded-full shadow-lg z-20"
                                      style={{ left: `${Math.min(adjustedGustPos, 100)}%` }}
                                      title={`Wind Gust: ${gustWind.toFixed(1)} kts`}
                                    />
                                  </div>
                                </div>
                              </div>
                            
                            {/* Scale Labels - shown once at the bottom */}
                            <div className="flex justify-between text-xs text-gray-600 mt-4">
                              <span>0</span>
                              <span>10</span>
                              <span>20</span>
                              <span>30</span>
                              <span>40</span>
                              <span>48</span>
                              <span className="text-red-600 font-semibold">64+</span>
                            </div>
                            
                            {/* Wind values */}
                            <div className="mt-2 flex justify-between text-xs text-gray-600">
                              <span>Current: {currentWind.toFixed(1)} kts</span>
                              <span>Gust: {gustWind.toFixed(1)} kts</span>
                            </div>
                          </>
                        )
                      })()}
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
                              backgroundColor: scale.color,
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
                  <FaWater className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-sm text-blue-600">No weather data available</p>
                </div>
              )}
                </div>
              )}
            </div>

            {/* Tides Card */}
            <div className={`bg-gradient-to-br rounded-lg shadow-sm border transition-all duration-300 ${
              isTidesExpanded 
                ? 'from-cyan-50 to-teal-100 border-cyan-300 shadow-lg ring-2 ring-cyan-100' 
                : 'from-slate-50 to-slate-100 border-slate-200 hover:shadow-2xl hover:scale-102 hover:animate-pulse hover:from-cyan-50 hover:to-teal-100 hover:border-cyan-200'
            }`}>
              {/* Collapsible Header */}
              <div 
                className={`p-6 cursor-pointer transition-colors duration-200 ${
                  isTidesExpanded 
                    ? 'hover:bg-cyan-100' 
                    : 'hover:bg-slate-100'
                }`}
                onClick={() => setIsTidesExpanded(!isTidesExpanded)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                      <FaWater className="w-5 h-5 mr-2 text-cyan-600" />
                      {tides && tides.upcoming.length > 0 ? (() => {
                        const now = new Date()
                        const recentTides = tides.upcoming.filter(tide => {
                          const tideTime = new Date(tide.time)
                          return tideTime <= now
                        }).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                        
                        const nextTide = tides.upcoming.find(tide => {
                          const tideTime = new Date(tide.time)
                          return tideTime > now
                        })
                        
                        let tideState = 'Unknown'
                        let arrow = ''
                        let nextTideType = 'Tide'
                        let nextTideTime = ''
                        
                        // If we have recent tides and next tide, determine state
                        if (recentTides.length > 0 && nextTide) {
                          const recentTide = recentTides[0]
                          const recentValue = recentTide.valueFt
                          const nextValue = nextTide.valueFt
                          
                          if (nextValue > recentValue) {
                            tideState = 'Flood'
                            arrow = '↗'
                          } else {
                            tideState = 'Ebb'
                            arrow = '↘'
                          }
                        } else if (nextTide) {
                          // If no recent tides, try to determine from next tide type
                          if (nextTide.type === 'High') {
                            tideState = 'Ebb'
                            arrow = '↘'
                          } else if (nextTide.type === 'Low') {
                            tideState = 'Flood'
                            arrow = '↗'
                          }
                        }
                        
                        if (nextTide) {
                          nextTideType = nextTide.type || 'Tide'
                          const nextTideTimeDate = new Date(nextTide.time)
                          const timeDiff = nextTideTimeDate.getTime() - now.getTime()
                          const hours = Math.floor(timeDiff / (1000 * 60 * 60))
                          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
                          
                          if (hours > 0) {
                            nextTideTime = `${hours}h ${minutes}m`
                          } else {
                            nextTideTime = `${minutes}m`
                          }
                        }
                        
                        return `Currently ${tideState} ${arrow} - Next ${nextTideType} in ${nextTideTime}`
                      })() : 'Tides'
                    }
                    </h3>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-green-600">
                      {isTidesExpanded ? 'Collapse' : 'Expand'}
                    </span>
                    <svg 
                      className={`w-5 h-5 text-green-600 transition-transform duration-200 ${
                        isTidesExpanded ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Collapsible Content */}
              {isTidesExpanded && (
                <div className="px-6 pb-6 animate-bounceIn">
                  {/* Toggle for 12h/24h view */}
                  <div className="flex items-center justify-center space-x-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-green-700">View:</span>
                      <button
                        onClick={() => setTideViewHours(12)}
                        className={`px-2 py-1 text-xs rounded ${
                          tideViewHours === 12
                            ? 'bg-green-600 text-white'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        12h
                      </button>
                      <button
                        onClick={() => setTideViewHours(24)}
                        className={`px-2 py-1 text-xs rounded ${
                          tideViewHours === 24
                            ? 'bg-green-600 text-white'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        24h
                      </button>
                    </div>
                  </div>
              
              {tides && tides.upcoming.length > 0 ? (
                <div className="space-y-4">
                  {/* Beautiful Tide Wave Visualization */}
                  <div className="bg-white rounded-lg p-6 border border-green-200">
                    <div className="text-sm font-medium text-green-800 mb-4 text-center">
                      {tideViewHours}-Hour Tide Forecast
                    </div>
                    
                    {/* Main Chart Container */}
                    <div className="relative bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 p-6">
                      <svg className="w-full h-96" viewBox="0 0 800 300">
                        {/* Grid Lines */}
                        <defs>
                          <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                        
                        {/* Y-Axis Labels (Feet) */}
                        {[0, 1, 2, 3, 4, 5, 6, 7].map(feet => (
                          <g key={feet}>
                            <line x1="40" y1={240 - feet * 30} x2="760" y2={240 - feet * 30} stroke="#d1d5db" strokeWidth="1" strokeDasharray="2,2"/>
                            <text x="35" y={245 - feet * 30} textAnchor="end" className="text-base fill-gray-600 font-medium">{feet}</text>
                          </g>
                        ))}
                        <text x="20" y="150" textAnchor="middle" className="text-base fill-gray-700 font-bold" transform="rotate(-90, 20, 150)">FEET</text>
                        
                        {/* X-Axis Labels (Time) - Dynamic based on current time */}
                        {Array.from({length: tideViewHours + 1}, (_, i) => {
                          const now = new Date()
                          const futureTime = new Date(now.getTime() + i * 60 * 60 * 1000)
                          let hour = futureTime.getHours()
                          const x = 40 + (i / tideViewHours) * 720
                          return (
                            <g key={i}>
                              <line x1={x} y1="30" x2={x} y2="240" stroke="#d1d5db" strokeWidth="1" strokeDasharray="2,2"/>
                              <text x={x} y="260" textAnchor="middle" className="text-sm fill-gray-600">
                                {i === 0 ? 'NOW' : hour === 0 ? '12' : hour === 12 ? 'NOON' : hour > 12 ? hour - 12 : hour}
                              </text>
                            </g>
                          )
                        })}
                        <text x="400" y="280" textAnchor="middle" className="text-base fill-gray-700 font-bold">TIME</text>
                        
                        {/* Beautiful Wave Graphic */}
                        <path
                          d={(() => {
                            const points = []
                            const now = new Date()
                            const endTime = new Date(now.getTime() + tideViewHours * 60 * 60 * 1000)
                            
                            // Get upcoming tides within the view window
                            const upcomingTides = tides.upcoming.filter(tide => {
                              const tideTime = new Date(tide.time)
                              return tideTime >= now && tideTime <= endTime
                            })
                            
                            if (upcomingTides.length === 0) return "M40,120 L760,120"
                            
                            const minTide = Math.min(...upcomingTides.map(t => t.valueFt))
                            const maxTide = Math.max(...upcomingTides.map(t => t.valueFt))
                            const range = maxTide - minTide || 1
                            
                            // Create smooth wave curve
                            for (let i = 0; i <= 200; i++) {
                              const time = new Date(now.getTime() + (i / 200) * (endTime.getTime() - now.getTime()))
                              const x = 40 + (i / 200) * 720
                              
                              const beforeTide = upcomingTides.filter(t => new Date(t.time) <= time).pop()
                              const afterTide = upcomingTides.find(t => new Date(t.time) >= time)
                              
                              let y
                              if (beforeTide && afterTide) {
                                const beforeTime = new Date(beforeTide.time).getTime()
                                const afterTime = new Date(afterTide.time).getTime()
                                const timeDiff = afterTime - beforeTime
                                const elapsed = time.getTime() - beforeTime
                                const ratio = elapsed / timeDiff
                                
                                const beforeValue = beforeTide.valueFt
                                const afterValue = afterTide.valueFt
                                const interpolatedValue = beforeValue + (afterValue - beforeValue) * ratio
                                y = 240 - ((interpolatedValue - minTide) / range) * 180
                              } else if (beforeTide) {
                                y = 240 - ((beforeTide.valueFt - minTide) / range) * 180
                              } else if (afterTide) {
                                y = 240 - ((afterTide.valueFt - minTide) / range) * 180
                              } else {
                                y = 120
                              }
                              
                              points.push(`${i === 0 ? 'M' : 'L'}${x},${y}`)
                            }
                            
                            return points.join(' ')
                          })()}
                          fill="url(#waveGradient)"
                          stroke="#1e40af"
                          strokeWidth="3"
                          className="drop-shadow-lg"
                        />
                        
                        {/* Wave Gradient Definition */}
                        <defs>
                          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                            <stop offset="50%" stopColor="#1d4ed8" stopOpacity="0.6"/>
                            <stop offset="100%" stopColor="#1e40af" stopOpacity="0.8"/>
                          </linearGradient>
                        </defs>
                        
                        {/* Wave Texture Lines */}
                        <path
                          d={(() => {
                            const points = []
                            const now = new Date()
                            const endTime = new Date(now.getTime() + tideViewHours * 60 * 60 * 1000)
                            
                            const upcomingTides = tides.upcoming.filter(tide => {
                              const tideTime = new Date(tide.time)
                              return tideTime >= now && tideTime <= endTime
                            })
                            
                            if (upcomingTides.length === 0) return ""
                            
                            const minTide = Math.min(...upcomingTides.map(t => t.valueFt))
                            const maxTide = Math.max(...upcomingTides.map(t => t.valueFt))
                            const range = maxTide - minTide || 1
                            
                            // Create texture lines inside the wave
                            for (let line = 0; line < 8; line++) {
                              const offset = line * 2
                              const linePoints = []
                              
                              for (let i = 0; i <= 200; i++) {
                                const time = new Date(now.getTime() + (i / 200) * (endTime.getTime() - now.getTime()))
                                const x = 40 + (i / 200) * 720
                                
                                const beforeTide = upcomingTides.filter(t => new Date(t.time) <= time).pop()
                                const afterTide = upcomingTides.find(t => new Date(t.time) >= time)
                                
                                let y
                                if (beforeTide && afterTide) {
                                  const beforeTime = new Date(beforeTide.time).getTime()
                                  const afterTime = new Date(afterTide.time).getTime()
                                  const timeDiff = afterTime - beforeTime
                                  const elapsed = time.getTime() - beforeTime
                                  const ratio = elapsed / timeDiff
                                  
                                  const beforeValue = beforeTide.valueFt
                                  const afterValue = afterTide.valueFt
                                  const interpolatedValue = beforeValue + (afterValue - beforeValue) * ratio
                                  y = 240 - ((interpolatedValue - minTide) / range) * 180 + offset
                                } else if (beforeTide) {
                                  y = 240 - ((beforeTide.valueFt - minTide) / range) * 180 + offset
                                } else if (afterTide) {
                                  y = 240 - ((afterTide.valueFt - minTide) / range) * 180 + offset
                                } else {
                                  y = 120 + offset
                                }
                                
                                linePoints.push(`${i === 0 ? 'M' : 'L'}${x},${y}`)
                              }
                              
                              points.push(linePoints.join(' '))
                            }
                            
                            return points.join(' ')
                          })()}
                          fill="none"
                          stroke="#1e40af"
                          strokeWidth="0.5"
                          opacity="0.3"
                        />
                        
                        {/* Current time indicator */}
                        <line x1="40" y1="30" x2="40" y2="240" stroke="#dc2626" strokeWidth="4" strokeDasharray="8,6"/>
                        <circle cx="40" cy="30" r="8" fill="#dc2626" stroke="white" strokeWidth="3"/>
                        <text x="40" y="20" textAnchor="middle" className="text-base fill-red-600 font-bold">NOW</text>
                        
                        {/* Tide Data Points with Beautiful Labels */}
                        {tides.upcoming.filter(tide => {
                          const tideTime = new Date(tide.time)
                          const now = new Date()
                          const endTime = new Date(now.getTime() + tideViewHours * 60 * 60 * 1000)
                          return tideTime >= now && tideTime <= endTime
                        }).map((tide, index) => {
                          const tideTime = new Date(tide.time)
                          const now = new Date()
                          const timeDiff = tideTime.getTime() - now.getTime()
                          const hoursFromNow = timeDiff / (1000 * 60 * 60)
                          const x = 40 + (hoursFromNow / tideViewHours) * 720
                          
                          if (x < 40 || x > 760) return null
                          
                          const endTime = new Date(now.getTime() + tideViewHours * 60 * 60 * 1000)
                          const upcomingTides = tides.upcoming.filter(t => {
                            const tTime = new Date(t.time)
                            return tTime >= now && tTime <= endTime
                          })
                          const minTide = Math.min(...upcomingTides.map(t => t.valueFt))
                          const maxTide = Math.max(...upcomingTides.map(t => t.valueFt))
                          const range = maxTide - minTide || 1
                          const y = 240 - ((tide.valueFt - minTide) / range) * 180
                          
                          return (
                            <g key={index}>
                              {/* Tide marker circle */}
                              <circle 
                                cx={x} 
                                cy={y} 
                                r="12" 
                                fill={tide.type === 'High' ? '#059669' : '#3b82f6'}
                                stroke="white"
                                strokeWidth="4"
                                className="drop-shadow-lg"
                              />
                              
                              {/* Tide height label */}
                              <rect 
                                x={x - 35} 
                                y={y - 35} 
                                width="70" 
                                height="24" 
                                fill="white" 
                                stroke={tide.type === 'High' ? '#059669' : '#3b82f6'}
                                strokeWidth="2"
                                rx="4"
                                className="drop-shadow-md"
                              />
                              <text 
                                x={x} 
                                y={y - 18} 
                                textAnchor="middle" 
                                className="text-sm fill-gray-800 font-bold"
                              >
                                {tide.valueFt.toFixed(1)}ft
                              </text>
                              
                              {/* Time label */}
                              <text 
                                x={x} 
                                y={y + 35} 
                                textAnchor="middle" 
                                className="text-sm fill-gray-600 font-medium"
                              >
                                {tideTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </text>
                              
                              {/* H/L indicator */}
                              <text 
                                x={x} 
                                y={y + 55} 
                                textAnchor="middle" 
                                className="text-base fill-gray-700 font-bold"
                              >
                                {tide.type === 'High' ? 'HIGH' : 'LOW'}
                              </text>
                            </g>
                          )
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Tide Change Data */}
                <div className="space-y-3">
                      <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-800">Next Change</span>
                      <span className="text-xl font-bold text-green-600">
                        {(() => {
                          const now = new Date()
                          const nextTide = tides.upcoming.find(tide => {
                            const tideTime = new Date(tide.time)
                            return tideTime > now
                          })
                          if (nextTide) {
                            const tideTime = new Date(nextTide.time)
                            const timeDiff = tideTime.getTime() - now.getTime()
                            const hours = Math.floor(timeDiff / (1000 * 60 * 60))
                            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
                            return `${hours}h ${minutes}m`
                          }
                          return 'N/A'
                        })()}
                      </span>
                          </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-800">Change Amount</span>
                      <span className="text-lg font-semibold text-green-600">
                        {(() => {
                          const now = new Date()
                          // Find the most recent tide (could be in the past)
                          const recentTides = tides.upcoming.filter(tide => {
                            const tideTime = new Date(tide.time)
                            return tideTime <= now
                          }).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                          
                          const nextTide = tides.upcoming.find(tide => {
                            const tideTime = new Date(tide.time)
                            return tideTime > now
                          })
                          
                          if (recentTides.length > 0 && nextTide) {
                            const currentTide = recentTides[0]
                            const change = Math.abs(nextTide.valueFt - currentTide.valueFt)
                            return `${change.toFixed(1)} ft`
                          } else if (nextTide) {
                            // If no recent tide, use the next tide as reference
                            return `${nextTide.valueFt.toFixed(1)} ft`
                          }
                          return 'N/A'
                        })()}
                      </span>
                        </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-800">Direction</span>
                      <span className="text-lg font-semibold text-green-600 flex items-center">
                        {(() => {
                          const now = new Date()
                          const recentTides = tides.upcoming.filter(tide => {
                            const tideTime = new Date(tide.time)
                            return tideTime <= now
                          }).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                          
                          const nextTide = tides.upcoming.find(tide => {
                            const tideTime = new Date(tide.time)
                            return tideTime > now
                          })
                          
                          if (recentTides.length > 0 && nextTide) {
                            const currentTide = recentTides[0]
                            if (nextTide.valueFt > currentTide.valueFt) {
                              return (
                                <>
                                  <FaWind className="w-3 h-3 mr-1 text-green-600" />
                                  Rising
                                </>
                              )
                            } else {
                              return (
                                <>
                                  <FaWater className="w-3 h-3 mr-1 text-red-600" />
                                  Falling
                                </>
                              )
                            }
                          }
                          return 'Unknown'
                        })()}
                      </span>
                        </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-800">Slack Tide</span>
                      <span className="text-lg font-semibold text-green-600">
                        {(() => {
                          const now = new Date()
                          const nextTide = tides.upcoming.find(tide => {
                            const tideTime = new Date(tide.time)
                            return tideTime > now
                          })
                          
                          if (nextTide) {
                            const tideTime = new Date(nextTide.time)
                            const timeDiff = tideTime.getTime() - now.getTime()
                            const hours = Math.floor(timeDiff / (1000 * 60 * 60))
                            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
                            return `${hours}h ${minutes}m`
                          }
                          return 'N/A'
                        })()}
                      </span>
                      </div>
                    </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-green-600">No tide data available</p>
                </div>
              )}
                </div>
              )}
            </div>

            {/* Temperature Card */}
            <div className={`bg-gradient-to-br rounded-lg shadow-sm border transition-all duration-300 ${
              isTemperatureExpanded 
                ? 'from-orange-50 to-amber-100 border-orange-300 shadow-lg ring-2 ring-orange-100' 
                : 'from-slate-50 to-slate-100 border-slate-200 hover:shadow-2xl hover:scale-102 hover:animate-pulse hover:from-orange-50 hover:to-amber-100 hover:border-orange-200'
            }`}>
              {/* Collapsible Header */}
              <div 
                className={`p-6 cursor-pointer transition-colors duration-200 ${
                  isTemperatureExpanded 
                    ? 'hover:bg-orange-100' 
                    : 'hover:bg-slate-100'
                }`}
                onClick={() => setIsTemperatureExpanded(!isTemperatureExpanded)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <FaThermometerHalf className="w-5 h-5 mr-2 text-amber-600" />
                    {marine?.temperatureC && !isNaN(marine.temperatureC) && marine?.weatherCode !== null ? (
                      <>
                        Currently {temperatureUnit === 'celsius' 
                          ? `${marine.temperatureC.toFixed(1)}°C`
                          : `${((marine.temperatureC * 9/5 + 32)).toFixed(1)}°F`
                        } and {getWeatherDescription(marine.weatherCode)} with {(() => {
                          if (marine.visibilityKm && !isNaN(marine.visibilityKm)) {
                            const miles = Math.min(marine.visibilityKm * 0.621371, 50)
                            if (miles >= 10) return 'excellent visibility'
                            if (miles >= 5) return 'good visibility'
                            if (miles >= 2) return 'fair visibility'
                            if (miles >= 1) return 'poor visibility'
                            return 'very poor visibility'
                          }
                          return 'unknown visibility'
                        })()}
                      </>
                    ) : (
                      'Temperature'
                    )}
                  </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-orange-600">
                        {isTemperatureExpanded ? 'Collapse' : 'Expand'}
                      </span>
                    <svg 
                      className={`w-5 h-5 text-orange-600 transition-transform duration-200 ${
                        isTemperatureExpanded ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                </div>
              </div>
              
              {/* Collapsible Content */}
              {isTemperatureExpanded && (
                <div className="px-6 pb-6 animate-bounceIn">
                  {/* Toggle for C/F temperature */}
                  <div className="flex items-center justify-center space-x-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-orange-700">Temp:</span>
                      <button
                        onClick={() => setTemperatureUnit('celsius')}
                        className={`px-2 py-1 text-xs rounded ${
                          temperatureUnit === 'celsius'
                            ? 'bg-orange-600 text-white' 
                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        }`}
                      >
                        °C
                      </button>
                      <button
                        onClick={() => setTemperatureUnit('fahrenheit')}
                        className={`px-2 py-1 text-xs rounded ${
                          temperatureUnit === 'fahrenheit'
                            ? 'bg-orange-600 text-white' 
                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        }`}
                      >
                        °F
                      </button>
                    </div>
                  </div>
                  {marine ? (
                    <div className="space-y-6">
                      {/* Temperature Visualization Options */}
                      <div className="bg-white rounded-lg p-6 border border-orange-200">
                        <div className="text-sm font-medium text-orange-800 mb-4 text-center">
                          Temperature Visualization
                        </div>
                        
                        
                        
                        {/* Temperature Visualization */}
                        <div className="bg-white rounded-lg p-4 border border-orange-200">
                          <div className="text-sm font-medium text-orange-800 mb-3 text-center">Temperature Scale</div>
                          
                          {/* Temperature scale with labels outside */}
                          <div className="space-y-2">
                            {/* Gradient bar with subtle effects */}
                            <div className="relative h-8 bg-gradient-to-r from-blue-500 via-green-400 via-yellow-400 via-orange-400 to-red-500 rounded-full overflow-hidden">
                              {/* Low temperature indicator (blue) */}
                              <div 
                                className="absolute top-0 w-1 h-full bg-blue-600 border border-blue-800 shadow-lg z-20 rounded-full"
                                style={{
                                  left: `${Math.max(0, Math.min(100, ((15 + 20) / 60) * 100))}%`,
                                  transform: 'translateX(-50%)'
                                }}
                              />
                              {/* High temperature indicator (red) */}
                              <div 
                                className="absolute top-0 w-1 h-full bg-red-600 border border-red-800 shadow-lg z-20 rounded-full"
                                style={{
                                  left: `${Math.max(0, Math.min(100, ((25 + 20) / 60) * 100))}%`,
                                  transform: 'translateX(-50%)'
                                }}
                              />
                              {/* Current temperature indicator with subtle pulse */}
                              {marine.temperatureC && (
                                <div 
                                  className="absolute top-0 w-2 h-full bg-white border-2 border-gray-800 shadow-lg z-30 rounded-full animate-pulse"
                                  style={{
                                    left: `${Math.max(0, Math.min(100, ((Number(marine.temperatureC) + 20) / 60) * 100))}%`,
                                    transform: 'translateX(-50%)',
                                    boxShadow: '0 0 10px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.5)'
                                  }}
                                  title={`Temperature: ${marine.temperatureC}°C`}
                                />
              )}
            </div>

                            {/* Temperature labels below */}
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>{temperatureUnit === 'celsius' ? '-20°C' : '-4°F'}</span>
                              <span>{temperatureUnit === 'celsius' ? '0°C' : '32°F'}</span>
                              <span>{temperatureUnit === 'celsius' ? '20°C' : '68°F'}</span>
                              <span>{temperatureUnit === 'celsius' ? '40°C' : '104°F'}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Weather Visualization */}
                        <div className="bg-white rounded-lg p-4 border border-orange-200">
                          <div className="text-sm font-medium text-orange-800 mb-3 text-center">
                            Weather Forecast
                          </div>
                          
                          <div className="space-y-3">
                            <div className="grid grid-cols-6 gap-2">
                              {[1, 2, 3, 4, 5, 6].map((hour) => {
                                const WeatherIcon = getWeatherIcon(marine.weatherCode, isNightTime())
                                return (
                                  <div key={hour} className="text-center p-1 bg-gray-50 rounded">
                                    <div className="text-lg mb-1">
                                      <WeatherIcon className="mx-auto text-blue-500" />
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      +{hour}h
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            <div className="text-xs text-gray-500 text-center">
                              Forecast based on current conditions
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Temperature Data - 5 Most Important Sailing Metrics */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-orange-800">Current Temp</span>
                          <span className="text-xl font-bold text-orange-600">
                            {marine.temperatureC !== null && !isNaN(marine.temperatureC) 
                              ? `${marine.temperatureC.toFixed(1)}°C (${((marine.temperatureC * 9/5) + 32).toFixed(1)}°F)`
                              : 'N/A'
                            }
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-orange-800">Humidity</span>
                          <span className="text-lg font-semibold text-orange-600">
                            {marine.humidity !== null && !isNaN(marine.humidity) 
                              ? `${marine.humidity.toFixed(0)}%`
                              : 'N/A'
                            }
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-orange-800">Pressure</span>
                          <span className="text-lg font-semibold text-orange-600">
                            {marine.pressureHpa !== null && !isNaN(marine.pressureHpa) 
                              ? `${(marine.pressureHpa * 0.02953).toFixed(2)} inHg`
                              : 'N/A'
                            }
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-orange-800">Visibility</span>
                          <span className="text-lg font-semibold text-orange-600">
                      {marine.visibilityKm !== null && !isNaN(marine.visibilityKm) 
                        ? (() => {
                            const miles = marine.visibilityKm * 0.621371;
                            // Cap visibility at reasonable maximum (e.g., 50 miles)
                            const cappedMiles = Math.min(miles, 50);
                            return `${cappedMiles.toFixed(1)} mi`;
                          })()
                        : 'N/A'
                      }
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-orange-800">Comfort Level</span>
                          <span className="text-lg font-semibold text-orange-600">
                            {(() => {
                              if (marine.temperatureC === null || isNaN(marine.temperatureC)) return 'N/A'
                              if (marine.temperatureC < 10) return '❄️ Cold'
                              if (marine.temperatureC < 20) return '🧊 Cool'
                              if (marine.temperatureC < 25) return '😊 Comfortable'
                              if (marine.temperatureC < 30) return '☀️ Warm'
                              return '🔥 Hot'
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-orange-600">No temperature data available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Route Planner Section */}
      <section className="bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">

            {/* Bay Area Map */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                <h2 className="text-lg font-semibold text-gray-900">Bay Area Map</h2>
                <p className="text-sm text-gray-600">Click to add waypoints, select harbor to center map</p>
                  </div>
                  <button
                    onClick={() => setMapStyle(mapStyle === 'streets' ? 'satellite' : 'streets')}
                    className="bg-blue-600 text-white p-2 rounded-md border border-blue-600 hover:bg-blue-500 hover:border-blue-400 transition-all duration-200"
                    title={mapStyle === 'streets' ? 'Switch to Satellite' : 'Switch to Streets'}
                  >
                    <FaSatellite className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                  <div 
                    ref={mapContainerRef} 
                    className="map-container h-96 w-full rounded-lg"
                    style={{ minHeight: '384px' }}
                  />
              </div>
              
              {/* Route Planner - Full Width */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Route Summary */}
                  <div className="lg:col-span-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Summary</h3>
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Waypoints</span>
                          <span className="text-lg font-bold text-blue-600">{waypoints.length}</span>
            </div>
                        {etaSummary && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Distance</span>
                            <span className="text-lg font-bold text-green-600">{etaSummary.distanceNm.toFixed(1)} nm</span>
          </div>
                        )}
        </div>

                      {etaSummary && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm font-medium text-gray-700 mb-2">Sailing ETA</div>
                          <div className="text-2xl font-bold text-gray-900 mb-3">{etaSummary.hours.toFixed(1)} hours</div>
                          {etaSummary.breakdown && (
                            <div className="space-y-2 text-xs text-gray-500">
                              <div className="flex justify-between">
                                <span>Harbor exit:</span>
                                <span>{etaSummary.breakdown.harborExit.toFixed(1)}h</span>
                  </div>
                              <div className="flex justify-between">
                                <span>Sailing:</span>
                                <span>{etaSummary.breakdown.sailingTime.toFixed(1)}h</span>
                    </div>
                              <div className="flex justify-between">
                                <span>Wind:</span>
                                <span>{etaSummary.breakdown.windSpeed.toFixed(1)} kts {getWindDirection(etaSummary.breakdown.windDirection)}</span>
                  </div>
                              <div className="flex justify-between" title="Sailing efficiency based on wind angle: 60% (close hauled), 80% (beam reach), 90% (broad reach)">
                                <span>Efficiency:</span>
                                <span>{(etaSummary.breakdown.efficiency * 100).toFixed(0)}%</span>
                              </div>
                              {etaSummary.breakdown.tackingPenalty > 1 && (
                                <div className="flex justify-between text-orange-600">
                                  <span>Tacking penalty:</span>
                                  <span>+{((etaSummary.breakdown.tackingPenalty - 1) * 100).toFixed(0)}%</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                </div>

                  {/* Waypoints List */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Waypoints</h3>
                      {waypoints.length > 0 && (
                    <button
                          onClick={() => setWaypoints([])}
                          className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 text-sm transition-colors"
                        >
                          Clear All
                    </button>
                      )}
                    </div>
                    
                    {waypoints.length === 0 ? (
                      <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                        <div className="text-gray-400 mb-2">
                          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm">Click on the map to add waypoints</p>
                        <p className="text-gray-400 text-xs mt-1">Start planning your route by clicking on the map above</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {waypoints.map(([lng, lat], i) => (
                          <div key={i} className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                  {i + 1}
                                </div>
                                <span className="font-medium text-gray-900">Waypoint {i + 1}</span>
                              </div>
                    <button
                      onClick={() => {
                                  const newWaypoints = waypoints.filter((_, index) => index !== i)
                                  setWaypoints(newWaypoints)
                                }}
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                Remove
                    </button>
                  </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {lat.toFixed(4)}°N, {lng.toFixed(4)}°W
                </div>
              </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-200 text-gray-800 py-8 mt-12 border-t border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                  <MdSailing className="w-5 h-5 text-white" />
                </div>
                <h5 className="text-blue-600 text-lg font-semibold">SailFrisco</h5>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Real-time marine weather, tides, and route planning for San Francisco Bay sailors. 
                Track conditions, plan routes, and sail smarter with data-driven insights.
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-600 mb-2">
                Built with <span className="text-red-600">❤️</span> for Bay Area sailors
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <div>React + TypeScript • MapLibre GL • NOAA Data</div>
                <div>Real-time weather • Tide predictions • Route planning</div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-6 pt-6">
            <div className="flex justify-center">
              <div className="text-xs text-gray-400">
                Data from NOAA • Weather from OpenWeatherMap • Tides from CO-OPS
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Beaufort Header Options Modal */}
      {showBeaufortHeaderOptions && (
        <BeaufortHeaderOptions
          onSelect={() => {
            setShowBeaufortHeaderOptions(false)
          }}
          onClose={() => setShowBeaufortHeaderOptions(false)}
        />
      )}
    </div>
  )
}

export default App

function boatHullSpeedKts(size: '20ft' | '30ft' | '40ft' | '50ft'): number {
  // Simple fixed estimates
  switch (size) {
    case '20ft': return 5.4
    case '30ft': return 7.3
    case '40ft': return 8.5
    case '50ft': return 9.2
  }
}

// Realistic sailing time calculation with wind, tacking, and harbor considerations
function calculateRealisticSailingTime(
  waypoints: [number, number][], 
  boat: '20ft' | '30ft' | '40ft' | '50ft',
  windData: MarineData | null,
  harbor: HarborKey
): { totalHours: number; breakdown: any } {
  if (waypoints.length < 2) return { totalHours: 0, breakdown: {} }
  
  const hullSpeed = boatHullSpeedKts(boat)
  const directDistance = totalDistanceNm(waypoints)
  
  // Harbor exit time (motoring through no-wake zones)
  const harborExitTime = getHarborExitTime(harbor)
  
  // Wind analysis
  const windSpeed = windData?.windSpeedKts || 0
  const windDirection = windData?.windDirectionDeg || 0
  
  // Calculate sailing efficiency based on wind angle
  const sailingEfficiency = calculateSailingEfficiency(waypoints, windDirection, windSpeed)
  
  // Tacking penalty (boats can't sail directly into wind)
  const tackingPenalty = calculateTackingPenalty(waypoints, windDirection)
  
  // Realistic sailing speed (not hull speed, but actual sailing speed)
  const sailingSpeed = calculateSailingSpeed(hullSpeed, windSpeed, sailingEfficiency)
  
  // Total time calculation
  const sailingTime = (directDistance * tackingPenalty) / sailingSpeed
  const totalTime = harborExitTime + sailingTime
  
  return {
    totalHours: totalTime,
    breakdown: {
      harborExit: harborExitTime,
      sailingTime: sailingTime,
      tackingPenalty: tackingPenalty,
      sailingSpeed: sailingSpeed,
      windSpeed: windSpeed,
      windDirection: windDirection,
      efficiency: sailingEfficiency
    }
  }
}

// Time to motor out of harbor through no-wake zones
function getHarborExitTime(harbor: HarborKey): number {
  const harborExitTimes = {
    'San Francisco': 0.5, // 30 min through busy harbor
    'Sausalito': 0.3,    // 20 min through Richardson Bay
    'Berkeley': 0.4,     // 25 min through Berkeley Marina
    'Alameda': 0.6,      // 35 min through Oakland Estuary
    'Richmond': 0.4      // 25 min through Richmond Harbor
  }
  return harborExitTimes[harbor] || 0.3
}

// Calculate how efficiently we can sail based on wind angle
function calculateSailingEfficiency(
  waypoints: [number, number][], 
  windDirection: number, 
  windSpeed: number
): number {
  if (windSpeed < 3) return 0.3 // Very light wind, mostly motoring
  
  // Calculate average course direction
  let totalBearing = 0
  for (let i = 1; i < waypoints.length; i++) {
    const bearing = calculateBearing(waypoints[i-1], waypoints[i])
    totalBearing += bearing
  }
  const avgCourse = totalBearing / (waypoints.length - 1)
  
  // Wind angle relative to course (0° = headwind, 180° = tailwind)
  const windAngle = Math.abs(windDirection - avgCourse)
  const normalizedAngle = Math.min(windAngle, 360 - windAngle) / 180
  
  // Sailing efficiency based on wind angle
  if (normalizedAngle < 0.3) return 0.6 // Close hauled - decent speed but extra distance
  if (normalizedAngle < 0.6) return 0.8 // Beam reach - good
  if (normalizedAngle < 0.8) return 0.9 // Broad reach - excellent
  return 0.8 // Running - good but not as fast as broad reach
}

// Calculate tacking penalty (how much extra distance due to zigzagging)
function calculateTackingPenalty(
  waypoints: [number, number][], 
  windDirection: number
): number {
  if (waypoints.length < 2) return 1
  
  // Calculate if we need to tack (sailing upwind)
  const courseBearing = calculateBearing(waypoints[0], waypoints[waypoints.length - 1])
  const windAngle = Math.abs(windDirection - courseBearing)
  const normalizedAngle = Math.min(windAngle, 360 - windAngle) / 180
  
  // If sailing upwind (wind angle < 45°), add tacking penalty
  if (normalizedAngle < 0.25) {
    return 1.15 // 15% extra distance due to tacking
  }
  
  return 1.0 // No tacking penalty
}

// Calculate realistic sailing speed based on wind and boat
function calculateSailingSpeed(
  hullSpeed: number, 
  windSpeed: number, 
  efficiency: number
): number {
  // Base speed is hull speed
  let speed = hullSpeed
  
  // Adjust for wind strength
  if (windSpeed < 5) {
    speed *= 0.6 // Light wind - slow
  } else if (windSpeed < 15) {
    speed *= 0.8 // Moderate wind - good
  } else if (windSpeed < 25) {
    speed *= 0.9 // Strong wind - very good
  } else {
    speed *= 0.7 // Too much wind - reefed sails
  }
  
  // Apply sailing efficiency
  speed *= efficiency
  
  // Minimum speed (motoring)
  return Math.max(speed, hullSpeed * 0.3)
}

// Calculate bearing between two points
function calculateBearing(from: [number, number], to: [number, number]): number {
  const [lon1, lat1] = from
  const [lon2, lat2] = to
  
  const dLon = (lon2 - lon1) * Math.PI / 180
  const lat1Rad = lat1 * Math.PI / 180
  const lat2Rad = lat2 * Math.PI / 180
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad)
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI
  return (bearing + 360) % 360
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

// Weather code to icon mapping (WMO Weather codes)
function getWeatherIcon(weatherCode: number | null, isNight: boolean = false) {
  if (weatherCode === null) return WiCloudy
  
  const weatherIcons = {
    // Clear sky
    0: isNight ? WiNightClear : WiDaySunny,
    // Mainly clear
    1: isNight ? WiNightCloudy : WiCloudy,
    // Partly cloudy
    2: isNight ? WiNightCloudy : WiCloudy,
    // Overcast
    3: WiCloudy,
    // Fog
    45: WiFog,
    48: WiFog,
    // Drizzle
    51: WiRain,
    53: WiRain,
    55: WiRain,
    // Freezing drizzle
    56: WiSnow,
    57: WiSnow,
    // Rain
    61: isNight ? WiNightRain : WiRain,
    63: isNight ? WiNightRain : WiRain,
    65: isNight ? WiNightRain : WiRain,
    // Freezing rain
    66: WiSnow,
    67: WiSnow,
    // Snow
    71: isNight ? WiNightSnow : WiSnow,
    73: isNight ? WiNightSnow : WiSnow,
    75: isNight ? WiNightSnow : WiSnow,
    // Snow grains
    77: WiSnow,
    // Rain showers
    80: isNight ? WiNightRain : WiRain,
    81: isNight ? WiNightRain : WiRain,
    82: isNight ? WiNightRain : WiRain,
    // Snow showers
    85: isNight ? WiNightSnow : WiSnow,
    86: isNight ? WiNightSnow : WiSnow,
    // Thunderstorm
    95: isNight ? WiNightThunderstorm : WiThunderstorm,
    96: isNight ? WiNightThunderstorm : WiThunderstorm,
    99: isNight ? WiNightThunderstorm : WiThunderstorm,
  }
  
  return weatherIcons[weatherCode as keyof typeof weatherIcons] || WiCloudy
}

// Weather code to description mapping
function getWeatherDescription(weatherCode: number | null): string {
  if (weatherCode === null) return 'unknown conditions'
  
  const weatherDescriptions = {
    // Clear sky
    0: 'clear skies',
    // Mainly clear
    1: 'mainly clear',
    // Partly cloudy
    2: 'partly cloudy',
    // Overcast
    3: 'overcast',
    // Fog
    45: 'foggy',
    48: 'foggy',
    // Drizzle
    51: 'light drizzle',
    53: 'moderate drizzle',
    55: 'heavy drizzle',
    // Freezing drizzle
    56: 'freezing drizzle',
    57: 'heavy freezing drizzle',
    // Rain
    61: 'light rain',
    63: 'moderate rain',
    65: 'heavy rain',
    // Freezing rain
    66: 'freezing rain',
    67: 'heavy freezing rain',
    // Snow
    71: 'light snow',
    73: 'moderate snow',
    75: 'heavy snow',
    // Snow grains
    77: 'snow grains',
    // Rain showers
    80: 'light rain showers',
    81: 'moderate rain showers',
    82: 'heavy rain showers',
    // Snow showers
    85: 'light snow showers',
    86: 'heavy snow showers',
    // Thunderstorm
    95: 'thunderstorms',
    96: 'thunderstorms with hail',
    99: 'severe thunderstorms',
  }
  
  return weatherDescriptions[weatherCode as keyof typeof weatherDescriptions] || 'unknown conditions'
}


// Check if it's night time (simplified)
function isNightTime(): boolean {
  const hour = new Date().getHours()
  return hour < 6 || hour > 18
}
