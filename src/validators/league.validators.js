import { body } from 'express-validator';

export const createLeagueValidator = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('country').optional().trim(),
  body('logo').optional().trim()
];
