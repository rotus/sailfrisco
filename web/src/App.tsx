import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { Map, Marker, type LngLatLike } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'
import { 
  WiDaySunny, WiCloudy, WiRain, WiSnow, WiThunderstorm, WiFog,
  WiNightClear, WiNightCloudy, WiNightRain, WiNightSnow, WiNightThunderstorm
} from 'react-icons/wi'

type HarborKey = 'Sausalito' | 'Berkeley' | 'Alameda' | 'San Francisco' | 'Richmond'

const HARBORS: Record<HarborKey, { lat: number; lon: number; tideStation: string }> = {
  'Sausalito': { lat: 37.8591, lon: -122.4853, tideStation: '9414806' }, // Sausalito station
  'Berkeley': { lat: 37.8659, lon: -122.3114, tideStation: '9414816' }, // Berkeley station
  'Alameda': { lat: 37.7726, lon: -122.2760, tideStation: '9414750' }, // Alameda station
  'San Francisco': { lat: 37.8060, lon: -122.4659, tideStation: '9414290' }, // San Francisco station
  'Richmond': { lat: 37.9120, lon: -122.3593, tideStation: '9414849' }, // Richmond Inner Harbor
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
  const [boat, setBoat] = useState<'20ft' | '30ft' | '40ft'>('30ft')
  const [marine, setMarine] = useState<MarineData | null>(null)
  const [tides, setTides] = useState<TidesData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [useLogarithmic, setUseLogarithmic] = useState(true)
  const [tideViewHours, setTideViewHours] = useState(24)
  const [isWindExpanded, setIsWindExpanded] = useState(false)
  const [isTidesExpanded, setIsTidesExpanded] = useState(false)
  const [isTemperatureExpanded, setIsTemperatureExpanded] = useState(false)
  const [beaufortLegendOption, setBeaufortLegendOption] = useState<'none' | 'option1' | 'option2' | 'option3'>('none')
  const [temperatureUnit, setTemperatureUnit] = useState<'celsius' | 'fahrenheit'>('fahrenheit')
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets')
  const [showTidalBuoys, setShowTidalBuoys] = useState(false)
  const [showWeatherStations, setShowWeatherStations] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Apply dark mode styles
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])
  const [showShippingLanes, setShowShippingLanes] = useState(false)
  const [showHazards, setShowHazards] = useState(false)
  const [showWaterDepths, setShowWaterDepths] = useState(false)
  const [showNavigationAids, setShowNavigationAids] = useState(false)
  const [showNauticalSigns, setShowNauticalSigns] = useState(false)

  const mapRef = useRef<Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const waypointMarkersRef = useRef<Marker[]>([])
  const harborMarkersRef = useRef<Marker[]>([])
  const tidalBuoyMarkersRef = useRef<Marker[]>([])
  const weatherStationMarkersRef = useRef<Marker[]>([])
  const [waypoints, setWaypoints] = useState<[number, number][]>([])

  // Tidal buoy locations (NOAA stations) - actual monitoring positions
  const TIDAL_BUOYS = [
    { id: '9414290', name: 'San Francisco', lat: 37.8063, lon: -122.4659 }, // SF Bay entrance
    { id: '9414392', name: 'Oyster Point', lat: 37.6650, lon: -122.3770 }, // Oyster Point Marina
    { id: '9414575', name: 'Coyote Creek', lat: 37.4650, lon: -122.0230 }, // Alviso Slough
    { id: '9414449', name: 'Coyote Point', lat: 37.5917, lon: -122.3130 }, // Coyote Point Marina
    { id: '9414806', name: 'Angel Island', lat: 37.8600, lon: -122.4300 }, // Angel Island
    { id: '9415020', name: 'Point Reyes', lat: 38.0000, lon: -122.9833 }, // Point Reyes
    { id: '9415144', name: 'Point Bonita', lat: 37.8100, lon: -122.5300 }, // Point Bonita
    { id: '9415102', name: 'Crissy Field', lat: 37.8100, lon: -122.4700 }, // Crissy Field
    { id: '9415115', name: 'Exploratorium', lat: 37.8000, lon: -122.4000 }, // Exploratorium
  ]

  // Weather station locations (NDBC stations)
  const WEATHER_STATIONS = [
    { id: '46026', name: 'San Francisco', lat: 37.7544, lon: -122.8378 },
    { id: '46042', name: 'Monterey Bay', lat: 36.7500, lon: -122.0000 },
    { id: '46013', name: 'Bodega Bay', lat: 38.2333, lon: -123.3167 },
    { id: '46012', name: 'Half Moon Bay', lat: 37.7500, lon: -122.8333 },
    { id: '46014', name: 'Point Arena', lat: 38.9500, lon: -123.7333 },
  ]

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

  // Update map style when changed
  useEffect(() => {
    if (!mapRef.current) return
    
    let styleUrl
    if (mapStyle === 'satellite') {
      styleUrl = 'https://api.maptiler.com/maps/satellite/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
    } else {
      // Use dark or light streets based on dark mode
      styleUrl = isDarkMode 
        ? 'https://api.maptiler.com/maps/dark/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
        : 'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
    }
    
    mapRef.current.setStyle(styleUrl)
    
    // Re-add route line layer after style change
    mapRef.current.on('style.load', () => {
      if (!mapRef.current) return
      
      mapRef.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      })
      
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
        },
      })
    })
  }, [mapStyle, isDarkMode])

  // Show/hide tidal buoys
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear existing markers
    tidalBuoyMarkersRef.current.forEach((m) => m.remove())
    tidalBuoyMarkersRef.current = []

    if (showTidalBuoys) {
      TIDAL_BUOYS.forEach((buoy) => {
        const el = document.createElement('div')
        el.className = 'w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-lg cursor-pointer flex items-center justify-center'
        el.innerHTML = '🌊'
        el.title = `${buoy.name} Tide Station (${buoy.id})`
        
        // Add click handler for detailed info
        el.addEventListener('click', () => {
          alert(`🌊 ${buoy.name} Tide Station\n\nStation ID: ${buoy.id}\nCoordinates: ${buoy.lat.toFixed(4)}°N, ${buoy.lon.toFixed(4)}°W\n\nThis NOAA tide station provides real-time water level data for accurate tide predictions.`)
        })
        
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([buoy.lon, buoy.lat] as LngLatLike)
          .addTo(map)
        
        tidalBuoyMarkersRef.current.push(marker)
      })
    }
  }, [showTidalBuoys])

  // Show/hide weather stations
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear existing markers
    weatherStationMarkersRef.current.forEach((m) => m.remove())
    weatherStationMarkersRef.current = []

    if (showWeatherStations) {
      WEATHER_STATIONS.forEach((station) => {
        const el = document.createElement('div')
        el.className = 'w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg cursor-pointer'
        el.title = `${station.name} Weather Station (${station.id})`
        
        // Add click handler for detailed info
        el.addEventListener('click', () => {
          alert(`🌤️ ${station.name} Weather Station\n\nStation ID: ${station.id}\nCoordinates: ${station.lat.toFixed(4)}°N, ${station.lon.toFixed(4)}°W\n\nThis NDBC weather buoy provides real-time marine weather data including wind, waves, and atmospheric conditions.`)
        })
        
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([station.lon, station.lat] as LngLatLike)
          .addTo(map)
        
        weatherStationMarkersRef.current.push(marker)
      })
    }
  }, [showWeatherStations])

  // Show/hide shipping lanes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (showShippingLanes) {
      // Add shipping lane source and layer
      if (!map.getSource('shipping-lanes')) {
        map.addSource('shipping-lanes', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [-122.5, 37.8], // Golden Gate
                    [-122.4, 37.7], // Bay Bridge
                    [-122.3, 37.6], // South Bay
                  ]
                },
                properties: { name: 'Main Shipping Lane' }
              }
            ]
          }
        })
      }
      
      if (!map.getLayer('shipping-lanes-layer')) {
        map.addLayer({
          id: 'shipping-lanes-layer',
          type: 'line',
          source: 'shipping-lanes',
          paint: {
            'line-color': '#ff6b6b',
            'line-width': 4,
            'line-dasharray': [2, 2]
          }
        })
      }
    } else {
      if (map.getLayer('shipping-lanes-layer')) {
        map.removeLayer('shipping-lanes-layer')
      }
      if (map.getSource('shipping-lanes')) {
        map.removeSource('shipping-lanes')
      }
    }
  }, [showShippingLanes])

  // Show/hide hazards
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (showHazards) {
      // Add hazards source and layer
      if (!map.getSource('hazards')) {
        map.addSource('hazards', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [-122.45, 37.82]
                },
                properties: { name: 'Shallow Water', type: 'hazard' }
              },
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [-122.35, 37.75]
                },
                properties: { name: 'Rock Outcrop', type: 'hazard' }
              }
            ]
          }
        })
      }
      
      if (!map.getLayer('hazards-layer')) {
        map.addLayer({
          id: 'hazards-layer',
          type: 'circle',
          source: 'hazards',
          paint: {
            'circle-color': '#ff0000',
            'circle-radius': 8,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
          }
        })
        
        // Add click handler for hazards
        map.on('click', 'hazards-layer', (e) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0]
            const name = feature.properties.name
            const type = feature.properties.type
            alert(`⚠️ ${name}\n\nType: ${type}\n\nThis hazard marker indicates a dangerous area that should be avoided while sailing. Always maintain a safe distance and check your charts.`)
          }
        })
        
        // Change cursor on hover
        map.on('mouseenter', 'hazards-layer', () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        
        map.on('mouseleave', 'hazards-layer', () => {
          map.getCanvas().style.cursor = ''
        })
      }
    } else {
      if (map.getLayer('hazards-layer')) {
        map.removeLayer('hazards-layer')
      }
      if (map.getSource('hazards')) {
        map.removeSource('hazards')
      }
    }
  }, [showHazards])

  // Show/hide water depths
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (showWaterDepths) {
      // Add water depth contours
      if (!map.getSource('water-depths')) {
        map.addSource('water-depths', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [-122.5, 37.8],
                    [-122.4, 37.8],
                    [-122.3, 37.8]
                  ]
                },
                properties: { depth: '10ft' }
              }
            ]
          }
        })
      }
      
      if (!map.getLayer('water-depths-layer')) {
        map.addLayer({
          id: 'water-depths-layer',
          type: 'line',
          source: 'water-depths',
          paint: {
            'line-color': '#0066cc',
            'line-width': 2
          }
        })
      }
    } else {
      if (map.getLayer('water-depths-layer')) {
        map.removeLayer('water-depths-layer')
      }
      if (map.getSource('water-depths')) {
        map.removeSource('water-depths')
      }
    }
  }, [showWaterDepths])

  // Show/hide navigation aids
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (showNavigationAids) {
      // Add navigation aids source and layer
      if (!map.getSource('navigation-aids')) {
        map.addSource('navigation-aids', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [-122.48, 37.81]
                },
                properties: { name: 'Red Buoy #2', type: 'buoy' }
              },
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [-122.42, 37.78]
                },
                properties: { name: 'Green Buoy #3', type: 'buoy' }
              }
            ]
          }
        })
      }
      
      if (!map.getLayer('navigation-aids-layer')) {
        map.addLayer({
          id: 'navigation-aids-layer',
          type: 'circle',
          source: 'navigation-aids',
          paint: {
            'circle-color': '#00ff00',
            'circle-radius': 6,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
          }
        })
        
        // Add click handler for navigation aids
        map.on('click', 'navigation-aids-layer', (e) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0]
            const name = feature.properties.name
            const type = feature.properties.type
            alert(`🧭 ${name}\n\nType: ${type}\n\nThis navigation aid helps sailors navigate safely. Red buoys should be kept to starboard when entering, green buoys to port. Always follow proper navigation rules.`)
          }
        })
        
        // Change cursor on hover
        map.on('mouseenter', 'navigation-aids-layer', () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        
        map.on('mouseleave', 'navigation-aids-layer', () => {
          map.getCanvas().style.cursor = ''
        })
      }
    } else {
      if (map.getLayer('navigation-aids-layer')) {
        map.removeLayer('navigation-aids-layer')
      }
      if (map.getSource('navigation-aids')) {
        map.removeSource('navigation-aids')
      }
    }
  }, [showNavigationAids])

  // Show/hide nautical signs
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (showNauticalSigns) {
      // Add nautical signs source and layer
      if (!map.getSource('nautical-signs')) {
        map.addSource('nautical-signs', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [-122.46, 37.79]
                },
                properties: { name: 'No Wake Zone', type: 'sign' }
              },
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [-122.38, 37.76]
                },
                properties: { name: 'Speed Limit 5mph', type: 'sign' }
              }
            ]
          }
        })
      }
      
      if (!map.getLayer('nautical-signs-layer')) {
        map.addLayer({
          id: 'nautical-signs-layer',
          type: 'circle',
          source: 'nautical-signs',
          paint: {
            'circle-color': '#ffaa00',
            'circle-radius': 5,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
          }
        })
        
        // Add click handler for nautical signs
        map.on('click', 'nautical-signs-layer', (e) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0]
            const name = feature.properties.name
            const type = feature.properties.type
            alert(`🚨 ${name}\n\nType: ${type}\n\nThis nautical sign indicates important regulations or restrictions. Always observe posted speed limits and wake restrictions for safety and courtesy.`)
          }
        })
        
        // Change cursor on hover
        map.on('mouseenter', 'nautical-signs-layer', () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        
        map.on('mouseleave', 'nautical-signs-layer', () => {
          map.getCanvas().style.cursor = ''
        })
      }
    } else {
      if (map.getLayer('nautical-signs-layer')) {
        map.removeLayer('nautical-signs-layer')
      }
      if (map.getSource('nautical-signs')) {
        map.removeSource('nautical-signs')
      }
    }
  }, [showNauticalSigns])

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

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm flex items-center space-x-2"
              >
                <span>{isDarkMode ? '☀️' : '🌙'}</span>
                <span>{isDarkMode ? 'Light' : 'Dark'}</span>
              </button>

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

      {/* Weather Information Section - Simplified */}
      <section className="bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-0">
            {/* Weather/Wind Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200">
              {/* Collapsible Header */}
              <div 
                className="p-6 cursor-pointer hover:bg-blue-100 transition-colors duration-200"
                onClick={() => setIsWindExpanded(!isWindExpanded)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                    <span className="mr-2">🌬️</span>
                    {marine?.windSpeedKts && !isNaN(marine.windSpeedKts) && marine?.windGustKts && !isNaN(marine.windGustKts) && marine?.windDirectionDeg && !isNaN(marine.windDirectionDeg) ? (
                      <>
                        Winds of {marine.windSpeedKts.toFixed(1)} knots out of the {getWindDirection(marine.windDirectionDeg)}, gusting to {marine.windGustKts.toFixed(1)} knots with {(() => {
                          const beaufortInfo = getBeaufortInfo(marine.windSpeedKts)
                          return beaufortInfo.waveHeight
                        })()} waves
                      </>
                    ) : (
                      'Wind & Waves'
                    )}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-blue-600">
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
                <div className="px-6 pb-6">
              {marine ? (
                <>
                  {/* Wind Scale Visualization */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                        <span className="mr-2">🌬️</span>
                        Wind Scale
                      </h3>
                      <div className="flex items-center space-x-4">
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
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-blue-700">Legend:</span>
                          <button
                            onClick={() => setBeaufortLegendOption(beaufortLegendOption === 'option3' ? 'none' : 'option3')}
                            className={`px-2 py-1 text-xs rounded ${
                              beaufortLegendOption === 'option3'
                                ? 'bg-blue-600 text-white' 
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            {beaufortLegendOption === 'option3' ? 'Hide Legend' : 'Show Legend'}
                          </button>
                  </div>
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
                            // Logarithmic scaling: log(1 + wind_speed) for better distribution - continuous segments
                            const logMin = Math.log(1 + scale.minKts)
                            const logTotal = Math.log(1 + 64)
                            
                            leftPercent = (logMin / logTotal) * 100
                            if (scale.maxKts === Infinity) {
                              widthPercent = 100 - leftPercent
                            } else {
                              // Calculate width to reach the next segment's start point
                              const nextSegment = BEAUFORT_SCALE[index + 1]
                              const nextLogMin = nextSegment ? Math.log(1 + nextSegment.minKts) : Math.log(1 + 64)
                              const endPoint = (nextLogMin / logTotal) * 100
                              widthPercent = endPoint - leftPercent
                            }
                          } else {
                            // Linear scaling - continuous segments with no gaps
                            leftPercent = (scale.minKts / 64) * 100
                            if (scale.maxKts === Infinity) {
                              widthPercent = 100 - leftPercent
                            } else {
                              // Calculate width to reach the next segment's start point
                              const nextSegment = BEAUFORT_SCALE[index + 1]
                              const endPoint = nextSegment ? (nextSegment.minKts / 64) * 100 : 100
                              widthPercent = endPoint - leftPercent
                            }
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
                                backgroundColor: scale.color,
                                borderRight: 'none', // Remove borders to eliminate gaps
                                boxShadow: isActive ? `0 0 10px ${scale.color}80` : 'none',
                                zIndex: isActive ? 10 : 1
                              }}
                            />
                          )
                        })}
                        
                        {/* Warning emoji at 25 knots */}
                        <div
                          className="absolute top-0 text-lg z-30"
                          style={{
                            left: `${Math.min(useLogarithmic 
                              ? (Math.log(1 + 25) / Math.log(1 + 64)) * 100
                              : (25 / 64) * 100, 100)}%`,
                            transform: 'translateX(-50%) translateY(-25px)'
                          }}
                        >
                          ⚠️
                  </div>
                        
                        {/* Current Wind Speed Indicator */}
                        {marine.windSpeedKts && !isNaN(marine.windSpeedKts) && (() => {
                          let indicatorPosition
                          if (useLogarithmic) {
                            // Use the same logarithmic calculation as segments
                            const logWind = Math.log(1 + marine.windSpeedKts)
                            const logTotal = Math.log(1 + 64)
                            indicatorPosition = (logWind / logTotal) * 100
                          } else {
                            // Use the same linear calculation as segments
                            indicatorPosition = (marine.windSpeedKts / 64) * 100
                          }
                          
                          return (
                            <div
                              className="absolute top-0 w-1 h-full bg-white border border-gray-400 shadow-lg z-20"
                              style={{
                                left: `${Math.min(indicatorPosition, 100)}%`,
                                transform: 'translateX(-50%)'
                              }}
                            />
                          )
                        })()}
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
                    
                    {/* Beaufort Scale Legend - Option 3 Only */}
                    {beaufortLegendOption === 'option3' && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                        <h4 className="text-sm font-semibold text-blue-800 mb-3">Beaufort Scale Legend</h4>
                        <div className="flex flex-wrap gap-1">
                          {BEAUFORT_SCALE.map((scale) => (
                            <div key={scale.force} className="flex items-center space-x-1 px-2 py-1 rounded text-xs" style={{ backgroundColor: scale.color }}>
                              <div className="w-2 h-2 rounded-full border border-white" style={{ backgroundColor: scale.color }}></div>
                              <span style={{ color: scale.textColor }}>{scale.force}</span>
                              <span style={{ color: scale.textColor }}>{scale.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
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
                  <div className="text-4xl mb-2">🌊</div>
                  <p className="text-sm text-blue-600">No weather data available</p>
                </div>
              )}
                </div>
              )}
            </div>

            {/* Tides Card */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200">
              {/* Collapsible Header */}
              <div 
                className="p-6 cursor-pointer hover:bg-green-100 transition-colors duration-200"
                onClick={() => setIsTidesExpanded(!isTidesExpanded)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-green-900 flex items-center">
                      <span className="mr-2">🌊</span>
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
                <div className="px-6 pb-6">
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
                                  <span className="mr-1">↗️</span>
                                  Rising
                                </>
                              )
                            } else {
                              return (
                                <>
                                  <span className="mr-1">↘️</span>
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
                  <div className="text-4xl mb-2">🌊</div>
                  <p className="text-sm text-green-600">No tide data available</p>
                </div>
              )}
                </div>
              )}
            </div>

            {/* Temperature Card */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200">
              {/* Collapsible Header */}
              <div 
                className="p-6 cursor-pointer hover:bg-orange-100 transition-colors duration-200"
                onClick={() => setIsTemperatureExpanded(!isTemperatureExpanded)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-orange-900 flex items-center">
                    <span className="mr-2">🌡️</span>
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
                <div className="px-6 pb-6">
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
                                    left: `${Math.max(0, Math.min(100, ((marine.temperatureC + 20) / 60) * 100))}%`,
                                    transform: 'translateX(-50%)',
                                    boxShadow: '0 0 10px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.5)'
                                  }}
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
                      <div className="text-4xl mb-2">🌡️</div>
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
              
              {/* Map Options */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">🗺️ Map Options</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Map Style */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-700">Map Style</h4>
                    <div className="space-y-1">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="mapStyle"
                          value="streets"
                          checked={mapStyle === 'streets'}
                          onChange={(e) => setMapStyle(e.target.value as 'streets' | 'satellite')}
                          className="mr-1"
                        />
                        <span className="text-xs">🗺️ Streets</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="mapStyle"
                          value="satellite"
                          checked={mapStyle === 'satellite'}
                          onChange={(e) => setMapStyle(e.target.value as 'streets' | 'satellite')}
                          className="mr-1"
                        />
                        <span className="text-xs">🛰️ Satellite</span>
                      </label>
            </div>
          </div>

                  {/* Tidal Buoys */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-700">Tide Data</h4>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={showTidalBuoys}
                        onChange={(e) => setShowTidalBuoys(e.target.checked)}
                        className="mr-1"
                      />
                      <span className="text-xs">🌊 Tidal Buoys</span>
                    </label>
        </div>

                  {/* Weather Stations */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-700">Weather</h4>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={showWeatherStations}
                        onChange={(e) => setShowWeatherStations(e.target.checked)}
                        className="mr-1"
                      />
                      <span className="text-xs">🌤️ Weather</span>
                    </label>
                  </div>

                  {/* Sailing Features */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-700">Sailing</h4>
                    <div className="space-y-1">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={showShippingLanes}
                          onChange={(e) => setShowShippingLanes(e.target.checked)}
                          className="mr-1"
                        />
                        <span className="text-xs">🚢 Shipping Lanes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={showHazards}
                          onChange={(e) => setShowHazards(e.target.checked)}
                          className="mr-1"
                        />
                        <span className="text-xs">⚠️ Hazards</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={showWaterDepths}
                          onChange={(e) => setShowWaterDepths(e.target.checked)}
                          className="mr-1"
                        />
                        <span className="text-xs">🌊 Water Depths</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={showNavigationAids}
                          onChange={(e) => setShowNavigationAids(e.target.checked)}
                          className="mr-1"
                        />
                        <span className="text-xs">🧭 Navigation Aids</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={showNauticalSigns}
                          onChange={(e) => setShowNauticalSigns(e.target.checked)}
                          className="mr-1"
                        />
                        <span className="text-xs">🚨 Nautical Signs</span>
                      </label>
                    </div>
                  </div>

                </div>

                {/* Quick Preview Buttons */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => {
                        setMapStyle('streets')
                        setShowTidalBuoys(true)
                        setShowWeatherStations(false)
                        setShowShippingLanes(false)
                        setShowHazards(false)
                        setShowWaterDepths(false)
                        setShowNavigationAids(false)
                        setShowNauticalSigns(false)
                      }}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      🗺️ Streets + Tides
                    </button>
                    <button
                      onClick={() => {
                        setMapStyle('satellite')
                        setShowTidalBuoys(false)
                        setShowWeatherStations(true)
                        setShowShippingLanes(false)
                        setShowHazards(false)
                        setShowWaterDepths(false)
                        setShowNavigationAids(false)
                        setShowNauticalSigns(false)
                      }}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      🛰️ Satellite + Weather
                    </button>
                    <button
                      onClick={() => {
                        setMapStyle('streets')
                        setShowTidalBuoys(true)
                        setShowWeatherStations(true)
                        setShowShippingLanes(true)
                        setShowHazards(true)
                        setShowWaterDepths(true)
                        setShowNavigationAids(true)
                        setShowNauticalSigns(true)
                      }}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                    >
                      🧭 All Sailing Data
                    </button>
                    <button
                      onClick={() => {
                        setMapStyle('streets')
                        setShowTidalBuoys(false)
                        setShowWeatherStations(false)
                        setShowShippingLanes(false)
                        setShowHazards(false)
                        setShowWaterDepths(false)
                        setShowNavigationAids(false)
                        setShowNauticalSigns(false)
                      }}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      🗺️ Clean
                    </button>
                  </div>
                </div>
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
