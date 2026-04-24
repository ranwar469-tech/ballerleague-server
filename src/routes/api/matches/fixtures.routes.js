import { Router } from 'express';
import { requireAuth, requireAnyRole } from '../../../middleware/auth.js';
import { validateRequest } from '../../../middleware/validate.js';
import { Match } from '../../../models/match.model.js';
import { Team } from '../../../models/team.model.js';
import { Season } from '../../../models/season.model.js';
import { Player } from '../../../models/player.model.js';
import {
  createManualMatchValidator,
  matchIdParamValidator,
  publishMatchValidator,
  publishScheduleValidator,
  recordGoalEventValidator,
  recordMatchResultValidator,
  updateGoalAssistValidator,
  updateMatchScheduleValidator,
  updateMatchStatusValidator
} from '../../../validators/match.validators.js';
import { enrichMatches, normalizeVenuePayload, recomputeAndPersistPlayerStatsForSeason } from './shared.js';
import { notifyMatchCreated, notifyMatchDeleted, notifyMatchUpdated } from '../../../services/email-notifications.service.js';

const router = Router();

router.get('/admin/all', requireAuth, requireAnyRole('league_admin', 'system_admin'), async (req, res) => {
  const seasonId = req.query.season_id ? Number(req.query.season_id) : null;
  const filter = seasonId ? { season_id: seasonId } : {};
  const matches = await Match.find(filter, { _id: 0 }).sort({ kickoff_at: 1 });
  const enriched = await enrichMatches(matches);
  res.json(enriched);
});

router.get('/upcoming', async (req, res) => {
  const now = new Date();
  const seasonId = req.query.season_id ? Number(req.query.season_id) : null;
  const filter = {
    published: true,
    status: { $in: ['scheduled', 'postponed'] },
    kickoff_at: { $gte: now }
  };

  if (seasonId) {
    filter.season_id = seasonId;
  }

  const matches = await Match.find(filter, { _id: 0 }).sort({ kickoff_at: 1 });
  const enriched = await enrichMatches(matches);
  res.json(enriched);
});

router.get('/past', async (req, res) => {
  const now = new Date();
  const seasonId = req.query.season_id ? Number(req.query.season_id) : null;
  const filter = {
    published: true,
    $or: [{ kickoff_at: { $lt: now } }, { status: { $in: ['completed', 'cancelled'] } }]
  };

  if (seasonId) {
    filter.season_id = seasonId;
  }

  const matches = await Match.find(filter, { _id: 0 }).sort({ kickoff_at: -1 });
  const enriched = await enrichMatches(matches);
  res.json(enriched);
});

router.get('/:id', matchIdParamValidator, validateRequest, async (req, res) => {
  const matchId = Number(req.params.id);
  const match = await Match.findOne({ id: matchId }, { _id: 0 });

  if (!match) {
    return res.status(404).json({ message: 'Match not found' });
  }

  const [enriched] = await enrichMatches([match]);
  return res.json(enriched);
});

router.post(
  '/manual',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  createManualMatchValidator,
  validateRequest,
  async (req, res) => {
    const seasonId = Number(req.body.season_id);
    const homeTeamId = Number(req.body.home_team_id);
    const awayTeamId = Number(req.body.away_team_id);

    const [season, homeTeam, awayTeam] = await Promise.all([
      Season.findOne({ id: seasonId }).select('id'),
      Team.findOne({ id: homeTeamId }).select('id'),
      Team.findOne({ id: awayTeamId }).select('id')
    ]);

    if (!season) {
      return res.status(404).json({ message: 'Season not found' });
    }

    if (!homeTeam || !awayTeam) {
      return res.status(404).json({ message: 'Home or away team not found' });
    }

    const last = await Match.findOne().sort({ id: -1 }).select('id');
    const nextMatchId = last ? Number(last.id) + 1 : 1;

    const normalizedVenue = normalizeVenuePayload(req.body);

    const created = await Match.create({
      id: nextMatchId,
      season_id: seasonId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      venue: normalizedVenue.venue,
      venue_details: normalizedVenue.venue_details,
      kickoff_at: new Date(req.body.kickoff_at),
      published: req.body.published ?? false,
      created_by: req.auth?.sub || null
    });

    const [enriched] = await enrichMatches([created]);
    void notifyMatchCreated(enriched);
    return res.status(201).json(enriched);
  }
);

