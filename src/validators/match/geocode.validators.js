import { query } from 'express-validator';

export const geocodeSearchValidator = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('q must be between 2 and 200 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('limit must be between 1 and 20')
];

export const geocodeReverseValidator = [
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('lat must be between -90 and 90'),
  query('lon').isFloat({ min: -180, max: 180 }).withMessage('lon must be between -180 and 180')
];
