import { Router } from 'express';
import { requireAuth, requireAnyRole } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import { createSeasonValidator, assignTeamToSeasonValidator } from '../../validators/season.validators.js';
import { League } from '../../models/league.model.js';
import { Season } from '../../models/season.model.js';
import { SeasonTeam } from '../../models/season-team.model.js';
import { Team } from '../../models/team.model.js';
import { Player } from '../../models/player.model.js';

const router = Router();

router.get('/', async (req, res) => {
  const seasons = await Season.find({}, { _id: 0 }).sort({ id: 1 }).lean();
  const leagueIds = [...new Set(seasons.map((season) => season.league_id))];
  const leagues = await League.find({ id: { $in: leagueIds } }, { _id: 0, id: 1, name: 1 }).lean();
  const leagueMap = new Map(leagues.map((league) => [league.id, league.name]));

  const payload = seasons.map((season) => ({
    ...season,
    league_name: leagueMap.get(season.league_id) ?? 'Unknown League'
  }));

  res.json(payload);
});

router.post(
  '/',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  createSeasonValidator,
  validateRequest,
  async (req, res) => {
  const leagueId = Number(req.body.league_id);
  const league = await League.findOne({ id: leagueId }).select('id');

  if (!league) {
    return res.status(404).json({ message: 'League not found' });
  }

  const last = await Season.findOne().sort({ id: -1 }).select('id');
  const nextSeasonId = last ? Number(last.id) + 1 : 1;

  const season = await Season.create({
    id: nextSeasonId,
    league_id: Number(req.body.league_id),
    name: req.body.name,
    start_date: req.body.start_date ?? '',
    end_date: req.body.end_date ?? ''
  });

  res.status(201).json({
    id: season.id,
    league_id: season.league_id,
    name: season.name,
    start_date: season.start_date,
    end_date: season.end_date
  });
  }
);

router.post(
  '/:id/teams',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  assignTeamToSeasonValidator,
  validateRequest,
  async (req, res) => {
  const seasonId = Number(req.params.id);
  const teamId = Number(req.body.team_id);

  const [season, team] = await Promise.all([
    Season.findOne({ id: seasonId }).select('id'),
    Team.findOne({ id: teamId }).select('id')
  ]);

  if (!season) {
    return res.status(404).json({ message: 'Season not found' });
  }

  if (!team) {
    return res.status(404).json({ message: 'Team not found' });
  }

  const exists = await SeasonTeam.exists({ season_id: seasonId, team_id: teamId });
  if (exists) {
    return res.status(409).json({ message: 'Team already assigned to this season' });
  }

  await SeasonTeam.create({ season_id: seasonId, team_id: teamId });
  return res.status(201).json({ success: true });
  }
);

router.delete(
  '/:id/teams/:teamId',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  async (req, res) => {
    const seasonId = Number(req.params.id);
    const teamId = Number(req.params.teamId);

    const deleted = await SeasonTeam.findOneAndDelete({ season_id: seasonId, team_id: teamId });
    if (!deleted) {
      return res.status(404).json({ message: 'Season team assignment not found' });
    }

    await Player.updateMany(
      { season_id: seasonId, team_id: teamId },
      { team_id: null, season_id: null }
    );

    return res.json({ success: true });
  }
);

router.get('/:id/teams', async (req, res) => {
  const seasonId = Number(req.params.id);
  const assignments = await SeasonTeam.find({ season_id: seasonId }, { _id: 0, team_id: 1 }).lean();
  const teamIds = assignments.map((item) => item.team_id);
  const teams = await Team.find({ id: { $in: teamIds } }, { _id: 0 }).sort({ id: 1 });

  res.json(teams);
});

export default router;
