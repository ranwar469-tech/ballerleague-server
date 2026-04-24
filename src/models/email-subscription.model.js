import mongoose from 'mongoose';

const emailSubscriptionSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    subscribed: {
      type: Boolean,
      default: true
    }
  },
  {
    collection: 'email_subscriptions',
    timestamps: true,
    versionKey: false
  }
);

export const EmailSubscription =
  mongoose.models.EmailSubscription || mongoose.model('EmailSubscription', emailSubscriptionSchema);
