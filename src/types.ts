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
}

export interface Submission {
  id: string;
  date: string;
  setId: string;
  activitiesChecked: string[];
  bonusesChecked: string[];
  totalPoints: number;
  note?: string;
}

export interface AppData {
  sets: ActivitySet[];
  submissions: Submission[];
}

export type View = 'sets' | 'statistics' | 'settings';
