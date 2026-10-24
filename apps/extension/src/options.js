const DEFAULTS = { startHour: 8, endHour: 23, activeDays: [0, 1, 2, 3, 4, 5, 6], remindersEnabled: false };
const byId = (id) => document.getElementById(id);

async function load() {
  const { settings } = await chrome.storage.local.get('settings');
  const value = { ...DEFAULTS, ...(settings || {}) };
  byId('remindersEnabled').checked = value.remindersEnabled;
  byId('startHour').value = value.startHour;
  byId('endHour').value = value.endHour;
}

byId('save').addEventListener('click', async () => {
  const startHour = Number(byId('startHour').value);
  const endHour = Number(byId('endHour').value);
  if (!Number.isInteger(startHour) || !Number.isInteger(endHour) || startHour < 0 || endHour > 24 || startHour >= endHour) {
    byId('status').textContent = 'Choose a valid active window.';
    return;
  }
  await chrome.storage.local.set({ settings: { ...DEFAULTS, startHour, endHour, remindersEnabled: byId('remindersEnabled').checked } });
  byId('status').textContent = 'Settings saved.';
});

byId('test').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'TEST_NOTIFICATION' });
  byId('status').textContent = 'Test notification sent.';
});

load();
