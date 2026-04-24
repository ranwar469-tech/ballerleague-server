import { body, param } from 'express-validator';

function hasValue(value) {
  return typeof value !== 'undefined' && value !== null && value !== '';
}

function isValidVenuePayload(value) {
  if (typeof value === 'undefined') {
    return true;
  }

  if (typeof value === 'string') {
    return true;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const hasName = hasValue(value.name) ? typeof value.name === 'string' : true;
  const hasAddress = hasValue(value.address) ? typeof value.address === 'string' : true;
  const hasPlaceId = hasValue(value.place_id) ? typeof value.place_id === 'string' : true;
  const hasLatitude = hasValue(value.latitude)
    ? Number.isFinite(Number(value.latitude)) && Number(value.latitude) >= -90 && Number(value.latitude) <= 90
    : true;
  const hasLongitude = hasValue(value.longitude)
    ? Number.isFinite(Number(value.longitude)) && Number(value.longitude) >= -180 && Number(value.longitude) <= 180
    : true;

  return hasName && hasAddress && hasPlaceId && hasLatitude && hasLongitude;
}

export const matchIdParamValidator = [
  param('id').isInt({ min: 1 }).withMessage('match id must be a positive integer')
];

export const createManualMatchValidator = [
  body('season_id').isInt({ min: 1 }).withMessage('season_id must be a positive integer'),
  body('home_team_id').isInt({ min: 1 }).withMessage('home_team_id must be a positive integer'),
  body('away_team_id').isInt({ min: 1 }).withMessage('away_team_id must be a positive integer'),
  body('away_team_id')
    .custom((value, { req }) => Number(value) !== Number(req.body.home_team_id))
    .withMessage('home_team_id and away_team_id must be different'),
  body('kickoff_at').isISO8601().withMessage('kickoff_at must be a valid ISO date-time'),
  body('venue').optional().isString().trim(),
  body('venue_details')
    .optional()
    .custom((value) => isValidVenuePayload(value))
    .withMessage('venue_details must be a valid venue payload'),
  body('published').optional().isBoolean().withMessage('published must be a boolean')
];

export const updateMatchScheduleValidator = [
  ...matchIdParamValidator,
  body('kickoff_at').optional().isISO8601().withMessage('kickoff_at must be a valid ISO date-time'),
  body('venue').optional().isString().trim(),
  body('venue_details')
    .optional()
    .custom((value) => isValidVenuePayload(value))
    .withMessage('venue_details must be a valid venue payload'),
  body('season_id').optional().isInt({ min: 1 }).withMessage('season_id must be a positive integer')
];

export const updateMatchStatusValidator = [
  ...matchIdParamValidator,
  body('status')
    .isIn(['scheduled', 'postponed', 'cancelled', 'completed'])
    .withMessage('status must be scheduled, postponed, cancelled, or completed'),
  body('status_note').optional().trim()
];

export const publishMatchValidator = [
  ...matchIdParamValidator,
  body('published').isBoolean().withMessage('published must be a boolean')
];

export const publishScheduleValidator = [
  body('season_id').optional().isInt({ min: 1 }).withMessage('season_id must be a positive integer'),
  body('published').optional().isBoolean().withMessage('published must be a boolean')
];

export const recordMatchResultValidator = [
  ...matchIdParamValidator,
  body('home_score').isInt({ min: 0 }).withMessage('home_score must be a non-negative integer'),
  body('away_score').isInt({ min: 0 }).withMessage('away_score must be a non-negative integer'),
  body('status')
    .optional()
    .isIn(['scheduled', 'postponed', 'cancelled', 'completed'])
    .withMessage('status must be scheduled, postponed, cancelled, or completed')
];

export const recordGoalEventValidator = [
  ...matchIdParamValidator,
  body('minute').isInt({ min: 0, max: 130 }).withMessage('minute must be between 0 and 130'),
  body('team_id').isInt({ min: 1 }).withMessage('team_id must be a positive integer'),
  body('scorer_player_id').isInt({ min: 1 }).withMessage('scorer_player_id must be a positive integer'),
  body('assist_player_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('assist_player_id must be a positive integer')
];

export const updateGoalAssistValidator = [
  ...matchIdParamValidator,
  param('goalId').isInt({ min: 1 }).withMessage('goalId must be a positive integer'),
  body('assist_player_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('assist_player_id must be a positive integer')
];