router.patch(
  '/:id/result',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  recordMatchResultValidator,
  validateRequest,
  async (req, res) => {
    const matchId = Number(req.params.id);
    const updated = await Match.findOneAndUpdate(
      { id: matchId },
      {
        home_score: Number(req.body.home_score),
        away_score: Number(req.body.away_score),
        status: req.body.status || 'completed',
        result_recorded_at: new Date()
      },
      { new: true, projection: { _id: 0 } }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Match not found' });
    }

    await recomputeAndPersistPlayerStatsForSeason(updated.season_id);
    const [enriched] = await enrichMatches([updated]);
    return res.json(enriched);
  }
);

router.patch(
  '/:id/score',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  recordMatchResultValidator,
  validateRequest,
  async (req, res) => {
    const matchId = Number(req.params.id);
    const updated = await Match.findOneAndUpdate(
      { id: matchId },
      {
        home_score: Number(req.body.home_score),
        away_score: Number(req.body.away_score),
        result_recorded_at: new Date()
      },
      { new: true, projection: { _id: 0 } }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const [enriched] = await enrichMatches([updated]);
    void notifyMatchUpdated(enriched);
    return res.json(enriched);
  }
);

router.post(
  '/:id/goals',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  recordGoalEventValidator,
  validateRequest,
  async (req, res) => {
    const matchId = Number(req.params.id);
    const match = await Match.findOne({ id: matchId });

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const teamId = Number(req.body.team_id);
    if (![match.home_team_id, match.away_team_id].includes(teamId)) {
      return res.status(400).json({ message: 'team_id must be one of the two match teams' });
    }

    const scorerPlayerId = Number(req.body.scorer_player_id);
    const assistPlayerId = req.body.assist_player_id ? Number(req.body.assist_player_id) : null;

    const [scorerPlayer, assistPlayer] = await Promise.all([
      Player.findOne({ id: scorerPlayerId }).select('id team_id'),
      assistPlayerId ? Player.findOne({ id: assistPlayerId }).select('id team_id') : null
    ]);

    if (!scorerPlayer) {
      return res.status(404).json({ message: 'Scorer player not found' });
    }

    if (scorerPlayer.team_id !== teamId) {
      return res.status(400).json({ message: 'Scorer player must belong to the scoring team' });
    }

    if (assistPlayerId && (!assistPlayer || assistPlayer.team_id !== teamId)) {
      return res.status(400).json({ message: 'Assist player must exist and belong to the scoring team' });
    }

    const nextGoalId = (match.goal_events || []).reduce((max, item) => Math.max(max, Number(item.id || 0)), 0) + 1;
    const nextGoalEvent = {
      id: nextGoalId,
      minute: Number(req.body.minute),
      team_id: teamId,
      scorer_player_id: scorerPlayerId,
      assist_player_id: assistPlayerId
    };

    match.goal_events = [...(match.goal_events || []), nextGoalEvent].sort((left, right) => {
      const minuteDiff = Number(left.minute) - Number(right.minute);
      if (minuteDiff !== 0) {
        return minuteDiff;
      }

      return Number(left.id) - Number(right.id);
    });
    if (teamId === match.home_team_id) {
      match.home_score = Number(match.home_score || 0) + 1;
    } else {
      match.away_score = Number(match.away_score || 0) + 1;
    }
    match.status = 'completed';
    match.result_recorded_at = new Date();

    await match.save();
    await recomputeAndPersistPlayerStatsForSeason(match.season_id);

    const [enriched] = await enrichMatches([match]);
    return res.status(201).json({
      ...enriched,
      goal_event: nextGoalEvent
    });
  }
);

router.patch(
  '/:id/goals/:goalId/assist',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  updateGoalAssistValidator,
  validateRequest,
  async (req, res) => {
    const matchId = Number(req.params.id);
    const goalId = Number(req.params.goalId);
    const assistPlayerId = req.body.assist_player_id ? Number(req.body.assist_player_id) : null;
    const match = await Match.findOne({ id: matchId });

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const index = (match.goal_events || []).findIndex((event) => Number(event.id) === goalId);
    if (index < 0) {
      return res.status(404).json({ message: 'Goal event not found' });
    }

    const goalEvent = match.goal_events[index];
    if (assistPlayerId) {
      const assistPlayer = await Player.findOne({ id: assistPlayerId }).select('id team_id');
      if (!assistPlayer || assistPlayer.team_id !== goalEvent.team_id) {
        return res.status(400).json({ message: 'Assist player must exist and belong to the scoring team' });
      }
    }

    goalEvent.assist_player_id = assistPlayerId;
    match.goal_events[index] = goalEvent;
    await match.save();
    await recomputeAndPersistPlayerStatsForSeason(match.season_id);

    const [enriched] = await enrichMatches([match]);
    return res.json(enriched);
  }
);

router.delete(
  '/:id/goals/:goalId',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  updateGoalAssistValidator,
  validateRequest,
  async (req, res) => {
    const matchId = Number(req.params.id);
    const goalId = Number(req.params.goalId);
    const match = await Match.findOne({ id: matchId });

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const index = (match.goal_events || []).findIndex((event) => Number(event.id) === goalId);
    if (index < 0) {
      return res.status(404).json({ message: 'Goal event not found' });
    }

    const [removedGoalEvent] = match.goal_events.splice(index, 1);
    const removedTeamId = Number(removedGoalEvent.team_id);

    if (removedTeamId === Number(match.home_team_id)) {
      match.home_score = Math.max(0, Number(match.home_score || 0) - 1);
    } else if (removedTeamId === Number(match.away_team_id)) {
      match.away_score = Math.max(0, Number(match.away_score || 0) - 1);
    }

    if ((match.goal_events || []).length === 0) {
      match.status = 'scheduled';
      match.result_recorded_at = null;
      match.home_score = 0;
      match.away_score = 0;
    }

    await match.save();
    await recomputeAndPersistPlayerStatsForSeason(match.season_id);

    const [enriched] = await enrichMatches([match]);
    return res.json({
      ...enriched,
      removed_goal_event: removedGoalEvent
    });
  }
);

router.patch(
  '/:id/schedule',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  updateMatchScheduleValidator,
  validateRequest,
  async (req, res) => {
    const matchId = Number(req.params.id);
    const updates = {};

    if (req.body.kickoff_at) {
      updates.kickoff_at = new Date(req.body.kickoff_at);
    }

    if (typeof req.body.venue !== 'undefined' || typeof req.body.venue_details !== 'undefined') {
      const normalizedVenue = normalizeVenuePayload(req.body);
      updates.venue = normalizedVenue.venue;
      updates.venue_details = normalizedVenue.venue_details;
    }

    if (typeof req.body.season_id !== 'undefined') {
      const seasonId = Number(req.body.season_id);
      const season = await Season.findOne({ id: seasonId }).select('id');
      if (!season) {
        return res.status(404).json({ message: 'Season not found' });
      }
      updates.season_id = seasonId;
    }

    const updated = await Match.findOneAndUpdate({ id: matchId }, updates, { new: true, projection: { _id: 0 } });

    if (!updated) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const [enriched] = await enrichMatches([updated]);
    return res.json(enriched);
  }
);

router.delete(
  '/:id',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  matchIdParamValidator,
  validateRequest,
  async (req, res) => {
    const matchId = Number(req.params.id);
    const match = await Match.findOne({ id: matchId }, { _id: 0 }).lean();

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const [enrichedMatch] = await enrichMatches([match]);

    await Match.deleteOne({ id: matchId });

    await recomputeAndPersistPlayerStatsForSeason(match.season_id);
    void notifyMatchDeleted(enrichedMatch);

    return res.json({
      success: true,
      deleted: true,
      match_id: matchId
    });
  }
);

router.patch(
  '/:id/status',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  updateMatchStatusValidator,
  validateRequest,
  async (req, res) => {
    const matchId = Number(req.params.id);
    const updated = await Match.findOneAndUpdate(
      { id: matchId },
      {
        status: req.body.status,
        status_note: req.body.status_note ?? ''
      },
      { new: true, projection: { _id: 0 } }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const [enriched] = await enrichMatches([updated]);
    return res.json(enriched);
  }
);

router.patch(
  '/:id/publish',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  publishMatchValidator,
  validateRequest,
  async (req, res) => {
    const matchId = Number(req.params.id);
    const updated = await Match.findOneAndUpdate(
      { id: matchId },
      { published: req.body.published },
      { new: true, projection: { _id: 0 } }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const [enriched] = await enrichMatches([updated]);
    return res.json(enriched);
  }
);

router.post(
  '/publish',
  requireAuth,
  requireAnyRole('league_admin', 'system_admin'),
  publishScheduleValidator,
  validateRequest,
  async (req, res) => {
    const seasonId = req.body.season_id ? Number(req.body.season_id) : null;
    const published = typeof req.body.published === 'boolean' ? req.body.published : true;

    const filter = seasonId ? { season_id: seasonId } : {};
    const result = await Match.updateMany(filter, { published });

    return res.json({
      success: true,
      modifiedCount: result.modifiedCount,
      published,
      season_id: seasonId
    });
  }
);

export default router;
