import { Router } from 'express';
import { requireAuth, requireAnyRole } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  createTeamValidator,
  assignPlayerToTeamValidator,
  listTeamPlayersValidator,
  teamIdParamValidator,
  updateTeamValidator
} from '../../validators/team.validators.js';
import { Team } from '../../models/team.model.js';
import { Player } from '../../models/player.model.js';
import { SeasonTeam } from '../../models/season-team.model.js';

const router = Router();

router.get('/', async (req, res) => {
  const teams = await Team.find({}, { _id: 0 }).sort({ id: 1 });
  return res.json(teams);
});

router.delete(
  '/:id/players/:playerId',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  async (req, res) => {
    const teamId = Number(req.params.id);
    const playerId = Number(req.params.playerId);
    const seasonId = req.query.season_id ? Number(req.query.season_id) : null;

    if (!seasonId) {
      return res.status(400).json({ message: 'season_id is required to remove a player from a roster' });
    }

    const updatedPlayer = await Player.findOneAndUpdate(
      { id: playerId, team_id: teamId, season_id: seasonId },
      { team_id: null, season_id: null },
      { new: true, projection: { _id: 0 } }
    );

    if (!updatedPlayer) {
      return res.status(404).json({ message: 'Player roster assignment not found' });
    }

    return res.json({ success: true });
  }
);

router.post('/', requireAuth, requireAnyRole('league_admin', 'system_admin'), createTeamValidator, validateRequest, async (req, res) => {
  const last = await Team.findOne().sort({ id: -1 }).select('id');
  const nextMongoId = last ? Number(last.id) + 1 : 1;

  const team = await Team.create({
    id: nextMongoId,
    name: req.body.name,
    stadium: req.body.stadium ?? '',
    city: req.body.city ?? '',
    logo: req.body.logo ?? ''
  });

  return res.status(201).json({
    id: team.id,
    name: team.name,
    stadium: team.stadium,
    city: team.city,
    logo: team.logo
  });
});

router.patch(
  '/:id',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  updateTeamValidator,
  validateRequest,
  async (req, res) => {
    const teamId = Number(req.params.id);
    const updates = {};

    if (typeof req.body.name === 'string') {
      updates.name = req.body.name.trim();
    }

    if (typeof req.body.stadium === 'string') {
      updates.stadium = req.body.stadium.trim();
    }

    if (typeof req.body.city === 'string') {
      updates.city = req.body.city.trim();
    }

    if (typeof req.body.logo === 'string') {
      updates.logo = req.body.logo.trim();
    }

    const team = await Team.findOneAndUpdate({ id: teamId }, updates, { new: true, projection: { _id: 0 } });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    return res.json(team);
  }
);

router.delete(
  '/:id',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  teamIdParamValidator,
  validateRequest,
  async (req, res) => {
    const teamId = Number(req.params.id);

    const deletedTeam = await Team.findOneAndDelete({ id: teamId }, { projection: { _id: 0 } });
    if (!deletedTeam) {
      return res.status(404).json({ message: 'Team not found' });
    }

    await Promise.all([
      SeasonTeam.deleteMany({ team_id: teamId }),
      Player.updateMany({ team_id: teamId }, { team_id: null, season_id: null })
    ]);

    return res.json({ success: true });
  }
);

router.post(
  '/:id/players',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  assignPlayerToTeamValidator,
  validateRequest,
  async (req, res) => {
  const teamId = Number(req.params.id);
  const playerId = Number(req.body.player_id);
  const seasonId = Number(req.body.season_id);

  const team = await Team.findOne({ id: teamId });
  if (!team) {
    return res.status(404).json({ message: 'Team not found' });
  }

  const player = await Player.findOneAndUpdate(
    { id: playerId },
    { team_id: teamId, season_id: seasonId },
    { new: true, projection: { _id: 0 } }
  );

  if (!player) {
    return res.status(404).json({ message: 'Player not found' });
  }

  return res.status(201).json({
    success: true,
    team_id: Number(req.params.id),
    player_id: Number(req.body.player_id),
    season_id: Number(req.body.season_id)
  });
  }
);

router.get('/:id/players', listTeamPlayersValidator, validateRequest, async (req, res) => {
  const teamId = Number(req.params.id);
  const seasonId = req.query.season_id ? Number(req.query.season_id) : null;

  const filter = {
    team_id: teamId
  };

  if (seasonId) {
    filter.season_id = seasonId;
  }

  const players = await Player.find(filter, { _id: 0 }).sort({ id: 1 });
  return res.json(players);
});

export default router;
