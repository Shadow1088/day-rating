export interface Bonus {
  id: string;
  name: string;
  points: number;
}

export interface Activity {
  id: string;
  name: string;
  points: number;
  bonus?: Bonus;
}

export interface ActivitySet {
  id: string;
  name: string;
  activities: Activity[];
  deactivated?: boolean;
}

export interface Submission {
  id: string;
  date: string;
  setId: string;
  activitiesChecked: string[];
  bonusesChecked: string[];
  totalPoints: number;
  note?: string;
  userId?: string;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface RivalPersonality {
  morning: number;
  nutrition: number;
  project: number;
  fitness: number;
  culture: number;
  discipline: number;
}

export interface Rival {
  id: string;
  name: string;
  personality: RivalPersonality;
  anomalyChance: number;
  createdAt: string;
  lastGenerated: string;
}

export interface AppData {
  sets: ActivitySet[];
  submissions: Submission[];
  users: User[];
  rivals: Rival[];
  rivalSubmissions: Submission[];
}

export type View = 'sets' | 'statistics' | 'settings' | 'leaderboard';
