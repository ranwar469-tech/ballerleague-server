import { Match } from '../../../models/match.model.js';
import { Team } from '../../../models/team.model.js';
import { Player } from '../../../models/player.model.js';
import { SeasonTeam } from '../../../models/season-team.model.js';

export const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

export function asVenueDetails(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const normalizedName = typeof value.name === 'string' ? value.name.trim() : '';
  const normalizedAddress = typeof value.address === 'string' ? value.address.trim() : '';
  const normalizedPlaceId = typeof value.place_id === 'string' ? value.place_id.trim() : null;

  const latitude =
    value.latitude === null || typeof value.latitude === 'undefined' || value.latitude === ''
      ? null
      : Number(value.latitude);
  const longitude =
    value.longitude === null || typeof value.longitude === 'undefined' || value.longitude === ''
      ? null
      : Number(value.longitude);

  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const hasAnyText = Boolean(normalizedName || normalizedAddress || normalizedPlaceId);

  if (!hasAnyText && !hasCoordinates) {
    return null;
  }

  return {
    name: normalizedName,
    address: normalizedAddress,
    latitude: hasCoordinates ? latitude : null,
    longitude: hasCoordinates ? longitude : null,
    place_id: normalizedPlaceId || null
  };
}

export function normalizeVenuePayload(body) {
  const details = asVenueDetails(body.venue_details);
  const directVenue = typeof body.venue === 'string' ? body.venue.trim() : '';
  const fallbackVenue = details?.name || details?.address || '';

  return {
    venue: directVenue || fallbackVenue,
    venue_details: details
  };
}

export function buildTeamNameMap(teams) {
  return new Map(teams.map((team) => [team.id, team.name]));
}

export function toStandingsRows(matches, teamIds) {
  const table = new Map();

  for (const teamId of teamIds) {
    table.set(teamId, {
      team_id: teamId,
      mp: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0
    });
  }

  for (const match of matches) {
    if (match.status !== 'completed') {
      continue;
    }

    const home = table.get(match.home_team_id) || {
      team_id: match.home_team_id,
      mp: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0
    };
    const away = table.get(match.away_team_id) || {
      team_id: match.away_team_id,
      mp: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0
    };

    const homeScore = Number(match.home_score ?? 0);
    const awayScore = Number(match.away_score ?? 0);

    home.mp += 1;
    away.mp += 1;
    home.gf += homeScore;
    home.ga += awayScore;
    away.gf += awayScore;
    away.ga += homeScore;

    if (homeScore > awayScore) {
      home.w += 1;
      away.l += 1;
      home.pts += 3;
    } else if (homeScore < awayScore) {
      away.w += 1;
      home.l += 1;
      away.pts += 3;
    } else {
      home.d += 1;
      away.d += 1;
      home.pts += 1;
      away.pts += 1;
    }

    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    table.set(home.team_id, home);
    table.set(away.team_id, away);
  }

  return [...table.values()];
}

export function computePlayerStatsFromMatches(matches) {
  const statsByPlayer = new Map();

  for (const match of matches) {
    if (match.status !== 'completed') {
      continue;
    }

    const events = Array.isArray(match.goal_events) ? match.goal_events : [];
    for (const event of events) {
      const scorerId = Number(event.scorer_player_id);
      const assistId = event.assist_player_id ? Number(event.assist_player_id) : null;

      if (!statsByPlayer.has(scorerId)) {
        statsByPlayer.set(scorerId, { goals: 0, assists: 0, matchIds: new Set() });
      }

      const scorer = statsByPlayer.get(scorerId);
      scorer.goals += 1;
      scorer.matchIds.add(match.id);

      if (assistId) {
        if (!statsByPlayer.has(assistId)) {
          statsByPlayer.set(assistId, { goals: 0, assists: 0, matchIds: new Set() });
        }

        const assister = statsByPlayer.get(assistId);
        assister.assists += 1;
        assister.matchIds.add(match.id);
      }
    }
  }

  return statsByPlayer;
}

export async function recomputeAndPersistPlayerStatsForSeason(seasonId) {
  const completedMatches = await Match.find({ season_id: seasonId, status: 'completed' }, { _id: 0 }).lean();
  const statsByPlayer = computePlayerStatsFromMatches(completedMatches);
  const playerIds = [...statsByPlayer.keys()];

  await Player.updateMany({ season_id: seasonId }, { apps: 0, goals: 0, assists: 0 });

  if (playerIds.length === 0) {
    return;
  }

  const ops = playerIds.map((playerId) => {
    const stats = statsByPlayer.get(playerId);
    return {
      updateOne: {
        filter: { id: playerId, season_id: seasonId },
        update: {
          apps: stats.matchIds.size,
          goals: stats.goals,
          assists: stats.assists
        }
      }
    };
  });

  if (ops.length > 0) {
    await Player.bulkWrite(ops, { ordered: false });
  }
}

export function mapNominatimPlace(item) {
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);

  return {
    place_id: item.place_id ? String(item.place_id) : null,
    name: item.name || item.display_name || '',
    address: item.display_name || '',
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    type: item.type || '',
    category: item.category || ''
  };
}

export async function getTeamIdsForStandings(matches, seasonId) {
  if (!seasonId) {
    return [...new Set(matches.flatMap((match) => [match.home_team_id, match.away_team_id]))];
  }

  const seasonTeams = await SeasonTeam.find({ season_id: seasonId }, { _id: 0, team_id: 1 }).lean();
  const ids = seasonTeams.map((row) => Number(row.team_id));

  if (ids.length > 0) {
    return ids;
  }

  return [...new Set(matches.flatMap((match) => [match.home_team_id, match.away_team_id]))];
}

export async function enrichMatches(matchDocs) {
  const matches = matchDocs.map((item) => (typeof item.toObject === 'function' ? item.toObject() : item));
  const teamIds = [...new Set(matches.flatMap((match) => [match.home_team_id, match.away_team_id]))];
  const teams = await Team.find({ id: { $in: teamIds } }, { _id: 0, id: 1, name: 1 }).lean();
  const teamMap = new Map(teams.map((team) => [team.id, team.name]));

  return matches.map((match) => ({
    ...match,
    home_team_name: teamMap.get(match.home_team_id) || `Team ${match.home_team_id}`,
    away_team_name: teamMap.get(match.away_team_id) || `Team ${match.away_team_id}`
  }));
}
