import { query } from 'express-validator';

export const standingsQueryValidator = [
  query('season_id').optional().isInt({ min: 1 }).withMessage('season_id must be a positive integer')
];

export const topScorersQueryValidator = [
  query('season_id').optional().isInt({ min: 1 }).withMessage('season_id must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200')
];
