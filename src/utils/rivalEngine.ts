import type { Rival, RivalPersonality, Submission, ActivitySet } from '../types';

const CATEGORY_MAP: Record<string, keyof RivalPersonality> = {
  'On time to school/work': 'morning',
  'Sleep before midnight': 'morning',
  'Screen time under 3h': 'discipline',
  'Write daily activity log': 'discipline',
  'Hit calorie target (2900+)': 'nutrition',
  'Project work session': 'project',
  'Gym/Box session (90 min)': 'fitness',
  'Listen to a full album': 'culture',
  'Band deep dive': 'culture',
  'Read 15+ min': 'discipline',
  'Breakfast': 'morning',
  'Additional food': 'nutrition',
  'Lunch': 'nutrition',
  'Dinner': 'nutrition',
  'Study to school': 'project',
  'Milkshake': 'nutrition',
  'Water 3L': 'nutrition',
  'On time': 'morning',
  // Fitness / Workout set
  'Morning stretch': 'fitness',
  'Cardio': 'fitness',
  'Strength training': 'fitness',
  'Hit step goal (8k+)': 'fitness',
  'Active recovery (walk, yoga)': 'fitness',
  'No junk food': 'nutrition',
  'Protein in every meal': 'nutrition',
  'Post-workout stretch': 'fitness',
  // Health / Nutrition set
  'Drank 2L water': 'nutrition',
  'Ate breakfast': 'morning',
  'Ate lunch': 'nutrition',
  'Ate dinner': 'nutrition',
  'No fast food': 'nutrition',
  'Took supplements': 'nutrition',
  'Fruits or vegetables': 'nutrition',
  'Slept 7+ hours': 'morning',
  'No alcohol': 'discipline',
  // Learning / Study set
  'Read for 20+ min': 'discipline',
  'Practiced a skill': 'project',
  'Watched educational content': 'project',
  'Did a tutorial or course': 'project',
  'Practiced a language': 'project',
  'Took notes on something new': 'project',
  'Applied what I learned': 'project',
  // Social / Relationships set
  'Called or texted a friend': 'culture',
  'Met someone in person': 'culture',
  'Listened to someone': 'culture',
  'Complimented someone': 'culture',
  'Helped someone': 'culture',
  'Said no to phone during conversation': 'discipline',
  'Reached out to someone new': 'culture',
  'Thanked someone genuinely': 'culture',
  // Leisure / Free Time set
  'Went outside': 'fitness',
  'Did a hobby': 'culture',
  'Played a game': 'culture',
  'Listened to music intentionally': 'culture',
  'Watched something enjoyable': 'culture',
  'Spent time in nature': 'fitness',
  'Did something creative': 'culture',
  'Limited screen time (<2h leisure)': 'discipline',
  // Chores / Errands set
  'Made the bed': 'discipline',
  'Did dishes': 'discipline',
  'Cleaned a room': 'discipline',
  'Did laundry': 'discipline',
  'Took out trash': 'discipline',
  'Grocery shopping': 'discipline',
  'Organized something': 'discipline',
  'Wiped down surfaces': 'discipline',
  'Ran an errand': 'discipline',
  // Work set
  'Breakfast at home': 'morning',
  'Well dressed': 'morning',
  'Brush teeth': 'morning',
  'Be on time': 'morning',
  'Breakfast at work': 'morning',
  'Be useful': 'project',
  'Brush teeth 2': 'morning',
  'Skincare': 'morning',
  'Sleep before 11pm': 'morning',
  // School set
  'Smell good': 'morning',
  'Food mid-day': 'nutrition',
  'Good grade (1-2)': 'project',
  'Learnt something new': 'project',
  'Did homework': 'project',
};

