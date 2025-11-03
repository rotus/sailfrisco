import { useState } from 'react'
import { FaWind } from 'react-icons/fa'

// Beaufort Wind Scale data (same as App.tsx)
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

// Sample wind data
const sampleWind = 3.5
const sampleGust = 7.0

// Calculate position with compressed high segments
const calculatePosition = (speed: number) => {
  const compressedBreakpoint = 48
  const compressedSpace = 0.90
  const highSpace = 0.10
  
  if (speed <= compressedBreakpoint) {
    return (speed / compressedBreakpoint) * compressedSpace * 100
  } else {
    const compressedRange = 64 - compressedBreakpoint
    const positionInHighRange = (speed - compressedBreakpoint) / compressedRange
    return (compressedSpace + (positionInHighRange * highSpace)) * 100
  }
}

type BeaufortScaleOptionsProps = {
  onSelect: (optionName: string) => void
  onClose: () => void
}

export default function BeaufortScaleOptions({ onSelect, onClose }: BeaufortScaleOptionsProps) {
  const [hoveredForce, setHoveredForce] = useState<number | null>(null)

  const renderWindVisualization = (legendVariant: number) => {
    const currentPos = calculatePosition(sampleWind)
    const gustPos = calculatePosition(sampleGust)

    return (
      <div className="space-y-4">
        {/* Wind Range Slider */}
        <div className="relative h-16 bg-gray-100 rounded-lg p-2">
          <div className="absolute inset-2 rounded">
            {/* Beaufort scale segments */}
            {BEAUFORT_SCALE.map((scale, index) => {
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
              const nextScale = BEAUFORT_SCALE[index + 1]
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
                width = 100 - left
              }
              
              return (
                <div
                  key={scale.force}
                  className="absolute h-full"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: scale.color,
                  }}
                />
              )
            })}
            
            {/* Range track */}
            <div
              className="absolute top-1/2 left-0 h-2 bg-blue-500 opacity-60 rounded transform -translate-y-1/2"
              style={{
                left: `${Math.min(currentPos, 100)}%`,
                width: `${Math.max(gustPos - currentPos, 2)}%`,
              }}
            />
            
            {/* Current wind thumb */}
            <div
              className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-lg z-20"
              style={{ left: `${Math.min(currentPos, 100)}%` }}
            />
            
            {/* Gust thumb */}
            <div
              className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-red-600 border-2 border-white rounded-full shadow-lg z-20"
              style={{ left: `${Math.min(gustPos, 100)}%` }}
            />
          </div>
        </div>
        
        {/* Scale Labels */}
        <div className="flex justify-between text-xs text-gray-600">
          <span>0</span>
          <span>10</span>
          <span>20</span>
          <span>30</span>
          <span>40</span>
          <span>48</span>
          <span className="text-red-600 font-semibold">64+</span>
        </div>

        {/* Legend Variants */}
        {legendVariant === 1 && (
          <div className="flex flex-wrap gap-1 justify-center">
            {BEAUFORT_SCALE.map((scale) => (
              <div 
                key={scale.force}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                style={{ backgroundColor: scale.color }}
                title={`Force ${scale.force}: ${scale.description}`}
              >
                <div className="w-2 h-2 rounded-full border border-white" style={{ backgroundColor: scale.color }}></div>
                <span style={{ color: scale.textColor }} className="font-semibold">{scale.force}</span>
              </div>
            ))}
          </div>
        )}

        {legendVariant === 2 && (
          <div className="flex flex-wrap gap-0.5 justify-center">
            {BEAUFORT_SCALE.map((scale) => (
              <div 
                key={scale.force}
                className="flex flex-col items-center px-1 py-0.5 rounded text-[9px]"
                style={{ backgroundColor: scale.color }}
                title={`Force ${scale.force}: ${scale.description}`}
              >
                <span style={{ color: scale.textColor }} className="font-bold">{scale.force}</span>
                <div className="w-2 h-2 rounded-full border border-white" style={{ backgroundColor: scale.color }}></div>
              </div>
            ))}
          </div>
        )}

        {legendVariant === 3 && (
          <div className="flex items-center gap-1 justify-center text-[10px]">
            {BEAUFORT_SCALE.map((scale) => (
              <div 
                key={scale.force}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                style={{ backgroundColor: scale.color }}
                title={`Force ${scale.force}: ${scale.description}`}
              >
                <span style={{ color: scale.textColor }} className="font-semibold">{scale.force}</span>
                <span style={{ color: scale.textColor }} className="hidden sm:inline">{scale.description.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        )}

        {legendVariant === 4 && (
          <div className="flex items-center justify-between text-[9px] px-1">
            {BEAUFORT_SCALE.map((scale) => (
              <div 
                key={scale.force}
                className="flex flex-col items-center"
                title={`Force ${scale.force}: ${scale.description}`}
              >
                <div className="w-3 h-3 rounded-full border border-gray-300 mb-0.5" style={{ backgroundColor: scale.color }}></div>
                <span style={{ color: scale.textColor }} className="font-semibold">{scale.force}</span>
              </div>
            ))}
          </div>
        )}

        {legendVariant === 5 && (
          <div className="flex flex-wrap gap-0.5 justify-center">
            {BEAUFORT_SCALE.map((scale) => (
              <div 
                key={scale.force}
                className="flex flex-col items-center py-1 px-1 rounded text-[9px]"
                style={{ backgroundColor: scale.color }}
                title={`Force ${scale.force}: ${scale.description}`}
              >
                <span style={{ color: scale.textColor }} className="font-bold">{scale.force}</span>
                <div className="w-2 h-2 rounded-full border border-white mt-0.5" style={{ backgroundColor: scale.color }}></div>
              </div>
            ))}
          </div>
        )}

        {legendVariant === 6 && (
          <div className="flex items-center gap-0.5 justify-center">
            {BEAUFORT_SCALE.map((scale) => (
              <div 
                key={scale.force}
                className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border border-gray-300"
                style={{ backgroundColor: scale.color, color: scale.textColor }}
                title={`Force ${scale.force}: ${scale.description}`}
              >
                {scale.force}
              </div>
            ))}
          </div>
        )}

        {legendVariant === 7 && (
          <div className="flex items-center gap-1 justify-center text-[10px]">
            <span className="text-gray-600 font-semibold">Force:</span>
            {BEAUFORT_SCALE.map((scale) => (
              <div 
                key={scale.force}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                style={{ backgroundColor: scale.color }}
                title={`Force ${scale.force}: ${scale.description}`}
                onMouseEnter={() => setHoveredForce(scale.force)}
                onMouseLeave={() => setHoveredForce(null)}
              >
                <span style={{ color: scale.textColor }} className="font-semibold">{scale.force}</span>
                {hoveredForce === scale.force && (
                  <span style={{ color: scale.textColor }} className="text-[9px]">{scale.description}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {legendVariant === 8 && (
          <div className="flex items-center justify-center gap-1 text-[9px]">
            {BEAUFORT_SCALE.slice(0, 7).map((scale) => (
              <div 
                key={scale.force}
                className="flex items-center gap-0.5 px-1 py-0.5 rounded"
                style={{ backgroundColor: scale.color }}
                title={`Force ${scale.force}: ${scale.description}`}
              >
                <div className="w-2 h-2 rounded-full border border-white" style={{ backgroundColor: scale.color }}></div>
                <span style={{ color: scale.textColor }} className="font-semibold">{scale.force}</span>
              </div>
            ))}
            <span className="text-gray-500">+</span>
            {BEAUFORT_SCALE.slice(7).map((scale) => (
              <div 
                key={scale.force}
                className="flex items-center gap-0.5 px-1 py-0.5 rounded"
                style={{ backgroundColor: scale.color }}
                title={`Force ${scale.force}: ${scale.description}`}
              >
                <div className="w-2 h-2 rounded-full border border-white" style={{ backgroundColor: scale.color }}></div>
                <span style={{ color: scale.textColor }} className="font-semibold">{scale.force}</span>
              </div>
            ))}
          </div>
        )}

        {legendVariant === 9 && (
          <div className="flex items-center justify-center gap-1 text-[9px]">
            {BEAUFORT_SCALE.map((scale, idx) => (
              <div key={scale.force} className="flex items-center">
                <div 
                  className="flex items-center gap-0.5 px-1 py-0.5 rounded"
                  style={{ backgroundColor: scale.color }}
                  title={`Force ${scale.force}: ${scale.description}`}
                >
                  <span style={{ color: scale.textColor }} className="font-bold">{scale.force}</span>
                </div>
                {idx < BEAUFORT_SCALE.length - 1 && <span className="text-gray-400 mx-0.5">•</span>}
              </div>
            ))}
          </div>
        )}

        {legendVariant === 10 && (
          <div className="flex items-center justify-center gap-1 text-[10px]">
            {BEAUFORT_SCALE.map((scale) => (
              <div 
                key={scale.force}
                className="relative group"
                title={`Force ${scale.force}: ${scale.description} (${scale.minKts}-${scale.maxKts === Infinity ? '∞' : scale.maxKts} kts)`}
              >
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-300 hover:border-blue-500 transition-colors">
                  <div className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: scale.color }}></div>
                  <span className="font-semibold text-gray-700">{scale.force}</span>
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {scale.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-800">Beaufort Scale Integration Options</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
        
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((variant) => (
            <div key={variant} className="border-2 border-blue-300 rounded-lg p-4 bg-white hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Option {variant}</h3>
                <button
                  onClick={() => onSelect(`option${variant}`)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  Select
                </button>
              </div>
              <div className="space-y-2">
                {variant === 1 && <p className="text-sm text-gray-600">Compact horizontal legend with color dots and force numbers</p>}
                {variant === 2 && <p className="text-sm text-gray-600">Vertical stacked legend with force number above color dot</p>}
                {variant === 3 && <p className="text-sm text-gray-600">Horizontal legend with force number and first word of description</p>}
                {variant === 4 && <p className="text-sm text-gray-600">Minimalist dots with force numbers below, evenly spaced</p>}
                {variant === 5 && <p className="text-sm text-gray-600">Grid layout with force number and color dot</p>}
                {variant === 6 && <p className="text-sm text-gray-600">Square boxes with force numbers only, no text</p>}
                {variant === 7 && <p className="text-sm text-gray-600">Interactive legend showing description on hover</p>}
                {variant === 8 && <p className="text-sm text-gray-600">Split layout: common forces (0-6) + separator + high forces (7-12)</p>}
                {variant === 9 && <p className="text-sm text-gray-600">Minimalist with dots and separators between forces</p>}
                {variant === 10 && <p className="text-sm text-gray-600">Hover tooltips with full descriptions and wind ranges</p>}
              </div>
              <div className="mt-4 p-4 bg-gray-50 rounded">
                {renderWindVisualization(variant)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

