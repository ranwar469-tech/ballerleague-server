import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      min: 1
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    team_id: {
      type: Number,
      default: null
    },
    season_id: {
      type: Number,
      default: null
    },
    position: {
      type: String,
      default: '',
      trim: true
    },
    number: {
      type: Number,
      default: 0,
      min: 0
    },
    nationality: {
      type: String,
      default: '',
      trim: true
    },
    avatar: {
      type: String,
      default: '',
      trim: true
    },
    apps: {
      type: Number,
      default: 0,
      min: 0
    },
    goals: {
      type: Number,
      default: 0,
      min: 0
    },
    assists: {
      type: Number,
      default: 0,
      min: 0
    },
  },
  {
    collection: 'players',
    timestamps: true,
    versionKey: false
  }
);

export const Player = mongoose.models.Player || mongoose.model('Player', playerSchema);
