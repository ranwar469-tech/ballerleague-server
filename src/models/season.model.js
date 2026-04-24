import mongoose from 'mongoose';

const seasonSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      min: 1
    },
    league_id: {
      type: Number,
      required: true,
      min: 1
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    start_date: {
      type: String,
      default: '',
      trim: true
    },
    end_date: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    collection: 'seasons',
    timestamps: true,
    versionKey: false
  }
);

export const Season = mongoose.models.Season || mongoose.model('Season', seasonSchema);
