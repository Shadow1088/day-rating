import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DATA_FILE = path.join(process.cwd(), 'data.json');
const DEFAULT_USER_ID = '__default__';

interface OldData {
  sets: Array<{
    id: string;
    name: string;
    deactivated?: boolean;
    global?: boolean;
    ownerUserId?: string;
    activities: Array<{
      id: string;
      name: string;
      points: number;
      bonus?: { id: string; name: string; points: number };
    }>;
  }>;
  submissions: Array<{
    id: string;
    date: string;
    setId: string;
    activitiesChecked: string[];
    bonusesChecked: string[];
    totalPoints: number;
    note?: string;
    userId?: string;
  }>;
  users: Array<{ id: string; name: string; pin?: string }>;
  rivals: Array<{
    id: string;
    name: string;
    personality: Record<string, number>;
    anomalyChance: number;
    createdAt: string;
    lastGenerated: string;
    ownerUserId?: string;
  }>;
  rivalSubmissions: Array<{
    id: string;
    date: string;
    setId: string;
    activitiesChecked: string[];
    bonusesChecked: string[];
    totalPoints: number;
  }>;
}

async function migrate() {
  console.log('Reading data.json...');
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const data: OldData = JSON.parse(raw);

  console.log(`Found ${data.sets.length} sets, ${data.submissions.length} submissions, ${data.users.length} users, ${data.rivals.length} rivals, ${data.rivalSubmissions.length} rival submissions`);

  // 1. Clear existing data
  console.log('Clearing existing data...');
  await supabase.from('rival_submissions').delete().neq('id', '__none__');
  await supabase.from('rivals').delete().neq('id', '__none__');
  await supabase.from('submissions').delete().neq('id', '__none__');
  await supabase.from('activities').delete().neq('id', '__none__');
  await supabase.from('activity_sets').delete().neq('id', '__none__');
  await supabase.from('users').delete().neq('id', '__none__');

  // 2. Insert users
  if (data.users.length > 0) {
    console.log(`Inserting ${data.users.length} users...`);
    const { error } = await supabase.from('users').insert(
      data.users.map(u => ({ id: u.id, name: u.name, pin: u.pin ?? null }))
    );
    if (error) { console.error('Users error:', error); process.exit(1); }
  }

  // 3. Insert activity sets
  console.log(`Inserting ${data.sets.length} sets...`);
  const { error: setsError } = await supabase.from('activity_sets').insert(
    data.sets.map(s => ({
      id: s.id,
      name: s.name,
      deactivated: s.deactivated ?? false,
      global_set: s.global ?? false,
      owner_user_id: s.ownerUserId ?? null,
    }))
  );
  if (setsError) { console.error('Sets error:', setsError); process.exit(1); }

  // 4. Insert activities
  const allActivities = data.sets.flatMap(set =>
    set.activities.map((a, i) => ({
      id: a.id,
      set_id: set.id,
      name: a.name,
      points: a.points,
      bonus_id: a.bonus?.id ?? null,
      bonus_name: a.bonus?.name ?? null,
      bonus_points: a.bonus?.points ?? null,
      sort_order: i,
    }))
  );
  console.log(`Inserting ${allActivities.length} activities...`);
  const { error: actError } = await supabase.from('activities').insert(allActivities);
  if (actError) { console.error('Activities error:', actError); process.exit(1); }

  // 5. Insert submissions
  if (data.submissions.length > 0) {
    console.log(`Inserting ${data.submissions.length} submissions...`);
    const { error } = await supabase.from('submissions').insert(
      data.submissions.map(s => ({
        id: s.id,
        user_id: s.userId ?? DEFAULT_USER_ID,
        set_id: s.setId,
        date: s.date,
        total_points: s.totalPoints,
        note: s.note ?? null,
        activities_checked: s.activitiesChecked,
        bonuses_checked: s.bonusesChecked,
      }))
    );
    if (error) { console.error('Submissions error:', error); process.exit(1); }
  }

  // 6. Insert rivals
  if (data.rivals.length > 0) {
    console.log(`Inserting ${data.rivals.length} rivals...`);
    const { error } = await supabase.from('rivals').insert(
      data.rivals.map(r => ({
        id: r.id,
        name: r.name,
        personality: r.personality,
        anomaly_chance: r.anomalyChance,
        created_at: r.createdAt,
        last_generated: r.lastGenerated,
        owner_user_id: r.ownerUserId ?? null,
      }))
    );
    if (error) { console.error('Rivals error:', error); process.exit(1); }
  }

  // 7. Insert rival submissions
  if (data.rivalSubmissions.length > 0) {
    console.log(`Inserting ${data.rivalSubmissions.length} rival submissions...`);
    // Extract rival_id from submission id: format is {rivalId}-{date}-{setId}
    const rivalIds = data.rivals.map(r => r.id);
    const { error } = await supabase.from('rival_submissions').insert(
      data.rivalSubmissions.map(s => {
        const rivalId = rivalIds.find(rid => s.id.startsWith(rid + '-')) ?? '';
        return {
          id: s.id,
          rival_id: rivalId,
          set_id: s.setId,
          date: s.date,
          total_points: s.totalPoints,
          activities_checked: s.activitiesChecked,
          bonuses_checked: s.bonusesChecked,
        };
      })
    );
    if (error) { console.error('Rival submissions error:', error); process.exit(1); }
  }

  console.log('Migration complete!');
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
