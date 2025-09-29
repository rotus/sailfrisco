import { Router } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { buildKey, cache } from '../lib/cache.js';
const router = Router();
// NOAA stations like: 9414290 (SF), 9414750 (Alameda)
const QuerySchema = z.object({
    station: z.string().min(1).default('9414290'), // San Francisco
    product: z.string().default('predictions'),
    time_zone: z.string().default('lst_ldt'),
    units: z.string().default('english'),
    datum: z.string().default('MLLW'),
    interval: z.string().default('hilo'), // High/Low
    range: z.string().default('24'),
});
router.get('/tides', async (req, res) => {
    const parse = QuerySchema.safeParse(req.query);
    if (!parse.success) {
        return res.status(400).json({ error: 'Invalid query', details: parse.error.flatten() });
    }
    const params = parse.data;
    const key = buildKey('tides', params);
    const cached = cache.get(key);
    if (cached)
        return res.json({ cached: true, data: cached });
    try {
        const url = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
        const now = new Date();
        const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const pad = (n) => String(n).padStart(2, '0');
        const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
        const ymdEnd = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}`;
        const merged = {
            format: 'json',
            application: 'sailfrisco',
            product: 'predictions',
            time_zone: 'lst_ldt',
            units: 'english',
            datum: 'MLLW',
            interval: 'hilo',
            begin_date: ymd,
            end_date: ymdEnd,
            station: params.station,
        };
        const { data } = await axios.get(url, { params: merged });
        const predictions = data?.predictions ?? [];
        const now2 = new Date();
        const upcoming = predictions
            .map((p) => ({
            time: p.t,
            valueFt: Number(p.v),
            type: p.type === 'H' ? 'High' : p.type === 'L' ? 'Low' : undefined,
        }))
            .filter((p) => new Date(p.time).getTime() >= now2.getTime() - 5 * 60 * 1000);
        const normalized = {
            station: params.station,
            upcoming,
            rawCount: predictions.length,
        };
        cache.set(key, normalized);
        res.json({ cached: false, data: normalized });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch tides data' });
    }
});
export default router;
//# sourceMappingURL=tides.js.map