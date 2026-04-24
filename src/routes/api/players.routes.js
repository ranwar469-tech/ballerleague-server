import { Router } from 'express';
import { requireAuth, requireAnyRole } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import { createPlayerValidator, playerIdParamValidator, updatePlayerValidator } from '../../validators/player.validators.js';
import { Player } from '../../models/player.model.js';

const router = Router();

router.get('/', async (req, res) => {
  const players = await Player.find({}, { _id: 0 }).sort({ id: 1 });
  return res.json(players);
});

router.post('/', requireAuth, requireAnyRole('league_admin', 'system_admin'), createPlayerValidator, validateRequest, async (req, res) => {
  const last = await Player.findOne().sort({ id: -1 }).select('id');
  const nextMongoId = last ? Number(last.id) + 1 : 1;

  const player = await Player.create({
    id: nextMongoId,
    name: req.body.name,
    team_id: req.body.team_id ? Number(req.body.team_id) : null,
    season_id: req.body.season_id ? Number(req.body.season_id) : null,
    position: req.body.position ?? '',
    number: Number(req.body.number ?? 0),
    nationality: req.body.nationality ?? '',
    avatar: req.body.avatar ?? '',
    apps: Number(req.body.apps ?? 0),
    goals: Number(req.body.goals ?? 0),
    assists: Number(req.body.assists ?? 0),
    rating: Number(req.body.rating ?? 0)
  });

  return res.status(201).json({
    id: player.id,
    name: player.name,
    team_id: player.team_id,
    season_id: player.season_id,
    position: player.position,
    number: player.number,
    nationality: player.nationality,
    avatar: player.avatar,
    apps: player.apps,
    goals: player.goals,
    assists: player.assists,
    rating: player.rating
  });
});

router.patch(
  '/:id',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  updatePlayerValidator,
  validateRequest,
  async (req, res) => {
    const playerId = Number(req.params.id);
    const updates = {};

    if (typeof req.body.name === 'string') {
      updates.name = req.body.name.trim();
    }

    if (typeof req.body.position === 'string') {
      updates.position = req.body.position.trim();
    }

    if (typeof req.body.number !== 'undefined') {
      updates.number = Number(req.body.number);
    }

    if (typeof req.body.nationality === 'string') {
      updates.nationality = req.body.nationality.trim();
    }

    if (typeof req.body.avatar === 'string') {
      updates.avatar = req.body.avatar.trim();
    }

    if (typeof req.body.team_id !== 'undefined') {
      updates.team_id = req.body.team_id === null ? null : Number(req.body.team_id);
    }

    if (typeof req.body.season_id !== 'undefined') {
      updates.season_id = req.body.season_id === null ? null : Number(req.body.season_id);
    }

    const player = await Player.findOneAndUpdate({ id: playerId }, updates, { new: true, projection: { _id: 0 } });
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    return res.json(player);
  }
);

router.delete(
  '/:id',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  playerIdParamValidator,
  validateRequest,
  async (req, res) => {
    const playerId = Number(req.params.id);
    const deleted = await Player.findOneAndDelete({ id: playerId }, { projection: { _id: 0 } });

    if (!deleted) {
      return res.status(404).json({ message: 'Player not found' });
    }

    return res.json({ success: true });
  }
);

export default router;
