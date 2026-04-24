import mongoose from 'mongoose';

export const APP_ROLES = [
  'participant',
  'league_admin',
  'system_admin',
  'public_user'
];

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    roles: {
      type: [String],
      enum: APP_ROLES,
      default: ['public_user']
    },
    participantType: {
      type: String,
      enum: ['player', 'coach', null],
      default: null
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    collection: 'users',
    timestamps: true,
    versionKey: false
  }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
