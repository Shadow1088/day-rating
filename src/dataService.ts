import type { AppData } from './types';

const API_URL = '/api/data';

const defaultData: AppData = {
  sets: [],
  submissions: [],
};

export const loadData = async (): Promise<AppData> => {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return defaultData;
    return await res.json();
  } catch {
    return defaultData;
  }
};

export const saveData = async (data: AppData): Promise<void> => {
  await fetch(API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};
