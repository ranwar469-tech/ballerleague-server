import { Router } from 'express';
import geocodeRoutes from './matches/geocode.routes.js';
import statsRoutes from './matches/stats.routes.js';
import fixturesRoutes from './matches/fixtures.routes.js';

const router = Router();

router.use(geocodeRoutes);
router.use(statsRoutes);
router.use(fixturesRoutes);

export default router;
