import mongoose from 'mongoose';

const leagueSchema = new mongoose.Schema(
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
    country: {
      type: String,
      default: '',
      trim: true
    },
    logo: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    collection: 'leagues',
    timestamps: true,
    versionKey: false
  }
);

export const League = mongoose.models.League || mongoose.model('League', leagueSchema);
