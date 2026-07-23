const api = typeof browser !== 'undefined' ? browser : chrome;

const supabaseUrlInput = document.getElementById('supabaseUrl');
const supabaseKeyInput = document.getElementById('supabaseKey');
const reminderTimeInput = document.getElementById('reminderTime');
const enabledInput = document.getElementById('enabled');
const testBtn = document.getElementById('testBtn');
const testNotifBtn = document.getElementById('testNotifBtn');
const statusDiv = document.getElementById('status');

// Load saved settings
try {
  api.storage.local.get('settings', (result) => {
    try {
      const s = (result && result.settings) || {};
      supabaseUrlInput.value = s.supabaseUrl || 'https://vbostqafjafniznigsjt.supabase.co';
      supabaseKeyInput.value = s.supabaseKey || '';
      enabledInput.checked = s.enabled || false;

      const hour = s.reminderHour ?? 21;
      const min = s.reminderMinute ?? 0;
      reminderTimeInput.value = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    } catch (e) {
      console.error('Error applying settings:', e);
    }
  });
} catch (e) {
  console.error('Storage read failed:', e);
}

// Save on any change
function save() {
  try {
    const [hour, min] = reminderTimeInput.value.split(':').map(Number);
    const settings = {
      supabaseUrl: supabaseUrlInput.value.replace(/\/+$/, ''),
      supabaseKey: supabaseKeyInput.value.trim(),
      reminderHour: hour ?? 21,
      reminderMinute: min ?? 0,
      enabled: enabledInput.checked,
    };
    api.storage.local.set({ settings });
  } catch (e) {
    console.error('Save failed:', e);
  }
}

supabaseUrlInput.addEventListener('change', save);
supabaseKeyInput.addEventListener('change', save);
reminderTimeInput.addEventListener('change', save);
enabledInput.addEventListener('change', save);

testBtn.addEventListener('click', async () => {
  statusDiv.textContent = 'Connecting...';
  statusDiv.className = 'status';

  const url = supabaseUrlInput.value.replace(/\/+$/, '');
  const key = supabaseKeyInput.value.trim();

  if (!url || !key) {
    statusDiv.textContent = 'Fill in Supabase URL and API key.';
    statusDiv.className = 'status err';
    return;
  }

  try {
    const res = await fetch(`${url}/rest/v1/submissions?select=id&limit=1`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Also get set count
    const setsRes = await fetch(`${url}/rest/v1/activity_sets?select=id&limit=1`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });
    const setsData = setsRes.ok ? await setsRes.json() : [];

    statusDiv.textContent = `Connected. Database OK.`;
    statusDiv.className = 'status ok';
  } catch (e) {
    statusDiv.textContent = `Failed: ${e.message}`;
    statusDiv.className = 'status err';
  }
});

testNotifBtn.addEventListener('click', () => {
  try {
    api.notifications.create('day-rating-reminder', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Day Rating',
      message: "You haven't submitted your activities today. Click to open the app.",
      priority: 2,
    });
    statusDiv.textContent = 'Notification sent.';
    statusDiv.className = 'status ok';
  } catch (e) {
    statusDiv.textContent = `Notification failed: ${e.message}`;
    statusDiv.className = 'status err';
  }
});
