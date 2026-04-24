import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import { User } from '../../models/user.model.js';
import { EmailSubscription } from '../../models/email-subscription.model.js';

const router = Router();

const updateSubscriptionValidator = [
  body('subscribed').isBoolean().withMessage('subscribed must be boolean'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('email must be a valid email address')
];

router.get('/me', requireAuth, async (req, res) => {
  const row = await EmailSubscription.findOne({ user_id: req.auth.sub }, { _id: 0, subscribed: 1, email: 1 }).lean();
  return res.json({
    subscribed: Boolean(row?.subscribed),
    email: row?.email || ''
  });
});

router.put('/me', requireAuth, updateSubscriptionValidator, validateRequest, async (req, res) => {
  const user = await User.findById(req.auth.sub).select('email');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const subscribed = Boolean(req.body.subscribed);
  const requestedEmail = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const email = requestedEmail || user.email;

  const updated = await EmailSubscription.findOneAndUpdate(
    { user_id: req.auth.sub },
    {
      user_id: req.auth.sub,
      email,
      subscribed
    },
    { upsert: true, new: true, projection: { _id: 0, subscribed: 1, email: 1 } }
  );

  return res.json({
    subscribed: Boolean(updated?.subscribed),
    email: updated?.email || ''
  });
});

export default router;
