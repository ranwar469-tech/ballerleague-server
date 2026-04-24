export const store = {
  leagues: [
    { id: 1, name: 'Premier League Alpha', country: 'England', logo: '' }
  ],
  seasons: [
    { id: 1, league_id: 1, name: '2023/24', start_date: '2023-08-11', end_date: '2024-05-26' }
  ],
  teams: [
    { id: 1, name: 'Manchester Eagles', stadium: 'Old Trafford', city: 'Manchester', logo: '' },
    { id: 2, name: 'London Lions', stadium: 'Lion Arena', city: 'London', logo: '' }
  ],
  players: [
    { id: 1, name: 'Alex Hunter', position: 'FW', number: 9, nationality: 'England', avatar: '' },
    { id: 2, name: 'Marco Silva', position: 'MF', number: 8, nationality: 'Portugal', avatar: '' }
  ],
  season_teams: [
    { season_id: 1, team_id: 1 },
    { season_id: 1, team_id: 2 }
  ],
  team_players: []
};

const counters = {
  leagues: store.leagues.length,
  seasons: store.seasons.length,
  teams: store.teams.length,
  players: store.players.length,
  team_players: 0
};

export function nextId(entity) {
  counters[entity] = (counters[entity] || 0) + 1;
  return counters[entity];
}
