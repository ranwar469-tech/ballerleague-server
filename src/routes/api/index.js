import { Router } from 'express';
import authRoutes from './auth.routes.js';
import leaguesRoutes from './leagues.routes.js';
import seasonsRoutes from './seasons.routes.js';
import teamsRoutes from './teams.routes.js';
import playersRoutes from './players.routes.js';
import matchesRoutes from './matches.routes.js';
import emailSubscriptionsRoutes from './email-subscriptions.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/leagues', leaguesRoutes);
router.use('/seasons', seasonsRoutes);
router.use('/teams', teamsRoutes);
router.use('/players', playersRoutes);
router.use('/matches', matchesRoutes);
router.use('/email-subscriptions', emailSubscriptionsRoutes);

export default router;
