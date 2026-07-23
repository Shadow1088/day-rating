const DEFAULT_SETTINGS = {
  supabaseUrl: 'https://vbostqafjafniznigsjt.supabase.co',
  supabaseKey: 'sb_publishable_T02bqH8egfO_xyh8_4vpNg_DlTv6dzL',
  reminderHour: 21,
  reminderMinute: 0,
  enabled: false,
};

let settings = { ...DEFAULT_SETTINGS };
let notifiedToday = false;
let lastCheckDate = '';

const api = typeof browser !== 'undefined' ? browser : chrome;

// Load settings on startup
try {
  api.storage.local.get('settings', (result) => {
    if (result && result.settings) {
      settings = { ...DEFAULT_SETTINGS, ...result.settings };
    }
  });
} catch (e) {
  console.error('Failed to load settings:', e);
}

// Listen for settings changes
api.storage.onChanged.addListener((changes) => {
  if (changes.settings) {
    settings = { ...DEFAULT_SETTINGS, ...changes.settings };
    notifiedToday = false;
  }
});

// Check every 60 seconds via alarm
try {
  api.alarms.create('reminder-check', { periodInMinutes: 1 });
} catch (e) {
  console.error('Failed to create alarm:', e);
}

api.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'reminder-check') {
    checkReminder();
  }
});

async function checkReminder() {
  if (!settings.enabled) return;

  const today = new Date().toISOString().split('T')[0];

  // Reset notification flag for new day
  if (lastCheckDate !== today) {
    notifiedToday = false;
    lastCheckDate = today;
  }

  if (notifiedToday) return;

  // Check if current time is past reminder time
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = settings.reminderHour * 60 + settings.reminderMinute;

  if (currentMinutes < targetMinutes) return;

  // Query Supabase for today's submissions
  try {
    const url = `${settings.supabaseUrl}/rest/v1/submissions?date=eq.${today}&select=id`;
    const res = await fetch(url, {
      headers: {
        'apikey': settings.supabaseKey,
        'Authorization': `Bearer ${settings.supabaseKey}`,
      },
    });
    if (!res.ok) return;

    const data = await res.json();

    if (!data || data.length === 0) {
      fireNotification();
    }
  } catch {
    // Supabase unreachable, silently skip
  }
}

function fireNotification() {
  notifiedToday = true;

  try {
    api.notifications.create('day-rating-reminder', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Day Rating',
      message: "You haven't submitted your activities today. Click to open the app.",
      priority: 2,
    });
  } catch (e) {
    console.error('Notification failed:', e);
  }
}

// Open app when notification is clicked
api.notifications.onClicked.addListener((id) => {
  if (id === 'day-rating-reminder') {
    api.tabs.create({ url: 'https://day-rating.vercel.app' });
  }
});
