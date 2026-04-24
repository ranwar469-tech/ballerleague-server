import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
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
    stadium: {
      type: String,
      default: '',
      trim: true
    },
    city: {
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
    collection: 'teams',
    timestamps: true,
    versionKey: false
  }
);

export const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);
