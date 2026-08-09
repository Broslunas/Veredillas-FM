import mongoose, { Schema } from 'mongoose';

export interface ITeamLink {
  label: string;
  url: string;
}

export interface ITeam {
  slug: string;
  name: string;
  role?: string;
  department?: string;
  image?: string;
  schoolYear: string;
  order: number;
  links: ITeamLink[];
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    role: { type: String },
    department: { type: String },
    image: { type: String },
    schoolYear: { type: String, required: true, index: true },
    order: { type: Number, default: 0 },
    links: {
      type: [
        {
          label: { type: String, required: true },
          url: { type: String, required: true },
        },
      ],
      default: [],
    },
    bio: { type: String },
  },
  { timestamps: true }
);

if (mongoose.models.Team) {
  delete mongoose.models.Team;
}

const Team = mongoose.model<ITeam>('Team', TeamSchema);

export default Team;
