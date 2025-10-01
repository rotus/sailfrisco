# ⛵ SailFrisco

**Real-time marine weather, tides, and route planning for San Francisco Bay sailors**

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC.svg)](https://tailwindcss.com/)
[![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-3-000000.svg)](https://maplibre.org/)

## 🌊 Overview

SailFrisco is a comprehensive marine weather and navigation application designed specifically for San Francisco Bay sailors. Get real-time weather data, tide predictions, and intelligent route planning with realistic sailing calculations.

## ✨ Key Features

### 🌤️ **Real-Time Weather & Wind**
- **Live wind data** with speed, gusts, and direction
- **Beaufort wind scale** with color-coded visualizations
- **Wave height predictions** based on wind conditions
- **Professional wind gauge** with linear/logarithmic scales
- **Dynamic wind icons** with cloud-based design

### 🌊 **Tide Predictions**
- **24-hour tide charts** with sine wave visualizations
- **Current tide state** (ebb/flow) with directional arrows
- **Next high/low tide** times and heights
- **Slack tide indicators** for optimal sailing windows
- **Harbor-specific data** from NOAA CO-OPS stations

### 🌡️ **Temperature & Conditions**
- **Current temperature** with Celsius/Fahrenheit toggle
- **Weather forecasts** with 6-hour predictions
- **Weather icons** for sun, clouds, rain conditions
- **Visibility data** in miles with decimal precision
- **Pressure readings** in inHg for practical use

### 🗺️ **Intelligent Route Planning**
- **Realistic sailing calculations** accounting for wind, tacking, and harbor exit times
- **Wind-aware routing** with efficiency calculations
- **Tacking penalties** for upwind sailing
- **Harbor exit times** for motoring through no-wake zones
- **Multiple boat sizes** (20ft, 30ft, 40ft, 50ft) with appropriate hull speeds
- **Interactive waypoints** with click-to-add functionality

### 🎨 **Professional UI/UX**
- **Dark/light mode** with automatic map tile switching
- **Collapsible cards** with dynamic color effects
- **Professional hover effects** with subtle scaling and shadows
- **Consistent color palette** with slate theme
- **Responsive design** optimized for mobile sailing
- **Beautiful sailboat icons** throughout the interface

## 🚀 Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom dark mode
- **Maps**: MapLibre GL JS with MapTiler integration
- **Icons**: Custom SVG icons with professional design
- **Data**: NOAA CO-OPS API for tides, OpenWeatherMap for weather
- **Build**: Vite with TypeScript compilation

## 🏗️ Installation

```bash
# Clone the repository
git clone https://github.com/your-username/sailfrisco.git
cd sailfrisco

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🌊 Marine Data Sources

- **Weather**: OpenWeatherMap API for real-time conditions
- **Tides**: NOAA CO-OPS API for accurate tide predictions
- **Stations**: 
  - San Francisco (9414290)
  - Sausalito (9414806) 
  - Berkeley (9414816)
  - Alameda (9414750)
  - Richmond (9414849)

## ⚓ Sailing Features

### **Realistic Route Calculations**
- Wind angle analysis for sailing efficiency
- Tacking penalties for upwind routes
- Harbor exit times for no-wake zones
- Hull speed calculations by boat size
- Current wind integration for accurate ETAs

### **Professional Visualizations**
- Beaufort wind scale with color coding
- Tide sine wave charts with current indicators
- Temperature gradients with high/low markers
- Interactive maps with waypoint planning

### **Mobile-Optimized**
- Touch-friendly interface for on-deck use
- Dark mode for night sailing
- Responsive design for all screen sizes
- Quick access to critical sailing data

## 🎯 Target Users

- **Recreational sailors** in San Francisco Bay
- **Racing teams** needing weather and tide data
- **Charter captains** planning routes and conditions
- **Marine enthusiasts** tracking Bay conditions

## 🛠️ Development

```bash
# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📱 Mobile Experience

SailFrisco is optimized for mobile use on boats:
- **Touch-friendly controls** for gloved hands
- **Large, readable text** in bright sunlight
- **Quick data access** without complex navigation
- **Offline-capable** with cached data

## 🌟 Future Enhancements

- [ ] **NDBC integration** for real-time buoy data
- [ ] **Current predictions** for ebb/flood speeds
- [ ] **Weather alerts** for changing conditions
- [ ] **Route optimization** with waypoint suggestions
- [ ] **Social features** for sharing conditions

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **NOAA** for tide and marine data
- **OpenWeatherMap** for weather conditions
- **MapTiler** for beautiful map tiles
- **San Francisco Bay sailing community** for feedback and testing

---

**Built with 💙 for Bay Area sailors**

*Sail smarter with data-driven insights*