function getActivityCategory(activityName: string): keyof RivalPersonality {
  return CATEGORY_MAP[activityName] || 'discipline';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

interface Anomaly {
  name: string;
  modifier: (personality: RivalPersonality) => RivalPersonality;
}

const ANOMALIES: Anomaly[] = [
  {
    name: 'Lazy Day',
    modifier: (p) => ({
      morning: p.morning * 0.7,
      nutrition: p.nutrition * 0.7,
      project: p.project * 0.7,
      fitness: p.fitness * 0.7,
      culture: p.culture * 0.7,
      discipline: p.discipline * 0.7,
    }),
  },
  {
    name: 'Great Day',
    modifier: (p) => ({
      morning: clamp(p.morning * 1.2, 1, 10),
      nutrition: clamp(p.nutrition * 1.2, 1, 10),
      project: clamp(p.project * 1.2, 1, 10),
      fitness: clamp(p.fitness * 1.2, 1, 10),
      culture: clamp(p.culture * 1.2, 1, 10),
      discipline: clamp(p.discipline * 1.2, 1, 10),
    }),
  },
  {
    name: 'Focused Grind',
    modifier: (p) => ({
      morning: p.morning * 0.9,
      nutrition: p.nutrition * 0.9,
      project: clamp(p.project * 1.5, 1, 10),
      fitness: p.fitness * 0.9,
      culture: p.culture * 0.9,
      discipline: clamp(p.discipline * 1.1, 1, 10),
    }),
  },
  {
    name: 'Social Day',
    modifier: (p) => ({
      morning: p.morning,
      nutrition: clamp(p.nutrition * 1.1, 1, 10),
      project: p.project * 0.8,
      fitness: p.fitness,
      culture: clamp(p.culture * 1.3, 1, 10),
      discipline: p.discipline * 0.9,
    }),
  },
  {
    name: 'Recovery Day',
    modifier: (p) => ({
      morning: clamp(p.morning * 1.1, 1, 10),
      nutrition: clamp(p.nutrition * 1.1, 1, 10),
      project: p.project,
      fitness: p.fitness * 0.5,
      culture: p.culture,
      discipline: clamp(p.discipline * 1.2, 1, 10),
    }),
  },
  {
    name: 'Burnout',
    modifier: (p) => ({
      morning: p.morning * 0.6,
      nutrition: p.nutrition * 0.6,
      project: p.project * 0.6,
      fitness: p.fitness * 0.6,
      culture: p.culture * 0.6,
      discipline: p.discipline * 0.6,
    }),
  },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateRivalDay(
  rival: Rival,
  date: string,
  sets: ActivitySet[]
): { submissions: Submission[]; totalPoints: number } {
  const seed = hashString(rival.id + date);
  const rand = seededRandom(seed);

  let personality = { ...rival.personality };

  if (rand() < rival.anomalyChance) {
    const anomalyIndex = Math.floor(rand() * ANOMALIES.length);
    personality = ANOMALIES[anomalyIndex].modifier(personality);
  }

  const submissions: Submission[] = [];
  let dayTotal = 0;

  for (const set of sets) {
    if (set.deactivated) continue;

    const activitiesChecked: string[] = [];
    const bonusesChecked: string[] = [];
    let setTotal = 0;
    const isChores = set.name === 'Chores / Errands';
    let choresDone = false;

    for (const activity of set.activities) {
      if (isChores && choresDone) break;

      const category = getActivityCategory(activity.name);
      const baseChance = personality[category] / 10;
      const variance = (rand() - 0.5) * 0.2;
      const finalChance = clamp(baseChance + variance, 0, 1);

      if (rand() < finalChance) {
        activitiesChecked.push(activity.id);
        setTotal += activity.points;
        if (isChores) choresDone = true;

        if (activity.bonus) {
          const bonusChance = finalChance * 0.6;
          if (rand() < bonusChance) {
            bonusesChecked.push(activity.bonus.id);
            setTotal += activity.bonus.points;
          }
        }
      }
    }

    if (activitiesChecked.length > 0) {
      submissions.push({
        id: `${rival.id}-${date}-${set.id}`,
        date,
        setId: set.id,
        activitiesChecked,
        bonusesChecked,
        totalPoints: setTotal,
      });
      dayTotal += setTotal;
    }
  }

  return { submissions, totalPoints: dayTotal };
}

export function generateRivalHistory(
  rival: Rival,
  sets: ActivitySet[]
): Submission[] {
  const allSubmissions: Submission[] = [];
  const startDate = new Date(rival.createdAt);
  const today = new Date();

  const current = new Date(startDate);
  while (current <= today) {
    const dateStr = current.toISOString().split('T')[0];
    const { submissions } = generateRivalDay(rival, dateStr, sets);
    allSubmissions.push(...submissions);
    current.setDate(current.getDate() + 1);
  }

  return allSubmissions;
}

export function calculateRivalStreak(
  rival: Rival,
  submissions: Submission[]
): { current: number; longest: number } {
  const dates = [...new Set(submissions.filter(s => s.id.startsWith(rival.id)).map(s => s.date))].sort().reverse();
  if (dates.length === 0) return { current: 0, longest: 0 };

  const today = new Date().toISOString().split('T')[0];
  const todaySub = dates.includes(today);

  let current = todaySub ? 1 : 0;
  let checkDate = new Date();
  checkDate.setDate(checkDate.getDate() - 1);

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (dates.includes(dateStr)) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  let longest = 1;
  let run = 1;
  const sorted = [...dates].sort();
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  return { current, longest };
}

export const PRESET_PERSONALITIES: Record<string, { personality: RivalPersonality; description: string }> = {
  'The Grinder': {
    personality: { morning: 7, nutrition: 6, project: 8, fitness: 9, culture: 3, discipline: 5 },
    description: 'Gym rat who grinds project work but skips culture',
  },
  'The Scholar': {
    personality: { morning: 6, nutrition: 5, project: 9, fitness: 4, culture: 6, discipline: 8 },
    description: 'Bookworm who studies hard but neglects body',
  },
  'The Artist': {
    personality: { morning: 8, nutrition: 5, project: 4, fitness: 3, culture: 9, discipline: 6 },
    description: 'Music lover who explores culture but skips gym',
  },
  'The Lazy Genius': {
    personality: { morning: 3, nutrition: 4, project: 8, fitness: 3, culture: 5, discipline: 4 },
    description: 'Smart but lazy - does project work but little else',
  },
  'The Jock': {
    personality: { morning: 7, nutrition: 7, project: 4, fitness: 9, culture: 3, discipline: 5 },
    description: 'All about fitness and meals, forgets about studying',
  },
  'The Balanced': {
    personality: { morning: 6, nutrition: 6, project: 6, fitness: 6, culture: 6, discipline: 6 },
    description: 'Moderate at everything, master of nothing',
  },
};
