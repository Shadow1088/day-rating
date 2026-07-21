const api = typeof browser !== 'undefined' ? browser : chrome;

const serverUrlInput = document.getElementById('serverUrl');
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
      serverUrlInput.value = s.serverUrl || 'http://localhost:3001';
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
  serverUrlInput.value = 'http://localhost:3001';
}

// Save on any change
function save() {
  try {
    const [hour, min] = reminderTimeInput.value.split(':').map(Number);
    const settings = {
      serverUrl: serverUrlInput.value.replace(/\/+$/, ''),
      reminderHour: hour ?? 21,
      reminderMinute: min ?? 0,
      enabled: enabledInput.checked,
    };
    api.storage.local.set({ settings });
  } catch (e) {
    console.error('Save failed:', e);
  }
}

serverUrlInput.addEventListener('change', save);
reminderTimeInput.addEventListener('change', save);
enabledInput.addEventListener('change', save);

testBtn.addEventListener('click', async () => {
  statusDiv.textContent = 'Connecting...';
  statusDiv.className = 'status';

  try {
    const res = await fetch(serverUrlInput.value.replace(/\/+$/, '') + '/api/data');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const sets = data.sets?.length ?? 0;
    const subs = data.submissions?.length ?? 0;
    statusDiv.textContent = `Connected. ${sets} set(s), ${subs} submission(s).`;
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
