import { Router } from 'express';
import axios from 'axios';
import { requireAuth, requireAnyRole } from '../../../middleware/auth.js';
import { validateRequest } from '../../../middleware/validate.js';
import { geocodeReverseValidator, geocodeSearchValidator } from '../../../validators/match.validators.js';
import { mapNominatimPlace, NOMINATIM_BASE_URL } from './shared.js';

const GEOCODE_CACHE_TTL_MS = 5 * 60 * 1000;
const geocodeCache = new Map();

function getCache(cacheKey) {
  const entry = geocodeCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt < Date.now()) {
    geocodeCache.delete(cacheKey);
    return null;
  }

  return entry.value;
}

function setCache(cacheKey, value) {
  geocodeCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS
  });
}

const router = Router();

router.get(
  '/geocode/search',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  geocodeSearchValidator,
  validateRequest,
  async (req, res) => {
    try {
      const queryText = String(req.query.q || '').trim();
      const limit = req.query.limit ? Number(req.query.limit) : 8;
      const cacheKey = `search:${queryText.toLowerCase()}:${limit}`;
      const cached = getCache(cacheKey);

      if (cached) {
        return res.json(cached);
      }

      const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
        params: {
          q: queryText,
          format: 'jsonv2',
          addressdetails: 1,
          limit
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'BallerLeague/1.0 (venue-search)'
        }
      });

      const data = Array.isArray(response.data) ? response.data.map(mapNominatimPlace) : [];
      setCache(cacheKey, data);
      return res.json(data);
    } catch (error) {
      return res.status(502).json({
        message: 'Failed to search venues via geocoding provider',
        error: error.message
      });
    }
  }
);

router.get(
  '/geocode/reverse',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  geocodeReverseValidator,
  validateRequest,
  async (req, res) => {
    try {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      const cacheKey = `reverse:${lat.toFixed(6)}:${lon.toFixed(6)}`;
      const cached = getCache(cacheKey);

      if (cached) {
        return res.json(cached);
      }

      const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
        params: {
          lat,
          lon,
          format: 'jsonv2',
          addressdetails: 1
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'BallerLeague/1.0 (venue-reverse-geocode)'
        }
      });

      const result = mapNominatimPlace(response.data || {});
      setCache(cacheKey, result);
      return res.json(result);
    } catch (error) {
      return res.status(502).json({
        message: 'Failed to reverse geocode location',
        error: error.message
      });
    }
  }
);

export default router;
