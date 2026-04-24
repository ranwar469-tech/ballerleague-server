import { Router } from 'express';
import { requireAuth, requireAnyRole } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import { createLeagueValidator } from '../../validators/league.validators.js';
import { League } from '../../models/league.model.js';

const router = Router();

router.get('/', async (req, res) => {
  const leagues = await League.find({}, { _id: 0 }).sort({ id: 1 });
  res.json(leagues);
});

router.post('/', requireAuth, requireAnyRole('league_admin', 'system_admin'), createLeagueValidator, validateRequest, async (req, res) => {
  const last = await League.findOne().sort({ id: -1 }).select('id');
  const nextLeagueId = last ? Number(last.id) + 1 : 1;

  const league = await League.create({
    id: nextLeagueId,
    name: req.body.name,
    country: req.body.country ?? '',
    logo: req.body.logo ?? ''
  });

  res.status(201).json({
    id: league.id,
    name: league.name,
    country: league.country,
    logo: league.logo
  });
});

export default router;
