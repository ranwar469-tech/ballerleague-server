import mongoose from 'mongoose';

const seasonTeamSchema = new mongoose.Schema(
  {
    season_id: {
      type: Number,
      required: true,
      min: 1
    },
    team_id: {
      type: Number,
      required: true,
      min: 1
    }
  },
  {
    collection: 'season_teams',
    timestamps: true,
    versionKey: false
  }
);

seasonTeamSchema.index({ season_id: 1, team_id: 1 }, { unique: true });

export const SeasonTeam = mongoose.models.SeasonTeam || mongoose.model('SeasonTeam', seasonTeamSchema);
