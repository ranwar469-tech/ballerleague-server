import mongoose from 'mongoose';

const goalEventSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      min: 1
    },
    minute: {
      type: Number,
      required: true,
      min: 0,
      max: 130
    },
    team_id: {
      type: Number,
      required: true,
      min: 1
    },
    scorer_player_id: {
      type: Number,
      required: true,
      min: 1
    },
    assist_player_id: {
      type: Number,
      default: null,
      min: 1
    }
  },
  { _id: false }
);

const venueDetailsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: '',
      trim: true
    },
    address: {
      type: String,
      default: '',
      trim: true
    },
    latitude: {
      type: Number,
      default: null,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      default: null,
      min: -180,
      max: 180
    },
    place_id: {
      type: String,
      default: null,
      trim: true
    }
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      min: 1
    },
    season_id: {
      type: Number,
      required: true,
      min: 1
    },
    home_team_id: {
      type: Number,
      required: true,
      min: 1
    },
    away_team_id: {
      type: Number,
      required: true,
      min: 1
    },
    venue: {
      type: String,
      default: '',
      trim: true
    },
    venue_details: {
      type: venueDetailsSchema,
      default: null
    },
    kickoff_at: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'postponed', 'cancelled', 'completed'],
      default: 'scheduled'
    },
    status_note: {
      type: String,
      default: '',
      trim: true
    },
    home_score: {
      type: Number,
      default: 0,
      min: 0
    },
    away_score: {
      type: Number,
      default: 0,
      min: 0
    },
    goal_events: {
      type: [goalEventSchema],
      default: []
    },
    result_recorded_at: {
      type: Date,
      default: null
    },
    published: {
      type: Boolean,
      default: false
    },
    created_by: {
      type: String,
      default: null
    }
  },
  {
    collection: 'matches',
    timestamps: true,
    versionKey: false
  }
);

matchSchema.index({ season_id: 1, kickoff_at: 1 });
matchSchema.index({ home_team_id: 1, away_team_id: 1, kickoff_at: 1 });

export const Match = mongoose.models.Match || mongoose.model('Match', matchSchema);
