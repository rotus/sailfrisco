import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { buildKey, cache } from '../lib/cache.js';

const router = Router();

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

router.get('/marine', async (req: Request, res: Response) => {
  const parse = QuerySchema.safeParse(req.query);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid query', details: parse.error.flatten() });
  }

  const { lat, lon } = parse.data;
  const key = buildKey('marine', { lat, lon });
  const cached = cache.get(key);
  if (cached) return res.json({ cached: true, data: cached });

  try {
    const url = 'https://api.open-meteo.com/v1/forecast';
    const params = {
      latitude: lat,
      longitude: lon,
      hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m',
      timezone: 'auto',
    } as const;

    const { data } = await axios.get(url, { params });

    const i = 0;
    const normalized = {
      lat,
      lon,
      updatedAt: data.hourly?.time?.[i] ?? null,
      windSpeedKts: data.hourly?.wind_speed_10m?.[i] ?? null,
      windGustKts: data.hourly?.wind_gusts_10m?.[i] ?? null,
      windDirectionDeg: data.hourly?.wind_direction_10m?.[i] ?? null,
      waveHeightM: null,
      units: {
        windSpeed: data.hourly_units?.wind_speed_10m ?? null,
        windGust: data.hourly_units?.wind_gusts_10m ?? null,
        windDirection: data.hourly_units?.wind_direction_10m ?? null,
        waveHeight: null,
      },
      raw: undefined,
    };

    cache.set(key, normalized);
    res.json({ cached: false, data: normalized });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch marine data' });
  }
});

export default router;


