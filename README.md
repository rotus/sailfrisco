# ⛵ SailFrisco

> **A comprehensive marine weather and navigation app for San Francisco Bay sailors**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1.7-646CFF.svg)](https://vitejs.dev/)

## 🌊 Overview

SailFrisco is a modern, responsive web application designed specifically for sailors navigating the San Francisco Bay. It provides real-time marine weather data, tide information, and interactive navigation tools to help sailors make informed decisions on the water.

## ✨ Key Features

### 🌬️ **Wind & Waves**
- **Real-time wind data** with speed, direction, and gust information
- **Interactive Beaufort scale** with logarithmic and linear visualization options
- **Dynamic wave height predictions** based on current wind conditions
- **Color-coded severity indicators** for quick assessment
- **Dynamic card titles** showing current conditions at a glance

### 🌊 **Tides & Currents**
- **24-hour rolling tide visualization** with beautiful sine wave graphics
- **Real-time tide state detection** (Ebb/Flood) with directional arrows
- **Interactive tide chart** with "NOW" indicator and data points
- **Next high/low tide countdown** with precise timing
- **12h/24h view toggle** for different planning needs

### 🌡️ **Temperature & Weather**
- **Current temperature** with Celsius/Fahrenheit toggle
- **Weather condition icons** with comprehensive WMO code mapping
- **Humidity, pressure, and visibility** metrics
- **6-hour weather forecast** with hourly predictions
- **Moon phase calculations** for night sailing

### 🗺️ **Navigation Tools**
- **Interactive Bay Area map** with MapLibre GL JS
- **Harbor selection** with automatic weather updates
- **Waypoint planning** with click-to-add functionality
- **Route visualization** with distance calculations
- **Common waypoints** (Alcatraz, Golden Gate Bridge, etc.)

## 🚀 Technology Stack

### Frontend
- **React 18.2.0** with TypeScript for type safety
- **Vite** for lightning-fast development and building
- **Tailwind CSS** for responsive, utility-first styling
- **MapLibre GL JS** for interactive maps
- **React Icons** for weather and navigation icons
- **Vitest** for comprehensive unit testing

### Backend
- **Node.js** with Express.js
- **TypeScript** for type-safe server development
- **Axios** for API integrations
- **LRU Cache** for performance optimization

### APIs & Data Sources
- **Open-Meteo** for marine weather data
- **NOAA Tides and Currents** for tide predictions
- **MapTiler** for satellite and street map tiles

## 🏗️ Project Structure

```
sailfrisco/
├── 📁 web/                    # Frontend React application
│   ├── 📁 src/
│   │   ├── 📄 App.tsx         # Main application component
│   │   ├── 📄 App.test.tsx    # Comprehensive unit tests
│   │   ├── 📄 App.css         # Custom styles and animations
│   │   └── 📄 main.tsx        # Application entry point
│   ├── 📄 package.json        # Frontend dependencies
│   └── 📄 vite.config.ts      # Vite configuration
├── 📁 server/                 # Backend Express server
│   ├── 📁 src/
│   │   ├── 📁 routes/         # API route handlers
│   │   │   ├── 📄 marine.ts   # Weather data endpoint
│   │   │   └── 📄 tides.ts    # Tide data endpoint
│   │   └── 📁 lib/            # Utility functions
│   └── 📄 package.json        # Backend dependencies
└── 📄 README.md              # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/rotus/sailfrisco.git
   cd sailfrisco
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   cd web
   npm install
   
   # Install backend dependencies
   cd ../server
   npm install
   ```

3. **Start the development servers**
   ```bash
   # Terminal 1: Start backend server
   cd server
   npm run dev
   
   # Terminal 2: Start frontend development server
   cd web
   npm run dev
   ```

4. **Open your browser**
   - Frontend: http://localhost:5176
   - Backend API: http://localhost:3001

## 🧪 Testing

The application includes comprehensive unit tests using Vitest and React Testing Library:

```bash
# Run all tests
cd web
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🎨 UI/UX Features

### 📱 **Responsive Design**
- **Mobile-first approach** with collapsible cards
- **Touch-friendly interactions** for on-water use
- **Adaptive layouts** for different screen sizes

### 🎯 **User Experience**
- **Collapsible cards** start minimized for quick overview
- **Dynamic titles** show key metrics without expanding
- **Intuitive navigation** with clear visual hierarchy
- **Real-time updates** with smooth animations

### 🌈 **Visual Design**
- **Color-coded weather data** for instant recognition
- **Beautiful tide visualizations** with sine wave graphics
- **Interactive wind gauges** with Beaufort scale
- **Professional typography** with clear data presentation

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the server directory:

```env
PORT=3001
NODE_ENV=development
```

### API Endpoints
- `GET /api/marine?lat={lat}&lon={lon}` - Marine weather data
- `GET /api/tides?station={station}` - Tide predictions
- `GET /api/marine/clear-cache` - Clear weather cache

## 🚢 Harbor Support

Currently supported harbors:
- 🏖️ **Sausalito** - North Bay
- 🌉 **San Francisco** - Central Bay
- 🏭 **Berkeley** - East Bay
- 🏝️ **Alameda** - South Bay
- 🏗️ **Richmond** - North Bay

## 📊 Data Sources

### Weather Data
- **Wind speed & direction** from Open-Meteo
- **Temperature & humidity** with real-time updates
- **Pressure & visibility** for sailing conditions
- **Weather codes** for condition descriptions

### Tide Data
- **NOAA Tides and Currents** for accurate predictions
- **High/Low tide times** with precise timing
- **Tide heights** in feet above MLLW
- **24-hour rolling dataset** for planning

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **NOAA** for tide and current data
- **Open-Meteo** for weather data
- **MapTiler** for map tiles
- **React Icons** for beautiful icons
- **Tailwind CSS** for utility-first styling

## 📞 Support

For support, feature requests, or bug reports, please:
- Open an issue on GitHub
- Contact the development team
- Check the documentation

---

**⚓ Happy Sailing! ⚓**

*Built with ❤️ for the San Francisco Bay sailing community*