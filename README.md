## SailFrisco

Monorepo for a Bay Area sailing app.

### Stack
- Server: Node.js, Express, TypeScript, Axios, Zod, dotenv, LRU cache
- Web: React, Vite, Tailwind CSS, TypeScript

### Getting Started

1. Web
   - cd web
   - npm install
   - npm run dev

2. Server
   - cd server
   - npm install
   - Create `.env` (see variables below)
   - npm run dev

### Environment Variables (server/.env)
```
PORT=5174
CACHE_TTL_MS=60000
CACHE_MAX_ITEMS=500
```

### API Endpoints
- GET `/api/marine?lat=..&lon=..`
- GET `/api/tides?station=..`


