import type { AppData, ActivitySet, Submission, User, Rival } from './types';
import { supabase } from './lib/supabase';

const DEFAULT_USER_ID = '__default__';

const defaultData: AppData = {
  sets: [],
  submissions: [],
  users: [],
  rivals: [],
  rivalSubmissions: [],
};

type DbSet = {
  id: string;
  name: string;
  deactivated: boolean;
  global_set: boolean;
  owner_user_id: string | null;
};

type DbActivity = {
  id: string;
  set_id: string;
  name: string;
  points: number;
  bonus_id: string | null;
  bonus_name: string | null;
  bonus_points: number | null;
  sort_order: number;
};

type DbSubmission = {
  id: string;
  user_id: string;
  set_id: string;
  date: string;
  total_points: number;
  note: string | null;
  activities_checked: string[];
  bonuses_checked: string[];
};

type DbRival = {
  id: string;
  name: string;
  personality: Record<string, number>;
  anomaly_chance: number;
  created_at: string;
  last_generated: string | null;
  owner_user_id: string | null;
};

type DbRivalSubmission = {
  id: string;
  rival_id: string;
  set_id: string;
  date: string;
  total_points: number;
  activities_checked: string[];
  bonuses_checked: string[];
};

export const loadData = async (): Promise<AppData> => {
  try {
    const [setsRes, activitiesRes, submissionsRes, usersRes, rivalsRes, rivalSubsRes] = await Promise.all([
      supabase.from('activity_sets').select('*'),
      supabase.from('activities').select('*').order('sort_order'),
      supabase.from('submissions').select('*'),
      supabase.from('users').select('*'),
      supabase.from('rivals').select('*'),
      supabase.from('rival_submissions').select('*'),
    ]);

    if (setsRes.error) throw setsRes.error;

    const dbSets = (setsRes.data ?? []) as DbSet[];
    const dbActivities = (activitiesRes.data ?? []) as DbActivity[];
    const dbSubmissions = (submissionsRes.data ?? []) as DbSubmission[];
    const dbUsers = (usersRes.data ?? []) as User[];
    const dbRivals = (rivalsRes.data ?? []) as DbRival[];
    const dbRivalSubs = (rivalSubsRes.data ?? []) as DbRivalSubmission[];

    // Assemble sets with nested activities
    const sets: ActivitySet[] = dbSets.map(set => ({
      id: set.id,
      name: set.name,
      deactivated: set.deactivated,
      global: set.global_set,
      ownerUserId: set.owner_user_id ?? undefined,
      activities: dbActivities
        .filter(a => a.set_id === set.id)
        .map(a => ({
          id: a.id,
          name: a.name,
          points: a.points,
          ...(a.bonus_id ? {
            bonus: { id: a.bonus_id, name: a.bonus_name ?? '', points: a.bonus_points ?? 0 }
          } : {}),
        })),
    }));

    // Assemble submissions
    const submissions: Submission[] = dbSubmissions.map(s => ({
      id: s.id,
      date: s.date,
      setId: s.set_id,
      activitiesChecked: s.activities_checked ?? [],
      bonusesChecked: s.bonuses_checked ?? [],
      totalPoints: s.total_points,
      note: s.note ?? undefined,
      userId: s.user_id === DEFAULT_USER_ID ? undefined : s.user_id,
    }));

    // Assemble rival submissions
    const rivalSubmissions: Submission[] = dbRivalSubs.map(s => ({
      id: s.id,
      date: s.date,
      setId: s.set_id,
      activitiesChecked: s.activities_checked ?? [],
      bonusesChecked: s.bonuses_checked ?? [],
      totalPoints: s.total_points,
      rivalId: s.rival_id,
    }));

    // Assemble rivals
    const rivals: Rival[] = dbRivals.map(r => ({
      id: r.id,
      name: r.name,
      personality: r.personality as unknown as Rival['personality'],
      anomalyChance: r.anomaly_chance,
      createdAt: r.created_at,
      lastGenerated: r.last_generated ?? r.created_at,
      ownerUserId: r.owner_user_id ?? undefined,
    }));

    return { sets, submissions, users: dbUsers, rivals, rivalSubmissions };
  } catch (e) {
    console.error('Failed to load data from Supabase:', e);
    return defaultData;
  }
};

export const saveData = async (data: AppData): Promise<void> => {
  try {
    // Delete in dependency order
    await supabase.from('rival_submissions').delete().neq('id', '__nonexistent__');
    await supabase.from('rivals').delete().neq('id', '__nonexistent__');
    await supabase.from('submissions').delete().neq('id', '__nonexistent__');
    await supabase.from('activities').delete().neq('id', '__nonexistent__');
    await supabase.from('activity_sets').delete().neq('id', '__nonexistent__');
    await supabase.from('users').delete().neq('id', '__nonexistent__');

    // Insert users
    if (data.users.length > 0) {
      await supabase.from('users').insert(
        data.users.map(u => ({ id: u.id, name: u.name, pin: u.pin ?? null }))
      );
    }

    // Insert activity sets
    if (data.sets.length > 0) {
      await supabase.from('activity_sets').insert(
        data.sets.map(s => ({
          id: s.id,
          name: s.name,
          deactivated: s.deactivated ?? false,
          global_set: s.global ?? false,
          owner_user_id: s.ownerUserId ?? null,
        }))
      );
    }

    // Insert activities
    const allActivities = data.sets.flatMap(set =>
      set.activities.map((a, actIndex) => ({
        id: a.id,
        set_id: set.id,
        name: a.name,
        points: a.points,
        bonus_id: a.bonus?.id ?? null,
        bonus_name: a.bonus?.name ?? null,
        bonus_points: a.bonus?.points ?? null,
        sort_order: actIndex,
      }))
    );
    if (allActivities.length > 0) {
      await supabase.from('activities').insert(allActivities);
    }

    // Insert user submissions
    if (data.submissions.length > 0) {
      await supabase.from('submissions').insert(
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
    }

    // Insert rivals
    if (data.rivals.length > 0) {
      await supabase.from('rivals').insert(
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
    }

    // Insert rival submissions
    if (data.rivalSubmissions.length > 0) {
      await supabase.from('rival_submissions').insert(
        data.rivalSubmissions.map(s => ({
          id: s.id,
          rival_id: s.rivalId ?? '',
          set_id: s.setId,
          date: s.date,
          total_points: s.totalPoints,
          activities_checked: s.activitiesChecked,
          bonuses_checked: s.bonusesChecked,
        }))
      );
    }
  } catch (e) {
    console.error('Failed to save data to Supabase:', e);
  }
};
