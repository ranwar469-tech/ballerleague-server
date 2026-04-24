import { body, param } from 'express-validator';

export const createSeasonValidator = [
  body('league_id').isInt({ min: 1 }).withMessage('league_id must be a positive integer'),
  body('name').trim().notEmpty().withMessage('name is required'),
  body('start_date').optional().isISO8601().withMessage('start_date must be a valid date'),
  body('end_date').optional().isISO8601().withMessage('end_date must be a valid date')
];

export const assignTeamToSeasonValidator = [
  param('id').isInt({ min: 1 }).withMessage('season id must be a positive integer'),
  body('team_id').isInt({ min: 1 }).withMessage('team_id must be a positive integer')
];
