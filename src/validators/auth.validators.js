import { body, param } from 'express-validator';
import { APP_ROLES } from '../models/user.model.js';

export const registerValidator = [
  body('displayName').trim().notEmpty().withMessage('displayName is required'),
  body('email').isEmail().withMessage('email must be valid').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters long'),
  body('roles').optional().isArray({ min: 1 }).withMessage('roles must be a non-empty array'),
  body('roles.*').optional().isIn(APP_ROLES).withMessage('invalid role provided')
];

export const loginValidator = [
  body('email').isEmail().withMessage('email must be valid').normalizeEmail(),
  body('password').notEmpty().withMessage('password is required')
];

export const updateOwnProfileValidator = [
  body('displayName').optional().trim().notEmpty().withMessage('displayName cannot be empty')
];

export const updateUserSettingsValidator = [
  body('displayName').optional().trim().notEmpty().withMessage('displayName cannot be empty'),
  body('email').optional().isEmail().withMessage('email must be valid').normalizeEmail(),
  body('password').optional().isLength({ min: 8 }).withMessage('password must be at least 8 characters long')
];

export const userIdParamValidator = [
  param('id').isMongoId().withMessage('id must be a valid user id')
];

export const updateUserRolesValidator = [
  ...userIdParamValidator,
  body('roles').isArray({ min: 1 }).withMessage('roles must be a non-empty array'),
  body('roles.*').isIn(APP_ROLES).withMessage('invalid role provided')
];

export const updateUserStatusValidator = [
  ...userIdParamValidator,
  body('active').isBoolean().withMessage('active must be a boolean')
];
