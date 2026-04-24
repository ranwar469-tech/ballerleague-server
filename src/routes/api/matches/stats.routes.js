import { Router } from 'express';
import { Match } from '../../../models/match.model.js';
import { Team } from '../../../models/team.model.js';
import { Player } from '../../../models/player.model.js';
import { validateRequest } from '../../../middleware/validate.js';
import { standingsQueryValidator, topScorersQueryValidator } from '../../../validators/match.validators.js';
import {
  buildTeamNameMap,
  computePlayerStatsFromMatches,
  getTeamIdsForStandings,
  toStandingsRows
} from './shared.js';

const router = Router();

router.get('/standings', standingsQueryValidator, validateRequest, async (req, res) => {
  const seasonId = req.query.season_id ? Number(req.query.season_id) : null;
  const matchFilter = seasonId ? { season_id: seasonId } : {};
  const matches = await Match.find(matchFilter, { _id: 0 }).lean();
  const teamIds = await getTeamIdsForStandings(matches, seasonId);

  const rows = toStandingsRows(matches, teamIds);
  const teams = await Team.find({ id: { $in: teamIds } }, { _id: 0, id: 1, name: 1 }).lean();
  const teamNameMap = buildTeamNameMap(teams);

  const sorted = rows
    .map((row) => ({
      ...row,
      team_name: teamNameMap.get(row.team_id) || `Team ${row.team_id}`
    }))
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team_name.localeCompare(b.team_name);
    })
    .map((row, index) => ({ ...row, pos: index + 1 }));

  return res.json(sorted);
});

router.get('/player-stats', topScorersQueryValidator, validateRequest, async (req, res) => {
  const seasonId = req.query.season_id ? Number(req.query.season_id) : null;
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const matchFilter = seasonId ? { season_id: seasonId, status: 'completed' } : { status: 'completed' };
  const matches = await Match.find(matchFilter, { _id: 0 }).lean();
  const statsByPlayer = computePlayerStatsFromMatches(matches);
  const playerIds = [...statsByPlayer.keys()];

  if (playerIds.length === 0) {
    return res.json([]);
  }

  const players = await Player.find({ id: { $in: playerIds } }, { _id: 0 }).lean();
  const teamIds = [...new Set(players.map((player) => player.team_id).filter(Boolean))];
  const teams = await Team.find({ id: { $in: teamIds } }, { _id: 0, id: 1, name: 1 }).lean();
  const teamNameMap = buildTeamNameMap(teams);

  const rows = players
    .map((player) => {
      const stats = statsByPlayer.get(player.id) || { goals: 0, assists: 0, matchIds: new Set() };
      return {
        player_id: player.id,
        name: player.name,
        team_id: player.team_id,
        team_name: player.team_id ? teamNameMap.get(player.team_id) || `Team ${player.team_id}` : 'Unknown Team',
        position: player.position,
        apps: stats.matchIds.size,
        goals: stats.goals,
        assists: stats.assists,
        rating: player.rating || 0
      };
    })
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);

  return res.json(rows);
});

router.get('/top-scorers', topScorersQueryValidator, validateRequest, async (req, res) => {
  const seasonId = req.query.season_id ? Number(req.query.season_id) : null;
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const matchFilter = seasonId ? { season_id: seasonId, status: 'completed' } : { status: 'completed' };
  const matches = await Match.find(matchFilter, { _id: 0 }).lean();
  const statsByPlayer = computePlayerStatsFromMatches(matches);
  const playerIds = [...statsByPlayer.keys()];

  if (playerIds.length === 0) {
    return res.json([]);
  }

  const players = await Player.find({ id: { $in: playerIds } }, { _id: 0, id: 1, name: 1, team_id: 1 }).lean();
  const teamIds = [...new Set(players.map((player) => player.team_id).filter(Boolean))];
  const teams = await Team.find({ id: { $in: teamIds } }, { _id: 0, id: 1, name: 1 }).lean();
  const teamNameMap = buildTeamNameMap(teams);

  const rows = players
    .map((player) => {
      const stats = statsByPlayer.get(player.id) || { goals: 0, assists: 0, matchIds: new Set() };
      return {
        player_id: player.id,
        name: player.name,
        team_name: player.team_id ? teamNameMap.get(player.team_id) || `Team ${player.team_id}` : 'Unknown Team',
        goals: stats.goals
      };
    })
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return res.json(rows);
});

export default router;
