import { useState } from 'react'

// Beaufort Wind Scale data (same as App.tsx)
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

// Calculate segment boundaries
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
      width = 100 - left
    }
    
    return { scale, left, width, center: left + (width / 2) }
  })
}

type BeaufortHeaderOptionsProps = {
  onSelect: (optionName: string) => void
  onClose: () => void
}

export default function BeaufortHeaderOptions({ onSelect, onClose }: BeaufortHeaderOptionsProps) {
  const segments = calculateSegmentBoundaries()
  const currentPos = calculatePosition(sampleWind)
  const gustPos = calculatePosition(sampleGust)

  const renderVisualization = (headerVariant: number) => {
    return (
      <div className={headerVariant === 2 || headerVariant === 7 || headerVariant === 9 ? '' : 'space-y-2'}>
        {/* Header row above scale */}
        {headerVariant === 1 && (
          <div className="relative h-8 bg-gray-50 rounded border border-gray-200">
            {segments.map(({ scale, left, width, center }) => (
              <div
                key={scale.force}
                className="absolute top-0 h-full flex items-center justify-center"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  borderRight: '1px solid rgba(0,0,0,0.1)',
                }}
                title={`Force ${scale.force}: ${scale.description}`}
              >
                <div className="flex items-center gap-1 text-[10px]">
                  <span style={{ color: scale.textColor }} className="font-semibold">{scale.force}</span>
                  <span style={{ color: scale.textColor }} className="hidden sm:inline">{scale.description.split(' ')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {headerVariant === 2 && (
          <div className="relative h-8 bg-gray-50 border-l border-r border-t border-gray-200">
            {segments.map(({ scale, left, width }) => (
              <div
                key={scale.force}
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
        )}

        {headerVariant === 3 && (
          <div className="relative h-8 bg-white rounded border border-gray-300">
            {segments.map(({ scale, left, width, center }) => (
              <div
                key={scale.force}
                className="absolute top-0 h-full"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  borderRight: '1px solid #e5e7eb',
                }}
              >
                <div className="h-1/2 flex items-center justify-center border-b border-gray-200" style={{ backgroundColor: scale.color }}>
                  <span style={{ color: scale.textColor }} className="text-[10px] font-bold">{scale.force}</span>
                </div>
                <div className="h-1/2 flex items-center justify-center">
                  {width > 3 && (
                    <span className="text-[9px] text-gray-600">{scale.description.split(' ')[0]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {headerVariant === 4 && (
          <div className="relative h-6 bg-gray-50 rounded-t border border-gray-200 border-b-0">
            {segments.map(({ scale, left, width }) => (
              <div
                key={scale.force}
                className="absolute top-0 h-full flex items-center justify-center"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
              >
                <div 
                  className="w-full h-full flex items-center justify-center border-r border-gray-300"
                  style={{ backgroundColor: scale.color }}
                  title={`Force ${scale.force}: ${scale.description}`}
                >
                  <span style={{ color: scale.textColor }} className="text-[10px] font-semibold">{scale.force}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {headerVariant === 5 && (
          <div className="relative h-7 bg-white rounded border border-gray-200">
            {segments.map(({ scale, left, width }) => (
              <div
                key={scale.force}
                className="absolute top-0 h-full flex items-center justify-center border-r border-gray-200"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
                title={`Force ${scale.force}: ${scale.description}`}
              >
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full border border-gray-300" style={{ backgroundColor: scale.color }}></div>
                  <span className="text-[10px] font-semibold text-gray-700">{scale.force}</span>
                  {width > 4 && (
                    <span className="text-[9px] text-gray-600">{scale.description.split(' ')[0]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {headerVariant === 6 && (
          <div className="relative h-8 bg-gradient-to-b from-gray-50 to-white rounded border border-gray-200">
            {segments.map(({ scale, left, width }) => (
              <div
                key={scale.force}
                className="absolute top-0 h-full flex flex-col items-center justify-center border-r border-gray-200"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
                title={`Force ${scale.force}: ${scale.description}`}
              >
                <div className="w-3 h-1 rounded" style={{ backgroundColor: scale.color }}></div>
                <span className="text-[10px] font-bold text-gray-700 mt-0.5">{scale.force}</span>
              </div>
            ))}
          </div>
        )}

        {headerVariant === 7 && (
          <div className="relative h-8 bg-white border-l border-r border-t border-gray-200">
            {segments.map(({ scale, left, width }) => (
              <div
                key={scale.force}
                className="absolute top-0 h-full flex items-center justify-center border-r border-gray-200"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: scale.color,
                  opacity: 0.3,
                }}
                title={`Force ${scale.force}: ${scale.description}`}
              >
                <span style={{ color: scale.textColor }} className="text-[11px] font-bold">{scale.force}</span>
              </div>
            ))}
            {segments.map(({ scale, left, width, center }) => (
              <div
                key={`label-${scale.force}`}
                className="absolute top-1/2 transform -translate-y-1/2"
                style={{ left: `${center}%`, transform: 'translate(-50%, -50%)' }}
              >
                <span className="text-[9px] font-semibold text-gray-700">{scale.description.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        )}

        {headerVariant === 8 && (
          <div className="relative h-7 bg-gray-50 rounded border border-gray-200">
            {segments.map(({ scale, left, width }) => (
              <div
                key={scale.force}
                className="absolute top-0 h-full flex items-center justify-center"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  borderRight: '1px solid #d1d5db',
                }}
                title={`Force ${scale.force}: ${scale.description}`}
              >
                <div className="text-center">
                  <div className="text-[10px] font-bold text-gray-800">{scale.force}</div>
                  {width > 3 && (
                    <div className="text-[8px] text-gray-600 leading-tight">{scale.description.split(' ')[0]}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {headerVariant === 9 && (
          <div className="relative h-8 bg-white border-l-2 border-r-2 border-t-2 border-gray-300">
            {segments.map(({ scale, left, width }) => (
              <div
                key={scale.force}
                className="absolute top-0 h-full flex items-center justify-center border-r-2 border-gray-300"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: scale.color,
                  opacity: 0.4,
                }}
                title={`Force ${scale.force}: ${scale.description}`}
              >
                <div className="flex items-center gap-1">
                  <span style={{ color: scale.textColor }} className="text-[11px] font-bold">{scale.force}</span>
                  {width > 5 && (
                    <span style={{ color: scale.textColor }} className="text-[9px]">{scale.description.split(' ')[0]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {headerVariant === 10 && (
          <div className="relative h-9 bg-white rounded-t-lg border border-gray-200 border-b-0">
            <div className="absolute inset-0 flex">
              {segments.map(({ scale, left, width }) => (
                <div
                  key={scale.force}
                  className="flex flex-col border-r border-gray-200"
                  style={{
                    width: `${width}%`,
                  }}
                  title={`Force ${scale.force}: ${scale.description}`}
                >
                  <div className="h-1/2 flex items-center justify-center" style={{ backgroundColor: scale.color }}>
                    <span style={{ color: scale.textColor }} className="text-[10px] font-bold">{scale.force}</span>
                  </div>
                  <div className="h-1/2 flex items-center justify-center bg-gray-50">
                    {width > 3 && (
                      <span className="text-[9px] text-gray-700">{scale.description.split(' ')[0]}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wind Range Slider below header */}
          <div className="relative h-16 bg-gray-100 border-l border-r border-b border-gray-200 p-2">
            <div className="absolute inset-2 rounded">
              {/* Beaufort scale segments - filter out Force 0 */}
              {segments.map(({ scale, left, width }) => (
              <div
                key={scale.force}
                className="absolute h-full"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: scale.color,
                }}
              />
            ))}
            
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
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-800">Beaufort Scale Header Options</h2>
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
                  onClick={() => onSelect(`header${variant}`)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  Select
                </button>
              </div>
              <div className="space-y-2 mb-4">
                {variant === 1 && <p className="text-sm text-gray-600">Simple header row with force number and first word, light background</p>}
                {variant === 2 && <p className="text-sm text-gray-600">Colored header matching segment colors, vertical layout</p>}
                {variant === 3 && <p className="text-sm text-gray-600">Two-row header: colored top with force, white bottom with description</p>}
                {variant === 4 && <p className="text-sm text-gray-600">Compact colored header matching segments exactly</p>}
                {variant === 5 && <p className="text-sm text-gray-600">Header with color dots, force number and description</p>}
                {variant === 6 && <p className="text-sm text-gray-600">Gradient header with colored bars and force numbers</p>}
                {variant === 7 && <p className="text-sm text-gray-600">Semi-transparent colored background with centered descriptions</p>}
                {variant === 8 && <p className="text-sm text-gray-600">Clean two-line header with force above description</p>}
                {variant === 9 && <p className="text-sm text-gray-600">Bold colored header with higher opacity, matching segments</p>}
                {variant === 10 && <p className="text-sm text-gray-600">Two-tier header: colored top row, gray bottom row</p>}
              </div>
              <div className="p-4 bg-gray-50 rounded">
                {renderVisualization(variant)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

